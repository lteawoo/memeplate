import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Layout, message } from 'antd';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload';

import MainHeader from './layout/MainHeader';
import EditorLayout from './editor/EditorLayout';
import MemeToolbar, { type ToolType } from './editor/MemeToolbar';
import MemePropertyPanel from './editor/MemePropertyPanel';
import MemeCanvas from './editor/MemeCanvas';

const MemeEditor: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false); 
  
  // Selection State
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [layers, setLayers] = useState<fabric.Object[]>([]);

  // Property State
  const [color, setColor] = useState('#ffffff'); 
  const [bgUrl, setBgUrl] = useState('');
  const [hasBackground, setHasBackground] = useState(false);

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
    if (isHistoryLocked.current || !fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    
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
    if (indexRef.current <= 0 || !fabricRef.current) return;
    isHistoryLocked.current = true;
    const newIndex = indexRef.current - 1;
    const prevState = historyRef.current[newIndex];
    fabricRef.current.loadFromJSON(JSON.parse(prevState)).then(() => {
        fabricRef.current?.renderAll();
        isHistoryLocked.current = false;
        setHistoryIndex(newIndex);
    });
  };

  const redo = () => {
    if (indexRef.current >= historyRef.current.length - 1 || !fabricRef.current) return;
    isHistoryLocked.current = true;
    const newIndex = indexRef.current + 1;
    const nextState = historyRef.current[newIndex];
    fabricRef.current.loadFromJSON(JSON.parse(nextState)).then(() => {
        fabricRef.current?.renderAll();
        isHistoryLocked.current = false;
        setHistoryIndex(newIndex);
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
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600, height: 600, backgroundColor: '#ffffff', preserveObjectStacking: true,
      targetFindTolerance: 15,
    });
    fabricRef.current = canvas;

    fabric.Object.prototype.set({
        transparentCorners: false,
        cornerColor: '#ffffff',
        cornerStrokeColor: '#2563eb',
        borderColor: '#2563eb',
        cornerSize: 12,
        padding: 20, 
        cornerStyle: 'circle',
        uniformScaling: false 
    });

    const initialJson = JSON.stringify(canvas.toJSON());
    setHistory([initialJson]);
    setHistoryIndex(0);

    const handleSelection = () => {
      const selected = canvas.getActiveObject();
      setActiveObject(selected || null);
      if (selected) {
        setIsPanelOpen(true); 
        setActiveTool('edit'); // Always stay in edit tool for all objects
        
        if (selected instanceof fabric.IText) {
          setColor(selected.fill as string); 
        } 
        else if (selected instanceof fabric.Rect || selected instanceof fabric.Circle) {
          setColor(selected.fill as string);
        }
      }
    };

    const handleUpdate = () => {
        saveHistory();
        setLayers([...canvas.getObjects()]);
    }

    canvas.on('mouse:down', (opt) => {
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

    return () => { canvas.dispose(); fabricRef.current = null; };
  }, []);

  const setBackgroundImage = (url: string) => {
    if (!fabricRef.current) return;
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      const canvas = fabricRef.current!;
      const containerPadding = window.innerWidth < 768 ? 32 : 48; 
      const ratio = Math.min((containerRef.current!.clientWidth - containerPadding) / img.width!, (containerRef.current!.clientHeight - containerPadding) / img.height!);
      canvas.setDimensions({ width: img.width! * ratio, height: img.height! * ratio });
      img.set({ scaleX: ratio, scaleY: ratio, originX: 'left', originY: 'top' });
      canvas.backgroundImage = img; canvas.renderAll();
      setHasBackground(true); setBgUrl(url); setActiveTool('background');
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

  const selectLayer = (obj: fabric.Object) => {
    if (!fabricRef.current) return;
    fabricRef.current.setActiveObject(obj);
    fabricRef.current.renderAll();
  };

  const panelProps = {
    layers, selectLayer,
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
      if (!fabricRef.current) return;
      const text = new fabric.IText('텍스트를 입력하세요', { 
        left: fabricRef.current.width!/2, 
        top: fabricRef.current.height!/2, 
        fontFamily: 'Impact', 
        fontSize: 40, 
        fill: '#ffffff', 
        stroke: '#000000', 
        strokeWidth: 2, 
        originX: 'center', 
        originY: 'center',
        uniformScaling: false
      });
      fabricRef.current.add(text); fabricRef.current.setActiveObject(text); fabricRef.current.renderAll();
    },
    color, 
    updateProperty: (key: string, value: string | number) => {
      if (!fabricRef.current) return;
      fabricRef.current.getActiveObjects().forEach(obj => obj.set(key as keyof fabric.Object, value));
      fabricRef.current.renderAll();
      if (key === 'fill') setColor(value as string);
      setLayers([...fabricRef.current.getObjects()]);
    },
    activeObject,
    deleteActiveObject: () => {
      fabricRef.current?.getActiveObjects().forEach(obj => fabricRef.current?.remove(obj));
      fabricRef.current?.discardActiveObject(); fabricRef.current?.renderAll();
    },
    addShape: (type: 'rect' | 'circle') => {
      if (!fabricRef.current) return;
      const common = { 
        left: fabricRef.current.width!/2, 
        top: fabricRef.current.height!/2, 
        fill: '#ffffff', 
        originX: 'center' as const, 
        originY: 'center' as const,
        uniformScaling: false
      };
      const shape = type === 'rect' ? new fabric.Rect({...common, width: 100, height: 100}) : new fabric.Circle({...common, radius: 50});
      fabricRef.current.add(shape); fabricRef.current.setActiveObject(shape); fabricRef.current.renderAll();
    },
    downloadImage: async (format: 'png' | 'jpg' | 'webp' | 'pdf') => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      if (format === 'pdf') {
        try {
          messageApi.loading('PDF 생성 중...');
          const { default: jsPDF } = await import('jspdf');
          const imgData = canvas.toDataURL({ format: 'png', multiplier: 2 });
          const pdf = new jsPDF({ orientation: canvas.width! > canvas.height! ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width!, canvas.height!] });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width!, canvas.height!);
          pdf.save(`meme-${Date.now()}.pdf`);
          messageApi.success('PDF 다운로드 완료');
        } catch (error) { console.error(error); messageApi.error('PDF 생성에 실패했습니다'); }
      } else {
        const mimeType = format === 'jpg' ? 'jpeg' : format;
        const link = document.createElement('a'); 
        link.download = `meme-${Date.now()}.${format}`;
        link.href = canvas.toDataURL({ format: mimeType, multiplier: 2 }); 
        link.click();
        messageApi.success('이미지 다운로드 시작');
      }
    },
    copyToClipboard: async () => {
      if (!fabricRef.current) return;
      try {
        const canvas = fabricRef.current;
        const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const blob = await (await fetch(dataURL)).blob();
        await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
        messageApi.success('클립보드에 복사되었습니다');
      } catch (err) { console.error('Failed to copy: ', err); messageApi.error('복사에 실패했습니다'); }
    },
    changeZIndex: (direction: 'forward' | 'backward' | 'front' | 'back') => {
      if (!fabricRef.current || !activeObject) return;
      const canvas = fabricRef.current;
      const obj = activeObject;
      
      switch(direction) {
        case 'forward': canvas.bringObjectForward(obj); break;
        case 'backward': canvas.sendObjectBackwards(obj); break;
        case 'front': canvas.bringObjectToFront(obj); break;
        case 'back': canvas.sendObjectToBack(obj); break;
      }
      canvas.renderAll();
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
              if (fabricRef.current) { fabricRef.current.discardActiveObject(); fabricRef.current.renderAll(); }
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
              style={{ height: activeObject ? '120px' : '45vh' }}
            >
                {!activeObject && (
                  <div className="h-10 flex items-center justify-center bg-white cursor-pointer border-b border-slate-50 shrink-0" onClick={() => setIsPanelOpen(false)}>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                  </div>
                )}
                <div className="h-full overflow-hidden" style={{ height: activeObject ? '120px' : 'calc(45vh - 40px)' }}>
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
