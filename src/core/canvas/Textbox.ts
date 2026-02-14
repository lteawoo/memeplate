import { CanvasObject, type CanvasObjectOptions } from './Object';

export interface TextOptions extends CanvasObjectOptions {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
}

const MIN_STROKE_PX = 0.35;
const MAX_STROKE_PX = 8;
const STROKE_SCALE_PER_FONT_SIZE = 0.03;

const getAdaptiveStrokeWidth = (strokeIntensity: number, fontSize: number) => {
  if (!isFinite(strokeIntensity) || strokeIntensity <= 0 || !isFinite(fontSize) || fontSize <= 0) return 0;
  const scaled = strokeIntensity * fontSize * STROKE_SCALE_PER_FONT_SIZE;
  return Math.max(MIN_STROKE_PX, Math.min(MAX_STROKE_PX, scaled));
};

export class Textbox extends CanvasObject {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number;
  type = 'text';

  constructor(text: string, options: TextOptions = {}) {
    super(options);
    this.text = text;
    this.fontSize = options.fontSize || 40;
    this.fontFamily = options.fontFamily || 'Arial';
    this.fontWeight = options.fontWeight || 'normal';
    this.fontStyle = options.fontStyle || 'normal';
    this.textAlign = options.textAlign || 'center';
    this.verticalAlign = options.verticalAlign || 'top';
    this.lineHeight = options.lineHeight || 1.2;
    this.fill = options.fill || '#000000';
    
    this.width = options.width || 300;
    this.height = options.height || 150; 
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.text || !isFinite(this.width) || !isFinite(this.height) || this.width <= 0 || this.height <= 0) return;

    ctx.save();
    try {
      let currentFontSize = isFinite(this.fontSize) ? this.fontSize : 40;
      const minFontSize = 8;
      let lines: string[] = [];
      let startY = -this.height / 2;
      let iterations = 0;

      // 1. Find the best font size that fits in the box (Max 100 attempts)
      while (currentFontSize >= minFontSize && iterations < 100) {
        iterations++;
        if (!isFinite(currentFontSize)) {
            currentFontSize = minFontSize;
            break;
        }
        
        ctx.font = `${this.fontStyle || 'normal'} ${this.fontWeight || 'normal'} ${currentFontSize}px ${this.fontFamily || 'Arial'}`;
        const words = (this.text || '').split(/\s+/);
        const tempLines: string[] = [];
        let currentLine = '';
        let fitsWidth = true;

        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
          const metrics = ctx.measureText(testLine);
          
          // Check if a single word is wider than the box
          if (ctx.measureText(words[i]).width > this.width) {
            fitsWidth = false;
            // If we are at the minimum font size, we have to just accept it and clip
            if (currentFontSize <= minFontSize) {
               fitsWidth = true; // Force fit at min size
            } else {
              break;
            }
          }

          if (metrics.width > this.width && i > 0) {
            tempLines.push(currentLine.trim());
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        
        if (fitsWidth) {
          tempLines.push(currentLine.trim());
          const totalContentHeight = tempLines.length * currentFontSize * (this.lineHeight || 1.2);
          
          if (totalContentHeight <= this.height || currentFontSize <= minFontSize) {
            lines = tempLines;
            if (this.verticalAlign === 'top') {
              startY = -this.height / 2;
            } else if (this.verticalAlign === 'middle') {
              startY = -totalContentHeight / 2;
            } else if (this.verticalAlign === 'bottom') {
              startY = this.height / 2 - totalContentHeight;
            }
            break;
          }
        }
        currentFontSize -= 1;
      }

      const finalFontSize = Math.max(currentFontSize, minFontSize);
      ctx.font = `${this.fontStyle || 'normal'} ${this.fontWeight || 'normal'} ${finalFontSize}px ${this.fontFamily || 'Arial'}`;
      ctx.fillStyle = this.fill || '#000000';
      ctx.textAlign = this.textAlign || 'center';
      ctx.textBaseline = 'top';

      let x = 0;
      if (this.textAlign === 'left') x = -this.width / 2;
      else if (this.textAlign === 'right') x = this.width / 2;

      const lh = this.lineHeight || 1.2;
      lines.forEach((line, index) => {
        const y = startY + index * finalFontSize * lh;
        if (y + finalFontSize <= this.height / 2 + 5) { // Added a small buffer
          ctx.fillText(line, x, y);
          
          if (this.stroke && this.stroke !== 'transparent' && this.strokeWidth > 0) {
            ctx.strokeStyle = this.stroke;
            ctx.lineWidth = getAdaptiveStrokeWidth(this.strokeWidth, finalFontSize);
            ctx.strokeText(line, x, y);
          }
        }
      });
    } finally {
      ctx.restore();
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
      fontStyle: this.fontStyle,
      textAlign: this.textAlign,
      verticalAlign: this.verticalAlign,
      lineHeight: this.lineHeight,
    };
  }
}
