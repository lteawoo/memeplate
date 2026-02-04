import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { 
  Layout, 
  Button, 
  Input, 
  Slider, 
  ColorPicker, 
  Upload, 
  Divider, 
  Space, 
  Typography, 
  Tooltip, 
  theme,
  Empty,
  Tag,
  Segmented
} from 'antd';
import Icon from '@mdi/react';
import { 
  mdiImage, 
  mdiFormatColorText, 
  mdiCloudUpload, 
  mdiLinkVariant, 
  mdiPlus, 
  mdiDelete, 
  mdiDownload,
  mdiShape,
  mdiEraser,
  mdiEyedropper,
  mdiRectangleOutline,
  mdiCircleOutline,
  mdiBrush
} from '@mdi/js';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

type ToolType = 'background' | 'text' | 'shapes' | 'eraser';

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
  
  // Eraser State
  const [eraserSize, setEraserSize] = useState(20);
  
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
        // Text Handling
        if (selected instanceof fabric.IText) {
          setIsTextSelected(true);
          setIsShapeSelected(false);
          setActiveTool('text'); // Auto-switch to Text tool
          
          setColor(selected.fill as string);
          setFontSize(selected.fontSize || 40);
          setStrokeWidth(selected.strokeWidth || 3);
        } 
        // Shape Handling (Single)
        else if (selected instanceof fabric.Rect || selected instanceof fabric.Circle) {
          setIsTextSelected(false);
          setIsShapeSelected(true);
          setActiveTool('shapes'); // Auto-switch to Shapes tool
          
          setColor(selected.fill as string);
        }
        // Multi-selection Handling (Group)
        else if (selected.type === 'activeSelection') {
             // Check if it contains shapes or texts or mixed
             // For simplicity, if it's not text-only, we treat it as generic/shapes for deletion/color
             setIsTextSelected(false);
             setIsShapeSelected(true);
             // Don't auto-switch tool aggressively on multi-select to avoid jumping, 
             // but if we are in 'background', maybe switch to 'shapes' or 'text'
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

    // Delete key event
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.getActiveObject()) {
        const active = canvas.getActiveObject();
        // Don't delete while editing text
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

    if (activeTool === 'eraser') {
      canvas.isDrawingMode = true;
      const eraserBrush = new fabric.PencilBrush(canvas);
      eraserBrush.width = eraserSize;
      eraserBrush.color = 'rgba(0,0,0,1)'; // Color doesn't matter much for destination-out
      (eraserBrush as any).globalCompositeOperation = 'destination-out';
      canvas.freeDrawingBrush = eraserBrush;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [activeTool, eraserSize]);

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
      // Switch to background tool to confirm
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
      fill: color, // Use current selected color
      originX: 'center',
      originY: 'center',
      cornerColor: token.colorPrimary,
      cornerStyle: 'circle',
      transparentCorners: false,
      uniformScaling: false, // Allow free resizing (aspect ratio change)
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
  // Common Modifications (Color, Size, etc.)
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

  // --------------------------------------------------------------------------
  // Eyedropper
  // --------------------------------------------------------------------------
  const activateEyedropper = async () => {
    if (!window.EyeDropper) {
        // Fallback or alert
        alert("이 브라우저는 스포이드 API를 지원하지 않습니다. (Chrome/Edge 권장)");
        return;
    }
    
    try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const pickedColor = result.sRGBHex;
        
        setColor(pickedColor);
        
        // If an object is selected, apply immediately
        if (activeObject) {
            updateProperty('fill', pickedColor);
        }
    } catch (e) {
        // User canceled or error
        console.log('Eyedropper canceled');
    }
  };

  // --------------------------------------------------------------------------
  // Image Download
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // UI Components
  // --------------------------------------------------------------------------
  
  const renderPanelContent = () => {
    switch(activeTool) {
      case 'background':
        return (
          <Space vertical className="w-full" size="large">
            <Title level={5} className="m-0">배경 설정</Title>
            <div>
              <Text strong className="block mb-3 text-slate-700">이미지 업로드</Text>
              <Upload.Dragger
                accept="image/*"
                showUploadList={false}
                customRequest={({ onSuccess }) => onSuccess?.('ok')}
                onChange={handleImageUpload}
                className="bg-slate-50 hover:bg-slate-100 transition-colors border-slate-200"
                style={{ padding: '24px 0', border: '2px dashed #e2e8f0' }}
              >
                <p className="flex justify-center mb-2">
                  <Icon path={mdiCloudUpload} size={2} color={token.colorPrimary} />
                </p>
                <p className="ant-upload-text text-slate-600 font-medium mt-2">클릭 또는 드래그</p>
              </Upload.Dragger>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="h-px bg-slate-200 flex-1"></div>
               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">OR</span>
               <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            
            <div>
              <Text strong className="block mb-3 text-slate-700">외부 URL 로드</Text>
              <div className="flex flex-col gap-2">
                <Input 
                  prefix={<Icon path={mdiLinkVariant} size={0.8} className="text-slate-400" />}
                  placeholder="https://example.com/image.jpg" 
                  value={bgUrl}
                  onChange={(e) => setBgUrl(e.target.value)}
                  onPressEnter={() => bgUrl && setBackgroundImage(bgUrl)}
                  className="h-10 rounded-lg"
                />
                <Button 
                  onClick={() => bgUrl && setBackgroundImage(bgUrl)}
                  className="h-10 rounded-lg font-medium"
                  block
                >
                  적용
                </Button>
              </div>
            </div>
          </Space>
        );

      case 'text':
        return (
          <Space vertical className="w-full" size="large">
            <Title level={5} className="m-0">텍스트 편집</Title>
            <Button 
              type="primary" 
              icon={<Icon path={mdiPlus} size={0.8} />} 
              onClick={addText} 
              block
              size="large"
              disabled={!hasBackground}
              className="h-12 text-base font-semibold rounded-xl shadow-sm flex items-center justify-center gap-1"
            >
              텍스트 추가
            </Button>

            {isTextSelected ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                  <Divider className="my-0 border-slate-100" />

                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase">글자 색상</Text>
                        <Tooltip title="스포이드 (화면 색상 추출)">
                            <Button 
                                type="text" 
                                size="small"
                                icon={<Icon path={mdiEyedropper} size={0.7} />} 
                                onClick={activateEyedropper}
                            />
                        </Tooltip>
                    </div>
                    <ColorPicker 
                      value={color} 
                      onChange={(c) => updateProperty('fill', c.toHexString())} 
                      showText
                      className="w-full h-10"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase">글자 크기</Text>
                      <Text className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{fontSize}px</Text>
                    </div>
                    <Slider 
                      min={10} 
                      max={200} 
                      value={fontSize} 
                      onChange={(val) => updateProperty('fontSize', val)} 
                      tooltip={{ open: false }}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase">외곽선 두께</Text>
                      <Text className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{strokeWidth}px</Text>
                    </div>
                    <Slider 
                      min={0} 
                      max={15} 
                      value={strokeWidth} 
                      onChange={(val) => updateProperty('strokeWidth', val)} 
                      tooltip={{ open: false }}
                    />
                  </div>

                  <Button 
                    danger 
                    icon={<Icon path={mdiDelete} size={0.8} />} 
                    onClick={deleteActiveObject}
                    block
                    className="flex items-center justify-center gap-1"
                  >
                    선택 삭제
                  </Button>
              </div>
            ) : (
                <Empty description="텍스트를 선택하세요" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Space>
        );

      case 'shapes':
        return (
          <Space vertical className="w-full" size="large">
             <Title level={5} className="m-0">가리기 도구 (도형)</Title>
             <div className="grid grid-cols-2 gap-2">
                <Button 
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    onClick={() => addShape('rect')}
                    disabled={!hasBackground}
                >
                    <Icon path={mdiRectangleOutline} size={1.5} className="text-slate-500" />
                    <span className="text-xs text-slate-500">사각형</span>
                </Button>
                <Button 
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    onClick={() => addShape('circle')}
                    disabled={!hasBackground}
                >
                    <Icon path={mdiCircleOutline} size={1.5} className="text-slate-500" />
                    <span className="text-xs text-slate-500">원형</span>
                </Button>
             </div>

             {isShapeSelected ? (
                 <div className="space-y-6 animate-in fade-in duration-300">
                    <Divider className="my-0 border-slate-100" />
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase">채우기 색상</Text>
                            <Tooltip title="스포이드 (배경색 추출하여 가리기)">
                                <Button 
                                    type="text" 
                                    size="small"
                                    icon={<Icon path={mdiEyedropper} size={0.7} />} 
                                    onClick={activateEyedropper}
                                />
                            </Tooltip>
                        </div>
                        <ColorPicker 
                            value={color} 
                            onChange={(c) => updateProperty('fill', c.toHexString())} 
                            showText
                            className="w-full h-10"
                        />
                    </div>
                    <Button 
                        danger 
                        icon={<Icon path={mdiDelete} size={0.8} />} 
                        onClick={deleteActiveObject}
                        block
                        className="flex items-center justify-center gap-1"
                    >
                        선택 삭제
                    </Button>
                 </div>
             ) : (
                 <div className="text-center text-slate-400 mt-4 text-sm">
                     도형을 추가하여 불필요한<br/>텍스트나 영역을 가려보세요.
                 </div>
             )}
          </Space>
        );

      case 'eraser':
        return (
          <Space vertical className="w-full" size="large">
             <Title level={5} className="m-0">지우개</Title>
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <Text type="secondary" className="text-xs">
                    캔버스 위를 드래그하여 이미지를 지웁니다.
                </Text>
             </div>
             
             <div>
                <div className="flex justify-between items-center mb-3">
                  <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase">지우개 크기</Text>
                  <Text className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{eraserSize}px</Text>
                </div>
                <Slider 
                  min={5} 
                  max={100} 
                  value={eraserSize} 
                  onChange={setEraserSize} 
                  tooltip={{ open: false }}
                />
             </div>
          </Space>
        );
    }
  };

  const SidebarItem = ({ id, icon, label }: { id: ToolType, icon: string, label: string }) => (
    <Tooltip title={label} placement="right">
        <button
            onClick={() => setActiveTool(id)}
            className={`
                w-full aspect-square flex flex-col items-center justify-center gap-1
                transition-all duration-200 rounded-xl
                ${activeTool === id 
                    ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500 ring-offset-2' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
            `}
        >
            <Icon path={icon} size={1} />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    </Tooltip>
  );

  return (
    <Layout className="h-screen overflow-hidden bg-white">
      {/* Header */}
      <Header 
        className="flex items-center px-6 border-b border-slate-200 z-20 relative"
        style={{ height: 64, background: '#ffffff', lineHeight: '64px' }}
      >
        <div className="flex items-center gap-3">
          <Title level={4} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px', color: '#1e293b' }}>
            Memeplate
          </Title>
        </div>
      </Header>

      <Layout>
        {/* NEW SIDER STRUCTURE */}
        <Sider 
          width={380} 
          theme="light" 
          className="border-r border-slate-200 z-10 flex flex-row !bg-white"
        >
          {/* 1. Icon Toolbar (Leftmost, Narrow) */}
          <div className="w-20 h-full border-r border-slate-100 bg-white flex flex-col items-center py-6 gap-4 px-2 shadow-sm z-10">
            <SidebarItem id="background" icon={mdiImage} label="배경" />
            <SidebarItem id="text" icon={mdiFormatColorText} label="텍스트" />
            <SidebarItem id="shapes" icon={mdiShape} label="가리기" />
            <SidebarItem id="eraser" icon={mdiEraser} label="지우개" />
          </div>

          {/* 2. Properties Panel (Right, Wide) */}
          <div className="flex-1 h-full flex flex-col bg-white">
             {/* Content Area */}
             <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8">
                {renderPanelContent()}
             </div>

             {/* Footer Area */}
             <div className="px-6 pb-8 pt-4 border-t border-slate-100">
                <Button 
                  type="primary" 
                  icon={<Icon path={mdiDownload} size={0.8} />} 
                  onClick={downloadImage}
                  size="large"
                  block
                  className="h-12 text-base font-bold shadow-lg shadow-blue-500/20 rounded-xl flex items-center justify-center gap-1"
                  disabled={!hasBackground}
                >
                  다운로드
                </Button>
             </div>
          </div>
        </Sider>

        {/* Main Content (Canvas) */}
        <Content 
          className="relative flex flex-col items-center justify-center bg-slate-50 p-12" 
          ref={containerRef}
          style={{ height: 'calc(100vh - 64px)' }}
        >
          {/* Canvas Container */}
          <div 
            className={`
              relative transition-all duration-300 ease-in-out
              ${hasBackground ? 'shadow-2xl opacity-100 scale-100' : 'opacity-0 scale-95 hidden'}
            `}
            style={{ fontSize: 0 }}
          >
             <canvas ref={canvasRef} />
          </div>

          {/* Empty State */}
          {!hasBackground && (
            <div 
              className="flex flex-col items-center justify-center w-full max-w-2xl h-96 border-4 border-dashed rounded-3xl transition-all duration-300 group hover:border-blue-400 hover:bg-blue-50/30"
              style={{ borderColor: token.colorBorderSecondary }}
            >
              <div className="text-center p-8 transition-transform duration-300 group-hover:scale-105">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: token.colorFillSecondary }}
                >
                  <Icon path={mdiImage} size={2} color={token.colorPrimary} />
                </div>
                <Title level={3} className="mb-2 text-gray-700">나만의 밈을 만들어보세요</Title>
                <Text type="secondary" className="block mb-8 text-lg">
                  배경 탭에서 이미지를 업로드하여 시작하세요
                </Text>
                
                <div className="flex gap-2 justify-center">
                  <Tag color="default" className="px-3 py-1 text-xs">JPG</Tag>
                  <Tag color="default" className="px-3 py-1 text-xs">PNG</Tag>
                </div>
              </div>
            </div>
          )}
        </Content>
      </Layout>

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