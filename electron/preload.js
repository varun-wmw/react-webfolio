// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is loading...'); // Confirm preload loading

contextBridge.exposeInMainWorld('electron', {
  captureScreenshot: async () => {
    console.log('captureScreenshot called from renderer process');
    return await ipcRenderer.invoke('capture-screenshot');
  },

  onScreenshotCaptured: (callback) => {
    console.log('Setting up screenshot capture listener');
    ipcRenderer.on('screenshot-captured', (_event, data) => {
      console.log('Screenshot captured:', data);
      callback(data);
    });
  },

});

console.log('Electron API exposed to renderer process');