// src/electron.d.ts
export {};

declare global {
  interface Window {
    electron: {
      captureScreenshot: () => void;
      onScreenshotCaptured: (callback: (data: { success: boolean; path?: string; error?: string }) => void) => void;
      send: (channel: string, data?: any) => void;
      on: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}