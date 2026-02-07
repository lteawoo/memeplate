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
      className="flex-1 relative flex flex-col items-center justify-center bg-slate-50 p-4 md:p-8" 
      ref={containerRef}
      style={{ touchAction: 'none' }}
    >
      {/* Undo/Redo Controls */}
      {hasBackground && (
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10 flex gap-2">
            <Tooltip title="실행 취소 (Ctrl+Z)">
                <Button 
                    shape="circle" 
                    icon={<Icon path={mdiUndo} size={0.8} />} 
                    onClick={undo} 
                    disabled={!canUndo}
                    size="large"
                    className="shadow-md border-none bg-white/90 backdrop-blur-sm"
                />
            </Tooltip>
            <Tooltip title="다시 실행 (Ctrl+Y)">
                <Button 
                    shape="circle" 
                    icon={<Icon path={mdiRedo} size={0.8} />} 
                    onClick={redo} 
                    disabled={!canRedo}
                    size="large"
                    className="shadow-md border-none bg-white/90 backdrop-blur-sm"
                />
            </Tooltip>
        </div>
      )}

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
                              <Title level={3} className="mb-2 text-gray-700">나만의 Memeplate를 만들어보세요</Title>
                              <Text type="secondary" className="block mb-8 text-lg">              이미지 탭에서 이미지를 업로드하여 시작하세요
            </Text>
          </div>
        </div>
      )}
    </Content>
  );
};

export default MemeCanvas;
