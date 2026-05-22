const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

let mainWindow = null
let backendProcess = null

const BACKEND_PORT = 8765

function startBackend() {
  const backendDir = path.join(__dirname, '..', 'backend')
  backendProcess = spawn('uvicorn', ['app.main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)], {
    cwd: backendDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  backendProcess.stdout.on('data', (data) => console.log(`[backend] ${data}`))
  backendProcess.stderr.on('data', (data) => console.error(`[backend] ${data}`))
  backendProcess.on('close', (code) => console.log(`backend exited with code ${code}`))
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
}

function createWindow() {
  const distPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
  const isDev = !fs.existsSync(distPath)

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Novel Writer - AI 小说写作助手',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    mainWindow.loadFile(distPath)
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  startBackend()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopBackend()
})