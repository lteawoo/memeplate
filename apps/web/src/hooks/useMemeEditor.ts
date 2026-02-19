import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, CanvasObject, Rect, Circle, Textbox, CanvasImage } from '../core/canvas';
import type { CanvasObjectOptions } from '../core/canvas';
import type { ToolType } from '../components/editor/MemeToolbar';
import { toast } from 'sonner';
import type { TemplateRecord, TemplateVisibility } from '../types/template';
import { apiFetch } from '../lib/apiFetch';
import { MAX_CANVAS_AREA_PX, MAX_CANVAS_EDGE_PX } from '../constants/canvasLimits';

const CANVAS_MARGIN = 0;
const PUBLISH_IMAGE_LONG_EDGE = 1920;
const TEMPLATE_BACKGROUND_QUALITY = 0.98;
const PUBLISH_IMAGE_QUALITY = 0.98;
const PUBLISH_IMAGE_MULTIPLIER = 2;
const BACKGROUND_LOADING_MIN_MS = 180;

interface HistoryItem {
  json: string;
  selectedId: string | null;
}

interface CanvasDoubleClickEvent {
  target?: CanvasObject;
}

interface CanvasObjectEvent {
  target?: CanvasObject;
}

type TemplateResponse = {
  template: {
    id: string;
    title: string;
    description?: string;
    visibility: TemplateVisibility;
    shareSlug: string;
  };
};

type EditorLoadMode = 'mine' | 'public';

interface UseMemeEditorOptions {
  initialTemplate?: TemplateRecord | null;
  initialTemplateMode?: EditorLoadMode;
}

type SavedTemplateMeta = {
  id: string;
  title: string;
  description?: string;
  visibility: TemplateVisibility;
  shareSlug: string;
};

type CreatedImageResponse = {
  image: {
    id: string;
    shareSlug: string;
  };
};

type UploadInput = File | Blob | {
  file?: File | Blob | {
    originFileObj?: File | Blob;
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toCanvasSafeImageSrc = (src: string): string => {
  return src;
};

const toPersistedImageSrc = (src: string): string => {
  if (!src) return src;
  try {
    const parsed = new URL(src, window.location.origin);
    if (parsed.pathname !== '/api/v1/assets/proxy') {
      return src;
    }
    const original = parsed.searchParams.get('url');
    return original || src;
  } catch {
    return src;
  }
};

const sanitizeTemplateNode = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => sanitizeTemplateNode(item));
  }

  if (!isObject(node)) {
    return node;
  }

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    next[key] = sanitizeTemplateNode(value);
  }

  if (next.type === 'text' && typeof next.text === 'string') {
    next.text = '';
  }

  if (next.type === 'image' && typeof next.src === 'string') {
    next.src = toPersistedImageSrc(next.src);
  }

  return next;
};

const sanitizeTemplateContent = (content: Record<string, unknown>): Record<string, unknown> =>
  sanitizeTemplateNode(content) as Record<string, unknown>;

const getPublishImageSize = (width: number, height: number) => {
  const longEdge = Math.max(width, height);
  if (!Number.isFinite(longEdge) || longEdge <= 0 || longEdge <= PUBLISH_IMAGE_LONG_EDGE) {
    return { width, height };
  }
  const scale = PUBLISH_IMAGE_LONG_EDGE / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

const parseDataUrlMime = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([^;,]+)[;,]/i);
  return match?.[1] ?? 'image/webp';
};

