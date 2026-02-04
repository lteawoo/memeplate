import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Layout, message } from 'antd';

import MainHeader from './layout/MainHeader';
import EditorLayout from './editor/EditorLayout';
import MemeToolbar, { ToolType } from './editor/MemeToolbar';
import MemePropertyPanel from './editor/MemePropertyPanel';
import MemeCanvas from './editor/MemeCanvas';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EyeDropper: any;
  }
}

const MemeEditor: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false); // Closed by default on entry
  
  // Selection State
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [isShapeSelected, setIsShapeSelected] = useState(false);

  // Property State
  const [color, setColor] = useState('#ffffff'); 
  const [fontSize, setFontSize] = useState(40);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [brushSize, setBrushSize] = useState(10);
  const [bgUrl, setBgUrl] = useState('');
  const [hasBackground, setHasBackground] = useState(false);

  // --------------------------------------------------------------------------
  // Canvas & Logic (Keep previous logic)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600, height: 600, backgroundColor: '#ffffff', preserveObjectStacking: true,
    });
    fabricRef.current = canvas;
    const handleSelection = () => {
      const selected = canvas.getActiveObject();
      setActiveObject(selected || null);
      if (selected) {
        setIsPanelOpen(true); // Auto-open on selection
        if (selected instanceof fabric.IText) {
          setIsTextSelected(true); setIsShapeSelected(false); setActiveTool('text');
          setColor(selected.fill as string); setFontSize(selected.fontSize || 40); setStrokeWidth(selected.strokeWidth || 3);
        } 
        else if (selected instanceof fabric.Rect || selected instanceof fabric.Circle) {
          setIsTextSelected(false); setIsShapeSelected(true); setActiveTool('shapes');
          setColor(selected.fill as string);
        }
      }
    };
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    return () => { canvas.dispose(); fabricRef.current = null; };
  }, []);

  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    if (activeTool === 'brush') {
      canvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(canvas);
      brush.width = brushSize; brush.color = color;
      canvas.freeDrawingBrush = brush;
    } else { canvas.isDrawingMode = false; }
  }, [activeTool, brushSize, color]);

  const setBackgroundImage = (url: string) => {
    if (!fabricRef.current) return;
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      const canvas = fabricRef.current!;
      const containerPadding = window.innerWidth < 768 ? 32 : 128; 
      const ratio = Math.min((containerRef.current!.clientWidth - containerPadding) / img.width!, (containerRef.current!.clientHeight - containerPadding) / img.height!);
      canvas.setDimensions({ width: img.width! * ratio, height: img.height! * ratio });
      img.set({ scaleX: ratio, scaleY: ratio, originX: 'left', originY: 'top' });
      canvas.backgroundImage = img; canvas.renderAll();
      setHasBackground(true); setBgUrl(url); setActiveTool('background');
    });
  };

  const handleToolClick = (tool: ToolType) => {
    if (activeTool === tool && window.innerWidth < 768) {
      setIsPanelOpen(!isPanelOpen); // Toggle folding on mobile
    } else {
      setActiveTool(tool);
      setIsPanelOpen(true);
    }
  };

  // --------------------------------------------------------------------------
  // Common Functions (addText, addShape, updateProperty, etc. - mapped to props)
  // --------------------------------------------------------------------------
  const panelProps = {
    activeTool, hasBackground, bgUrl, setBgUrl,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleImageUpload: (info: any) => {
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
      const text = new fabric.IText('TOP TEXT', { left: fabricRef.current.width!/2, top: 100, fontFamily: 'Impact', fontSize: 50, fill: '#ffffff', stroke: '#000000', strokeWidth: 3, originX: 'center', originY: 'center' });
      fabricRef.current.add(text); fabricRef.current.setActiveObject(text); fabricRef.current.renderAll();
    },
    isTextSelected, color, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateProperty: (key: string, value: any) => {
      if (!fabricRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricRef.current.getActiveObjects().forEach(obj => obj.set(key as any, value));
      fabricRef.current.renderAll();
      if (key === 'fill') setColor(value);
      if (key === 'fontSize') setFontSize(value);
      if (key === 'strokeWidth') setStrokeWidth(value);
    },
    activateEyedropper: async () => {
      if (!window.EyeDropper) return;
      const result = await new window.EyeDropper().open();
      setColor(result.sRGBHex);
      if (activeObject) {
         fabricRef.current?.getActiveObjects().forEach(obj => obj.set('fill', result.sRGBHex));
         fabricRef.current?.renderAll();
      }
    },
    fontSize, activeObject, strokeWidth,
    deleteActiveObject: () => {
      fabricRef.current?.getActiveObjects().forEach(obj => fabricRef.current?.remove(obj));
      fabricRef.current?.discardActiveObject(); fabricRef.current?.renderAll();
    },
    addShape: (type: 'rect' | 'circle') => {
      if (!fabricRef.current) return;
      const common = { left: fabricRef.current.width!/2, top: fabricRef.current.height!/2, fill: color, originX: 'center' as const, originY: 'center' as const };
      const shape = type === 'rect' ? new fabric.Rect({...common, width: 100, height: 100}) : new fabric.Circle({...common, radius: 50});
      fabricRef.current.add(shape); fabricRef.current.setActiveObject(shape); fabricRef.current.renderAll();
    },
    isShapeSelected, brushSize, setBrushSize, setColor,
    downloadImage: async (format: 'png' | 'jpg' | 'webp' | 'pdf') => {
      if (!fabricRef.current) return;
      
      const canvas = fabricRef.current;
      
      if (format === 'pdf') {
        try {
          messageApi.loading('PDF 생성 중...');
          const { default: jsPDF } = await import('jspdf');
          // High quality multiplier for clearer PDF
          const imgData = canvas.toDataURL({ format: 'png', multiplier: 2 });
          const pdf = new jsPDF({
            orientation: canvas.width! > canvas.height! ? 'landscape' : 'portrait',
            unit: 'px',
            format: [canvas.width!, canvas.height!]
          });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width!, canvas.height!);
          pdf.save(`meme-${Date.now()}.pdf`);
          messageApi.success('PDF 다운로드 완료');
        } catch (error) {
          console.error(error);
          messageApi.error('PDF 생성에 실패했습니다');
        }
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
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        messageApi.success('클립보드에 복사되었습니다');
      } catch (err) {
        console.error('Failed to copy: ', err);
        messageApi.error('복사에 실패했습니다');
      }
    }
  };

  return (
    <Layout className="h-screen overflow-hidden bg-white relative">
      {contextHolder}
      <MainHeader />
      
      <div className="flex-1 flex overflow-hidden relative">
        <EditorLayout
          sidebar={
            <div className="flex flex-col md:flex-row h-auto md:h-full w-full bg-white border-t md:border-t-0 md:border-r border-slate-200 order-2 md:order-1 shrink-0 md:w-[420px] relative z-20">
              {/* Desktop Toolbar & Panel */}
              <div className="hidden md:flex flex-row h-full w-full">
                <MemeToolbar activeTool={activeTool} setActiveTool={handleToolClick} />
                <div className="flex-1 overflow-hidden">
                    <MemePropertyPanel {...panelProps} />
                </div>
              </div>
            </div>
          }
        >
          <div 
            className="flex-1 flex flex-col overflow-hidden order-1 md:order-2 relative"
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName.toLowerCase() === 'canvas') return;
              if (window.innerWidth < 768) setIsPanelOpen(false);
            }}
          >
              <MemeCanvas canvasRef={canvasRef} containerRef={containerRef} hasBackground={hasBackground} />
          </div>
        </EditorLayout>

        {/* Mobile Integrated Bottom UI - Fixed to the Screen Bottom, Outside of EditorLayout */}
        <div 
          className="md:hidden fixed bottom-0 left-0 right-0 z-[9999]" 
          onClick={(e) => e.stopPropagation()}
        >
            {/* Panel Area */}
            <div 
              className={`bg-white border-t border-slate-200 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out rounded-t-3xl overflow-hidden ${isPanelOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}
              style={{ height: '45vh' }}
            >
                <div 
                  className="h-10 flex items-center justify-center bg-white cursor-pointer border-b border-slate-50"
                  onClick={() => setIsPanelOpen(false)}
                >
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>
                <div className="overflow-y-auto" style={{ height: 'calc(45vh - 40px)' }}>
                    <MemePropertyPanel {...panelProps} />
                </div>
            </div>

            {/* Toolbar Area */}
            <div className="bg-white border-t border-slate-100 relative z-10" style={{ height: '80px' }}>
                <MemeToolbar activeTool={activeTool} setActiveTool={handleToolClick} />
            </div>
        </div>
      </div>
    </Layout>
  );
};

export default MemeEditor;
