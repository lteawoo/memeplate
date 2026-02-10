import { CanvasObject, type CanvasObjectOptions } from './Object';

export interface RectOptions extends CanvasObjectOptions {
  rx?: number;
  ry?: number;
}

export class Rect extends CanvasObject {
  rx: number;
  ry: number;
  type = 'rect';

  constructor(options: RectOptions = {}) {
    super(options);
    this.rx = options.rx || 0;
    this.ry = options.ry || 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const x = -this.width / 2;
    const y = -this.height / 2;
    
    ctx.beginPath();
    if (this.rx === 0 && this.ry === 0) {
      ctx.rect(x, y, this.width, this.height);
    } else {
      ctx.roundRect(x, y, this.width, this.height, [this.rx, this.ry]);
    }
    
    if (this.fill !== 'transparent') {
      ctx.fillStyle = this.fill;
      ctx.fill();
    }
    
    if (this.stroke !== 'transparent' && this.strokeWidth > 0) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
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

  clone(): Rect {
    return new Rect(this.toObject());
  }

  toObject(): RectOptions {
    return {
      ...super.toObject(),
      rx: this.rx,
      ry: this.ry,
    };
  }
}
