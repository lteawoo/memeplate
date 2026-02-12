import { useEffect, useRef, useState } from 'react';
import { Canvas, CanvasObject, Rect, Circle, Textbox, CanvasImage } from '../core/canvas';
import type { ToolType } from '../components/editor/MemeToolbar';
import { message } from 'antd';

type MessageInstance = ReturnType<typeof message.useMessage>[0];

const CANVAS_MARGIN = 0;

interface HistoryItem {
  json: string;
  selectedId: string | null;
}

export const useMemeEditor = (messageApi: MessageInstance) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasInstanceRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
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

  const undo = () => {
    if (isHistoryLocked.current) return;
    if (indexRef.current <= 0 || !canvasInstanceRef.current) return;
    
    const newIndex = indexRef.current - 1;
    const prevState = historyRef.current[newIndex];
    loadHistoryItem(prevState, newIndex);
  };

  const redo = () => {
    if (isHistoryLocked.current) return;
    if (indexRef.current >= historyRef.current.length - 1 || !canvasInstanceRef.current) return;
    
    const newIndex = indexRef.current + 1;
    const nextState = historyRef.current[newIndex];
    loadHistoryItem(nextState, newIndex);
  };

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
  }, []);

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
        setIsPanelOpen(true); 
        
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
        if (!obj || !canvasInstanceRef.current) return;

        const width = obj.width * obj.scaleX;
        const height = obj.height * obj.scaleY;
        
        const boundLeft = obj.left - width / 2;
        const boundTop = obj.top - height / 2;
        
        const minLeft = CANVAS_MARGIN;
        const minTop = CANVAS_MARGIN;
        const maxLeft = CANVAS_MARGIN + workspaceSizeRef.current.width;
        const maxTop = CANVAS_MARGIN + workspaceSizeRef.current.height;

        let moved = false;
        let newLeft = obj.left;
        let newTop = obj.top;

        if (boundLeft < minLeft) {
            newLeft += (minLeft - boundLeft);
            moved = true;
        }
        if (boundTop < minTop) {
            newTop += (minTop - boundTop);
            moved = true;
        }
        if (boundLeft + width > maxLeft) {
            newLeft -= (boundLeft + width - maxLeft);
            moved = true;
        }
        if (boundTop + height > maxTop) {
            newTop -= (boundTop + height - maxTop);
            moved = true;
        }

        if (moved) {
            obj.set('left', newLeft);
            obj.set('top', newTop);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:down', (opt: any) => {
        if (window.innerWidth < 768 && !opt.target) {
            setIsPanelOpen(false);
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
    // 1. Update state first to ensure UI is ready (canvas container becomes visible)
    setHasBackground(true); 
    setBgUrl(url); 
    setActiveTool('background');

    if (!canvasInstanceRef.current) return;
    
    // Lock history to prevent intermediate states (remove + add) from being saved individually
    isHistoryLocked.current = true;

    // 2. Load image and set up canvas
    CanvasImage.fromURL(url).then((img) => {
      const canvas = canvasInstanceRef.current!;
      const containerPadding = (window.innerWidth < 768 ? 32 : 48); 
      // Ensure container has dimensions. If 0 (hidden), fallback to window size or default
      const containerW = containerRef.current?.clientWidth || window.innerWidth;
      const containerH = containerRef.current?.clientHeight || window.innerHeight;

      const ratio = Math.min((containerW - containerPadding) / img.width, (containerH - containerPadding) / img.height);
      
      const scaledW = img.width * ratio;
      const scaledH = img.height * ratio;
      
      canvas.setDimensions({ 
        width: scaledW, 
        height: scaledH 
      });
      
      const newSize = { width: scaledW, height: scaledH };
      setWorkspaceSize(newSize);
      workspaceSizeRef.current = newSize;

      img.set('scaleX', ratio);
      img.set('scaleY', ratio);
      img.set('left', scaledW / 2);
      img.set('top', scaledH / 2);
      
      img.set('selectable', false);
      img.set('evented', false);
      
      canvas.getObjects().filter(o => o.name === 'background').forEach(o => canvas.remove(o));
      img.set('name', 'background');
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
      
      // Unlock history
      isHistoryLocked.current = false;

      setTimeout(() => {
        if (canvasInstanceRef.current) {
          canvasInstanceRef.current.requestRender();
        }
      }, 100);
    }).catch((err) => {
      console.error('Failed to load image:', err);
      messageApi.error('이미지를 불러오는데 실패했습니다.');
      
      // Revert state
      setHasBackground(false);
      setBgUrl('');
      setActiveTool(null);
      isHistoryLocked.current = false;
    });
  };

  const handleToolClick = (tool: ToolType) => {
    if (activeTool === tool && window.innerWidth < 768) {
      setIsPanelOpen(!isPanelOpen); 
    } else {
      setActiveTool(tool);
      setIsPanelOpen(true);
    }
  };

  const selectLayer = (obj: CanvasObject) => {
    if (!canvasInstanceRef.current) return;
    canvasInstanceRef.current.setActiveObject(obj);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleImageUpload = (info: any) => {
    const file = info.file?.originFileObj || info.file || info;
    if (file instanceof File || file instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setBackgroundImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      console.error('Invalid file object:', file);
    }
  };

  const addText = () => {
    if (!canvasInstanceRef.current) return;
    const canvasW = workspaceSize.width || 400;
    const text = new Textbox('텍스트를 입력하세요', { 
      left: CANVAS_MARGIN + canvasW / 2, 
      top: CANVAS_MARGIN + workspaceSize.height / 2, 
      width: Math.min(canvasW * 0.8, 400),
      height: 100, 
      fontSize: 40, 
      fill: '#ffffff', 
      stroke: '#000000', 
      strokeWidth: 2, 
      name: 'text'
    });
    canvasInstanceRef.current.add(text); 
    canvasInstanceRef.current.setActiveObject(text); 
  };

  const updateProperty = (key: string, value: string | number) => {
    if (!canvasInstanceRef.current) return;
    const active = canvasInstanceRef.current.getActiveObject();
    if (active) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        active.set(key as any, value);
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
    const common = { 
      fill: '#ffffff', 
      stroke: '#000000',
      strokeWidth: 0,
      name: 'shape'
    };
    
    let shape;
    if (type === 'rect') {
        shape = new Rect({ ...common, left: centerX, top: centerY, width: 100, height: 100 });
    } else {
        shape = new Circle({ ...common, left: centerX, top: centerY, radius: 50 });
    }
    
    canvasInstanceRef.current.add(shape); 
    canvasInstanceRef.current.setActiveObject(shape); 
  };

  const downloadImage = async (format: 'png' | 'jpg' | 'webp' | 'pdf') => {
    if (!canvasInstanceRef.current) return;
    const canvas = canvasInstanceRef.current;
    
    const dataURL = canvas.toDataURL({ 
      format: (format === 'jpg' ? 'jpeg' : format) as 'png' | 'jpeg' | 'webp', 
      multiplier: 2,
      width: workspaceSize.width,
      height: workspaceSize.height
    });

    if (format === 'pdf') {
      try {
        messageApi.loading('PDF 생성 중...');
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: workspaceSize.width > workspaceSize.height ? 'landscape' : 'portrait', unit: 'px', format: [workspaceSize.width, workspaceSize.height] });
        pdf.addImage(dataURL, 'PNG', 0, 0, workspaceSize.width, workspaceSize.height);
        pdf.save(`meme-${Date.now()}.pdf`);
        messageApi.success('PDF 다운로드 완료');
      } catch (error) { console.error(error); messageApi.error('PDF 생성에 실패했습니다'); }
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
      const canvas = canvasInstanceRef.current;
      const dataURL = canvas.toDataURL({ 
          format: 'png', 
          multiplier: 2,
          width: workspaceSize.width,
          height: workspaceSize.height
      });
      const blob = await (await fetch(dataURL)).blob();
      await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
      messageApi.success('클립보드에 복사되었습니다');
    } catch (err) { console.error('Failed to copy: ', err); messageApi.error('복사에 실패했습니다'); }
  };

  const changeZIndex = (direction: 'forward' | 'backward' | 'front' | 'back') => {
    if (!canvasInstanceRef.current || !activeObject) return;
    const canvas = canvasInstanceRef.current;
    const obj = activeObject;
    
    switch(direction) {
      case 'forward': canvas.bringObjectForward(obj); break;
      case 'backward': canvas.sendObjectBackwards(obj); break;
      case 'front': canvas.bringObjectToFront(obj); break;
      case 'back': canvas.sendObjectToBack(obj); break;
    }
    setLayers([...canvas.getObjects()]);
  };

  return {
    canvasRef,
    containerRef,
    activeTool,
    setActiveTool: handleToolClick,
    isPanelOpen,
    setIsPanelOpen,
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
