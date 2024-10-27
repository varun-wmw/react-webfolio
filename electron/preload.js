const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Capture a screenshot
  captureScreenshot: () => {
    console.log('captureScreenshot called');
    ipcRenderer.send('capture-screenshot');
  },

  // Listener for receiving the screenshot file path
  onScreenshotCaptured: (callback) => {
    ipcRenderer.on('screenshot-captured', (event, path) => {
      console.log('Screenshot captured:', path);
      callback(path);
    });
  },

  // Opens the clock-in window
  openClockInWindow: () => {
    console.log('openClockInWindow called');
    ipcRenderer.send('open-clock-in-window');
  },

  // General-purpose send function
  send: (channel, data) => {
    console.log(`Sending IPC message to ${channel} with data:`, data);
    ipcRenderer.send(channel, data);
  },

  // General-purpose receive function
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => {
      console.log(`Received IPC message from ${channel} with args:`, args);
      callback(...args);
    });
  },
});