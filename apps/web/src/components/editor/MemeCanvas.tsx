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
}

const MAX_DISPLAY_EDGE_PX = 800;
const MIN_TEXT_FONT_SIZE = 8;

const MemeCanvas: React.FC<MemeCanvasProps> = ({ 
  canvasRef, 
  containerRef, 
  hasBackground,
  editingTextId,
  completeTextEdit,
  canvasInstance,
  workspaceSize
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
  const intrinsicMaxEdge = Math.max(intrinsicWidth, intrinsicHeight, 1);

  const displayScale = React.useMemo(() => {
    if (!intrinsicWidth || !intrinsicHeight || !viewportSize.width || !viewportSize.height) {
      return 1;
    }
    const viewportScale = Math.min(
      viewportSize.width / intrinsicWidth,
      viewportSize.height / intrinsicHeight
    );
    const maxEdgeScale = MAX_DISPLAY_EDGE_PX / intrinsicMaxEdge;
    return Math.min(viewportScale, maxEdgeScale);
  }, [intrinsicWidth, intrinsicHeight, intrinsicMaxEdge, viewportSize.width, viewportSize.height]);

  const displayWidth = intrinsicWidth
    ? Math.max(1, Math.floor(intrinsicWidth * displayScale))
    : 0;
  const displayHeight = intrinsicHeight
    ? Math.max(1, Math.floor(intrinsicHeight * displayScale))
    : 0;

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

  const getFittedFontSize = (obj: Textbox, text: string) => {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return Math.max(obj.fontSize || 40, MIN_TEXT_FONT_SIZE);

    const safeWidth = Math.max(1, obj.width);
    const safeHeight = Math.max(1, obj.height);
    const baseSize = isFinite(obj.fontSize) ? obj.fontSize : 40;
    const lineHeight = obj.lineHeight || 1.2;

    const paragraphs = (text || '').split('\n');
    let currentFontSize = Math.max(baseSize, MIN_TEXT_FONT_SIZE);
    let iterations = 0;

    while (currentFontSize >= MIN_TEXT_FONT_SIZE && iterations < 100) {
      iterations += 1;
      ctx.font = `${obj.fontStyle || 'normal'} ${obj.fontWeight || 'normal'} ${currentFontSize}px ${obj.fontFamily || 'Arial'}`;

      const lines: string[] = [];
      let fitsWidth = true;

      for (const paragraph of paragraphs) {
        const words = paragraph.split(/\s+/);
        let currentLine = '';

        if (words.length === 0) {
          lines.push('');
          continue;
        }

        for (let i = 0; i < words.length; i += 1) {
          const word = words[i];
          const testLine = currentLine ? `${currentLine} ${word}` : word;

          if (ctx.measureText(word).width > safeWidth) {
            fitsWidth = false;
            break;
          }

          if (ctx.measureText(testLine).width > safeWidth && i > 0) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (!fitsWidth) {
          break;
        }

        lines.push(currentLine);
      }

      if (fitsWidth) {
        const totalHeight = lines.length * currentFontSize * lineHeight;
        if (totalHeight <= safeHeight || currentFontSize <= MIN_TEXT_FONT_SIZE) {
          return Math.max(currentFontSize, MIN_TEXT_FONT_SIZE);
        }
      }

      currentFontSize -= 1;
    }

    return MIN_TEXT_FONT_SIZE;
  };

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
    
    const fittedLogicalFontSize = getFittedFontSize(editingObject, editingText || editingObject.text);
    const displayFontSize = Math.max(
      12,
      fittedLogicalFontSize * editingObject.scaleY * scaleY
    );
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
      padding: '4px 6px',
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
      className="flex-1 min-w-0 relative flex flex-col items-center justify-center bg-white p-4 md:p-6 overflow-hidden" 
      ref={containerRef}
      style={{ touchAction: 'none' }}
    >
      {/* Canvas Container - Always in DOM but doesn't affect layout if no background */}
      <div 
        ref={canvasViewportRef}
        className={`relative transition-all duration-300 flex items-center justify-center overflow-hidden ${hasBackground ? 'opacity-100 scale-100 w-full h-full' : 'opacity-0 scale-95 pointer-events-none absolute w-0 h-0'}`}
        style={{ fontSize: 0 }}
        onClick={(e) => e.stopPropagation()}
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
    </Content>
  );
};

export default MemeCanvas;
