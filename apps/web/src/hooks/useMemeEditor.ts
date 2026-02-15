import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, CanvasObject, Rect, Circle, Textbox, CanvasImage } from '../core/canvas';
import type { CanvasObjectOptions } from '../core/canvas';
import type { ToolType } from '../components/editor/MemeToolbar';
import { message } from 'antd';

type MessageInstance = ReturnType<typeof message.useMessage>[0];

const CANVAS_MARGIN = 0;

interface HistoryItem {
  json: string;
  selectedId: string | null;
}

interface CanvasDoubleClickEvent {
  target?: CanvasObject;
}

type UploadInput = File | Blob | {
  file?: File | Blob | {
    originFileObj?: File | Blob;
  };
};

export const useMemeEditor = (messageApi: MessageInstance) => {
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

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryLocked = useRef(false);
  const historyRef = useRef<HistoryItem[]>([]);
  const indexRef = useRef(-1);

  const saveHistory = () => {
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
  };

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

    const handleUpdate = () => {
        saveHistory();
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

    return () => { canvas.dispose(); canvasInstanceRef.current = null; };
  }, []);

  const setBackgroundImage = (url: string) => {
    setHasBackground(true); 
    setBgUrl(url); 
    setActiveTool('background');

    if (!canvasInstanceRef.current) return;
    isHistoryLocked.current = true;

    CanvasImage.fromURL(url).then((img) => {
      const canvas = canvasInstanceRef.current!;
      const logicalW = img.element?.naturalWidth || img.width;
      const logicalH = img.element?.naturalHeight || img.height;

      canvas.setDimensions({ width: logicalW, height: logicalH });
      const newSize = { width: logicalW, height: logicalH };
      setWorkspaceSize(newSize);
      workspaceSizeRef.current = newSize;

      img.set('width', logicalW);
      img.set('height', logicalH);
      img.set('scaleX', 1);
      img.set('scaleY', 1);
      img.set('left', logicalW / 2);
      img.set('top', logicalH / 2);
      img.set('selectable', false);
      img.set('evented', false);
      img.set('name', 'background');
      
      canvas.getObjects().filter(o => o.name === 'background').forEach(o => canvas.remove(o));
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
      isHistoryLocked.current = false;

      setTimeout(() => {
        if (canvasInstanceRef.current) canvasInstanceRef.current.requestRender();
      }, 100);
    }).catch((err) => {
      console.error('Failed to load image:', err);
      messageApi.error('이미지를 불러오는데 실패했습니다.');
      setHasBackground(false);
      setBgUrl('');
      setActiveTool(null);
      isHistoryLocked.current = false;
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
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setBackgroundImage(e.target.result as string);
      };
      reader.readAsDataURL(file);
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
        setLayers([...canvasInstanceRef.current.getObjects()]);
        saveHistory();
    }
  };

  const deleteActiveObject = () => {
    if (!canvasInstanceRef.current) return;
    const active = canvasInstanceRef.current.getActiveObject();
    if (active && active.name !== 'background') {
        canvasInstanceRef.current.remove(active);
        canvasInstanceRef.current.discardActiveObject();
    }
  };

  const addShape = (type: 'rect' | 'circle') => {
    if (!canvasInstanceRef.current) return;
    const centerX = CANVAS_MARGIN + workspaceSize.width/2;
    const centerY = CANVAS_MARGIN + workspaceSize.height/2;
    const common = { fill: '#ffffff', stroke: '#000000', strokeWidth: 0, name: 'shape' };
    
    let shape;
    if (type === 'rect') shape = new Rect({ ...common, left: centerX, top: centerY, width: 100, height: 100 });
    else shape = new Circle({ ...common, left: centerX, top: centerY, radius: 50 });
    
    canvasInstanceRef.current.add(shape); 
    canvasInstanceRef.current.setActiveObject(shape); 
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
      try {
        messageApi.loading('PDF 생성 중...');
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ 
          orientation: workspaceSize.width > workspaceSize.height ? 'landscape' : 'portrait', 
          unit: 'px', 
          format: [workspaceSize.width, workspaceSize.height] 
        });
        pdf.addImage(dataURL, 'PNG', 0, 0, workspaceSize.width, workspaceSize.height);
        pdf.save(`meme-${Date.now()}.pdf`);
        messageApi.success('PDF 다운로드 완료');
      } catch {
        messageApi.error('PDF 생성에 실패했습니다');
      }
    } else {
      const link = document.createElement('a'); 
      link.download = `meme-${Date.now()}.${format}`;
      link.href = dataURL;
      link.click();
      messageApi.success('이미지 다운로드 시작');
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
      messageApi.success('클립보드에 복사되었습니다');
    } catch {
      messageApi.error('복사에 실패했습니다');
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
    setLayers([...canvas.getObjects()]);
  };

  const completeTextEdit = (id: string, newText: string) => {
    if (!canvasInstanceRef.current) return;
    const obj = canvasInstanceRef.current.getObjectById(id);
    if (obj instanceof Textbox) {
        obj.set('text', newText);
        obj.set('visible', true);
        canvasInstanceRef.current.requestRender();
        saveHistory();
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
    changeZIndex,
    canvasInstance: canvasInstanceRef.current
  };
};
