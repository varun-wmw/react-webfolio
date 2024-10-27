const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Update the preload path to be absolute
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // Add this to ensure proper Node.js integration
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';
  const url = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`;
  
  console.log("Loading URL:", url);
  mainWindow.loadURL(url);
  
  // Open DevTools for debugging
  // mainWindow.webContents.openDevTools();
}


app.whenReady().then(createMainWindow);

ipcMain.handle('capture-screenshot', async () => {
  console.log("Received capture-screenshot request");
  try {
    // Wait for all sources to be available
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 } // Add proper resolution
    });
    
    if (!sources || sources.length === 0) {
      throw new Error("No screen sources available for screenshot");
    }

    const screen = sources[0];
    const screenshotPath = path.join(app.getPath('temp'), `${Date.now()}_screenshot.png`);
    
    // Ensure we have a thumbnail
    if (!screen.thumbnail) {
      throw new Error("No thumbnail available from screen source");
    }

    const image = screen.thumbnail.toPNG();

    fs.writeFileSync(screenshotPath, image); // Use sync version for simplicity
    console.log("Screenshot saved at:", screenshotPath);
    
    // Read the file back immediately
    const imageBuffer = fs.readFileSync(screenshotPath);
    
    // Send both path and buffer
    mainWindow.webContents.send('screenshot-captured', {
      success: true,
      path: screenshotPath,
      buffer: imageBuffer
    });

    return { success: true, path: screenshotPath };
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    mainWindow.webContents.send('screenshot-captured', { 
      success: false, 
      error: error.message 
    });
    throw error; // Re-throw to be caught by the renderer
  }
});