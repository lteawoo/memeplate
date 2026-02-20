import { CanvasObject, type CanvasObjectOptions } from './Object';
import { getFontDeclaration, resolveTextLayout } from './textLayout';

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
const DEFAULT_TEXT_FILL = '#000000';

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
    this.fill = options.fill || DEFAULT_TEXT_FILL;
    
    this.width = options.width || 300;
    this.height = options.height || 150; 
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.text || !isFinite(this.width) || !isFinite(this.height) || this.width <= 0 || this.height <= 0) return;

    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.clip();

      const layout = resolveTextLayout(ctx, {
        text: this.text,
        width: this.width,
        height: this.height,
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        fontWeight: this.fontWeight,
        fontStyle: this.fontStyle,
        lineHeight: this.lineHeight,
        verticalAlign: this.verticalAlign
      });

      ctx.font = getFontDeclaration(layout.fontSize, this.fontStyle, this.fontWeight, this.fontFamily);
      ctx.fillStyle = this.fill || DEFAULT_TEXT_FILL;
      ctx.textAlign = this.textAlign || 'center';
      ctx.textBaseline = 'top';

      let x = 0;
      if (this.textAlign === 'left') x = -this.width / 2;
      else if (this.textAlign === 'right') x = this.width / 2;

      layout.lines.forEach((line, index) => {
        const y = layout.startY + index * layout.lineHeightPx;
        ctx.fillText(line, x, y);

        if (this.stroke && this.stroke !== 'transparent' && this.strokeWidth > 0) {
          ctx.strokeStyle = this.stroke;
          ctx.lineWidth = getAdaptiveStrokeWidth(this.strokeWidth, layout.fontSize);
          ctx.strokeText(line, x, y);
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
