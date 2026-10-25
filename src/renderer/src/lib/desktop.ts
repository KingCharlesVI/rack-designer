// Thin wrapper around the preload API, with browser fallbacks so the UI can also
// run in a plain browser during development.
import type { DesktopApi, FileFilter } from '../../../preload'

export type { FileFilter }

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

export const setDirty = (dirty: boolean) => api?.setDirty(dirty)
export const setTitle = (title: string) => {
  document.title = title
  api?.setTitle(title)
}
export const closeAfterSave = () => api?.closeAfterSave()
export const onMenu = (cb: (cmd: string) => void) => api?.onMenu(cb) ?? (() => {})
export const onFileOpened = (cb: (f: { path: string; content: string }) => void) => api?.onFileOpened(cb) ?? (() => {})