const estimateDataUrlBytes = (dataUrl: string) => {
  const base64Index = dataUrl.indexOf('base64,');
  if (base64Index < 0) return 0;
  const base64 = dataUrl.slice(base64Index + 'base64,'.length);
  const padding = (base64.match(/=*$/)?.[0].length ?? 0);
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

const normalizeWorkspaceSize = (width: number, height: number) => {
  const safeWidth = Number.isFinite(width) && width > 0 ? Math.round(width) : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? Math.round(height) : 1;
  const longEdge = Math.max(safeWidth, safeHeight, 1);
  const area = safeWidth * safeHeight;
  const edgeScale = MAX_CANVAS_EDGE_PX / longEdge;
  const areaScale = area > MAX_CANVAS_AREA_PX
    ? Math.sqrt(MAX_CANVAS_AREA_PX / area)
    : 1;
  const scale = Math.min(1, edgeScale, areaScale);
  if (scale >= 1) {
    return { width: safeWidth, height: safeHeight, scaled: false };
  }
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
    scaled: true
  };
};

const isTextObject = (obj?: CanvasObject | null) => obj instanceof Textbox || obj?.type === 'text';

const getBackgroundSourceFromCanvas = (canvas: Canvas) => {
  const objects = canvas.getObjects();
  const background = objects.find((obj) => obj.name === 'background' && obj.type === 'image');
  const fallbackImage = objects.find((obj) => obj.type === 'image');
  const src = (background ?? fallbackImage)?.src;
  return typeof src === 'string' ? src.trim() : '';
};

const createBackgroundImageObject = (src: string, width: number, height: number): Record<string, unknown> => ({
  id: crypto.randomUUID(),
  type: 'image',
  name: 'background',
  src: toCanvasSafeImageSrc(src),
  left: width / 2,
  top: height / 2,
  width,
  height,
  scaleX: 1,
  scaleY: 1,
  angle: 0,
  fill: 'transparent',
  stroke: 'transparent',
  strokeWidth: 0,
  opacity: 1,
  selectable: false,
  evented: false,
  visible: true
});

