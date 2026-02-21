import React from 'react';
import Icon from '@mdi/react';
import { mdiImage } from '@mdi/js';
import { Canvas, Textbox } from '../../core/canvas';
import { resolveTextLayout } from '../../core/canvas/textLayout';
import { MAX_RENDER_CANVAS_AREA_PX, MAX_RENDER_CANVAS_EDGE_PX } from '../../constants/canvasLimits';
import { resolveCssVarColor } from '../../theme/theme';

const toRgba = (hexColor: string, alpha: number) => {
  const raw = hexColor.replace('#', '').trim();
  const normalized = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(54, 76, 117, ${alpha})`;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface MemeCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  hasBackground: boolean;
  editingTextId?: string | null;
  completeTextEdit?: (id: string, newText: string) => void;
  canvasInstance?: Canvas | null;
  workspaceSize?: { width: number; height: number };
  zoom?: number;
  isBackgroundLoading?: boolean;
  onUploadImage?: (file: File) => void;
  onZoomByWheelDelta?: (deltaY: number) => void;
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
  zoom = 1,
  isBackgroundLoading = false,
  onUploadImage,
  onZoomByWheelDelta,
}) => {
  const [editingText, setEditingText] = React.useState('');
  const [editingOriginalText, setEditingOriginalText] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const editCompletingRef = React.useRef(false);
  const canvasViewportRef = React.useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });
  const [canvasCssSize, setCanvasCssSize] = React.useState({ width: 0, height: 0 });
  const [canvasCssOffset, setCanvasCssOffset] = React.useState({ left: 0, top: 0 });
  const [viewportTransform, setViewportTransform] = React.useState({ zoom: 1, panX: 0, panY: 0 });
  const [isDragOverUpload, setIsDragOverUpload] = React.useState(false);
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [isPanningCanvas, setIsPanningCanvas] = React.useState(false);
  const panSessionRef = React.useRef<{ pointerId: number; clientX: number; clientY: number } | null>(null);
  const pendingZoomAnchorRef = React.useRef<{ x: number; y: number } | null>(null);
  const previousSafeZoomRef = React.useRef(zoom);

  const editingObject = React.useMemo(() => {
    if (!editingTextId || !canvasInstance) return null;
    return canvasInstance.getObjectById(editingTextId) as Textbox;
  }, [editingTextId, canvasInstance]);

  const intrinsicWidth = workspaceSize?.width || 0;
  const intrinsicHeight = workspaceSize?.height || 0;
  const [canvasBorderSize, setCanvasBorderSize] = React.useState({ width: 0, height: 0 });
  const isMobileViewport = viewportSize.width < 768;
  const viewportScreenWidth = Math.max(1, viewportSize.width - canvasBorderSize.width);
  const viewportScreenHeight = Math.max(1, viewportSize.height - canvasBorderSize.height);

  const fitScale = React.useMemo(() => {
    if (!intrinsicWidth || !intrinsicHeight || !viewportScreenWidth || !viewportScreenHeight) {
      return 1;
    }
    if (isMobileViewport) {
      return Math.max(0.01, viewportScreenWidth / intrinsicWidth);
    }
    const viewportScale = Math.min(
      viewportScreenWidth / intrinsicWidth,
      viewportScreenHeight / intrinsicHeight,
    );
    return Math.max(0.01, viewportScale);
  }, [
    intrinsicWidth,
    intrinsicHeight,
    viewportScreenWidth,
    viewportScreenHeight,
    isMobileViewport,
  ]);

  const safeZoom = React.useMemo(() => {
    if (!Number.isFinite(zoom) || zoom <= 0) return 1;
    return Math.max(0.25, Math.min(4, zoom));
  }, [zoom]);

  const stopCanvasPan = React.useCallback(() => {
    panSessionRef.current = null;
    setIsPanningCanvas(false);
  }, []);

  const resolveWheelZoomAnchor = React.useCallback((event: WheelEvent) => {
    const viewportNode = canvasViewportRef.current;
    if (!viewportNode || viewportScreenWidth <= 0 || viewportScreenHeight <= 0) return null;
    const rect = viewportNode.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const ratioX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const ratioY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    return {
      x: ratioX * viewportScreenWidth,
      y: ratioY * viewportScreenHeight
    };
  }, [viewportScreenHeight, viewportScreenWidth]);

  React.useEffect(() => {
    if (!canvasInstance) return;
    canvasInstance.setViewportSize(viewportScreenWidth, viewportScreenHeight);
    const zoomChanged = Math.abs(previousSafeZoomRef.current - safeZoom) > 0.0001;
    const zoomAnchor = zoomChanged ? pendingZoomAnchorRef.current : null;
    const targetViewportZoom = fitScale * safeZoom;
    if (zoomAnchor) {
      canvasInstance.setViewportZoom(targetViewportZoom, zoomAnchor);
    } else if (safeZoom <= 1.0001) {
      canvasInstance.centerViewport(targetViewportZoom);
    } else {
      canvasInstance.setViewportZoom(targetViewportZoom);
    }
    pendingZoomAnchorRef.current = null;
    previousSafeZoomRef.current = safeZoom;
  }, [canvasInstance, fitScale, safeZoom, viewportScreenWidth, viewportScreenHeight]);

  React.useEffect(() => {
    if (!canvasInstance) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const upscale = Math.max(1, fitScale * safeZoom);
    const targetScale = Math.min(4, dpr * upscale);
    const intrinsicArea = Math.max(1, intrinsicWidth * intrinsicHeight);
    const edgeCap = intrinsicWidth && intrinsicHeight
      ? Math.min(
        MAX_RENDER_CANVAS_EDGE_PX / Math.max(1, intrinsicWidth),
        MAX_RENDER_CANVAS_EDGE_PX / Math.max(1, intrinsicHeight),
      )
      : 1;
    const areaCap = Math.sqrt(MAX_RENDER_CANVAS_AREA_PX / intrinsicArea);
    const safeScale = Math.max(0.1, Math.min(targetScale, edgeCap, areaCap));
    canvasInstance.setRenderScale(safeScale);
  }, [canvasInstance, fitScale, intrinsicWidth, intrinsicHeight, safeZoom]);

  React.useEffect(() => {
    if (!canvasInstance) return;
    const handleViewportChanged = () => {
      const next = canvasInstance.getViewportTransform();
      setViewportTransform((prev) => {
        if (prev.zoom === next.zoom && prev.panX === next.panX && prev.panY === next.panY) {
          return prev;
        }
        return next;
      });
    };
    handleViewportChanged();
    canvasInstance.on('viewport:changed', handleViewportChanged);
    return () => {
      canvasInstance.off('viewport:changed', handleViewportChanged);
    };
  }, [canvasInstance]);

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
          Math.round((isMobileWindow ? windowViewportWidth : layoutContainer.clientWidth) - paddingX),
        ),
        height: Math.max(0, Math.round(layoutContainer.clientHeight - paddingY)),
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
      height: Math.round(borderY),
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
        height: Math.max(0, rect.height),
      });
      setCanvasCssOffset({
        left: viewportRect ? rect.left - viewportRect.left : 0,
        top: viewportRect ? rect.top - viewportRect.top : 0,
      });
    };

    updateCanvasCssSize();
    const observer = new ResizeObserver(updateCanvasCssSize);
    observer.observe(canvas);
    const viewportNode = canvasViewportRef.current;
    if (viewportNode) {
      observer.observe(viewportNode);
      viewportNode.addEventListener('scroll', updateCanvasCssSize, { passive: true });
    }
    window.addEventListener('scroll', updateCanvasCssSize, true);

    return () => {
      observer.disconnect();
      if (viewportNode) {
        viewportNode.removeEventListener('scroll', updateCanvasCssSize);
      }
      window.removeEventListener('scroll', updateCanvasCssSize, true);
    };
  }, [canvasRef, hasBackground, viewportScreenWidth, viewportScreenHeight]);

  React.useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport || !hasBackground) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (!onZoomByWheelDelta) return;
        event.preventDefault();
        pendingZoomAnchorRef.current = resolveWheelZoomAnchor(event);
        onZoomByWheelDelta(event.deltaY);
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [hasBackground, onZoomByWheelDelta, resolveWheelZoomAnchor]);

  React.useEffect(() => {
    if (!hasBackground) {
      setIsSpacePressed(false);
      return;
    }
    const isTypingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || element.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || isTypingTarget(event.target)) return;
      event.preventDefault();
      setIsSpacePressed(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      setIsSpacePressed(false);
      stopCanvasPan();
    };

    const handleWindowBlur = () => {
      setIsSpacePressed(false);
      stopCanvasPan();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [hasBackground, stopCanvasPan]);

  React.useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport || !hasBackground || !canvasInstance) return;

    const handlePointerDown = (event: PointerEvent) => {
      const middleButtonPan = event.button === 1;
      const spacePan = event.button === 0 && isSpacePressed;
      if (!middleButtonPan && !spacePan) return;

      panSessionRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      setIsPanningCanvas(true);
      viewport.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const panSession = panSessionRef.current;
      if (!panSession || panSession.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - panSession.clientX;
      const deltaY = event.clientY - panSession.clientY;
      if (deltaX === 0 && deltaY === 0) return;

      panSession.clientX = event.clientX;
      panSession.clientY = event.clientY;
      canvasInstance.panViewportByCssDelta(deltaX, deltaY);
      event.preventDefault();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (panSessionRef.current?.pointerId !== event.pointerId) return;
      stopCanvasPan();
    };

    viewport.addEventListener('pointerdown', handlePointerDown, { capture: true });
    viewport.addEventListener('pointermove', handlePointerMove);
    viewport.addEventListener('pointerup', handlePointerEnd);
    viewport.addEventListener('pointercancel', handlePointerEnd);
    viewport.addEventListener('lostpointercapture', handlePointerEnd);
    return () => {
      viewport.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      viewport.removeEventListener('pointermove', handlePointerMove);
      viewport.removeEventListener('pointerup', handlePointerEnd);
      viewport.removeEventListener('pointercancel', handlePointerEnd);
      viewport.removeEventListener('lostpointercapture', handlePointerEnd);
      stopCanvasPan();
    };
  }, [canvasInstance, hasBackground, isSpacePressed, stopCanvasPan]);

  React.useEffect(() => {
    if (editingObject) {
      setEditingText(editingObject.text);
      setEditingOriginalText(editingObject.text);
      editCompletingRef.current = false;
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

    const cssPerScreenX = canvasCssSize.width / viewportScreenWidth;
    const cssPerScreenY = canvasCssSize.height / viewportScreenHeight;
    const viewportZoom = viewportTransform.zoom;
    const screenX = (editingObject.left * viewportZoom) + viewportTransform.panX;
    const screenY = (editingObject.top * viewportZoom) + viewportTransform.panY;
    const width = editingObject.width * editingObject.scaleX * viewportZoom * cssPerScreenX;
    const height = editingObject.height * editingObject.scaleY * viewportZoom * cssPerScreenY;

    const left = canvasCssOffset.left + (screenX * cssPerScreenX) - (width / 2);
    const top = canvasCssOffset.top + (screenY * cssPerScreenY) - (height / 2);

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
      verticalAlign: editingObject.verticalAlign,
    }) : null;
    const fittedLogicalFontSize = layout?.fontSize || editingObject.fontSize || 40;
    const displayFontSize = Math.max(8, fittedLogicalFontSize * editingObject.scaleY * viewportZoom * cssPerScreenY);
    const contentHeight = (layout?.totalHeight || 0) * editingObject.scaleY * viewportZoom * cssPerScreenY;
    const verticalPadding = editingObject.verticalAlign === 'middle'
      ? Math.max(0, (height - contentHeight) / 2)
      : editingObject.verticalAlign === 'bottom'
        ? Math.max(0, height - contentHeight)
        : 0;
    const textColor = editingObject.fill || resolveCssVarColor('--canvas-text-default', '#f9f9f8');
    const luminance = getLuminance(textColor);
    const contrastBg = luminance > 0.6 ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.24)';
    const contrastShadow = luminance > 0.6 ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 3px rgba(255,255,255,0.8)';
    const overlayBorderColor = resolveCssVarColor('--canvas-control-stroke', '#364c75');

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
      border: `1px dashed ${toRgba(overlayBorderColor, 0.8)}`,
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
      caretColor: luminance > 0.6
        ? resolveCssVarColor('--canvas-caret-on-dark', '#f9f9f8')
        : resolveCssVarColor('--canvas-caret-on-light', '#0d1b2a'),
      boxSizing: 'border-box' as const,
    };
  };

  const handleUploadFile = React.useCallback((file?: File | null) => {
    if (!file || isBackgroundLoading) return;
    onUploadImage?.(file);
  }, [isBackgroundLoading, onUploadImage]);

  const openUploadDialog = React.useCallback(() => {
    if (isBackgroundLoading) return;
    uploadInputRef.current?.click();
  }, [isBackgroundLoading]);

  const viewportInteractionClass = React.useMemo(() => {
    if (!hasBackground) return '';
    if (isPanningCanvas) return 'is-pan-dragging';
    if (isSpacePressed) return 'is-pan-ready';
    return '';
  }, [hasBackground, isPanningCanvas, isSpacePressed]);

  return (
    <div
      className="editor-desktop-canvas-stage relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-editor-canvas-bg"
      ref={containerRef}
      style={{ touchAction: 'none' }}
    >
      <div
        ref={canvasViewportRef}
        className={`editor-canvas-viewport relative flex items-center justify-center overflow-hidden ${viewportInteractionClass} ${hasBackground ? 'h-full w-full scale-100 opacity-100' : 'pointer-events-none absolute h-0 w-0 scale-95 opacity-0'}`}
        style={{ fontSize: 0, touchAction: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <canvas
          ref={canvasRef}
          className="editor-canvas-element bg-transparent"
          style={{
            touchAction: 'none',
            width: '100%',
            height: '100%',
          }}
        />

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

      {!hasBackground && (
        <div
          role="button"
          tabIndex={isBackgroundLoading ? -1 : 0}
          aria-disabled={isBackgroundLoading}
          onClick={(event) => {
            event.stopPropagation();
            openUploadDialog();
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            openUploadDialog();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!isBackgroundLoading) {
              setIsDragOverUpload(true);
            }
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragOverUpload(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragOverUpload(false);
            if (isBackgroundLoading) return;
            const file = event.dataTransfer.files?.[0];
            handleUploadFile(file);
          }}
          className={`group flex h-64 w-full max-w-2xl flex-col items-center justify-center rounded-3xl border-4 border-dashed transition-all duration-300 md:h-96 ${
            isBackgroundLoading
              ? 'cursor-wait opacity-75'
              : 'cursor-pointer'
          } ${isDragOverUpload ? 'bg-primary/15' : 'hover:bg-primary/10'}`}
          style={{
            borderColor: isDragOverUpload
              ? resolveCssVarColor('--ring', '#778da9')
              : resolveCssVarColor('--app-border', '#acbacb')
          }}
        >
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isBackgroundLoading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              handleUploadFile(file);
              event.currentTarget.value = '';
            }}
          />
          <div className="p-4 text-center transition-transform duration-300 group-hover:scale-105 md:p-8">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-sm md:mb-6 md:h-24 md:w-24"
              style={{ backgroundColor: resolveCssVarColor('--muted', '#f2f3f1') }}
            >
              <Icon
                path={mdiImage}
                size={window.innerWidth < 768 ? 1.5 : 2}
                color={resolveCssVarColor('--primary', '#364c75')}
              />
            </div>
            <p className="m-0 text-lg font-bold text-foreground md:text-2xl">업로드하려면 클릭</p>
            <p className="m-0 mt-2 text-sm font-semibold text-muted-foreground md:text-lg">또는 여기에 파일 끌어다놓기</p>
          </div>
        </div>
      )}

      {isBackgroundLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-muted/80 backdrop-blur-[1px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-foreground/60" />
        </div>
      )}
    </div>
  );
};

export default MemeCanvas;
