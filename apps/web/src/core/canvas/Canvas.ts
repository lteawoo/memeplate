import { CanvasObject } from './Object';
import { Rect } from './Rect';
import { Circle } from './Circle';
import { Textbox } from './Textbox';
import { CanvasImage } from './Image';

const getCssVarColor = (variableName: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
};

export class Canvas {
  private el: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private objects: CanvasObject[] = [];
  private activeObject: CanvasObject | null = null;
  private sceneWidth: number;
  private sceneHeight: number;
  private viewWidth: number;
  private viewHeight: number;
  private renderScale: number;
  private viewportZoom: number = 1;
  private viewportPanX: number = 0;
  private viewportPanY: number = 0;
  private needsRedraw: boolean = true;
  private themeObserver: MutationObserver | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventListeners: Record<string, ((options?: any) => void)[]> = {};

  constructor(el: HTMLCanvasElement) {
    this.el = el;
    const ctx = el.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;
    this.sceneWidth = el.width;
    this.sceneHeight = el.height;
    this.viewWidth = el.width;
    this.viewHeight = el.height;
    this.renderScale = Math.max(1, window.devicePixelRatio || 1);
    this.syncBackingStoreSize();
    
    this.renderLoop = this.renderLoop.bind(this);
    requestAnimationFrame(this.renderLoop);
    
    this.initEvents();
    this.initThemeObserver();
  }

