import { CanvasObject, type CanvasObjectOptions } from './Object';

export interface TextOptions extends CanvasObjectOptions {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export class Textbox extends CanvasObject {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  type = 'text';

  constructor(text: string, options: TextOptions = {}) {
    super(options);
    this.text = text;
    this.fontSize = options.fontSize || 40;
    this.fontFamily = options.fontFamily || 'Arial';
    this.fontWeight = options.fontWeight || 'normal';
    this.textAlign = options.textAlign || 'center';
    this.lineHeight = options.lineHeight || 1.2;
    this.fill = options.fill || '#000000';
    
    // Set fixed initial size if not provided
    this.width = options.width || 300;
    this.height = options.height || 150; 
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = this.fill;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top'; // Start drawing from top for multi-line

    const words = this.text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    // Word Wrap Logic
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > this.width && i > 0) {
        lines.push(currentLine.trim());
        currentLine = words[i] + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine.trim());

    // Vertical Centering Calculation Removed - Top Align
    const startY = -this.height / 2;

    lines.forEach((line, index) => {
      const y = startY + index * this.fontSize * this.lineHeight;
      ctx.fillText(line, 0, y);
      
      if (this.stroke && this.stroke !== 'transparent' && this.strokeWidth > 0) {
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        ctx.strokeText(line, 0, y);
      }
    });
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

  clone(): Textbox {
    return new Textbox(this.text, this.toObject());
  }

  toObject(): TextOptions {
    return {
      ...super.toObject(),
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      textAlign: this.textAlign,
      lineHeight: this.lineHeight,
    };
  }
}
