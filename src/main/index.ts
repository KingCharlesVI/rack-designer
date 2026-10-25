import { app, BrowserWindow, dialog, ipcMain, Menu, net, shell, type FileFilter, type MenuItemConstructorOptions } from 'electron'
import { promises as fs } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { isAllowedRegistryUrl } from '../renderer/src/model/packs'

let win: BrowserWindow | null = null
let dirty = false
let closing = false
/** Paths the user picked or opened; the renderer may only write to these. */
const approvedPaths = new Set<string>()
let pendingOpen: string | null = findProjectArg(process.argv)

const libraryDir = () => join(app.getPath('userData'), 'library')
const settingsFile = () => join(app.getPath('userData'), 'settings.json')
const MAX_FETCH_BYTES = 10 * 1024 * 1024

/** Community packs are fetched over https, or plain http on a private network (e.g. a homelab registry). */
function allowedUrl(raw: string): URL {
  const url = new URL(raw)
  if (!isAllowedRegistryUrl(url.toString())) throw new Error('Only https:// links, or http:// links on your local network, are allowed')
  return url
}

/** POST JSON to a registry's submission endpoint and return the status and parsed reply. */
async function postJson(raw: string, body: string, key?: string): Promise<{ status: number; data: unknown }> {
  const url = allowedUrl(raw)
  if (Buffer.byteLength(body) > MAX_FETCH_BYTES) throw new Error('The pack is too large')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (key) headers['x-pack-key'] = key
    const res = await net.fetch(url.toString(), { method: 'POST', body, headers, signal: controller.signal })
    const text = (await res.text()).slice(0, 200_000)
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text.slice(0, 300) || res.statusText }
    }
    return { status: res.status, data }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error(`Timed out contacting ${url.hostname}`)
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function fetchText(raw: string): Promise<string> {
  const url = allowedUrl(raw)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await net.fetch(url.toString(), { signal: controller.signal, cache: 'no-cache' })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText || 'error'} fetching ${url.hostname}`)
    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_FETCH_BYTES) throw new Error('The file is too large')
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > MAX_FETCH_BYTES) throw new Error('The file is too large')
    return buf.toString('utf-8')
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error(`Timed out contacting ${url.hostname}`)
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function readSettings(): Promise<Record<string, unknown>> {
  try {
    const data = JSON.parse(await fs.readFile(settingsFile(), 'utf-8'))
    return typeof data === 'object' && data && !Array.isArray(data) ? data : {}
  } catch {
    return {}
  }
}

function findProjectArg(argv: string[]): string | null {
  const arg = argv.slice(1).find((a) => !a.startsWith('-') && ['.rack', '.json'].includes(extname(a).toLowerCase()))
  return arg ? resolve(arg) : null
}

const send = (channel: string, ...args: unknown[]) => win?.webContents.send(channel, ...args)
const command = (cmd: string) => () => send('menu', cmd)

function buildMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: '&File',
      submenu: [
        { label: '&New design', accelerator: 'CmdOrCtrl+N', click: command('new') },
        { label: '&Open…', accelerator: 'CmdOrCtrl+O', click: command('open') },
        { type: 'separator' },
        { label: '&Save', accelerator: 'CmdOrCtrl+S', click: command('save') },
        { label: 'Save &as…', accelerator: 'CmdOrCtrl+Shift+S', click: command('saveAs') },
        { type: 'separator' },
        {
          label: '&Import',
          submenu: [
            { label: 'Merge racks from another design…', click: command('importMerge') },
            { label: 'Library pack…', click: command('importLibrary') }
          ]
        },
        {
          label: '&Export',
          submenu: [
            { label: 'Elevation drawing (SVG)…', click: command('exportSvg') },
            { label: 'Elevation drawing (PNG)…', click: command('exportPng') },
            { type: 'separator' },
            { label: 'Bill of materials (CSV)…', click: command('exportBom') },
            { label: 'Cable schedule (CSV)…', click: command('exportCables') },
            { label: 'Power report (CSV)…', click: command('exportPower') },
            { type: 'separator' },
            { label: 'Custom component library…', click: command('exportLibrary') }
          ]
        },
        { type: 'separator' },
        { label: 'Community packs…', accelerator: 'CmdOrCtrl+Shift+P', click: command('community') },
        { label: 'Open library folder', click: () => shell.openPath(libraryDir()) },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: '&Edit',
      submenu: [
        { label: '&Undo', accelerator: 'CmdOrCtrl+Z', click: command('undo') },
        { label: '&Redo', accelerator: 'CmdOrCtrl+Y', click: command('redo') },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { label: 'Duplicate', accelerator: 'CmdOrCtrl+D', click: command('duplicate') },
        { label: 'New custom component…', click: command('customComponent') },
        { label: 'New custom rack…', click: command('customRack') }
      ]
    },
    {
      label: '&View',
      submenu: [
        { label: 'Front', accelerator: 'F', registerAccelerator: false, click: command('viewFront') },
        { label: 'Rear', accelerator: 'R', registerAccelerator: false, click: command('viewRear') },
        { label: 'Toggle cables', accelerator: 'C', registerAccelerator: false, click: command('toggleCables') },
        { type: 'separator' },
        { label: 'Zoom in', accelerator: 'CmdOrCtrl+=', click: command('zoomIn') },
        { label: 'Zoom out', accelerator: 'CmdOrCtrl+-', click: command('zoomOut') },
        { label: 'Fit to window', accelerator: 'CmdOrCtrl+0', click: command('zoomFit') },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '&Help',
      submenu: [
        { label: 'Open example design', click: command('example') },
        { type: 'separator' },
        { label: 'About Rack Designer', click: () => dialog.showMessageBox(win!, { title: 'Rack Designer', message: `Rack Designer ${app.getVersion()}`, detail: 'Design server racks with power and data connection modelling.' }) }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function openPath(path: string) {
  try {
    const content = await fs.readFile(path, 'utf-8')
    approvedPaths.add(path)
    app.addRecentDocument(path)
    send('file:opened', { path, content })
  } catch (e) {
    dialog.showErrorBox('Could not open file', `${path}\n\n${(e as Error).message}`)
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    backgroundColor: '#15171b',
    title: 'Rack Designer',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.once('ready-to-show', () => win?.show())
  win.webContents.on('did-finish-load', () => {
    if (pendingOpen) {
      void openPath(pendingOpen)
      pendingOpen = null
    }
    if (process.env['RD_SCREENSHOT']) void screenshotRun(process.env['RD_SCREENSHOT'], (process.env['RD_STEPS'] ?? '').split('|').filter(Boolean))
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.on('close', (e) => {
    if (!dirty || closing) return
    e.preventDefault()
    const choice = dialog.showMessageBoxSync(win!, {
      type: 'warning',
      buttons: ['Save', "Don't save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Unsaved changes',
      message: 'Save changes to this design before closing?'
    })
    if (choice === 0) send('menu', 'saveAndClose')
    else if (choice === 1) {
      closing = true
      win?.close()
    }
  })
  win.on('closed', () => (win = null))

  if (process.env['ELECTRON_RENDERER_URL']) void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

/** Development aid: run menu commands and capture the window after each one. */
async function screenshotRun(dir: string, steps: string[]) {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  await fs.mkdir(dir, { recursive: true })
  await wait(1200)
  for (const [i, step] of ['start', ...steps].entries()) {
    if (step !== 'start') {
      if (step.startsWith('js:')) await win?.webContents.executeJavaScript(step.slice(3))
      else send('menu', step)
      await wait(900)
    }
    const img = await win!.webContents.capturePage()
    await fs.writeFile(join(dir, `${String(i).padStart(2, '0')}-${step.replace(/[^\w]+/g, '_').slice(0, 40)}.png`), img.toPNG())
  }
  closing = true
  app.quit()
}

function registerIpc() {
  ipcMain.handle('dialog:open', async (_e, opts: { filters: FileFilter[]; title?: string }) => {
    const r = await dialog.showOpenDialog(win!, { title: opts.title, filters: opts.filters, properties: ['openFile'] })
    if (r.canceled || !r.filePaths[0]) return null
    const path = r.filePaths[0]
    approvedPaths.add(path)
    return { path, content: await fs.readFile(path, 'utf-8') }
  })

  ipcMain.handle('dialog:save', async (_e, opts: { defaultPath?: string; filters: FileFilter[]; content: string | Uint8Array; title?: string }) => {
    const r = await dialog.showSaveDialog(win!, { title: opts.title, defaultPath: opts.defaultPath, filters: opts.filters })
    if (r.canceled || !r.filePath) return null
    await fs.writeFile(r.filePath, opts.content)
    approvedPaths.add(r.filePath)
    return r.filePath
  })

  ipcMain.handle('file:write', async (_e, path: string, content: string) => {
    if (!approvedPaths.has(path)) throw new Error('Writing to this path was not approved by the user')
    await fs.writeFile(path, content, 'utf-8')
    app.addRecentDocument(path)
    return true
  })

  ipcMain.handle('library:list', async () => {
    await fs.mkdir(libraryDir(), { recursive: true })
    const files = (await fs.readdir(libraryDir())).filter((f) => f.toLowerCase().endsWith('.json'))
    return Promise.all(files.map(async (name) => ({ name, content: await fs.readFile(join(libraryDir(), name), 'utf-8') })))
  })

  ipcMain.handle('library:save', async (_e, name: string, content: string) => {
    const safe = basename(name).replace(/[^\w.-]+/g, '_')
    if (!safe.endsWith('.json')) throw new Error('Library files must be .json')
    await fs.mkdir(libraryDir(), { recursive: true })
    await fs.writeFile(join(libraryDir(), safe), content, 'utf-8')
    return safe
  })

  ipcMain.handle('library:delete', async (_e, name: string) => {
    await fs.rm(join(libraryDir(), basename(name)), { force: true })
  })

  ipcMain.handle('net:fetchText', (_e, url: string) => fetchText(url))
  ipcMain.handle('net:postJson', (_e, url: string, body: string, key?: string) => postJson(url, body, key))

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    if (new URL(url).protocol !== 'https:') throw new Error('Only https:// links can be opened')
    await shell.openExternal(url)
  })

  ipcMain.handle('settings:get', () => readSettings())
  ipcMain.handle('settings:set', async (_e, patch: Record<string, unknown>) => {
    const next = { ...(await readSettings()), ...patch }
    await fs.mkdir(app.getPath('userData'), { recursive: true })
    await fs.writeFile(settingsFile(), JSON.stringify(next, null, 2), 'utf-8')
    return next
  })

  ipcMain.on('app:dirty', (_e, value: boolean) => (dirty = value))
  ipcMain.on('app:title', (_e, title: string) => win?.setTitle(title))
  ipcMain.on('app:closeAfterSave', () => {
    closing = true
    win?.close()
  })
}

// Screenshot runs use a throwaway profile so they never touch the user's library.
if (process.env['RD_SCREENSHOT']) app.setPath('userData', join(process.env['RD_SCREENSHOT'], 'userdata'))

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    const path = findProjectArg(argv)
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      if (path) void openPath(path)
    }
  })
  void app.whenReady().then(() => {
    registerIpc()
    buildMenu()
    createWindow()
  })
  app.on('window-all-closed', () => app.quit())
}
