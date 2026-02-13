import React from 'react';
import { Layout, Typography, theme } from 'antd';
import Icon from '@mdi/react';
import { mdiImage } from '@mdi/js';
import { Canvas, Textbox } from '../../core/canvas';

const { Content } = Layout;
const { Title, Text } = Typography;

interface MemeCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  hasBackground: boolean;
  editingTextId?: string | null;
  completeTextEdit?: (id: string, newText: string) => void;
  canvasInstance?: Canvas | null;
  workspaceSize?: { width: number; height: number };
  zoomMode?: 'fit' | 'manual';
  zoomPercent?: number;
  onZoomPercentChange?: (percent: number) => void;
  onWheelZoom?: (deltaY: number) => void;
}

const MemeCanvas: React.FC<MemeCanvasProps> = ({ 
  canvasRef, 
  containerRef, 
  hasBackground,
  editingTextId,
  completeTextEdit,
  canvasInstance,
  workspaceSize,
  zoomMode = 'fit',
  zoomPercent = 100,
  onZoomPercentChange,
  onWheelZoom
}) => {
  const { token } = theme.useToken();
  const [editingText, setEditingText] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const canvasViewportRef = React.useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });
  const [canvasCssSize, setCanvasCssSize] = React.useState({ width: 0, height: 0 });

  const editingObject = React.useMemo(() => {
    if (!editingTextId || !canvasInstance) return null;
    return canvasInstance.getObjectById(editingTextId) as Textbox;
  }, [editingTextId, canvasInstance]);

  const intrinsicWidth = workspaceSize?.width || 0;
  const intrinsicHeight = workspaceSize?.height || 0;

  const fitScale = React.useMemo(() => {
    if (!intrinsicWidth || !intrinsicHeight || !viewportSize.width || !viewportSize.height) {
      return 1;
    }
    return Math.min(viewportSize.width / intrinsicWidth, viewportSize.height / intrinsicHeight);
  }, [intrinsicWidth, intrinsicHeight, viewportSize.width, viewportSize.height]);

  const manualScale = Math.max(0.2, Math.min(4, zoomPercent / 100));
  const displayScale = zoomMode === 'fit' ? fitScale : manualScale;
  const displayWidth = intrinsicWidth ? Math.max(1, Math.round(intrinsicWidth * displayScale)) : 0;
  const displayHeight = intrinsicHeight ? Math.max(1, Math.round(intrinsicHeight * displayScale)) : 0;

  React.useEffect(() => {
    if (!canvasInstance) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const upscale = Math.max(1, displayScale);
    canvasInstance.setRenderScale(Math.min(4, dpr * upscale));
  }, [canvasInstance, displayScale]);

  React.useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;

    const updateViewportSize = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({
        width: Math.max(0, Math.round(rect.width)),
        height: Math.max(0, Math.round(rect.height))
      });
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasCssSize = () => {
      const rect = canvas.getBoundingClientRect();
      setCanvasCssSize({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height)
      });
    };

    updateCanvasCssSize();
    const observer = new ResizeObserver(updateCanvasCssSize);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [canvasRef, displayWidth, displayHeight, hasBackground, zoomMode]);

  React.useEffect(() => {
    if (!hasBackground) {
      onZoomPercentChange?.(100);
      return;
    }
    onZoomPercentChange?.(Math.max(1, Math.round(displayScale * 100)));
  }, [hasBackground, displayScale, onZoomPercentChange]);

  React.useEffect(() => {
    if (editingObject) {
      setEditingText(editingObject.text);
      // Use setTimeout to ensure the textarea is rendered before focusing
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [editingObject]);

  const getTextareaStyle = () => {
    if (!editingObject || !intrinsicWidth || !intrinsicHeight || !canvasCssSize.width || !canvasCssSize.height) {
      return { display: 'none' };
    }
    
    // Scale between logical and CSS pixels
    const scaleX = canvasCssSize.width / intrinsicWidth;
    const scaleY = canvasCssSize.height / intrinsicHeight;
    
    const width = editingObject.width * editingObject.scaleX * scaleX;
    const height = editingObject.height * editingObject.scaleY * scaleY;
    
    // Position (Canvas center-based logic to CSS top-left)
    const left = editingObject.left * scaleX - width / 2;
    const top = editingObject.top * scaleY - height / 2;
    
    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${editingObject.fontSize * editingObject.scaleY * scaleY}px`,
      color: editingObject.fill,
      textAlign: editingObject.textAlign || ('center' as const),
      lineHeight: editingObject.lineHeight || 1.2,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      resize: 'none' as const,
      overflow: 'hidden',
      padding: 0,
      margin: 0,
      zIndex: 1000,
      transform: `rotate(${editingObject.angle}deg)`,
      transformOrigin: 'center center',
      fontFamily: editingObject.fontFamily || 'Arial',
      fontWeight: editingObject.fontWeight || 'normal',
      fontStyle: editingObject.fontStyle || 'normal'
    };
  };

  return (
    <Content 
      className="flex-1 relative flex flex-col items-center justify-center bg-white p-4 md:p-6 overflow-hidden" 
      ref={containerRef}
      style={{ touchAction: 'none' }}
    >
      {/* Canvas Container - Always in DOM but doesn't affect layout if no background */}
      <div 
        ref={canvasViewportRef}
        className={`relative transition-all duration-300 flex items-center justify-center overflow-hidden ${hasBackground ? 'opacity-100 scale-100 w-full h-full' : 'opacity-0 scale-95 pointer-events-none absolute w-0 h-0'}`}
        style={{ fontSize: 0 }}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          onWheelZoom?.(e.deltaY);
        }}
      >
         <canvas 
            ref={canvasRef} 
            className="border border-slate-100 shadow-sm bg-white transition-[width,height] duration-200 ease-out"
            style={{ 
              touchAction: 'none',
              width: displayWidth ? `${displayWidth}px` : undefined,
              height: displayHeight ? `${displayHeight}px` : undefined
            }}
         />

         {/* Text Editing Overlay */}
         {editingObject && (
           <textarea
             ref={textareaRef}
             style={getTextareaStyle()}
             value={editingText}
             onChange={(e) => {
               setEditingText(e.target.value);
               editingObject.set('text', e.target.value);
               canvasInstance?.requestRender();
             }}
             onBlur={() => {
               if (editingTextId && completeTextEdit) {
                 completeTextEdit(editingTextId, editingText);
               }
             }}
             onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 textareaRef.current?.blur();
               }
               if (e.key === 'Escape') {
                 // Cancel: revert to original (we should probably store original text if we want true cancel)
                 textareaRef.current?.blur();
               }
             }}
           />
         )}
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
