import React from 'react';
import { Layout, Typography, theme, Button, Tooltip } from 'antd';
import Icon from '@mdi/react';
import { mdiImage, mdiUndo, mdiRedo } from '@mdi/js';

const { Content } = Layout;
const { Title, Text } = Typography;

interface MemeCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  hasBackground: boolean;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const MemeCanvas: React.FC<MemeCanvasProps> = ({ 
  canvasRef, 
  containerRef, 
  hasBackground,
  undo,
  redo,
  canUndo,
  canRedo
}) => {
  const { token } = theme.useToken();

  return (
    <Content 
      className="flex-1 relative flex flex-col items-center justify-center bg-white p-4 md:p-6 overflow-hidden" 
      ref={containerRef}
      style={{ touchAction: 'none' }}
    >
      {/* Undo/Redo Controls */}
      {hasBackground && (
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-50 flex gap-2">
            <Tooltip title="실행 취소 (Ctrl+Z)">
                <Button 
                    shape="circle" 
                    icon={<Icon path={mdiUndo} size={0.8} />} 
                    onClick={undo} 
                    disabled={!canUndo}
                    size="large"
                    className="shadow-sm border border-slate-100 bg-white/90 backdrop-blur-sm hover:bg-white"
                />
            </Tooltip>
            <Tooltip title="다시 실행 (Ctrl+Y)">
                <Button 
                    shape="circle" 
                    icon={<Icon path={mdiRedo} size={0.8} />} 
                    onClick={redo} 
                    disabled={!canRedo}
                    size="large"
                    className="shadow-sm border border-slate-100 bg-white/90 backdrop-blur-sm hover:bg-white"
                />
            </Tooltip>
        </div>
      )}

      {/* Canvas Container - Always in DOM but doesn't affect layout if no background */}
      <div 
        className={`relative transition-all duration-300 flex items-center justify-center overflow-hidden ${hasBackground ? 'opacity-100 scale-100 w-full h-full' : 'opacity-0 scale-95 pointer-events-none absolute w-0 h-0'}`}
        style={{ fontSize: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
         <canvas 
            ref={canvasRef} 
            className="border border-slate-100 shadow-sm bg-white max-w-full max-h-full object-contain" 
            style={{ touchAction: 'none' }}
         />
      </div>

      {/* Empty State */}
      {!hasBackground && (
        <div 
          className="flex flex-col items-center justify-center w-full max-w-2xl h-64 md:h-96 border-4 border-dashed rounded-3xl transition-all duration-300 group hover:border-blue-400 hover:bg-blue-50/30"
          style={{ borderColor: token.colorBorderSecondary }}
        >
          <div className="text-center p-4 md:p-8 transition-transform duration-300 group-hover:scale-105">
            <div 
              className="w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-sm"
              style={{ backgroundColor: token.colorFillSecondary }}
            >
              <Icon path={mdiImage} size={window.innerWidth < 768 ? 1.5 : 2} color={token.colorPrimary} />
            </div>
            <Title level={window.innerWidth < 768 ? 4 : 3} className="mb-1 md:mb-2 text-gray-700">나만의 Memeplate를 만들어보세요</Title>
            <Text type="secondary" className="block mb-4 md:mb-8 text-sm md:text-lg">이미지 탭에서 이미지를 업로드하여 시작하세요</Text>
          </div>
        </div>
      )}
    </Content>
  );
};

export default MemeCanvas;
