import React from 'react';
import { Layout, Typography, theme, Spin } from 'antd';
import Icon from '@mdi/react';
import { mdiImage } from '@mdi/js';
import { Canvas, Textbox } from '../../core/canvas';
import { resolveTextLayout } from '../../core/canvas/textLayout';
import { MAX_CANVAS_AREA_PX, MAX_CANVAS_EDGE_PX } from '../../constants/canvasLimits';

const { Content } = Layout;
const { Title, Text } = Typography;

interface MemeCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  hasBackground: boolean;
  editingTextId?: string | null;
  completeTextEdit?: (id: string, newText: string) => void;
  canvasInstance?: Canvas | null;
  workspaceSize?: { width: number; height: number };
  isBackgroundLoading?: boolean;
}

const MemeCanvas: React.FC<MemeCanvasProps> = ({ 
  canvasRef, 
  containerRef, 
  viewportRef,
  hasBackground,
  editingTextId,
  completeTextEdit,
  canvasInstance,
  workspaceSize,
  isBackgroundLoading = false
}) => {
  const { token } = theme.useToken();
  const [editingText, setEditingText] = React.useState('');
  const [editingOriginalText, setEditingOriginalText] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const editCompletingRef = React.useRef(false);
  const canvasViewportRef = React.useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });
  const [canvasCssSize, setCanvasCssSize] = React.useState({ width: 0, height: 0 });
  const [canvasCssOffset, setCanvasCssOffset] = React.useState({ left: 0, top: 0 });

  const editingObject = React.useMemo(() => {
    if (!editingTextId || !canvasInstance) return null;
    return canvasInstance.getObjectById(editingTextId) as Textbox;
  }, [editingTextId, canvasInstance]);

  const intrinsicWidth = workspaceSize?.width || 0;
  const intrinsicHeight = workspaceSize?.height || 0;
  const [canvasBorderSize, setCanvasBorderSize] = React.useState({ width: 0, height: 0 });
  const isMobileViewport = viewportSize.width < 768;

  const displayScale = React.useMemo(() => {
    if (!intrinsicWidth || !intrinsicHeight || !viewportSize.width || !viewportSize.height) {
      return 1;
    }
    const usableWidth = Math.max(1, viewportSize.width - canvasBorderSize.width);
    if (isMobileViewport) {
      return Math.min(1, usableWidth / intrinsicWidth);
    }
    const usableHeight = Math.max(1, viewportSize.height - canvasBorderSize.height);
    const viewportScale = Math.min(
      usableWidth / intrinsicWidth,
      usableHeight / intrinsicHeight
    );
    return Math.min(1, viewportScale);
  }, [intrinsicWidth, intrinsicHeight, viewportSize.width, viewportSize.height, canvasBorderSize.width, canvasBorderSize.height, isMobileViewport]);

  const usableViewportWidth = Math.max(1, viewportSize.width - canvasBorderSize.width);
  const usableViewportHeight = Math.max(1, viewportSize.height - canvasBorderSize.height);

  const displayWidth = intrinsicWidth
    ? (isMobileViewport
        ? Math.max(1, Math.floor(intrinsicWidth * displayScale))
        : Math.min(usableViewportWidth, Math.max(1, Math.floor(intrinsicWidth * displayScale))))
    : 0;
  const displayHeight = intrinsicHeight
    ? (isMobileViewport
        ? Math.max(1, Math.floor(intrinsicHeight * displayScale))
        : Math.min(usableViewportHeight, Math.max(1, Math.floor(intrinsicHeight * displayScale))))
    : 0;

  React.useEffect(() => {
    if (!canvasInstance) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const upscale = Math.max(1, displayScale);
    const targetScale = Math.min(4, dpr * upscale);
    const intrinsicArea = Math.max(1, intrinsicWidth * intrinsicHeight);
    const edgeCap = intrinsicWidth && intrinsicHeight
      ? Math.min(
          MAX_CANVAS_EDGE_PX / Math.max(1, intrinsicWidth),
          MAX_CANVAS_EDGE_PX / Math.max(1, intrinsicHeight)
        )
      : 1;
    const areaCap = Math.sqrt(MAX_CANVAS_AREA_PX / intrinsicArea);
    const safeScale = Math.max(0.1, Math.min(targetScale, edgeCap, areaCap));
    canvasInstance.setRenderScale(safeScale);
  }, [canvasInstance, displayScale, intrinsicWidth, intrinsicHeight]);

  React.useEffect(() => {
    const layoutContainer = viewportRef?.current ?? containerRef.current;
    const contentContainer = containerRef.current;
    if (!layoutContainer || !contentContainer) return;

    const updateViewportSize = () => {
      const style = window.getComputedStyle(contentContainer);
      const paddingX = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
      const paddingY = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
      const windowViewportWidth = Math.round(window.visualViewport?.width ?? window.innerWidth);
      const isMobileWindow = windowViewportWidth < 768;
      const next = {
        width: Math.max(
          0,
          Math.round((isMobileWindow ? windowViewportWidth : layoutContainer.clientWidth) - paddingX)
        ),
        height: Math.max(0, Math.round(layoutContainer.clientHeight - paddingY))
      };
      setViewportSize((prev) => {
        if (prev.width === next.width && prev.height === next.height) {
          return prev;
        }
        return next;
      });
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(layoutContainer);
    window.addEventListener('resize', updateViewportSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateViewportSize);
    };
  }, [containerRef, viewportRef]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const style = window.getComputedStyle(canvas);
    const borderX = (Number.parseFloat(style.borderLeftWidth) || 0) + (Number.parseFloat(style.borderRightWidth) || 0);
    const borderY = (Number.parseFloat(style.borderTopWidth) || 0) + (Number.parseFloat(style.borderBottomWidth) || 0);
    setCanvasBorderSize({
      width: Math.round(borderX),
      height: Math.round(borderY)
    });
  }, [canvasRef, hasBackground]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasCssSize = () => {
      const rect = canvas.getBoundingClientRect();
      const viewportRect = canvasViewportRef.current?.getBoundingClientRect();
      setCanvasCssSize({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height)
      });
      setCanvasCssOffset({
        left: viewportRect ? rect.left - viewportRect.left : 0,
        top: viewportRect ? rect.top - viewportRect.top : 0
      });
    };

    updateCanvasCssSize();
    const observer = new ResizeObserver(updateCanvasCssSize);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [canvasRef, displayWidth, displayHeight, hasBackground]);

  React.useEffect(() => {
    if (editingObject) {
      setEditingText(editingObject.text);
      setEditingOriginalText(editingObject.text);
      editCompletingRef.current = false;
      // Use setTimeout to ensure the textarea is rendered before focusing
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [editingObject]);

  const getLuminance = (hexColor: string) => {
    const raw = hexColor.replace('#', '').trim();
    const normalized = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return 0.5;
    const r = parseInt(normalized.slice(0, 2), 16) / 255;
    const g = parseInt(normalized.slice(2, 4), 16) / 255;
    const b = parseInt(normalized.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const completeEditing = (text: string) => {
    if (!editingTextId || !completeTextEdit || editCompletingRef.current) return;
    editCompletingRef.current = true;
    completeTextEdit(editingTextId, text);
    requestAnimationFrame(() => {
      editCompletingRef.current = false;
    });
  };

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
    const left = canvasCssOffset.left + editingObject.left * scaleX - width / 2;
    const top = canvasCssOffset.top + editingObject.top * scaleY - height / 2;
    
    const measureCtx = document.createElement('canvas').getContext('2d');
    const layout = measureCtx ? resolveTextLayout(measureCtx, {
      text: editingText,
      width: editingObject.width,
      height: editingObject.height,
      fontSize: editingObject.fontSize,
      fontFamily: editingObject.fontFamily,
      fontWeight: editingObject.fontWeight,
      fontStyle: editingObject.fontStyle,
      lineHeight: editingObject.lineHeight,
      verticalAlign: editingObject.verticalAlign
    }) : null;
    const fittedLogicalFontSize = layout?.fontSize || editingObject.fontSize || 40;
    const displayFontSize = Math.max(8, fittedLogicalFontSize * editingObject.scaleY * scaleY);
    const contentHeight = (layout?.totalHeight || 0) * editingObject.scaleY * scaleY;
    const verticalPadding =
      editingObject.verticalAlign === 'middle'
        ? Math.max(0, (height - contentHeight) / 2)
        : editingObject.verticalAlign === 'bottom'
          ? Math.max(0, height - contentHeight)
          : 0;
    const textColor = editingObject.fill || '#000000';
    const luminance = getLuminance(textColor);
    const contrastBg = luminance > 0.6 ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.24)';
    const contrastShadow = luminance > 0.6 ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 3px rgba(255,255,255,0.8)';

    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${displayFontSize}px`,
      color: textColor,
      textAlign: editingObject.textAlign || ('center' as const),
      lineHeight: editingObject.lineHeight || 1.2,
      background: contrastBg,
      border: '1px dashed rgba(37, 99, 235, 0.8)',
      outline: 'none',
      borderRadius: '6px',
      resize: 'none' as const,
      overflow: 'hidden',
      paddingTop: `${verticalPadding}px`,
      paddingRight: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px',
      margin: 0,
      zIndex: 1000,
      transform: `rotate(${editingObject.angle}deg)`,
      transformOrigin: 'center center',
      fontFamily: editingObject.fontFamily || 'Arial',
      fontWeight: editingObject.fontWeight || 'normal',
      fontStyle: editingObject.fontStyle || 'normal',
      textShadow: contrastShadow,
      caretColor: luminance > 0.6 ? '#ffffff' : '#111827',
      boxSizing: 'border-box' as const
    };
  };

  return (
    <Content 
      className="flex-1 min-h-0 min-w-0 relative flex flex-col items-center justify-center bg-white p-4 md:p-6 overflow-hidden" 
      ref={containerRef}
      style={{ touchAction: 'none' }}
    >
      {/* Canvas Container - Always in DOM but doesn't affect layout if no background */}
      <div 
        ref={canvasViewportRef}
        className={`relative flex items-center justify-center overflow-hidden ${hasBackground ? 'opacity-100 scale-100 w-full h-full' : 'opacity-0 scale-95 pointer-events-none absolute w-0 h-0'}`}
        style={{ fontSize: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
         <canvas 
            ref={canvasRef} 
            className="border border-slate-100 shadow-sm bg-white"
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
               completeEditing(editingText);
             }}
             onKeyDown={(e) => {
               if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                 e.preventDefault();
                 completeEditing(editingText);
               }
               if (e.key === 'Escape') {
                 e.preventDefault();
                 setEditingText(editingOriginalText);
                 completeEditing(editingOriginalText);
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

      {isBackgroundLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
          <Spin size="large" />
        </div>
      )}
    </Content>
  );
};

export default MemeCanvas;
