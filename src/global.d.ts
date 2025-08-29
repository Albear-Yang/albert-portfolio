// src/global.d.ts
export {};

declare global {
  interface Window {
    flipFourier?: () => void;
    // add more if needed later
    // nnpath?: () => void;
  }
}
