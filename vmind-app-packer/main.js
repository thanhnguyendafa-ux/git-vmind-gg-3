const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    })

    // Load the index.html from the parent project's dist folder
    // In the packaged app, this is mapped to resources/app/renderer
    // In development/testing, it might need adjustment, but for the build:

    if (app.isPackaged) {
        win.loadFile(path.join(__dirname, 'renderer/index.html'))
    } else {
        // Fallback or dev mode - try to find the dist folder
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
