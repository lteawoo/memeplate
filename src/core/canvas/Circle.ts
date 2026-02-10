import { CanvasObject, type CanvasObjectOptions } from './Object';

export interface CircleOptions extends CanvasObjectOptions {
  radius?: number;
}

export class Circle extends CanvasObject {
  radius: number;
  type = 'circle';

  constructor(options: CircleOptions = {}) {
    super(options);
    this.radius = options.radius || 0;
    // For consistency with Rect/Object model, set width/height
    this.width = this.radius * 2;
    this.height = this.radius * 2;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    
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
    const dx = x - this.left;
    const dy = y - this.top;
    const scaledRadius = this.radius * Math.max(this.scaleX, this.scaleY);
    return dx * dx + dy * dy <= scaledRadius * scaledRadius;
  }

  clone(): Circle {
    return new Circle(this.toObject());
  }

  toObject(): CircleOptions {
    return {
      ...super.toObject(),
      radius: this.radius,
    };
  }
}
