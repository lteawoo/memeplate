export interface CanvasObjectOptions {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  selectable?: boolean;
  evented?: boolean;
  visible?: boolean;
  name?: string;
  id?: string;
}

export abstract class CanvasObject {
  id: string;
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  selectable: boolean;
  evented: boolean;
  visible: boolean;

  constructor(options: CanvasObjectOptions = {}) {
    this.id = options.id || crypto.randomUUID();
    this.name = options.name || 'object';
    this.left = options.left || 0;
    this.top = options.top || 0;
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.fill = options.fill || 'transparent';
    this.stroke = options.stroke || 'transparent';
    this.strokeWidth = options.strokeWidth || 0;
    this.angle = options.angle || 0;
    this.scaleX = options.scaleX ?? 1;
    this.scaleY = options.scaleY ?? 1;
    this.opacity = options.opacity ?? 1;
    this.selectable = options.selectable ?? true;
    this.evented = options.evented ?? true;
    this.visible = options.visible ?? true;
  }

  abstract draw(ctx: CanvasRenderingContext2D): void;
  abstract containsPoint(x: number, y: number): boolean;
  abstract clone(): CanvasObject;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(key: keyof CanvasObjectOptions, value: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any)[key] = value;
  }

  toObject(): CanvasObjectOptions {
    return {
      id: this.id,
      name: this.name,
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      fill: this.fill,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      angle: this.angle,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      opacity: this.opacity,
      selectable: this.selectable,
      evented: this.evented,
      visible: this.visible,
    };
  }

  toJSON() {
    return this.toObject();
  }
}