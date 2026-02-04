import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Layout, theme } from 'antd';

import MainHeader from './layout/MainHeader';
import EditorLayout from './editor/EditorLayout';
import MemeToolbar, { ToolType } from './editor/MemeToolbar';
import MemePropertyPanel from './editor/MemePropertyPanel';
import MemeCanvas from './editor/MemeCanvas';

declare global {
  interface Window {
    EyeDropper: any;
  }
}

const { Sider } = Layout;

const MemeEditor: React.FC = () => {
  const { token } = theme.useToken();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('background');
  
  // Selection State
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [isShapeSelected, setIsShapeSelected] = useState(false);

  // Property State
  const [color, setColor] = useState('#ffffff'); // Text or Shape fill
  const [fontSize, setFontSize] = useState(40);
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  // Brush State
  const [brushSize, setBrushSize] = useState(10);
  
  // Background State
  const [bgUrl, setBgUrl] = useState('');
  const [hasBackground, setHasBackground] = useState(false);

  // --------------------------------------------------------------------------
  // Canvas Initialization
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600,
      height: 600,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    const handleSelection = () => {
      const selected = canvas.getActiveObject();
      setActiveObject(selected || null);

      if (selected) {
        if (selected instanceof fabric.IText) {
          setIsTextSelected(true);
          setIsShapeSelected(false);
          setActiveTool('text');
          
          setColor(selected.fill as string);
          setFontSize(selected.fontSize || 40);
          setStrokeWidth(selected.strokeWidth || 3);
        } 
        else if (selected instanceof fabric.Rect || selected instanceof fabric.Circle) {
          setIsTextSelected(false);
          setIsShapeSelected(true);
          setActiveTool('shapes');
          
          setColor(selected.fill as string);
        }
        else if (selected.type === 'activeSelection') {
             setIsTextSelected(false);
             setIsShapeSelected(true);
             if (activeTool === 'background') setActiveTool('shapes');
        }
      } else {
        setIsTextSelected(false);
        setIsShapeSelected(false);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelection);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.getActiveObject()) {
        const active = canvas.getActiveObject();
        if (active && active instanceof fabric.IText && (active as any).isEditing) return;
        
        if (active) {
          canvas.remove(active);
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Tool Switching Logic
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    if (activeTool === 'brush') {
      canvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(canvas);
      brush.width = brushSize;
      brush.color = color;
      canvas.freeDrawingBrush = brush;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [activeTool, brushSize, color]);

  // --------------------------------------------------------------------------
  // Background Functions
  // --------------------------------------------------------------------------
  const fitCanvasToContainer = (canvas: fabric.Canvas, imgObj?: fabric.Image) => {
    if (!containerRef.current) return;

    const containerPadding = 128; 
    const containerWidth = containerRef.current.clientWidth - containerPadding;
    const containerHeight = containerRef.current.clientHeight - containerPadding;

    if (!imgObj) return;

    const ratio = Math.min(containerWidth / imgObj.width!, containerHeight / imgObj.height!);
    const newWidth = imgObj.width! * ratio;
    const newHeight = imgObj.height! * ratio;

    canvas.setDimensions({ width: newWidth, height: newHeight });
    
    imgObj.set({
      scaleX: ratio,
      scaleY: ratio,
      originX: 'left',
      originY: 'top',
    });
    
    canvas.backgroundImage = imgObj;
    canvas.renderAll();
  };

  const setBackgroundImage = (url: string) => {
    if (!fabricRef.current) return;

    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      const canvas = fabricRef.current!;
      fitCanvasToContainer(canvas, img);
      setHasBackground(true);
      setBgUrl(url); 
      setActiveTool('background');
    }).catch(() => {
      alert('이미지를 불러오는데 실패했습니다. URL을 확인해주세요.');
    });
  };

  const handleImageUpload = (info: any) => {
    const file = info.file.originFileObj;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setBackgroundImage(url);
    };
    reader.readAsDataURL(file);
  };

  // --------------------------------------------------------------------------
  // Text Functions
  // --------------------------------------------------------------------------
  const addText = () => {
    if (!fabricRef.current) return;

    const text = new fabric.IText('TOP TEXT', {
      left: fabricRef.current.width! / 2,
      top: 100,
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 50,
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 3,
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center',
      cornerColor: token.colorPrimary,
      cornerStyle: 'circle',
      transparentCorners: false,
      padding: 10,
    });

    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
    setActiveTool('text');
  };

  // --------------------------------------------------------------------------
  // Shape Functions
  // --------------------------------------------------------------------------
  const addShape = (type: 'rect' | 'circle') => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const center = {
      left: canvas.width! / 2,
      top: canvas.height! / 2
    };
    
    let shape;
    const commonProps = {
      left: center.left,
      top: center.top,
      fill: color, 
      originX: 'center' as const,
      originY: 'center' as const,
      cornerColor: token.colorPrimary,
      cornerStyle: 'circle' as const,
      transparentCorners: false,
      uniformScaling: false,
    };

    if (type === 'rect') {
      shape = new fabric.Rect({
        ...commonProps,
        width: 100,
        height: 100,
      });
    } else {
      shape = new fabric.Circle({
        ...commonProps,
        radius: 50,
      });
    }

    fabricRef.current.add(shape);
    fabricRef.current.setActiveObject(shape);
    fabricRef.current.renderAll();
    setActiveTool('shapes');
  };

  // --------------------------------------------------------------------------
  // Common Modifications
  // --------------------------------------------------------------------------
  const updateProperty = (key: string, value: any) => {
    if (!fabricRef.current) return;
    
    const activeObjects = fabricRef.current.getActiveObjects();
    if (activeObjects.length > 0) {
        activeObjects.forEach(obj => {
            obj.set(key as any, value);
        });
        fabricRef.current.renderAll();
    }

    if (key === 'fill') setColor(value);
    if (key === 'fontSize') setFontSize(value);
    if (key === 'strokeWidth') setStrokeWidth(value);
  };

  const deleteActiveObject = () => {
    if (!fabricRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
          fabricRef.current?.remove(obj);
      });
      fabricRef.current.discardActiveObject();
      fabricRef.current.renderAll();
    }
  };

  const activateEyedropper = async () => {
    if (!window.EyeDropper) {
        alert("이 브라우저는 스포이드 API를 지원하지 않습니다. (Chrome/Edge 권장)");
        return;
    }
    
    try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const pickedColor = result.sRGBHex;
        
        setColor(pickedColor);
        if (activeObject) {
            updateProperty('fill', pickedColor);
        }
    } catch (e) {
        console.log('Eyedropper canceled');
    }
  };

  const downloadImage = () => {
    if (!fabricRef.current) return;
    const dataURL = fabricRef.current.toDataURL({
      format: 'png',
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `meme-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <Layout className="h-screen overflow-hidden bg-white">
      <MainHeader />
      
      <EditorLayout
        sidebar={
          <Sider 
            width={420} 
            theme="light" 
            className="border-r border-slate-200 z-10 !bg-white"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div className="flex flex-row h-full w-full">
              <MemeToolbar activeTool={activeTool} setActiveTool={setActiveTool} />

              <MemePropertyPanel 
                activeTool={activeTool}
                hasBackground={hasBackground}
                bgUrl={bgUrl}
                setBgUrl={setBgUrl}
                handleImageUpload={handleImageUpload}
                setBackgroundImage={setBackgroundImage}
                addText={addText}
                isTextSelected={isTextSelected}
                color={color}
                updateProperty={updateProperty}
                activateEyedropper={activateEyedropper}
                fontSize={fontSize}
                activeObject={activeObject}
                strokeWidth={strokeWidth}
                deleteActiveObject={deleteActiveObject}
                addShape={addShape}
                isShapeSelected={isShapeSelected}
                brushSize={brushSize}
                setBrushSize={setBrushSize}
                setColor={setColor}
                downloadImage={downloadImage}
              />
            </div>
          </Sider>
        }
      >
        <MemeCanvas 
          canvasRef={canvasRef} 
          containerRef={containerRef} 
          hasBackground={hasBackground} 
        />
      </EditorLayout>

      <style>{`
        .ant-layout-sider-children {
            display: flex;
            flex-direction: row;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </Layout>
  );
};

export default MemeEditor;
