const { contextBridge, ipcRenderer } = require('electron');

console.log("Preload script running...");

// Remove fs require since we'll handle the buffer in main process
const electronBridge = {
  captureScreenshot: () => {
    console.log("Capture screenshot called from renderer");
    return ipcRenderer.invoke('capture-screenshot');
  },

  onScreenshotCaptured: (callback) => {
    console.log("Setting up screenshot capture listener...");
    ipcRenderer.removeAllListeners('screenshot-captured');
    ipcRenderer.on('screenshot-captured', (event, data) => {
      console.log('Screenshot captured event received in preload:', data);
      callback(data);
    });
  }
};

console.log("Exposing electron bridge to main world...");
contextBridge.exposeInMainWorld('electron', electronBridge);
console.log("Preload script completed");