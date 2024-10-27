const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let clockInWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), 
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadURL('http://localhost:3000'); // Load your React app here
  mainWindow.on('closed', () => { mainWindow = null; });
}

// Function to create the Clock-In Window
function createClockInWindow() {
  if (!clockInWindow) {
    clockInWindow = new BrowserWindow({
      width: 400,
      height: 300,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'), 
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    clockInWindow.loadURL('http://localhost:3000/clock-in'); // Optional: direct to a specific clock-in route
    clockInWindow.on('closed', () => { clockInWindow = null; });
  } else {
    clockInWindow.focus();
  }
}

app.on('ready', createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createMainWindow();
});

// Listen for the "open-clock-in-window" event to create the clock-in window
ipcMain.on('open-clock-in-window', () => {
  console.log('Received open-clock-in-window request');
  createClockInWindow();
});

// Listen for the "capture-screenshot" event
ipcMain.on('capture-screenshot', async (event) => {
  console.log('Received capture-screenshot request');

  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    if (!sources || sources.length === 0) {
      throw new Error('No screen sources available for screenshot');
    }

    const screen = sources[0]; // Capture the first screen source
    const screenshotPath = path.join(app.getPath('temp'), `${Date.now()}_screenshot.png`);
    const image = screen.thumbnail.toPNG();

    fs.writeFile(screenshotPath, image, (error) => {
      if (error) {
        console.error('Failed to save screenshot:', error);
        event.reply('screenshot-captured', { success: false, error: 'Failed to save screenshot' });
      } else {
        console.log('Screenshot saved at:', screenshotPath);
        event.reply('screenshot-captured', { success: true, path: screenshotPath });
      }
    });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    event.reply('screenshot-captured', { success: false, error: error.message });
  }
});