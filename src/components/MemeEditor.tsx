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
  Tabs, 
  Tooltip, 
  theme,
  Empty,
  Tag
} from 'antd';
import Icon from '@mdi/react';
import { 
  mdiImage, 
  mdiFormatColorText, 
  mdiCloudUpload, 
  mdiLinkVariant, 
  mdiPlus, 
  mdiDelete, 
  mdiDownload 
} from '@mdi/js';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MemeEditor: React.FC = () => {
  const { token } = theme.useToken();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeObject, setActiveObject] = useState<fabric.IText | null>(null);
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(40);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [bgUrl, setBgUrl] = useState('');
  const [hasBackground, setHasBackground] = useState(false);

  // 캔버스 초기화 및 정리
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
      if (selected && selected instanceof fabric.IText) {
        setActiveObject(selected);
        setTextColor(selected.fill as string);
        setFontSize(selected.fontSize || 40);
        setStrokeWidth(selected.strokeWidth || 3);
      } else {
        setActiveObject(null);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setActiveObject(null));

    // Delete key event
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.getActiveObject()) {
        const active = canvas.getActiveObject();
        if (active && !(active as any).isEditing) {
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

  // 텍스트 추가 기능 (밈 표준 스타일)
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
  };

  // 배경 이미지 설정 및 캔버스 크기 조정
  const fitCanvasToContainer = (canvas: fabric.Canvas, imgObj?: fabric.Image) => {
    if (!containerRef.current) return;

    const containerPadding = 128; // p-16 (64px) * 2
    const containerWidth = containerRef.current.clientWidth - containerPadding;
    const containerHeight = containerRef.current.clientHeight - containerPadding;

    // 이미지가 없으면 기본 크기 또는 컨테이너 크기 유지
    if (!imgObj) {
      // 배경 이미지가 없을 때도 캔버스가 너무 작아지지 않도록 설정
      return; 
    }

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
    
    // 중앙 정렬을 위한 좌표 계산 (선택 사항, 현재는 0,0)
    canvas.backgroundImage = imgObj;
    canvas.renderAll();
  };

  const setBackgroundImage = (url: string) => {
    if (!fabricRef.current) return;

    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      const canvas = fabricRef.current!;
      fitCanvasToContainer(canvas, img);
      setHasBackground(true);
      setBgUrl(url); // Store current URL for resizing reference if needed
    }).catch(() => {
      alert('이미지를 불러오는데 실패했습니다. URL을 확인해주세요.');
    });
  };

  // 윈도우 리사이즈 대응
  useEffect(() => {
    const handleResize = () => {
      if (fabricRef.current && fabricRef.current.backgroundImage && containerRef.current) {
        // 이미지가 있을 경우 다시 피팅
        const bgImage = fabricRef.current.backgroundImage as fabric.Image;
        fitCanvasToContainer(fabricRef.current, bgImage);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // 이미지 다운로드
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

  // ... (기존 updateTextStyle, deleteActiveObject 유지)

  // 텍스트 스타일 업데이트
  const updateTextStyle = (key: string, value: any) => {
    if (!activeObject || !fabricRef.current) return;
    activeObject.set(key as any, value);
    fabricRef.current.renderAll();

    if (key === 'fill') setTextColor(value);
    if (key === 'fontSize') setFontSize(value);
    if (key === 'strokeWidth') setStrokeWidth(value);
  };

  const deleteActiveObject = () => {
    if (!fabricRef.current) return;
    const active = fabricRef.current.getActiveObject();
    if (active) {
      fabricRef.current.remove(active);
      fabricRef.current.discardActiveObject();
      fabricRef.current.renderAll();
    }
  };

  const sidebarTabs = [
    {
      key: '1',
      label: (
        <span className="flex items-center gap-2">
          <Icon path={mdiImage} size={0.8} />
          배경
        </span>
      ),
      children: (
        <Space vertical className="w-full" size="large">
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
      ),
    },
    {
      key: '2',
      label: (
        <span className="flex items-center gap-2">
          <Icon path={mdiFormatColorText} size={0.8} />
          텍스트
        </span>
      ),
      children: (
        <Space vertical className="w-full" size="large">
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

          {activeObject ? (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <Text strong className="text-slate-700 text-base">텍스트 속성</Text>
                  <Tooltip title="삭제 (Del)">
                    <Button 
                      type="text" 
                      danger 
                      icon={<Icon path={mdiDelete} size={0.8} />} 
                      onClick={deleteActiveObject}
                      className="hover:bg-red-50 flex items-center justify-center"
                    />
                  </Tooltip>
                </div>
                
                <Divider className="my-0 border-slate-100" />

                <div>
                  <Text type="secondary" className="block mb-3 text-xs font-bold text-slate-500 uppercase">글자 색상</Text>
                  <ColorPicker 
                    value={textColor} 
                    onChange={(color) => updateTextStyle('fill', color.toHexString())} 
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
                    onChange={(val) => updateTextStyle('fontSize', val)} 
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
                    onChange={(val) => updateTextStyle('strokeWidth', val)} 
                    tooltip={{ open: false }}
                  />
                </div>
            </div>
          ) : (
            <div className="py-16 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description={
                  <Text type="secondary" className="text-slate-400">
                    {hasBackground ? "텍스트를 선택하여 편집하세요" : "배경을 먼저 추가하세요"}
                  </Text>
                } 
              />
            </div>
          )}
        </Space>
      ),
    }
  ];

  return (
    <Layout className="h-screen overflow-hidden bg-white">
      {/* Header: Clean text logo only */}
      <Header 
        className="flex items-center px-8 border-b border-slate-200"
        style={{ height: 72, background: '#ffffff', lineHeight: '72px' }}
      >
        <div className="flex items-center gap-3">
          <Title level={3} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px', color: '#1e293b' }}>
            Memeplate
          </Title>
        </div>
      </Header>

      <Layout>
        <Sider 
          width={360} 
          theme="light" 
          className="border-r border-slate-200 z-10 flex flex-col"
          style={{ background: '#ffffff' }}
        >
          {/* Flex column layout for Sider */}
          <div className="h-full flex flex-col">
            
            {/* Tabs Header */}
            <div className="px-6 pt-6 pb-2">
              <Tabs 
                defaultActiveKey="1" 
                items={sidebarTabs} 
                className="custom-tabs font-medium"
                centered
                tabBarStyle={{ marginBottom: 0 }}
              />
            </div>
            
            {/* Scrollable Content Area - Added padding here */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
              {/* Tab content is rendered here */}
            </div>

            {/* Floating Footer Area */}
            <div className="px-8 pb-8 pt-4 bg-white">
              <div className="pt-4 border-t border-slate-100">
                <Button 
                  type="primary" 
                  icon={<Icon path={mdiDownload} size={0.8} />} 
                  onClick={downloadImage}
                  size="large"
                  block
                  className="h-12 text-base font-bold shadow-lg shadow-blue-500/20 rounded-xl flex items-center justify-center gap-1"
                  disabled={!hasBackground}
                >
                  이미지 다운로드
                </Button>
              </div>
            </div>
          </div>
        </Sider>

        <Content 
          className="relative flex flex-col items-center justify-center bg-slate-50 p-12" 
          ref={containerRef}
          style={{ height: 'calc(100vh - 72px)' }}
        >
          {/* Canvas Container */}
          <div 
            className={`
              relative transition-all duration-300 ease-in-out
              ${hasBackground ? 'shadow-2xl opacity-100 scale-100' : 'opacity-0 scale-95 hidden'}
            `}
            style={{ fontSize: 0 }} // Remove slight spacing below canvas
          >
             <canvas ref={canvasRef} />
          </div>

          {/* Empty State / Dropzone */}
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
                  왼쪽 사이드바에서 이미지를 업로드하거나<br />URL을 입력하여 시작하세요
                </Text>
                
                <div className="flex gap-2 justify-center">
                  <Tag color="default" className="px-3 py-1 text-xs">JPG</Tag>
                  <Tag color="default" className="px-3 py-1 text-xs">PNG</Tag>
                  <Tag color="default" className="px-3 py-1 text-xs">WEBP</Tag>
                </div>
              </div>
            </div>
          )}

          {hasBackground && (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Text type="secondary" className="text-xs bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-gray-200/50">
                <span className="font-bold mr-1 text-blue-500">TIP:</span> 
                객체를 선택하고 <kbd className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 text-gray-600">Del</kbd> 키를 눌러 삭제할 수 있습니다.
              </Text>
            </div>
          )}
        </Content>
      </Layout>

      <style>{`
        .custom-tabs .ant-tabs-nav {
          margin-bottom: 0;
        }
        .ant-layout-header {
          line-height: 80px;
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