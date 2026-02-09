export {};

declare global {
  interface EyeDropper {
    open(options?: { signal?: AbortSignal }): Promise<{ sRGBHex: string }>;
  }

  interface Window {
    EyeDropper?: {
      new (): EyeDropper;
    };
  }
}

import 'fabric';

declare module 'fabric' {
  interface FabricObject {
    id?: string;
    name?: string;
  }
}
