// electron/main.js
import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow;
let clockInWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Adjust path to electron/preload.js if needed
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadURL('http://localhost:3000');
  mainWindow.on('closed', () => { mainWindow = null; });
}

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

    clockInWindow.loadURL('http://localhost:3000');
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

ipcMain.handle('open-clock-in-window', () => {
  console.log('Received open-clock-in-window request');
  createClockInWindow();
  return true;
});

ipcMain.handle('capture-screenshot', async () => {
  console.log("Received capture-screenshot request");
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    if (!sources || sources.length === 0) {
      throw new Error("No screen sources available for screenshot");
    }

    const screen = sources[0];
    const screenshotPath = path.join(app.getPath('temp'), `${Date.now()}_screenshot.png`);
    const image = screen.thumbnail.toPNG();

    return new Promise((resolve, reject) => {
      fs.writeFile(screenshotPath, image, (error) => {
        if (error) {
          console.error("Failed to save screenshot:", error);
          reject({ success: false, error: "Failed to save screenshot" });
        } else {
          console.log("Screenshot saved at:", screenshotPath);
          resolve({ success: true, path: screenshotPath });
        }
      });
    });
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    return { success: false, error: error.message };
  }
});
