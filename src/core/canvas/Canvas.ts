import { CanvasObject } from './Object';
import { Rect } from './Rect';
import { Circle } from './Circle';
import { Textbox } from './Textbox';
import { CanvasImage } from './Image';

export class Canvas {
  private el: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private objects: CanvasObject[] = [];
  private activeObject: CanvasObject | null = null;
  private width: number;
  private height: number;
  private needsRedraw: boolean = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventListeners: Record<string, ((options?: any) => void)[]> = {};

  constructor(el: HTMLCanvasElement) {
    this.el = el;
    const ctx = el.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;
    this.width = el.width;
    this.height = el.height;
    
    this.renderLoop = this.renderLoop.bind(this);
    requestAnimationFrame(this.renderLoop);
    
    this.initEvents();
  }

  private renderLoop() {
    // Check if any object is still loading (like images without an element yet)
    // This ensures that as soon as the image is loaded, it gets drawn.
    const hasLoadingObjects = this.objects.some(obj => obj.type === 'image' && !(obj as any).element);
    
    if (this.needsRedraw || hasLoadingObjects) {
      this.render();
      this.needsRedraw = false;
    }
    requestAnimationFrame(this.renderLoop);
  }

  requestRender() {
    this.needsRedraw = true;
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
    const handleDown = (e: MouseEvent | TouchEvent) => {
      const { x, y } = this.getPointer(e);
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

    const handleMouseMove = (e: MouseEvent) => {
      this.updateCursor(e);
    };

    this.el.addEventListener('mousedown', handleDown);
    this.el.addEventListener('touchstart', handleDown, { passive: false });
    this.el.addEventListener('mousemove', handleMouseMove);
  }

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
    const viewWidth = obj.width * obj.scaleX;
    const viewHeight = obj.height * obj.scaleY;
    const halfW = viewWidth / 2 + 4;
    const halfH = viewHeight / 2 + 4;
    const handleSize = 12;

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

    if (checkHandle(0, -halfH - 30)) return 'mtr'; // Rotation
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
      em.preventDefault();
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
      em.preventDefault();
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

  private handleResize(target: CanvasObject, control: string, startX: number, startY: number) {
    const isText = target.type === 'text';
    const origScaleX = target.scaleX;
    const origScaleY = target.scaleY;
    const origWidth = target.width * origScaleX;
    const origHeight = target.height * origScaleY;

    // For text, we want to work with width/height directly. 
    // If it has scale, commit it to width/height first.
    if (isText && (origScaleX !== 1 || origScaleY !== 1)) {
      target.width = origWidth;
      target.height = origHeight;
      target.scaleX = 1;
      target.scaleY = 1;
    }

    const handleMove = (em: MouseEvent | TouchEvent) => {
      em.preventDefault();
      const p = this.getPointer(em);
      const dx = p.x - startX;
      const dy = p.y - startY;

      if (isText) {
        if (control === 'br' || control === 'tr' || control === 'tl' || control === 'bl') {
          const dw = (control === 'br' || control === 'tr') ? dx * 2 : -dx * 2;
          const dh = (control === 'br' || control === 'bl') ? dy * 2 : -dy * 2;
          target.width = Math.max(50, origWidth + dw);
          target.height = Math.max(20, origHeight + dh);
        } else if (control === 'mr') {
          target.width = Math.max(50, origWidth + dx * 2);
        } else if (control === 'ml') {
          target.width = Math.max(50, origWidth - dx * 2);
        } else if (control === 'mb') {
          target.height = Math.max(20, origHeight + dy * 2);
        } else if (control === 'mt') {
          target.height = Math.max(20, origHeight - dy * 2);
        }
      } else {
        // Scaling logic for other objects
        if (control === 'br' || control === 'tr' || control === 'tl' || control === 'bl') {
          const scale = (control === 'br' || control === 'tr') ? (origWidth + dx * 2) / origWidth : (origWidth - dx * 2) / origWidth;
          const uniformScale = Math.max(0.1, scale);
          target.scaleX = origScaleX * uniformScale;
          target.scaleY = origScaleY * uniformScale;
        } else if (control === 'mr') {
          target.scaleX = Math.max(0.1, (origWidth + dx * 2) / target.width);
        } else if (control === 'ml') {
          target.scaleX = Math.max(0.1, (origWidth - dx * 2) / target.width);
        } else if (control === 'mb') {
          target.scaleY = Math.max(0.1, (origHeight + dy * 2) / target.height);
        } else if (control === 'mt') {
          target.scaleY = Math.max(0.1, (origHeight - dy * 2) / target.height);
        }
      }

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
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
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
      this.requestRender();
    }
  }

  discardActiveObject() {
    this.activeObject = null;
    this.requestRender();
  }

  getActiveObject() {
    return this.activeObject;
  }

  // Helper for fabric compatibility
  getActiveObjects() {
    return this.activeObject ? [this.activeObject] : [];
  }

  getObjects() {
    return [...this.objects];
  }

  clear() {
    this.objects = [];
    this.discardActiveObject();
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  setWidth(width: number) {
    this.width = width;
    this.el.width = width;
    this.requestRender();
  }

  setHeight(height: number) {
    this.height = height;
    this.el.height = height;
    this.requestRender();
  }

  setDimensions(dims: { width: number; height: number }) {
    this.setWidth(dims.width);
    this.setHeight(dims.height);
  }

  renderAll() {
    this.requestRender();
  }

  render() {
    // Clear the entire canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Fill background with a light gray to indicate the canvas area (optional)
    // this.ctx.fillStyle = '#f8fafc';
    // this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    
    // Draw all objects
    this.objects.forEach(obj => {
      if (obj.visible) {
        this.ctx.save();
        // Basic transform
        this.ctx.translate(obj.left, obj.top);
        this.ctx.rotate((obj.angle * Math.PI) / 180);
        this.ctx.scale(obj.scaleX, obj.scaleY);
        this.ctx.globalAlpha = obj.opacity;
        
        obj.draw(this.ctx);
        
        this.ctx.restore();
      }
    });

    // Draw selection controls if exists
    if (this.activeObject) {
      this.drawControls(this.activeObject);
    }

    this.ctx.restore();
  }

  private drawControls(obj: CanvasObject) {
    this.ctx.save();
    this.ctx.strokeStyle = '#2563eb';
    this.ctx.lineWidth = 1;
    
    const viewWidth = obj.width * obj.scaleX;
    const viewHeight = obj.height * obj.scaleY;

    this.ctx.translate(obj.left, obj.top);
    this.ctx.rotate((obj.angle * Math.PI) / 180);
    
    // Bounding box
    this.ctx.strokeRect(-viewWidth / 2 - 4, -viewHeight / 2 - 4, viewWidth + 8, viewHeight + 8);
    
    // Controls style
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#2563eb';
    const halfW = viewWidth / 2 + 4;
    const halfH = viewHeight / 2 + 4;
    
    const handles = [
      { id: 'tl', x: -halfW, y: -halfH },
      { id: 'tr', x: halfW, y: -halfH },
      { id: 'bl', x: -halfW, y: halfH },
      { id: 'br', x: halfW, y: halfH },
      { id: 'mt', x: 0, y: -halfH },
      { id: 'mb', x: 0, y: halfH },
      { id: 'ml', x: -halfW, y: 0 },
      { id: 'mr', x: halfW, y: 0 },
      { id: 'mtr', x: 0, y: -halfH - 30 } // Rotation handle
    ];
    
    handles.forEach(h => {
      this.ctx.beginPath();
      if (h.id === 'mtr') {
        // Draw a line to rotation handle
        this.ctx.moveTo(0, -halfH - 4);
        this.ctx.lineTo(0, -halfH - 30);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
      } else {
        this.ctx.rect(h.x - 5, h.y - 5, 10, 10);
      }
      this.ctx.fill();
      this.ctx.stroke();
    });
    
    this.ctx.restore();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toDataURL(options: any = {}) {
    // Basic implementation ignoring most options for now except format/quality
    // For crop/multiplier, it's more complex.
    // If specific crop is requested, we might need a temporary canvas.
    
    if (options.left !== undefined || options.top !== undefined || options.width !== undefined || options.height !== undefined) {
      // Create temp canvas for cropping
      const tempCanvas = document.createElement('canvas');
      const w = options.width || this.width;
      const h = options.height || this.height;
      const left = options.left || 0;
      const top = options.top || 0;
      const multiplier = options.multiplier || 1;
      
      tempCanvas.width = w * multiplier;
      tempCanvas.height = h * multiplier;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return '';

      tCtx.scale(multiplier, multiplier);
      tCtx.translate(-left, -top);
      
      // Draw everything
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
      
      return tempCanvas.toDataURL(`image/${options.format === 'jpg' ? 'jpeg' : (options.format || 'png')}`);
    }

    return this.el.toDataURL(`image/${options.format === 'jpg' ? 'jpeg' : (options.format || 'png')}`);
  }

  toJSON() {
    return {
      objects: this.objects.map(obj => obj.toJSON()),
      width: this.width,
      height: this.height
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadFromJSON(json: any): Promise<void> {
    return new Promise((resolve) => {
      this.clear();
      if (json.width) this.setWidth(json.width);
      if (json.height) this.setHeight(json.height);
      
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
        
        Promise.all(promises).then((objects) => {
            objects.forEach(obj => {
                if (obj) this.objects.push(obj);
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
      this.objects.unshift(obj);
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
    if (idx !== -1 && idx > 0) {
      this.objects[idx] = this.objects[idx - 1];
      this.objects[idx - 1] = obj;
      this.requestRender();
    }
  }

  dispose() {
    // Cleanup listeners
    // TODO: remove event listeners
    this.objects = [];
  }
}
