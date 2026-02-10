import React, { useEffect, useRef, useState } from 'react';
import { Layout, message } from 'antd';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload';

import { Canvas, CanvasObject, Rect, Circle, Textbox, CanvasImage } from '../core/canvas';
import MainHeader from './layout/MainHeader';
import EditorLayout from './editor/EditorLayout';
import MemeToolbar, { type ToolType } from './editor/MemeToolbar';
import MemePropertyPanel from './editor/MemePropertyPanel';
import MemeCanvas from './editor/MemeCanvas';

const CANVAS_MARGIN = 0;

const MemeEditor: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
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
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryLocked = useRef(false);
  const historyRef = useRef<string[]>([]);
  const indexRef = useRef(-1);

  // Sync refs for event listeners
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { indexRef.current = historyIndex; }, [historyIndex]);

  const saveHistory = () => {
    if (isHistoryLocked.current || !canvasInstanceRef.current) return;
    const json = JSON.stringify(canvasInstanceRef.current.toJSON());
    
    if (historyRef.current.length > 0 && indexRef.current > -1) {
        if (historyRef.current[indexRef.current] === json) return;
    }

    const newHistory = historyRef.current.slice(0, indexRef.current + 1);
    newHistory.push(json);
    if (newHistory.length > 50) newHistory.shift();
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (indexRef.current <= 0 || !canvasInstanceRef.current) return;
    isHistoryLocked.current = true;
    const newIndex = indexRef.current - 1;
    const prevState = historyRef.current[newIndex];
    canvasInstanceRef.current.loadFromJSON(JSON.parse(prevState)).then(() => {
        isHistoryLocked.current = false;
        setHistoryIndex(newIndex);
        if (canvasInstanceRef.current) setLayers([...canvasInstanceRef.current.getObjects()]);
    });
  };

  const redo = () => {
    if (indexRef.current >= historyRef.current.length - 1 || !canvasInstanceRef.current) return;
    isHistoryLocked.current = true;
    const newIndex = indexRef.current + 1;
    const nextState = historyRef.current[newIndex];
    canvasInstanceRef.current.loadFromJSON(JSON.parse(nextState)).then(() => {
        isHistoryLocked.current = false;
        setHistoryIndex(newIndex);
        if (canvasInstanceRef.current) setLayers([...canvasInstanceRef.current.getObjects()]);
    });
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
    // Initial setup if needed (width/height usually set by setBackgroundImage or container)
    canvas.setWidth(600);
    canvas.setHeight(600);
    
    canvasInstanceRef.current = canvas;

    const initialJson = JSON.stringify(canvas.toJSON());
    setHistory([initialJson]);
    setHistoryIndex(0);

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

        // Bounding rect check
        // Note: My simple engine doesn't implement getBoundingRect fully with rotation yet.
        // Assuming non-rotated or simple bounds for now.
        const width = obj.width * obj.scaleX;
        const height = obj.height * obj.scaleY;
        // const left = obj.left - width / 2; // centered origin in my engine? 
        // Wait, my draw logic uses translate(obj.left, obj.top) and draws at -w/2, -h/2
        // So obj.left/top IS the center.
        
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
    // canvas.on('object:scaling', enforceBoundaries); // Not implemented yet

    return () => { canvas.dispose(); canvasInstanceRef.current = null; };
  }, []);

  const setBackgroundImage = (url: string) => {
    if (!canvasInstanceRef.current) return;
    CanvasImage.fromURL(url).then((img) => {
      const canvas = canvasInstanceRef.current!;
      const containerPadding = (window.innerWidth < 768 ? 32 : 48); 
      const ratio = Math.min((containerRef.current!.clientWidth - containerPadding) / img.width, (containerRef.current!.clientHeight - containerPadding) / img.height);
      
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
      // Center at 50%, 50%
      img.set('left', scaledW / 2);
      img.set('top', scaledH / 2);
      
      img.set('selectable', false);
      img.set('evented', false);
      
      // Clear existing background
      canvas.getObjects().filter(o => o.name === 'background').forEach(o => canvas.remove(o));
      img.set('name', 'background');
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
      
      setHasBackground(true); setBgUrl(url); setActiveTool('background');

      // Ensure rendering after layout changes
      setTimeout(() => {
        if (canvasInstanceRef.current) {
          canvasInstanceRef.current.requestRender();
        }
      }, 100);
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

  const panelProps = {
    layers: layers.filter(l => l.name !== 'background'), 
    selectLayer,
    activeTool, hasBackground, bgUrl, setBgUrl,
    handleImageUpload: (info: UploadChangeParam<UploadFile>) => {
      const file = info.file.originFileObj;
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => setBackgroundImage(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    },
    setBackgroundImage,
    addText: () => {
      if (!canvasInstanceRef.current) return;
      const canvasW = workspaceSize.width || 400;
      const text = new Textbox('텍스트를 입력하세요', { 
        // Center of workspace
        left: CANVAS_MARGIN + canvasW / 2, 
        top: CANVAS_MARGIN + workspaceSize.height / 2, 
        width: Math.min(canvasW * 0.8, 400), // Fixed width: 80% of canvas or max 400
        height: 100, // Fixed height
        fontSize: 40, 
        fill: '#ffffff', 
        stroke: '#000000', 
        strokeWidth: 2, 
        name: 'text'
      });
      canvasInstanceRef.current.add(text); 
      canvasInstanceRef.current.setActiveObject(text); 
    },
    color, 
    updateProperty: (key: string, value: string | number) => {
      if (!canvasInstanceRef.current) return;
      // In my engine activeObject is single
      const active = canvasInstanceRef.current.getActiveObject();
      if (active) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          active.set(key as any, value);
          canvasInstanceRef.current.renderAll();
          if (key === 'fill') setColor(value as string);
          setLayers([...canvasInstanceRef.current.getObjects()]);
      }
    },
    activeObject,
    deleteActiveObject: () => {
      if (!canvasInstanceRef.current) return;
      const active = canvasInstanceRef.current.getActiveObject();
      if (active && active.name !== 'background') {
          canvasInstanceRef.current.remove(active);
          canvasInstanceRef.current.discardActiveObject();
      }
    },
    addShape: (type: 'rect' | 'circle') => {
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
    },
    downloadImage: async (format: 'png' | 'jpg' | 'webp' | 'pdf') => {
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
    },
    copyToClipboard: async () => {
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
    },
    changeZIndex: (direction: 'forward' | 'backward' | 'front' | 'back') => {
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
    }
  };

  return (
    <Layout className="h-screen overflow-hidden bg-white relative">
      {contextHolder}
      <MainHeader />
      
      <div className="flex-1 flex overflow-hidden relative">
        <EditorLayout
          sidebar={
            <div className="hidden md:flex flex-col h-full w-[400px] bg-white border-r border-slate-200 shrink-0 relative z-20">
              <MemeToolbar 
                activeTool={activeTool} 
                setActiveTool={handleToolClick}
                hasBackground={hasBackground}
              />
              <div className="flex-1 overflow-hidden">
                <MemePropertyPanel {...panelProps} />
              </div>
            </div>
          }
        >
          <div 
            className="flex-1 flex flex-col overflow-hidden order-1 md:order-2 relative"
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName.toLowerCase() === 'canvas') return;
              if (canvasInstanceRef.current) { 
                  canvasInstanceRef.current.discardActiveObject(); 
              }
              if (window.innerWidth < 768) setIsPanelOpen(false);
            }}
          >
              <MemeCanvas 
                canvasRef={canvasRef} 
                containerRef={containerRef} 
                hasBackground={hasBackground}
                undo={undo}
                redo={redo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
              />
          </div>
        </EditorLayout>

        <div 
          className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col justify-end" 
          style={{ height: '100vh' }}
          onClick={(e) => e.stopPropagation()}
        >
            <div 
              className={`bg-white border-t border-slate-200 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out rounded-t-3xl overflow-hidden pointer-events-auto ${isPanelOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
              style={{ height: '45vh' }}
            >
                <div className="h-10 flex items-center justify-center bg-white cursor-pointer border-b border-slate-50 shrink-0" onClick={() => setIsPanelOpen(false)}>
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>
                <div className="h-full overflow-hidden" style={{ height: 'calc(45vh - 40px)' }}>
                    <MemePropertyPanel {...panelProps} />
                </div>
            </div>

            <div className="bg-white border-t border-slate-100 relative z-10 pointer-events-auto" style={{ height: '80px' }}>
                <MemeToolbar activeTool={activeTool} setActiveTool={handleToolClick} hasBackground={hasBackground} />
            </div>
        </div>
      </div>
    </Layout>
  );
};

export default MemeEditor;