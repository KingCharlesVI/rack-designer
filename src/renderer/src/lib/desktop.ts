// Thin wrapper around the preload API, with browser fallbacks so the UI can also
// run in a plain browser during development.
import type { DesktopApi, FileFilter, UpdateStatus } from '../../../preload'

export type { FileFilter, UpdateStatus }

const api: DesktopApi | undefined = window.api

export const isDesktop = !!api

export const FILTERS = {
  project: [{ name: 'Rack Designer project', extensions: ['rack'] }, { name: 'JSON', extensions: ['json'] }],
  library: [{ name: 'Rack Designer library', extensions: ['json'] }],
  svg: [{ name: 'SVG image', extensions: ['svg'] }],
  png: [{ name: 'PNG image', extensions: ['png'] }],
  csv: [{ name: 'CSV', extensions: ['csv'] }]
} satisfies Record<string, FileFilter[]>

export async function openFile(filters: FileFilter[], title?: string): Promise<{ path: string; content: string } | null> {
  if (api) return api.openFile(filters, title)
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',')
    input.onchange = async () => {
      const file = input.files?.[0]
      resolve(file ? { path: file.name, content: await file.text() } : null)
    }
    input.click()
  })
}

export async function saveFileAs(defaultPath: string, filters: FileFilter[], content: string | Uint8Array, title?: string): Promise<string | null> {
  if (api) return api.saveFileAs({ defaultPath, filters, content, title })
  const blob = new Blob([content as BlobPart])
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = defaultPath
  a.click()
  URL.revokeObjectURL(a.href)
  return defaultPath
}

export async function writeFile(path: string, content: string): Promise<void> {
  if (api) await api.writeFile(path, content)
  else await saveFileAs(path, [], content)
}

const LS_KEY = 'rack-designer-library'

export async function listLibrary(): Promise<{ name: string; content: string }[]> {
  if (api) return api.listLibrary()
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export async function saveLibrary(name: string, content: string): Promise<string> {
  if (api) return api.saveLibrary(name, content)
  const all = (await listLibrary()).filter((f) => f.name !== name)
  all.push({ name, content })
  localStorage.setItem(LS_KEY, JSON.stringify(all))
  return name
}

export async function deleteLibrary(name: string): Promise<void> {
  if (api) return api.deleteLibrary(name)
  localStorage.setItem(LS_KEY, JSON.stringify((await listLibrary()).filter((f) => f.name !== name)))
}

export async function fetchText(url: string): Promise<string> {
  if (api) return api.fetchText(url)
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
  return res.text()
}

export async function postJson(url: string, body: string, key?: string): Promise<{ status: number; data: unknown }> {
  if (api) return api.postJson(url, body, key)
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (key) headers['x-pack-key'] = key
  const res = await fetch(url, { method: 'POST', body, headers })
  return { status: res.status, data: await res.json().catch(() => ({ error: res.statusText })) }
}

export async function openExternal(url: string): Promise<void> {
  if (api) return api.openExternal(url)
  window.open(url, '_blank', 'noopener')
}

const SETTINGS_KEY = 'rack-designer-settings'

export async function getSettings(): Promise<Record<string, unknown>> {
  if (api) return api.getSettings()
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export async function setSettings(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (api) return api.setSettings(patch)
  const next = { ...(await getSettings()), ...patch }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  return next
}

export async function appInfo(): Promise<{ version: string; packaged: boolean; portable: boolean }> {
  return api ? api.appInfo() : { version: import.meta.env.VITE_APP_VERSION ?? 'dev', packaged: false, portable: false }
}

const UNSUPPORTED: UpdateStatus = { state: 'unsupported', currentVersion: 'dev', canInstall: false, releaseUrl: 'https://github.com/KingCharlesVI/rack-designer/releases/latest' }

export const updates = {
  status: (): Promise<UpdateStatus> => api?.updateStatus() ?? Promise.resolve(UNSUPPORTED),
  check: (): Promise<UpdateStatus> => api?.checkForUpdates() ?? Promise.resolve(UNSUPPORTED),
  download: (): Promise<UpdateStatus> => api?.downloadUpdate() ?? Promise.resolve(UNSUPPORTED),
  install: (): Promise<boolean> => api?.installUpdate() ?? Promise.resolve(false),
  openReleasePage: (): Promise<void> => api?.openReleasePage() ?? openExternal(UNSUPPORTED.releaseUrl),
  onStatus: (cb: (s: UpdateStatus) => void): (() => void) => api?.onUpdateStatus(cb) ?? (() => {})
}

export const setDirty = (dirty: boolean) => api?.setDirty(dirty)
export const setTitle = (title: string) => {
  document.title = title
  api?.setTitle(title)
}
export const closeAfterSave = () => api?.closeAfterSave()
export const onMenu = (cb: (cmd: string) => void) => api?.onMenu(cb) ?? (() => {})
export const onFileOpened = (cb: (f: { path: string; content: string }) => void) => api?.onFileOpened(cb) ?? (() => {})
