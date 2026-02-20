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

  const splitLongWord = (word: string) => {
    const chars = Array.from(word);
    const segments: string[] = [];
    let currentSegment = '';

    for (let i = 0; i < chars.length; i += 1) {
      const char = chars[i];
      const next = currentSegment + char;

      if (ctx.measureText(next).width <= maxWidth) {
        currentSegment = next;
        continue;
      }

      if (!currentSegment) {
        segments.push(char);
        for (let j = i + 1; j < chars.length; j += 1) {
          segments.push(chars[j]);
        }
        return { lines: segments, fitsWidth: false };
      }

      segments.push(currentSegment);
      currentSegment = char;
    }

    if (currentSegment) {
      segments.push(currentSegment);
    }

    return { lines: segments, fitsWidth: true };
  };

  const words = paragraph.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];

    if (ctx.measureText(word).width > maxWidth) {
      const wrapped = splitLongWord(word);
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }

      if (wrapped.lines.length === 0) {
        return { lines: lines.length ? lines : [''], fitsWidth: false };
      }

      if (!wrapped.fitsWidth) {
        lines.push(...wrapped.lines);
        return { lines, fitsWidth: false };
      }

      lines.push(...wrapped.lines.slice(0, -1));
      currentLine = wrapped.lines[wrapped.lines.length - 1];

      continue;
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

interface MeasuredLayout {
  lines: string[];
  totalHeight: number;
  fitsWidth: boolean;
}

const measureLayoutAtFontSize = (
  ctx: CanvasRenderingContext2D,
  input: TextLayoutInput,
  fontSize: number,
  lineHeight: number,
  maxWidth: number
): MeasuredLayout => {
  ctx.font = getFontDeclaration(fontSize, input.fontStyle, input.fontWeight, input.fontFamily);

  const paragraphLines = input.text.split('\n');
  const lines: string[] = [];
  let fitsWidth = true;

  for (let p = 0; p < paragraphLines.length; p += 1) {
    const wrapped = wrapParagraph(ctx, paragraphLines[p], maxWidth);
    if (wrapped.lines.length > 0) {
      lines.push(...wrapped.lines);
    } else {
      lines.push('');
    }

    if (!wrapped.fitsWidth) {
      fitsWidth = false;
      break;
    }
  }

  const normalizedLines = lines.length > 0 ? lines : [''];
  return {
    lines: normalizedLines,
    totalHeight: normalizedLines.length * fontSize * lineHeight,
    fitsWidth
  };
};

export const resolveTextLayout = (
  ctx: CanvasRenderingContext2D,
  input: TextLayoutInput
): TextLayoutResult => {
  const safeWidth = Math.max(1, input.width);
  const safeHeight = Math.max(1, input.height);
  const lineHeight = input.lineHeight || 1.2;
  const baseFontSize = isFinite(input.fontSize) ? input.fontSize : 40;
  const maxSearchFontSize = Math.max(MIN_TEXT_FONT_SIZE, Math.round(baseFontSize));

  let acceptedFontSize = maxSearchFontSize;
  let acceptedLayout = measureLayoutAtFontSize(
    ctx,
    input,
    acceptedFontSize,
    lineHeight,
    safeWidth
  );

  const isFitCandidate = (layout: MeasuredLayout) =>
    layout.fitsWidth && layout.totalHeight <= safeHeight;

  if (!isFitCandidate(acceptedLayout)) {
    for (let nextFontSize = maxSearchFontSize - 1; nextFontSize >= MIN_TEXT_FONT_SIZE; nextFontSize -= 1) {
      const nextLayout = measureLayoutAtFontSize(
        ctx,
        input,
        nextFontSize,
        lineHeight,
        safeWidth
      );
      acceptedFontSize = nextFontSize;
      acceptedLayout = nextLayout;

      if (isFitCandidate(nextLayout)) {
        break;
      }
    }
  }

  const lineHeightPx = acceptedFontSize * lineHeight;
  let startY = -safeHeight / 2;
  if (input.verticalAlign === 'middle') {
    startY = -acceptedLayout.totalHeight / 2;
  } else if (input.verticalAlign === 'bottom') {
    startY = safeHeight / 2 - acceptedLayout.totalHeight;
  }

  return {
    fontSize: Math.max(acceptedFontSize, MIN_TEXT_FONT_SIZE),
    lineHeight,
    lineHeightPx,
    lines: acceptedLayout.lines,
    totalHeight: acceptedLayout.totalHeight,
    startY
  };
};
