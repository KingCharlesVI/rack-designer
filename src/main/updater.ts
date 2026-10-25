// Built-in updates from GitHub Releases via electron-updater. Updates are only
// offered: nothing downloads until the user asks, and installation happens on restart.
import { app, ipcMain, shell, type BrowserWindow } from 'electron'
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater'

export const RELEASES_URL = 'https://github.com/KingCharlesVI/rack-designer/releases'

export type UpdateState = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'unsupported'

export interface UpdateStatus {
  state: UpdateState
  currentVersion: string
  version?: string
  releaseDate?: string
  /** Plain-text release notes. */
  notes?: string
  percent?: number
  error?: string
  /** False for the portable build and development runs: updates are downloaded manually. */
  canInstall: boolean
  releaseUrl: string
}

const isPortable = () => !!process.env['PORTABLE_EXECUTABLE_DIR']

let status: UpdateStatus
let getWindow: () => BrowserWindow | null = () => null
let manualCheck = false

function publish(patch: Partial<UpdateStatus>) {
  status = { ...status, ...patch }
  getWindow()?.webContents.send('update:status', status)
}

/** Release notes arrive as HTML from GitHub; reduce them to plain text so nothing is rendered as markup. */
function notesToText(notes: UpdateInfo['releaseNotes']): string | undefined {
  if (!notes) return undefined
  const html = typeof notes === 'string' ? notes : notes.map((n) => `${n.version}\n${n.note ?? ''}`).join('\n\n')
  return html
    .replace(/<\s*(br|\/p|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 8000)
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/404|Unable to find latest version|No published versions/i.test(msg)) return 'No releases have been published yet.'
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|net::/i.test(msg)) return 'Could not reach GitHub. Check your internet connection.'
  return msg.split('\n')[0].slice(0, 300)
}

export function initUpdater(win: () => BrowserWindow | null, opts: { beforeInstall: () => void }) {
  getWindow = win
  const supported = app.isPackaged || !!process.env['RD_UPDATE_FEED']
  status = {
    state: supported ? 'idle' : 'unsupported',
    currentVersion: app.getVersion(),
    canInstall: supported && !isPortable(),
    releaseUrl: `${RELEASES_URL}/latest`
  }

  autoUpdater.autoDownload = false
  // Install a downloaded update when the app quits, except in development/test runs,
  // where quitting must never install anything on the developer's machine.
  autoUpdater.autoInstallOnAppQuit = !process.env['RD_UPDATE_FEED'] && !process.env['RD_SCREENSHOT']
  autoUpdater.allowPrerelease = false
  autoUpdater.logger = null
  // Development aid: point at a local "generic" feed (a folder with latest.yml and the installer).
  if (process.env['RD_UPDATE_FEED']) {
    autoUpdater.forceDevUpdateConfig = true
    autoUpdater.setFeedURL({ provider: 'generic', url: process.env['RD_UPDATE_FEED'] })
  }

  autoUpdater.on('checking-for-update', () => publish({ state: 'checking', error: undefined }))
  autoUpdater.on('update-available', (info: UpdateInfo) =>
    publish({
      state: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      notes: notesToText(info.releaseNotes),
      releaseUrl: `${RELEASES_URL}/tag/v${info.version}`
    })
  )
  autoUpdater.on('update-not-available', () => publish({ state: 'not-available' }))
  autoUpdater.on('download-progress', (p: ProgressInfo) => publish({ state: 'downloading', percent: p.percent }))
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => publish({ state: 'downloaded', version: info.version, percent: 100 }))
  autoUpdater.on('error', (e) => {
    // Background checks fail quietly (e.g. offline); manual checks report the problem.
    if (status.state === 'checking' && !manualCheck) publish({ state: 'idle' })
    else publish({ state: 'error', error: friendlyError(e) })
  })

  const check = async (manual: boolean) => {
    if (status.state === 'unsupported') return status
    if (status.state === 'downloading' || status.state === 'downloaded') return status
    manualCheck = manual
    try {
      await autoUpdater.checkForUpdates()
    } catch (e) {
      publish(manual ? { state: 'error', error: friendlyError(e) } : { state: 'idle' })
    }
    return status
  }

  ipcMain.handle('update:getStatus', () => status)
  ipcMain.handle('update:check', () => check(true))
  ipcMain.handle('update:download', async () => {
    if (!status.canInstall) {
      await shell.openExternal(status.releaseUrl)
      return status
    }
    if (status.state !== 'available' && status.state !== 'error') return status
    publish({ state: 'downloading', percent: 0, error: undefined })
    try {
      await autoUpdater.downloadUpdate()
    } catch (e) {
      publish({ state: 'error', error: friendlyError(e) })
    }
    return status
  })
  ipcMain.handle('update:install', () => {
    if (status.state !== 'downloaded') return false
    opts.beforeInstall()
    // Install silently and relaunch Rack Designer afterwards.
    setImmediate(() => autoUpdater.quitAndInstall(true, true))
    return true
  })
  ipcMain.handle('update:openReleasePage', () => shell.openExternal(status.releaseUrl))

  return { checkInBackground: () => void check(false) }
}
