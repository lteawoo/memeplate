import { CanvasObject, type CanvasObjectOptions } from './Object';
import {
  getAdaptiveStrokeWidth,
  getFontDeclaration,
  resolveTextContentInsets,
  resolveTextLayout,
} from './textLayout';

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

const DEFAULT_TEXT_FILL = '#000000';

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

      const probeLayout = resolveTextLayout(ctx, {
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

      const logicalInsets = resolveTextContentInsets({
        fontSize: probeLayout.fontSize,
        strokeIntensity: this.strokeWidth,
      });
      const layoutWidth = Math.max(1, this.width - (logicalInsets.horizontal * 2));
      const layoutHeight = Math.max(1, this.height - (logicalInsets.vertical * 2));

      const layout = resolveTextLayout(ctx, {
        text: this.text,
        width: layoutWidth,
        height: layoutHeight,
        fontSize: probeLayout.fontSize,
        fontFamily: this.fontFamily,
        fontWeight: this.fontWeight,
        fontStyle: this.fontStyle,
        lineHeight: this.lineHeight,
        verticalAlign: this.verticalAlign
      });

      ctx.font = getFontDeclaration(layout.fontSize, this.fontStyle, this.fontWeight, this.fontFamily);
      ctx.fillStyle = this.fill || DEFAULT_TEXT_FILL;
      ctx.textAlign = this.textAlign || 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      let x = 0;
      if (this.textAlign === 'left') x = -layoutWidth / 2;
      else if (this.textAlign === 'right') x = layoutWidth / 2;

      layout.lines.forEach((line, index) => {
        const y = layout.startY + layout.baselineOffsetPx + index * layout.lineHeightPx;
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
