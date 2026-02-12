import { CanvasObject, type CanvasObjectOptions } from './Object';

export interface ImageOptions extends CanvasObjectOptions {
  src?: string;
  element?: HTMLImageElement;
}

export class CanvasImage extends CanvasObject {
  public element: HTMLImageElement | null = null;
  src: string = '';
  type = 'image';

  constructor(options: ImageOptions = {}) {
    super(options);
    if (options.element) {
      this.element = options.element;
      this.width = options.width || this.element.naturalWidth;
      this.height = options.height || this.element.naturalHeight;
    } else if (options.src) {
      this.src = options.src;
      this.loadElement();
    }
  }

  private loadElement() {
    const img = new Image();
    if (!this.src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = this.src;
    img.onload = () => {
      this.element = img;
      if (this.width === 0) this.width = img.naturalWidth;
      if (this.height === 0) this.height = img.naturalHeight;
      // We need a way to tell the canvas to redraw.
      // For now, we'll rely on the next render loop or manual request.
    };
  }

  static fromURL(url: string, options: ImageOptions = {}): Promise<CanvasImage> {
    return new Promise((resolve, reject) => {
      const load = (withCORS: boolean) => {
        const img = new Image();
        if (withCORS && !url.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        img.src = url;
        img.onload = () => {
          const imageObj = new CanvasImage({ ...options, element: img, src: url });
          resolve(imageObj);
        };
        img.onerror = (e) => {
          if (withCORS && !url.startsWith('data:')) {
            console.warn('Failed to load image with CORS, retrying without CORS:', url);
            load(false);
          } else {
            console.error('CanvasImage loading failed for:', url, e);
            reject(e);
          }
        };
      };
      
      load(true);
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.element) return;
    
    ctx.beginPath(); // Ensure clean path state
    const x = -this.width / 2;
    const y = -this.height / 2;
    
    ctx.drawImage(this.element, x, y, this.width, this.height);
  }

  containsPoint(x: number, y: number): boolean {
    const sw = this.width * this.scaleX;
    const sh = this.height * this.scaleY;
    
    return (
      x >= this.left - sw / 2 &&
      x <= this.left + sw / 2 &&
      y >= this.top - sh / 2 &&
      y <= this.top + sh / 2
    );
  }

  clone(): CanvasImage {
    return new CanvasImage({
      ...this.toObject(),
      element: this.element || undefined, // Referencing same element is fine usually
      src: this.src
    });
  }

  toObject(): ImageOptions {
    return {
      ...super.toObject(),
      src: this.src,
    };
  }
}