  private initThemeObserver() {
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
    const root = document.documentElement;
    if (!root) return;

    this.themeObserver = new MutationObserver(() => {
      this.requestRender();
    });
    this.themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme', 'style', 'class']
    });
  }

  private renderLoop() {
    // Check if any object is still loading (like images without an element yet)
    // This ensures that as soon as the image is loaded, it gets drawn.
    const hasLoadingObjects = this.objects.some(obj => obj instanceof CanvasImage && !obj.element);
    
    if (this.needsRedraw || hasLoadingObjects) {
      this.render();
      this.needsRedraw = false;
    }
    requestAnimationFrame(this.renderLoop);
  }

  requestRender() {
    this.needsRedraw = true;
  }

  private syncBackingStoreSize() {
    const pixelWidth = Math.max(1, Math.round(this.viewWidth * this.renderScale));
    const pixelHeight = Math.max(1, Math.round(this.viewHeight * this.renderScale));
    if (this.el.width !== pixelWidth) this.el.width = pixelWidth;
    if (this.el.height !== pixelHeight) this.el.height = pixelHeight;
  }

  setRenderScale(scale: number) {
    const safeScale = isFinite(scale) ? Math.max(1, scale) : 1;
    if (Math.abs(this.renderScale - safeScale) < 0.001) return;
    this.renderScale = safeScale;
    this.syncBackingStoreSize();
    this.requestRender();
  }

  private getViewportPanBounds(zoom: number) {
    const safeZoom = isFinite(zoom) ? Math.max(0.1, zoom) : 1;
    const scaledWidth = this.sceneWidth * safeZoom;
    const scaledHeight = this.sceneHeight * safeZoom;
    const overscrollX = Math.max(96, this.viewWidth * 0.18);
    const overscrollY = Math.max(96, this.viewHeight * 0.18);

    const centerPanX = scaledWidth <= this.viewWidth
      ? (this.viewWidth - scaledWidth) / 2
      : 0;
    const minPanX = scaledWidth <= this.viewWidth
      ? centerPanX - overscrollX
      : (this.viewWidth - scaledWidth) - overscrollX;
    const maxPanX = scaledWidth <= this.viewWidth
      ? centerPanX + overscrollX
      : overscrollX;

    const centerPanY = scaledHeight <= this.viewHeight
      ? (this.viewHeight - scaledHeight) / 2
      : 0;
    const minPanY = scaledHeight <= this.viewHeight
      ? centerPanY - overscrollY
      : (this.viewHeight - scaledHeight) - overscrollY;
    const maxPanY = scaledHeight <= this.viewHeight
      ? centerPanY + overscrollY
      : overscrollY;

    return { minPanX, maxPanX, minPanY, maxPanY };
  }

  private applyViewport(zoom: number, panX: number, panY: number) {
    const safeZoom = isFinite(zoom) ? Math.max(0.1, Math.min(8, zoom)) : 1;
    const { minPanX, maxPanX, minPanY, maxPanY } = this.getViewportPanBounds(safeZoom);
    const clampedPanX = Math.max(minPanX, Math.min(maxPanX, panX));
    const clampedPanY = Math.max(minPanY, Math.min(maxPanY, panY));
    const changed = Math.abs(this.viewportZoom - safeZoom) > 0.0001
      || Math.abs(this.viewportPanX - clampedPanX) > 0.0001
      || Math.abs(this.viewportPanY - clampedPanY) > 0.0001;
    if (!changed) return;

    this.viewportZoom = safeZoom;
    this.viewportPanX = clampedPanX;
    this.viewportPanY = clampedPanY;
    this.fire('viewport:changed', this.getViewportTransform());
    this.requestRender();
  }

  getViewportTransform() {
    return {
      zoom: this.viewportZoom,
      panX: this.viewportPanX,
      panY: this.viewportPanY
    };
  }

  setViewportZoom(zoom: number, anchor?: { x: number; y: number }) {
    const safeZoom = isFinite(zoom) ? Math.max(0.1, Math.min(8, zoom)) : 1;
    const anchorX = typeof anchor?.x === 'number' && isFinite(anchor.x) ? anchor.x : this.viewWidth / 2;
    const anchorY = typeof anchor?.y === 'number' && isFinite(anchor.y) ? anchor.y : this.viewHeight / 2;
    const worldX = (anchorX - this.viewportPanX) / this.viewportZoom;
    const worldY = (anchorY - this.viewportPanY) / this.viewportZoom;
    const nextPanX = anchorX - (worldX * safeZoom);
    const nextPanY = anchorY - (worldY * safeZoom);
    this.applyViewport(safeZoom, nextPanX, nextPanY);
  }

  setViewportSize(width: number, height: number) {
    if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) return;
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));
    if (this.viewWidth === safeWidth && this.viewHeight === safeHeight) return;
    this.viewWidth = safeWidth;
    this.viewHeight = safeHeight;
    this.syncBackingStoreSize();
    this.applyViewport(this.viewportZoom, this.viewportPanX, this.viewportPanY);
    this.requestRender();
  }

  panViewportByScreenDelta(deltaX: number, deltaY: number) {
    if (!isFinite(deltaX) || !isFinite(deltaY)) return;
    this.applyViewport(
      this.viewportZoom,
      this.viewportPanX + deltaX,
      this.viewportPanY + deltaY
    );
  }

  panViewportByCssDelta(deltaX: number, deltaY: number) {
    if (!isFinite(deltaX) || !isFinite(deltaY)) return;
    const rect = this.el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scaleX = this.viewWidth / rect.width;
    const scaleY = this.viewHeight / rect.height;
    this.panViewportByScreenDelta(deltaX * scaleX, deltaY * scaleY);
  }

  resetViewport() {
    this.applyViewport(1, 0, 0);
  }

  centerViewport(zoom: number = this.viewportZoom) {
    const safeZoom = isFinite(zoom) ? Math.max(0.1, Math.min(8, zoom)) : this.viewportZoom;
    const panX = (this.viewWidth - (this.sceneWidth * safeZoom)) / 2;
    const panY = (this.viewHeight - (this.sceneHeight * safeZoom)) / 2;
    this.applyViewport(safeZoom, panX, panY);
  }

  /**
   * Returns the scale factor between logical canvas size and its CSS display size.
   * Used to keep UI elements (like handles) consistent in size regardless of zoom/screen size.
   */
  private getSceneScale(): number {
    const rect = this.el.getBoundingClientRect();
    if (rect.width === 0) return 1;
    return (this.viewWidth / rect.width) / this.viewportZoom;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(eventName: string, handler: (options?: any) => void) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(handler);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(eventName: string, handler: (options?: any) => void) {
    if (!this.eventListeners[eventName]) return;
    this.eventListeners[eventName] = this.eventListeners[eventName].filter(h => h !== handler);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fire(eventName: string, options: any = {}) {
    if (!this.eventListeners[eventName]) return;
    this.eventListeners[eventName].forEach(handler => handler(options));
  }

    private initEvents() {
      this.el.addEventListener('mousedown', this.handleDown);
      this.el.addEventListener('touchstart', this.handleDown, { passive: false });
      this.el.addEventListener('mousemove', this.handleMouseMove);
      this.el.addEventListener('dblclick', this.handleDoubleClick);
    }
  
    private handleDoubleClick = (e: MouseEvent) => {
      const { x, y } = this.getPointer(e);
      const target = this.findTarget(x, y);
      if (target) {
        this.fire('mouse:dblclick', { e, target, pointer: { x, y } });
      }
    };

    private handleDown = (e: MouseEvent | TouchEvent) => {
      // Prevent double firing on touch devices (touchstart followed by mousedown)
      if (e.type === 'touchstart' && e.cancelable) {
        e.preventDefault();
      }
  
      const { x, y } = this.getPointer(e);
      
      // Early exit if pointer coordinates are invalid
      if (!isFinite(x) || !isFinite(y)) return;
  
      const control = this.activeObject ? this.findControl(this.activeObject, x, y) : null;
      
      if (control) {
        if (control === 'mtr') {
          this.handleRotate(this.activeObject!, x, y);
        } else {
          this.handleResize(this.activeObject!, control, x, y);
        }
        return;
      }
  
      const target = this.findTarget(x, y);
      this.fire('mouse:down', { e, target, pointer: { x, y } });
      
      if (target) {
        if (target.selectable) {
          this.setActiveObject(target);
          this.fire('selection:created', { selected: [target] });
          this.fire('selection:updated', { selected: [target] });
          this.handleDrag(target, x, y);
        }
      } else {
        this.discardActiveObject();
        this.fire('selection:cleared', {});
      }
    };
  
    private handleMouseMove = (e: MouseEvent) => {
      this.updateCursor(e);
    };
  private updateCursor(e: MouseEvent) {
    const { x, y } = this.getPointer(e);
    const control = this.activeObject ? this.findControl(this.activeObject, x, y) : null;
    
    if (control) {
      switch (control) {
        case 'mtr': this.el.style.cursor = 'crosshair'; break;
        case 'tl': case 'br': this.el.style.cursor = 'nwse-resize'; break;
        case 'tr': case 'bl': this.el.style.cursor = 'nesw-resize'; break;
        case 'mt': case 'mb': this.el.style.cursor = 'ns-resize'; break;
        case 'ml': case 'mr': this.el.style.cursor = 'ew-resize'; break;
      }
      return;
    }

    const target = this.findTarget(x, y);
    if (target && target.selectable) {
      this.el.style.cursor = 'move';
    } else {
      this.el.style.cursor = 'default';
    }
  }

  private findControl(obj: CanvasObject, x: number, y: number): string | null {
    const scale = this.getSceneScale();
    const viewWidth = obj.width * obj.scaleX;
    const viewHeight = obj.height * obj.scaleY;
    const halfW = viewWidth / 2 + (4 * scale);
    const halfH = viewHeight / 2 + (4 * scale);
    const handleSize = 12 * scale; // Adjust touch area based on screen scale

    // Helper to check if point is near handle, considering rotation
    const checkHandle = (hx: number, hy: number) => {
      const rad = (obj.angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      // Local to global (obj.left/top is origin)
      const rx = obj.left + (hx * cos - hy * sin);
      const ry = obj.top + (hx * sin + hy * cos);
      return Math.abs(x - rx) <= handleSize && Math.abs(y - ry) <= handleSize;
    };

    if (checkHandle(0, -halfH - (30 * scale))) return 'mtr'; // Rotation
    if (checkHandle(-halfW, -halfH)) return 'tl';
    if (checkHandle(halfW, -halfH)) return 'tr';
    if (checkHandle(-halfW, halfH)) return 'bl';
    if (checkHandle(halfW, halfH)) return 'br';
    if (checkHandle(0, -halfH)) return 'mt';
    if (checkHandle(0, halfH)) return 'mb';
    if (checkHandle(-halfW, 0)) return 'ml';
    if (checkHandle(halfW, 0)) return 'mr';

    return null;
  }

  private handleDrag(target: CanvasObject, startX: number, startY: number) {
    const origLeft = target.left;
    const origTop = target.top;

    const handleMove = (em: MouseEvent | TouchEvent) => {
      if (em.cancelable) em.preventDefault();
      const p = this.getPointer(em);
      target.left = origLeft + (p.x - startX);
      target.top = origTop + (p.y - startY);
      this.fire('object:moving', { target, e: em });
      this.requestRender();
    };

    const handleUp = () => {
      this.fire('object:modified', { target });
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  }

  private handleRotate(target: CanvasObject, startX: number, startY: number) {
    const center = { x: target.left, y: target.top };
    const startAngle = Math.atan2(startY - center.y, startX - center.x);
    const origAngle = target.angle;

    const handleMove = (em: MouseEvent | TouchEvent) => {
      if (em.cancelable) em.preventDefault();
      const p = this.getPointer(em);
      const currentAngle = Math.atan2(p.y - center.y, p.x - center.x);
      const diff = ((currentAngle - startAngle) * 180) / Math.PI;
      target.angle = origAngle + diff;
      this.fire('object:rotating', { target, e: em });
      this.requestRender();
    };

    const handleUp = () => {
      this.fire('object:modified', { target });
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  }

  private handleResize(target: CanvasObject, control: string, _startX: number, _startY: number) {
    const isText = target.type === 'text';
    const origScaleX = target.scaleX;
    const origScaleY = target.scaleY;
    const origWidth = target.width;
    const origHeight = target.height;
    const origLeft = target.left;
    const origTop = target.top;
    const origAngle = target.angle;

    // For text, we want to work with width/height directly.
    // If it has scale, commit it to width/height first.
    if (isText && (origScaleX !== 1 || origScaleY !== 1)) {
      const currentWidth = origWidth * origScaleX;
      const currentHeight = origHeight * origScaleY;
      if (isFinite(currentWidth) && isFinite(currentHeight) && currentWidth > 0 && currentHeight > 0) {
        target.width = currentWidth;
        target.height = currentHeight;
        target.scaleX = 1;
        target.scaleY = 1;
        this.requestRender();
      }
    }

    const angleRad = (origAngle * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    // 1. Find the fixed point (opposite of the control) in local coordinates (relative to center)
    let localFixedX = 0;
    let localFixedY = 0;

    switch (control) {
      case 'tl': localFixedX = target.width / 2; localFixedY = target.height / 2; break;
      case 'tr': localFixedX = -target.width / 2; localFixedY = target.height / 2; break;
      case 'bl': localFixedX = target.width / 2; localFixedY = -target.height / 2; break;
      case 'br': localFixedX = -target.width / 2; localFixedY = -target.height / 2; break;
      case 'mt': localFixedX = 0; localFixedY = target.height / 2; break;
      case 'mb': localFixedX = 0; localFixedY = -target.height / 2; break;
      case 'ml': localFixedX = target.width / 2; localFixedY = 0; break;
      case 'mr': localFixedX = -target.width / 2; localFixedY = 0; break;
    }

    // 2. Convert local fixed point to global coordinates
    const globalFixedX = origLeft + (localFixedX * target.scaleX * cos - localFixedY * target.scaleY * sin);
    const globalFixedY = origTop + (localFixedX * target.scaleX * sin + localFixedY * target.scaleY * cos);

    const handleMove = (em: MouseEvent | TouchEvent) => {
      if (em.cancelable) em.preventDefault();
      const p = this.getPointer(em);
      
      if (!isFinite(p.x) || !isFinite(p.y)) return;
      
      // 5. Determine new view dimensions
      let newViewWidth = target.width * target.scaleX;
      let newViewHeight = target.height * target.scaleY;
      const minW = isText ? 50 : 5;
      const minH = isText ? 20 : 5;

      // 3. Vector from fixed point to current pointer in global space
      const dx = p.x - globalFixedX;
      const dy = p.y - globalFixedY;

      // 4. Rotate that vector back to local space
      const localDx = dx * cos + dy * sin;
      const localDy = -dx * sin + dy * cos;

      if (control.includes('l')) newViewWidth = -localDx;
      else if (control.includes('r')) newViewWidth = localDx;

      if (control.includes('t')) newViewHeight = -localDy;
      else if (control.includes('b')) newViewHeight = localDy;

      newViewWidth = Math.max(minW, newViewWidth);
      newViewHeight = Math.max(minH, newViewHeight);

      // 7. Update object dimensions/scale
      if (isText) {
        target.width = newViewWidth;
        target.height = newViewHeight;
        target.scaleX = 1;
        target.scaleY = 1;
      } else {
        target.scaleX = newViewWidth / target.width;
        target.scaleY = newViewHeight / target.height;
      }

      // 8. Update center (left, top)
      let vCenterX = 0;
      let vCenterY = 0;
      const currentViewW = target.width * target.scaleX;
      const currentViewH = target.height * target.scaleY;

      if (control.includes('l')) vCenterX = -currentViewW / 2;
      else if (control.includes('r')) vCenterX = currentViewW / 2;

      if (control.includes('t')) vCenterY = -currentViewH / 2;
      else if (control.includes('b')) vCenterY = currentViewH / 2;

      target.left = globalFixedX + (vCenterX * cos - vCenterY * sin);
      target.top = globalFixedY + (vCenterX * sin + vCenterY * cos);

      this.fire('object:scaling', { target, e: em });
      this.requestRender();
    };

    const handleUp = () => {
      this.fire('object:modified', { target });
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  }


  private getPointer(e: MouseEvent | TouchEvent) {
    const rect = this.el.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
      if (touch) {
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = rect.left;
        clientY = rect.top;
      }
    }
    
    const cssWidth = rect.width;
    const cssHeight = rect.height;
    
    // Protect against division by zero if element is hidden or collapsed
    if (cssWidth === 0 || cssHeight === 0) {
        return { x: 0, y: 0 };
    }

    const scaleX = this.viewWidth / cssWidth;
    const scaleY = this.viewHeight / cssHeight;
    const screenX = (clientX - rect.left) * scaleX;
    const screenY = (clientY - rect.top) * scaleY;
    
    return {
      x: (screenX - this.viewportPanX) / this.viewportZoom,
      y: (screenY - this.viewportPanY) / this.viewportZoom
    };
  }

  private findTarget(x: number, y: number): CanvasObject | null {
    // Search from top to bottom (reverse order)
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      if (obj.visible && obj.evented !== false && obj.containsPoint(x, y)) {
        return obj;
      }
    }
    return null;
  }

  add(object: CanvasObject) {
    this.objects.push(object);
    this.fire('object:added', { target: object });
    this.requestRender();
  }

  remove(object: CanvasObject) {
    this.objects = this.objects.filter(obj => obj.id !== object.id);
    if (this.activeObject?.id === object.id) {
      this.discardActiveObject();
    }
    this.fire('object:removed', { target: object });
    this.requestRender();
  }

  setActiveObject(object: CanvasObject) {
    if (object.selectable) {
      this.activeObject = object;
      this.fire('selection:created', { selected: [object] });
      this.requestRender();
    }
  }

  discardActiveObject() {
    this.activeObject = null;
    this.fire('selection:cleared', {});
    this.requestRender();
  }

  getActiveObject() {
    return this.activeObject;
  }

  // Helper for fabric compatibility
  getActiveObjects() {
    return this.activeObject ? [this.activeObject] : [];
  }

  getObjectById(id: string): CanvasObject | undefined {
    return this.objects.find(obj => obj.id === id);
  }

  getObjects() {
    return [...this.objects];
  }

  clear() {
    this.objects = [];
    this.discardActiveObject();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.el.width, this.el.height);
  }

  setWidth(width: number) {
    if (!isFinite(width) || width <= 0) return;
    this.sceneWidth = width;
    this.applyViewport(this.viewportZoom, this.viewportPanX, this.viewportPanY);
    this.requestRender();
  }

  setHeight(height: number) {
    if (!isFinite(height) || height <= 0) return;
    this.sceneHeight = height;
    this.applyViewport(this.viewportZoom, this.viewportPanX, this.viewportPanY);
    this.requestRender();
  }

  setDimensions(dims: { width: number; height: number }) {
    if (isFinite(dims.width) && isFinite(dims.height) && dims.width > 0 && dims.height > 0) {
        this.setWidth(dims.width);
        this.setHeight(dims.height);
    }
  }

  renderAll() {
    this.requestRender();
  }

  private drawEditorGrid(step: number, alpha: number, color: string) {
    if (!isFinite(step) || step <= 0 || !isFinite(this.viewportZoom) || this.viewportZoom <= 0) {
      return;
    }

    const safeStep = Math.max(4, Math.round(step));
    const worldLeft = (-this.viewportPanX) / this.viewportZoom;
    const worldTop = (-this.viewportPanY) / this.viewportZoom;
    const worldRight = (this.viewWidth - this.viewportPanX) / this.viewportZoom;
    const worldBottom = (this.viewHeight - this.viewportPanY) / this.viewportZoom;

    const startX = Math.floor(worldLeft / safeStep) * safeStep;
    const startY = Math.floor(worldTop / safeStep) * safeStep;
    const endX = Math.ceil(worldRight / safeStep) * safeStep;
    const endY = Math.ceil(worldBottom / safeStep) * safeStep;

    const maxLinesPerAxis = 600;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    this.ctx.lineWidth = 1;

    for (let x = startX, verticalCount = 0; x <= endX && verticalCount < maxLinesPerAxis; x += safeStep) {
      const screenX = (x * this.viewportZoom) + this.viewportPanX;
      const crispX = Math.round(screenX) + 0.5;
      this.ctx.moveTo(crispX, 0);
      this.ctx.lineTo(crispX, this.viewHeight);
      verticalCount++;
    }

    for (let y = startY, horizontalCount = 0; y <= endY && horizontalCount < maxLinesPerAxis; y += safeStep) {
      const screenY = (y * this.viewportZoom) + this.viewportPanY;
      const crispY = Math.round(screenY) + 0.5;
      this.ctx.moveTo(0, crispY);
      this.ctx.lineTo(this.viewWidth, crispY);
      horizontalCount++;
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawEditorBackdrop() {
    const stageFill = getCssVarColor('--editor-canvas-bg', '#f2f3f1');
    const gridMinor = getCssVarColor('--canvas-grid-minor', '#415a77');
    const gridMajor = getCssVarColor('--canvas-grid-major', '#364c75');

    this.ctx.save();
    this.ctx.fillStyle = stageFill;
    this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    this.drawEditorGrid(48, 0.07, gridMinor);
    this.drawEditorGrid(240, 0.16, gridMajor);
    this.ctx.restore();
  }

  render() {
    if (
      !this.ctx
      || !isFinite(this.sceneWidth)
      || !isFinite(this.sceneHeight)
      || !isFinite(this.viewWidth)
      || !isFinite(this.viewHeight)
      || this.sceneWidth <= 0
      || this.sceneHeight <= 0
      || this.viewWidth <= 0
      || this.viewHeight <= 0
    ) {
      return;
    }

    try {
      this.ctx.save();
      
      // Reset any global state that might have been left over
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.globalAlpha = 1;
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      
      // Clear the canvas - use actual canvas element dimensions
      this.ctx.clearRect(0, 0, this.el.width, this.el.height);
      this.ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
      this.drawEditorBackdrop();
      this.ctx.translate(this.viewportPanX, this.viewportPanY);
      this.ctx.scale(this.viewportZoom, this.viewportZoom);
      
      // Draw all objects
      for (const obj of this.objects) {
        if (!obj || !obj.visible) continue;

        const left = obj.left ?? 0;
        const top = obj.top ?? 0;
        const angle = obj.angle ?? 0;
        const scaleX = obj.scaleX ?? 1;
        const scaleY = obj.scaleY ?? 1;

        // Skip objects with invalid transformation properties
        if (!isFinite(left) || !isFinite(top) || !isFinite(scaleX) || !isFinite(scaleY) || !isFinite(angle)) {
          continue;
        }

        this.ctx.save();
        try {
          this.ctx.translate(left, top);
          this.ctx.rotate((angle * Math.PI) / 180);
          this.ctx.scale(scaleX, scaleY);
          this.ctx.globalAlpha = isFinite(obj.opacity) ? Math.max(0, Math.min(1, obj.opacity)) : 1;
          
          obj.draw(this.ctx);
        } catch (err) {
          console.error('Error drawing object:', err, obj);
        } finally {
          this.ctx.restore();
        }
      }

      // Draw controls for the active object
      if (this.activeObject && this.activeObject.visible) {
        try {
          this.drawControls(this.activeObject);
        } catch (err) {
          console.error('Error drawing controls:', err);
        }
      }

    } catch (err) {
      console.error('Canvas render error:', err);
    } finally {
      this.ctx.restore();
    }
  }

  private drawControls(obj: CanvasObject) {
    if (!obj || !isFinite(obj.left) || !isFinite(obj.top)) return;

    const scale = this.getSceneScale();
    const scaleX = obj.scaleX ?? 1;
    const scaleY = obj.scaleY ?? 1;
    const width = obj.width || 0;
    const height = obj.height || 0;

    if (!isFinite(scaleX) || !isFinite(scaleY) || !isFinite(width) || !isFinite(height)) return;

    this.ctx.save();
    try {
      const controlStroke = getCssVarColor('--canvas-control-stroke', '#364c75');
      const controlFill = getCssVarColor('--canvas-control-fill', '#ffffff');
      this.ctx.strokeStyle = controlStroke;
      this.ctx.lineWidth = 1 * scale; // Keep line weight consistent
      
      const viewWidth = width * scaleX;
      const viewHeight = height * scaleY;

      this.ctx.translate(obj.left, obj.top);
      this.ctx.rotate(((obj.angle || 0) * Math.PI) / 180);
      
      // 1. Draw bounding box (Stroke only)
      const offset = 4 * scale;
      this.ctx.beginPath();
      this.ctx.rect(-viewWidth / 2 - offset, -viewHeight / 2 - offset, viewWidth + (offset * 2), viewHeight + (offset * 2));
      this.ctx.stroke();
      
      // 2. Draw handles
      this.ctx.fillStyle = controlFill;
      this.ctx.strokeStyle = controlStroke;
      const halfW = viewWidth / 2 + offset;
      const halfH = viewHeight / 2 + offset;
      const hSize = 10 * scale; // Visual size of handles
      const hHalf = hSize / 2;
      
      const handles = [
        { id: 'tl', x: -halfW, y: -halfH },
        { id: 'tr', x: halfW, y: -halfH },
        { id: 'bl', x: -halfW, y: halfH },
        { id: 'br', x: halfW, y: halfH },
        { id: 'mt', x: 0, y: -halfH },
        { id: 'mb', x: 0, y: halfH },
        { id: 'ml', x: -halfW, y: 0 },
        { id: 'mr', x: halfW, y: 0 },
        { id: 'mtr', x: 0, y: -halfH - (30 * scale) }
      ];
      
      handles.forEach(h => {
        if (h.id === 'mtr') {
          // Line to rotation handle
          this.ctx.beginPath();
          this.ctx.moveTo(0, -halfH - (4 * scale));
          this.ctx.lineTo(0, -halfH - (30 * scale));
          this.ctx.stroke();
          
          // Rotation handle circle
          this.ctx.beginPath();
          this.ctx.arc(h.x, h.y, 6 * scale, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
        } else {
          this.ctx.beginPath();
          this.ctx.rect(h.x - hHalf, h.y - hHalf, hSize, hSize);
          this.ctx.fill();
          this.ctx.stroke();
        }
      });
    } finally {
      this.ctx.restore();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toDataURL(options: any = {}) {
    const format = options.format === 'jpg' ? 'jpeg' : (options.format || 'png');
    const mimeType = `image/${format}`;
    const quality =
      typeof options.quality === 'number' && Number.isFinite(options.quality)
        ? Math.max(0, Math.min(1, options.quality))
        : undefined;
    
    // Always render export from scene coordinates so viewport zoom/pan never affects output.
    const tempCanvas = document.createElement('canvas');
    const w = options.width || this.sceneWidth;
    const h = options.height || this.sceneHeight;
    const left = options.left || 0;
    const top = options.top || 0;
    const multiplier = options.multiplier || 1;

    tempCanvas.width = w * multiplier;
    tempCanvas.height = h * multiplier;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return '';

    tCtx.scale(multiplier, multiplier);
    tCtx.translate(-left, -top);

    this.objects.forEach(obj => {
      if (obj.visible) {
        tCtx.save();
        tCtx.translate(obj.left, obj.top);
        tCtx.rotate((obj.angle * Math.PI) / 180);
        tCtx.scale(obj.scaleX, obj.scaleY);
        tCtx.globalAlpha = obj.opacity;
        obj.draw(tCtx);
        tCtx.restore();
      }
    });

    if (quality !== undefined && (format === 'jpeg' || format === 'webp')) {
      return tempCanvas.toDataURL(mimeType, quality);
    }

    return tempCanvas.toDataURL(mimeType);
  }

  toJSON(includeBackground: boolean = true) {
    const objects = includeBackground 
      ? this.objects 
      : this.objects.filter(obj => obj.name !== 'background');
      
    return {
      objects: objects.map(obj => obj.toJSON()),
      width: this.sceneWidth,
      height: this.sceneHeight
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadFromJSON(json: any, preserveBackground: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      
      if (json.objects) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const promises = json.objects.map((objData: any) => {
           let obj: CanvasObject | null = null;
           switch(objData.type) {
             case 'rect': obj = new Rect(objData); break;
             case 'circle': obj = new Circle(objData); break;
             case 'text': obj = new Textbox(objData.text, objData); break;
             case 'image': return CanvasImage.fromURL(objData.src, objData);
           }
           return obj ? Promise.resolve(obj) : Promise.resolve(null);
        });
        
        Promise.allSettled(promises).then((results) => {
            if (preserveBackground) {
                // Keep only background objects
                this.objects = this.objects.filter(o => o.name === 'background');
                this.discardActiveObject();
            } else {
                this.clear();
                if (json.width) this.setWidth(json.width);
                if (json.height) this.setHeight(json.height);
            }

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    this.objects.push(result.value);
                } else if (result.status === 'rejected') {
                    console.error('Failed to load object:', result.reason);
                }
            });
            this.requestRender();
            resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  // Z-Index manipulation
  sendObjectToBack(obj: CanvasObject) {
    const idx = this.objects.indexOf(obj);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
      // Ensure background stays at the very bottom
      const targetIdx = (this.objects.length > 0 && this.objects[0].name === 'background') ? 1 : 0;
      this.objects.splice(targetIdx, 0, obj);
      this.requestRender();
    }
  }

  bringObjectToFront(obj: CanvasObject) {
    const idx = this.objects.indexOf(obj);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
      this.objects.push(obj);
      this.requestRender();
    }
  }

  bringObjectForward(obj: CanvasObject) {
    const idx = this.objects.indexOf(obj);
    if (idx !== -1 && idx < this.objects.length - 1) {
      this.objects[idx] = this.objects[idx + 1];
      this.objects[idx + 1] = obj;
      this.requestRender();
    }
  }

  sendObjectBackwards(obj: CanvasObject) {
    const idx = this.objects.indexOf(obj);
    // Cannot move backwards if it's already at the bottom (or just above background)
    const minIdx = (this.objects.length > 0 && this.objects[0].name === 'background') ? 1 : 0;
    
    if (idx !== -1 && idx > minIdx) {
      this.objects[idx] = this.objects[idx - 1];
      this.objects[idx - 1] = obj;
      this.requestRender();
    }
  }

  dispose() {
    // Cleanup listeners
    this.el.removeEventListener('mousedown', this.handleDown);
    this.el.removeEventListener('touchstart', this.handleDown);
    this.el.removeEventListener('mousemove', this.handleMouseMove);
    this.el.removeEventListener('dblclick', this.handleDoubleClick);
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    this.objects = [];
  }
}