export const useMemeEditor = (options?: UseMemeEditorOptions) => {
  const initialTemplate = options?.initialTemplate ?? null;
  const initialTemplateMode = options?.initialTemplateMode;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasInstanceRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
  // Selection State
  const [activeObject, setActiveObject] = useState<CanvasObject | null>(null);
  const [layers, setLayers] = useState<CanvasObject[]>([]);

  // Property State
  const [color, setColor] = useState('#ffffff');
  const [bgUrl, setBgUrl] = useState('');
  const [hasBackground, setHasBackground] = useState(false);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });
  const workspaceSizeRef = useRef({ width: 0, height: 0 });
  const [savedTemplate, setSavedTemplate] = useState<SavedTemplateMeta | null>(null);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);
  const [isImagePublishing, setIsImagePublishing] = useState(false);
  const [isBackgroundApplying, setIsBackgroundApplying] = useState(false);
  const backgroundApplySeqRef = useRef(0);
  const backgroundApplyStartedAtRef = useRef(0);
  const backgroundApplyEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTemplateSaveDisabled = initialTemplateMode === 'public';
  const linkedTemplateId = savedTemplate?.id ?? initialTemplate?.id;
  const canPublishRemix = Boolean(linkedTemplateId);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryLocked = useRef(false);
  const historyRef = useRef<HistoryItem[]>([]);
  const indexRef = useRef(-1);
  const historyDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBackgroundDirtyRef = useRef(false);
  const loadedTemplateKeyRef = useRef<string | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  const saveHistoryNow = useCallback(() => {
    if (isHistoryLocked.current || !canvasInstanceRef.current) return;
    
    const canvas = canvasInstanceRef.current;
    const json = JSON.stringify(canvas.toJSON(false)); // Exclude background
    const activeObj = canvas.getActiveObject();
    const selectedId = activeObj ? activeObj.id : null;
    
    if (historyRef.current.length > 0 && indexRef.current > -1) {
        // Compare only JSON content to avoid duplicate saves on selection change only
        if (historyRef.current[indexRef.current].json === json) return;
    }

    const newItem: HistoryItem = { json, selectedId };
    const newHistory = historyRef.current.slice(0, indexRef.current + 1);
    newHistory.push(newItem);
    
    if (newHistory.length > 50) newHistory.shift();
    
    // Update refs immediately to prevent race conditions in rapid updates
    historyRef.current = newHistory;
    indexRef.current = newHistory.length - 1;

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, []);

  const saveHistoryDebounced = useCallback((delayMs = 200) => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
    }
    historyDebounceTimerRef.current = setTimeout(() => {
      historyDebounceTimerRef.current = null;
      saveHistoryNow();
    }, delayMs);
  }, [saveHistoryNow]);

  const loadHistoryItem = (item: HistoryItem, newIndex: number) => {
    if (!canvasInstanceRef.current) return;
    
    isHistoryLocked.current = true;
    canvasInstanceRef.current.loadFromJSON(JSON.parse(item.json), true).then(() => { // Preserve background
        if (!canvasInstanceRef.current) return;
        
        // Restore selection
        if (item.selectedId) {
            const obj = canvasInstanceRef.current.getObjectById(item.selectedId);
            if (obj) {
                canvasInstanceRef.current.setActiveObject(obj);
            }
        } else {
            canvasInstanceRef.current.discardActiveObject();
        }

        // Update refs immediately
        indexRef.current = newIndex;
        setHistoryIndex(newIndex);
        setLayers([...canvasInstanceRef.current.getObjects()]);
        
        isHistoryLocked.current = false;
    }).catch((err) => {
        console.error('Failed to load history item:', err);
        isHistoryLocked.current = false;
    });
  };

  const undo = useCallback(() => {
    if (isHistoryLocked.current) return;
    if (indexRef.current <= 0 || !canvasInstanceRef.current) return;
    
    const newIndex = indexRef.current - 1;
    const prevState = historyRef.current[newIndex];
    loadHistoryItem(prevState, newIndex);
  }, []);

  const redo = useCallback(() => {
    if (isHistoryLocked.current) return;
    if (indexRef.current >= historyRef.current.length - 1 || !canvasInstanceRef.current) return;
    
    const newIndex = indexRef.current + 1;
    const nextState = historyRef.current[newIndex];
    loadHistoryItem(nextState, newIndex);
  }, []);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) redo();
              else undo();
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
              e.preventDefault();
              redo();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, undo]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new Canvas(canvasRef.current);
    canvas.setWidth(600);
    canvas.setHeight(600);
    
    canvasInstanceRef.current = canvas;
    setIsCanvasReady(true);

    const initialJson = JSON.stringify(canvas.toJSON(false)); // Exclude background
    const initialItem: HistoryItem = { json: initialJson, selectedId: null };
    
    setHistory([initialItem]);
    setHistoryIndex(0);
    
    // Initialize refs
    historyRef.current = [initialItem];
    indexRef.current = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelection = (e: any) => {
      const selected = e.selected ? e.selected[0] : null;
      setActiveObject(selected || null);
      if (selected) {
        setActiveTool('edit'); // Switch to edit tool to show properties/layers
        
        if (selected instanceof Textbox) {
          setColor(selected.fill as string); 
        } 
        else if (selected instanceof Rect || selected instanceof Circle) {
          setColor(selected.fill as string);
        }
      }
    };

    const handleUpdate = (event?: CanvasObjectEvent) => {
        if (event?.target && !isTextObject(event.target)) {
          isBackgroundDirtyRef.current = true;
        }
        saveHistoryNow();
        setLayers([...canvas.getObjects()]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enforceBoundaries = (e: any) => {
        const obj = e.target;
        if (!obj || !canvasInstanceRef.current || !workspaceSizeRef.current.width) return;

        const width = obj.width * obj.scaleX;
        const height = obj.height * obj.scaleY;
        
        const boundLeft = obj.left - width / 2;
        const boundTop = obj.top - height / 2;
        
        const minLeft = 0;
        const minTop = 0;
        const maxLeft = workspaceSizeRef.current.width;
        const maxTop = workspaceSizeRef.current.height;

        let moved = false;
        let newLeft = obj.left;
        let newTop = obj.top;

        if (boundLeft < minLeft) {
            newLeft = minLeft + width / 2;
            moved = true;
        }
        if (boundTop < minTop) {
            newTop = minTop + height / 2;
            moved = true;
        }
        if (boundLeft + width > maxLeft) {
            newLeft = maxLeft - width / 2;
            moved = true;
        }
        if (boundTop + height > maxTop) {
            newTop = maxTop - height / 2;
            moved = true;
        }

        if (moved) {
            obj.set('left', newLeft);
            obj.set('top', newTop);
        }
    };

    canvas.on('mouse:dblclick', (opt: CanvasDoubleClickEvent) => {
        if (opt.target instanceof Textbox) {
            setEditingTextId(opt.target.id);
            opt.target.set('visible', false);
            canvas.requestRender();
        }
    });

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setActiveObject(null));
    
    canvas.on('object:added', handleUpdate);
    canvas.on('object:modified', handleUpdate);
    canvas.on('object:removed', handleUpdate);
    
    canvas.on('object:moving', enforceBoundaries);

    return () => {
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }
      if (backgroundApplyEndTimerRef.current) {
        clearTimeout(backgroundApplyEndTimerRef.current);
        backgroundApplyEndTimerRef.current = null;
      }
      canvas.dispose();
      canvasInstanceRef.current = null;
      setIsCanvasReady(false);
    };
  }, [saveHistoryNow]);

  useEffect(() => {
    const canvas = canvasInstanceRef.current;
    if (!isCanvasReady || !canvas || !initialTemplate?.content) return;

    const templateKey = `${initialTemplateMode || 'public'}:${initialTemplate.id}`;
    if (loadedTemplateKeyRef.current === templateKey) return;
    loadedTemplateKeyRef.current = templateKey;

    const contentToLoad = structuredClone(initialTemplate.content) as Record<string, unknown>;
    const width = Number(contentToLoad.width);
    const height = Number(contentToLoad.height);

    const objects = Array.isArray(contentToLoad.objects) ? contentToLoad.objects as Array<Record<string, unknown>> : [];
    contentToLoad.objects = objects;

    objects.forEach((obj) => {
      if (obj.type === 'image' && typeof obj.src === 'string' && obj.src.trim() !== '') {
        obj.src = toCanvasSafeImageSrc(obj.src);
      }
    });

    isHistoryLocked.current = true;
    void canvas.loadFromJSON(contentToLoad, false).then(() => {
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        canvas.setDimensions({ width, height });
        const newSize = { width, height };
        setWorkspaceSize(newSize);
        workspaceSizeRef.current = newSize;
      }

      const loadedObjects = canvas.getObjects();
      const hasBg = loadedObjects.some((obj) => obj.name === 'background' || obj.type === 'image');
      setHasBackground(hasBg);
      setLayers(loadedObjects);
      canvas.discardActiveObject();
      canvas.requestRender();
      setActiveTool(hasBg ? 'edit' : 'background');

      const initialJson = JSON.stringify(canvas.toJSON(false));
      const initialItem: HistoryItem = { json: initialJson, selectedId: null };
      historyRef.current = [initialItem];
      indexRef.current = 0;
      setHistory([initialItem]);
      setHistoryIndex(0);

      if (initialTemplateMode === 'mine') {
        setSavedTemplate({
          id: initialTemplate.id,
          title: initialTemplate.title,
          description: initialTemplate.description,
          visibility: initialTemplate.visibility,
          shareSlug: initialTemplate.shareSlug
        });
      } else {
        setSavedTemplate(null);
      }
      isBackgroundDirtyRef.current = false;

      isHistoryLocked.current = false;
    }).catch((err) => {
      console.error('Failed to load template content:', err);
      isHistoryLocked.current = false;
    });
  }, [initialTemplate, initialTemplateMode, isCanvasReady]);

  const setBackgroundImage = (url: string) => {
    if (!canvasInstanceRef.current) return;
    isHistoryLocked.current = true;
    const applySeq = ++backgroundApplySeqRef.current;
    backgroundApplyStartedAtRef.current = Date.now();
    if (backgroundApplyEndTimerRef.current) {
      clearTimeout(backgroundApplyEndTimerRef.current);
      backgroundApplyEndTimerRef.current = null;
    }
    setIsBackgroundApplying(true);

    const safeImageUrl = toCanvasSafeImageSrc(url);
    const shouldRevokeObjectUrl = safeImageUrl.startsWith('blob:');

    CanvasImage.fromURL(safeImageUrl).then((img) => {
      if (applySeq !== backgroundApplySeqRef.current) {
        if (shouldRevokeObjectUrl) {
          URL.revokeObjectURL(safeImageUrl);
        }
        return;
      }
      const canvas = canvasInstanceRef.current!;
      const logicalW = img.element?.naturalWidth || img.width;
      const logicalH = img.element?.naturalHeight || img.height;
      const normalizedSize = normalizeWorkspaceSize(logicalW, logicalH);

      canvas.setDimensions({ width: normalizedSize.width, height: normalizedSize.height });
      const newSize = { width: normalizedSize.width, height: normalizedSize.height };
      setWorkspaceSize(newSize);
      workspaceSizeRef.current = newSize;

      img.set('width', normalizedSize.width);
      img.set('height', normalizedSize.height);
      img.set('scaleX', 1);
      img.set('scaleY', 1);
      img.set('left', normalizedSize.width / 2);
      img.set('top', normalizedSize.height / 2);
      img.set('selectable', false);
      img.set('evented', false);
      img.set('name', 'background');
      
      canvas.getObjects().filter(o => o.name === 'background').forEach(o => canvas.remove(o));
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
      setHasBackground(true);
      setBgUrl(url);
      setActiveTool('background');
      if (normalizedSize.scaled) {
        toast.info(`큰 원본이라 편집 안정성을 위해 ${normalizedSize.width}x${normalizedSize.height}로 조정했습니다.`);
      }
      isBackgroundDirtyRef.current = true;
      isHistoryLocked.current = false;

      setTimeout(() => {
        if (canvasInstanceRef.current) canvasInstanceRef.current.requestRender();
      }, 100);
      if (shouldRevokeObjectUrl) {
        URL.revokeObjectURL(safeImageUrl);
      }
    }).catch((err) => {
      if (applySeq !== backgroundApplySeqRef.current) {
        if (shouldRevokeObjectUrl) {
          URL.revokeObjectURL(safeImageUrl);
        }
        return;
      }
      console.error('Failed to load image:', err);
      toast.error('이미지를 불러오는데 실패했습니다.');
      isHistoryLocked.current = false;
      if (shouldRevokeObjectUrl) {
        URL.revokeObjectURL(safeImageUrl);
      }
    }).finally(() => {
      if (applySeq === backgroundApplySeqRef.current) {
        const elapsedMs = Date.now() - backgroundApplyStartedAtRef.current;
        const remainingMs = Math.max(0, BACKGROUND_LOADING_MIN_MS - elapsedMs);
        if (remainingMs === 0) {
          setIsBackgroundApplying(false);
        } else {
          backgroundApplyEndTimerRef.current = setTimeout(() => {
            if (applySeq === backgroundApplySeqRef.current) {
              setIsBackgroundApplying(false);
            }
            backgroundApplyEndTimerRef.current = null;
          }, remainingMs);
        }
      }
    });
  };

  const selectLayer = (obj: CanvasObject) => {
    if (!canvasInstanceRef.current) return;
    canvasInstanceRef.current.setActiveObject(obj);
  };

  const handleImageUpload = (info: UploadInput) => {
    const maybeFile = info.file ?? info;
    const file = (
      typeof maybeFile === 'object' &&
      maybeFile !== null &&
      'originFileObj' in maybeFile
    ) ? maybeFile.originFileObj : maybeFile;

    if (file instanceof File || file instanceof Blob) {
      const objectUrl = URL.createObjectURL(file);
      setBackgroundImage(objectUrl);
    }
  };

  const addText = () => {
    if (!canvasInstanceRef.current) return;
    const canvasW = workspaceSize.width || 400;
    const text = new Textbox('', { 
      left: CANVAS_MARGIN + canvasW / 2, 
      top: CANVAS_MARGIN + workspaceSize.height / 2, 
      width: Math.min(canvasW * 0.8, 400),
      height: 100, 
      fontSize: 40, 
      fill: '#ffffff', 
      stroke: '#000000', 
      strokeWidth: 1, 
      name: 'text'
    });
    canvasInstanceRef.current.add(text); 
    canvasInstanceRef.current.setActiveObject(text); 
  };

  const updateProperty = (key: keyof CanvasObjectOptions, value: string | number | boolean) => {
    if (!canvasInstanceRef.current) return;
    const active = canvasInstanceRef.current.getActiveObject();
    if (active) {
        active.set(key, value);
        canvasInstanceRef.current.renderAll();
        if (key === 'fill') setColor(value as string);
        if (!isTextObject(active)) {
          isBackgroundDirtyRef.current = true;
        }
        setLayers([...canvasInstanceRef.current.getObjects()]);
        saveHistoryDebounced();
    }
  };

  const deleteActiveObject = () => {
    if (!canvasInstanceRef.current) return;
    const active = canvasInstanceRef.current.getActiveObject();
    if (active && active.name !== 'background') {
        if (!isTextObject(active)) {
          isBackgroundDirtyRef.current = true;
        }
        canvasInstanceRef.current.remove(active);
        canvasInstanceRef.current.discardActiveObject();
    }
  };

  const addShape = (type: 'rect' | 'circle') => {
    if (!canvasInstanceRef.current) return;
    const centerX = CANVAS_MARGIN + workspaceSize.width/2;
    const centerY = CANVAS_MARGIN + workspaceSize.height/2;
    const common = {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 0,
      name: 'shape'
    };
    
    let shape;
    if (type === 'rect') shape = new Rect({ ...common, left: centerX, top: centerY, width: 100, height: 100 });
    else shape = new Circle({ ...common, left: centerX, top: centerY, radius: 50 });
    
    canvasInstanceRef.current.add(shape); 
    canvasInstanceRef.current.setActiveObject(shape); 
    isBackgroundDirtyRef.current = true;
  };

  const downloadImage = async (format: 'png' | 'jpg' | 'webp' | 'pdf') => {
    if (!canvasInstanceRef.current) return;
    const canvas = canvasInstanceRef.current;
    const exportFormat = format === 'jpg' ? 'jpeg' : format;
    const dataURL = canvas.toDataURL({ 
      format: exportFormat, 
      multiplier: 2,
      width: workspaceSize.width,
      height: workspaceSize.height
    });

    if (format === 'pdf') {
      const toastId = toast.loading('PDF 생성 중...');
      try {
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ 
          orientation: workspaceSize.width > workspaceSize.height ? 'landscape' : 'portrait', 
          unit: 'px', 
          format: [workspaceSize.width, workspaceSize.height] 
        });
        pdf.addImage(dataURL, 'PNG', 0, 0, workspaceSize.width, workspaceSize.height);
        pdf.save(`meme-${Date.now()}.pdf`);
        toast.success('PDF 다운로드 완료', { id: toastId });
      } catch {
        toast.error('PDF 생성에 실패했습니다', { id: toastId });
      }
    } else {
      const link = document.createElement('a'); 
      link.download = `meme-${Date.now()}.${format}`;
      link.href = dataURL;
      link.click();
      toast.success('이미지 다운로드 시작');
    }
  };

  const copyToClipboard = async () => {
    if (!canvasInstanceRef.current) return;
    try {
      const dataURL = canvasInstanceRef.current.toDataURL({ 
          format: 'png', multiplier: 2, width: workspaceSize.width, height: workspaceSize.height
      });
      const blob = await (await fetch(dataURL)).blob();
      await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
      toast.success('클립보드에 복사되었습니다');
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

  const publishImage = async (title: string, description: string) => {
    if (!canvasInstanceRef.current) return null;
    if (!linkedTemplateId) {
      toast.warning('리믹스 게시 전 밈플릿을 먼저 선택하거나 저장하세요.');
      return null;
    }
    const imageTitle = title.trim() || '새 이미지';
    const imageDescription = description.trim();

    try {
      setIsImagePublishing(true);

      const publishSize = getPublishImageSize(workspaceSize.width, workspaceSize.height);
      const publishExportWidth = Math.max(1, Math.round(publishSize.width * PUBLISH_IMAGE_MULTIPLIER));
      const publishExportHeight = Math.max(1, Math.round(publishSize.height * PUBLISH_IMAGE_MULTIPLIER));
      const imageDataUrl = canvasInstanceRef.current.toDataURL({
        format: 'webp',
        multiplier: PUBLISH_IMAGE_MULTIPLIER,
        width: publishSize.width,
        height: publishSize.height,
        quality: PUBLISH_IMAGE_QUALITY
      });
      const imageMime = parseDataUrlMime(imageDataUrl);
      const imageBytes = estimateDataUrlBytes(imageDataUrl);

      const res = await apiFetch('/api/v1/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: linkedTemplateId,
          title: imageTitle,
          description: imageDescription.length > 0 ? imageDescription : undefined,
          imageDataUrl,
          imageWidth: publishExportWidth,
          imageHeight: publishExportHeight,
          imageBytes,
          imageMime,
          visibility: 'public'
        })
      });

      if (res.status === 401) {
        toast.error('로그인이 필요합니다.');
        return null;
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '리믹스 게시에 실패했습니다.');
      }

      const payload = (await res.json()) as CreatedImageResponse;
      const shareUrl = `${window.location.origin}/images/s/${payload.image.shareSlug}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('리믹스를 게시했고 링크를 복사했습니다.');
      } catch {
        toast.success('리믹스를 게시했습니다.');
      }
      return payload.image;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '리믹스 게시에 실패했습니다.';
      toast.error(msg);
      return null;
    } finally {
      setIsImagePublishing(false);
    }
  };

  const saveTemplate = async (title: string, description: string, visibility: TemplateVisibility) => {
    if (!canvasInstanceRef.current) return null;
    if (isTemplateSaveDisabled) {
      toast.warning('공개 밈플릿으로 시작한 작업은 밈플릿 저장/공유를 지원하지 않습니다.');
      return null;
    }
    if (!title.trim()) {
      toast.error('밈플릿 제목을 입력하세요.');
      return null;
    }

    try {
      setIsTemplateSaving(true);
      const canvas = canvasInstanceRef.current;
      const rawContent = sanitizeTemplateContent(canvas.toJSON(true) as Record<string, unknown>);
      const sanitizedObjects = Array.isArray(rawContent.objects)
        ? rawContent.objects as Array<Record<string, unknown>>
        : [];
      const textLayerObjects = sanitizedObjects.filter((obj) => obj.type === 'text');
      const textObjects = canvas
        .getObjects()
        .filter((obj) => obj instanceof Textbox || obj.type === 'text')
        .map((obj) => ({ obj, visible: obj.visible }));

      const backgroundSrc = getBackgroundSourceFromCanvas(canvas);
      const shouldUploadBackground = isBackgroundDirtyRef.current
        || !backgroundSrc
        || backgroundSrc.startsWith('data:image/');
      let flattenedBackgroundDataUrl = '';
      if (shouldUploadBackground) {
        try {
          textObjects.forEach(({ obj }) => obj.set('visible', false));
          // Bake non-text layers (background + shapes) into one base image.
          flattenedBackgroundDataUrl = canvas.toDataURL({
            format: 'webp',
            multiplier: 1,
            width: workspaceSize.width,
            height: workspaceSize.height,
            quality: TEMPLATE_BACKGROUND_QUALITY
          });
        } finally {
          textObjects.forEach(({ obj, visible }) => obj.set('visible', visible));
        }
      }

      const content = {
        width: workspaceSize.width,
        height: workspaceSize.height,
        objects: [
          createBackgroundImageObject(shouldUploadBackground ? '' : backgroundSrc, workspaceSize.width, workspaceSize.height),
          ...textLayerObjects
        ]
      };

      const body = JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        content,
        backgroundDataUrl: shouldUploadBackground ? flattenedBackgroundDataUrl : undefined,
        visibility
      });

      const endpoint = savedTemplate
        ? `/api/v1/templates/${savedTemplate.id}`
        : '/api/v1/templates';
      const method = savedTemplate ? 'PATCH' : 'POST';

      const res = await apiFetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body
      });

      if (res.status === 401) {
        toast.error('로그인이 필요합니다.');
        return null;
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '밈플릿 저장에 실패했습니다.');
      }

      const payload = (await res.json()) as TemplateResponse;
      const template = {
        id: payload.template.id,
        title: payload.template.title,
        description: payload.template.description,
        visibility: payload.template.visibility,
        shareSlug: payload.template.shareSlug
      };
      setSavedTemplate(template);
      isBackgroundDirtyRef.current = false;
      toast.success('밈플릿이 저장되었습니다.');
      return template;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '밈플릿 저장에 실패했습니다.';
      toast.error(msg);
      return null;
    } finally {
      setIsTemplateSaving(false);
    }
  };

  const copyTemplateShareLink = async () => {
    if (!savedTemplate?.shareSlug) {
      toast.warning('공유 가능한 밈플릿이 없습니다.');
      return;
    }
    const shareUrl = `${window.location.origin}/templates/s/${savedTemplate.shareSlug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('밈플릿 공유 링크가 복사되었습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  const changeZIndex = (direction: 'forward' | 'backward' | 'front' | 'back') => {
    if (!canvasInstanceRef.current || !activeObject) return;
    const canvas = canvasInstanceRef.current;
    switch(direction) {
      case 'forward': canvas.bringObjectForward(activeObject); break;
      case 'backward': canvas.sendObjectBackwards(activeObject); break;
      case 'front': canvas.bringObjectToFront(activeObject); break;
      case 'back': canvas.sendObjectToBack(activeObject); break;
    }
    if (!isTextObject(activeObject)) {
      isBackgroundDirtyRef.current = true;
    }
    setLayers([...canvas.getObjects()]);
  };

  const completeTextEdit = (id: string, newText: string) => {
    if (!canvasInstanceRef.current) return;
    const obj = canvasInstanceRef.current.getObjectById(id);
    if (obj instanceof Textbox) {
        obj.set('text', newText);
        obj.set('visible', true);
        canvasInstanceRef.current.requestRender();
        saveHistoryNow();
    }
    setEditingTextId(null);
  };

  return {
    canvasRef,
    containerRef,
    activeTool,
    setActiveTool,
    editingTextId,
    completeTextEdit,
    isPanelOpen: false,
    setIsPanelOpen: () => {},
    activeObject,
    layers,
    color,
    bgUrl,
    setBgUrl,
    hasBackground,
    workspaceSize,
    historyIndex,
    history,
    undo,
    redo,
    setBackgroundImage,
    selectLayer,
    handleImageUpload,
    addText,
    updateProperty,
    deleteActiveObject,
    addShape,
    downloadImage,
    copyToClipboard,
    publishImage,
    changeZIndex,
    saveTemplate,
    copyTemplateShareLink,
    savedTemplate,
    isTemplateSaving,
    isImagePublishing,
    isBackgroundApplying,
    canPublishRemix,
    isTemplateSaveDisabled,
    canvasInstance: canvasInstanceRef.current
  };
};
