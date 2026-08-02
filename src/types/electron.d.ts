export interface ElectronAPI {
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => void;
  openExternal: (url: string) => void;
  windowControls: {
    minimize: () => void;
    close: () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}