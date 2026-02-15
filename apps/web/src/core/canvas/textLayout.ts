export interface TextLayoutInput {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number;
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

export interface TextLayoutResult {
  fontSize: number;
  lineHeight: number;
  lineHeightPx: number;
  lines: string[];
  totalHeight: number;
  startY: number;
}

export const MIN_TEXT_FONT_SIZE = 8;

export const getFontDeclaration = (
  fontSize: number,
  fontStyle: TextLayoutInput['fontStyle'],
  fontWeight: TextLayoutInput['fontWeight'],
  fontFamily: TextLayoutInput['fontFamily']
) => `${fontStyle || 'normal'} ${fontWeight || 'normal'} ${fontSize}px ${fontFamily || 'Arial'}`;

const wrapParagraph = (ctx: CanvasRenderingContext2D, paragraph: string, maxWidth: number) => {
  if (!paragraph.trim()) {
    return { lines: [''], fitsWidth: true };
  }

  const words = paragraph.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];

    if (ctx.measureText(word).width > maxWidth) {
      return { lines: [], fitsWidth: false };
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  lines.push(currentLine);
  return { lines, fitsWidth: true };
};

export const resolveTextLayout = (
  ctx: CanvasRenderingContext2D,
  input: TextLayoutInput
): TextLayoutResult => {
  const safeWidth = Math.max(1, input.width);
  const safeHeight = Math.max(1, input.height);
  const lineHeight = input.lineHeight || 1.2;
  const baseFontSize = isFinite(input.fontSize) ? input.fontSize : 40;

  let currentFontSize = Math.max(baseFontSize, MIN_TEXT_FONT_SIZE);
  let acceptedLines: string[] = [''];
  let acceptedTotalHeight = currentFontSize * lineHeight;
  let acceptedFontSize = currentFontSize;

  for (let i = 0; i < 100 && currentFontSize >= MIN_TEXT_FONT_SIZE; i += 1) {
    ctx.font = getFontDeclaration(
      currentFontSize,
      input.fontStyle,
      input.fontWeight,
      input.fontFamily
    );

    const paragraphLines = input.text.split('\n');
    const lines: string[] = [];
    let fitsWidth = true;

    for (let p = 0; p < paragraphLines.length; p += 1) {
      const wrapped = wrapParagraph(ctx, paragraphLines[p], safeWidth);
      if (!wrapped.fitsWidth) {
        fitsWidth = false;
        break;
      }
      lines.push(...wrapped.lines);
    }

    if (fitsWidth) {
      const totalHeight = lines.length * currentFontSize * lineHeight;
      acceptedLines = lines.length ? lines : [''];
      acceptedTotalHeight = totalHeight;
      acceptedFontSize = currentFontSize;

      if (totalHeight <= safeHeight || currentFontSize <= MIN_TEXT_FONT_SIZE) {
        break;
      }
    }

    currentFontSize -= 1;
  }

  const lineHeightPx = acceptedFontSize * lineHeight;
  let startY = -safeHeight / 2;
  if (input.verticalAlign === 'middle') {
    startY = -acceptedTotalHeight / 2;
  } else if (input.verticalAlign === 'bottom') {
    startY = safeHeight / 2 - acceptedTotalHeight;
  }

  return {
    fontSize: Math.max(acceptedFontSize, MIN_TEXT_FONT_SIZE),
    lineHeight,
    lineHeightPx,
    lines: acceptedLines,
    totalHeight: acceptedTotalHeight,
    startY
  };
};
