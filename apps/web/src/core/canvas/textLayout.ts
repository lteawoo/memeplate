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
  baselineOffsetPx: number;
}

export const MIN_TEXT_FONT_SIZE = 8;
const ABSOLUTE_MIN_TEXT_FONT_SIZE = 1;
const MIN_STROKE_PX = 0.35;
const MAX_STROKE_PX = 8;
const STROKE_SCALE_PER_FONT_SIZE = 0.03;
const MIN_INSET_PX = 1;
const VERTICAL_HEADROOM_RATIO = 0.08;
const MAX_FONT_BINARY_STEPS = 18;

export const getFontDeclaration = (
  fontSize: number,
  fontStyle: TextLayoutInput['fontStyle'],
  fontWeight: TextLayoutInput['fontWeight'],
  fontFamily: TextLayoutInput['fontFamily']
) => `${fontStyle || 'normal'} ${fontWeight || 'normal'} ${fontSize}px ${fontFamily || 'Arial'}`;

export const getAdaptiveStrokeWidth = (strokeIntensity: number, fontSize: number) => {
  if (!isFinite(strokeIntensity) || strokeIntensity <= 0 || !isFinite(fontSize) || fontSize <= 0) return 0;
  const scaled = strokeIntensity * fontSize * STROKE_SCALE_PER_FONT_SIZE;
  return Math.max(MIN_STROKE_PX, Math.min(MAX_STROKE_PX, scaled));
};

export interface TextContentInsetsInput {
  fontSize: number;
  strokeIntensity?: number;
}

export interface TextContentInsets {
  horizontal: number;
  vertical: number;
}

export const resolveTextContentInsets = (input: TextContentInsetsInput): TextContentInsets => {
  const fontSize = Number.isFinite(input.fontSize) ? Math.max(0, input.fontSize) : 0;
  const strokePx = getAdaptiveStrokeWidth(input.strokeIntensity || 0, fontSize);
  const strokeInset = Math.ceil(strokePx / 2);
  const verticalFontInset = Math.max(MIN_INSET_PX, Math.ceil(fontSize * VERTICAL_HEADROOM_RATIO));
  return {
    horizontal: Math.max(MIN_INSET_PX, strokeInset),
    vertical: Math.max(MIN_INSET_PX, verticalFontInset + strokeInset),
  };
};

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
  ascent: number;
  descent: number;
  lineAdvance: number;
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

  const fallbackMetrics = ctx.measureText('Hg');
  const fallbackAscent = Math.max(
    fallbackMetrics.actualBoundingBoxAscent || 0,
    fallbackMetrics.fontBoundingBoxAscent || 0,
    fontSize * 0.8
  );
  const fallbackDescent = Math.max(
    fallbackMetrics.actualBoundingBoxDescent || 0,
    fallbackMetrics.fontBoundingBoxDescent || 0,
    fontSize * 0.2
  );

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
  let maxAscent = fallbackAscent;
  let maxDescent = fallbackDescent;
  for (const line of normalizedLines) {
    const metrics = ctx.measureText(line || ' ');
    maxAscent = Math.max(
      maxAscent,
      metrics.actualBoundingBoxAscent || 0,
      metrics.fontBoundingBoxAscent || 0
    );
    maxDescent = Math.max(
      maxDescent,
      metrics.actualBoundingBoxDescent || 0,
      metrics.fontBoundingBoxDescent || 0
    );
  }
  const lineAdvance = fontSize * lineHeight;
  const totalHeight = maxAscent + maxDescent + Math.max(0, normalizedLines.length - 1) * lineAdvance;
  return {
    lines: normalizedLines,
    totalHeight,
    fitsWidth,
    ascent: maxAscent,
    descent: maxDescent,
    lineAdvance
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

  const normalizeFittingFontSize = (value: number) =>
    Math.max(ABSOLUTE_MIN_TEXT_FONT_SIZE, Math.floor(value * 100) / 100);

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

  // If content still does not fit at the preferred minimum size, shrink below 8px
  // so that multiline content can stay unclipped in fixed-height text boxes.
  if (!isFitCandidate(acceptedLayout)) {
    const absoluteMinLayout = measureLayoutAtFontSize(
      ctx,
      input,
      ABSOLUTE_MIN_TEXT_FONT_SIZE,
      lineHeight,
      safeWidth
    );

    if (isFitCandidate(absoluteMinLayout)) {
      let low = ABSOLUTE_MIN_TEXT_FONT_SIZE;
      let high = Math.max(ABSOLUTE_MIN_TEXT_FONT_SIZE, MIN_TEXT_FONT_SIZE);
      let bestSize = low;
      let bestLayout = absoluteMinLayout;

      for (let i = 0; i < MAX_FONT_BINARY_STEPS; i += 1) {
        const mid = (low + high) / 2;
        const midLayout = measureLayoutAtFontSize(
          ctx,
          input,
          mid,
          lineHeight,
          safeWidth
        );

        if (isFitCandidate(midLayout)) {
          bestSize = mid;
          bestLayout = midLayout;
          low = mid;
        } else {
          high = mid;
        }
      }

      acceptedFontSize = normalizeFittingFontSize(bestSize);
      acceptedLayout = bestLayout;
    } else {
      acceptedFontSize = ABSOLUTE_MIN_TEXT_FONT_SIZE;
      acceptedLayout = absoluteMinLayout;
    }
  }

  const normalizedFontSize = normalizeFittingFontSize(acceptedFontSize);
  if (normalizedFontSize !== acceptedFontSize) {
    const normalizedLayout = measureLayoutAtFontSize(
      ctx,
      input,
      normalizedFontSize,
      lineHeight,
      safeWidth
    );
    if (isFitCandidate(normalizedLayout)) {
      acceptedFontSize = normalizedFontSize;
      acceptedLayout = normalizedLayout;
    }
  }

  // Keep font/layout perfectly aligned to avoid edge clipping from metric mismatch.
  const strictLayout = measureLayoutAtFontSize(
    ctx,
    input,
    acceptedFontSize,
    lineHeight,
    safeWidth
  );
  if (isFitCandidate(strictLayout)) {
    acceptedLayout = strictLayout;
  }

  const lineHeightPx = acceptedLayout.lineAdvance;
  let startY = -safeHeight / 2;
  if (input.verticalAlign === 'middle') {
    startY = -acceptedLayout.totalHeight / 2;
  } else if (input.verticalAlign === 'bottom') {
    startY = safeHeight / 2 - acceptedLayout.totalHeight;
  }

  return {
    fontSize: acceptedFontSize,
    lineHeight,
    lineHeightPx,
    lines: acceptedLayout.lines,
    totalHeight: acceptedLayout.totalHeight,
    startY,
    baselineOffsetPx: acceptedLayout.ascent
  };
};
