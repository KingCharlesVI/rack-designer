import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

export interface FileFilter {
  name: string
  extensions: string[]
}

const api = {
  openFile: (filters: FileFilter[], title?: string): Promise<{ path: string; content: string } | null> => ipcRenderer.invoke('dialog:open', { filters, title }),
  saveFileAs: (opts: { defaultPath?: string; filters: FileFilter[]; content: string | Uint8Array; title?: string }): Promise<string | null> =>
    ipcRenderer.invoke('dialog:save', opts),
  writeFile: (path: string, content: string): Promise<boolean> => ipcRenderer.invoke('file:write', path, content),
  listLibrary: (): Promise<{ name: string; content: string }[]> => ipcRenderer.invoke('library:list'),
  saveLibrary: (name: string, content: string): Promise<string> => ipcRenderer.invoke('library:save', name, content),
  deleteLibrary: (name: string): Promise<void> => ipcRenderer.invoke('library:delete', name),
  setDirty: (dirty: boolean) => ipcRenderer.send('app:dirty', dirty),
  setTitle: (title: string) => ipcRenderer.send('app:title', title),
  closeAfterSave: () => ipcRenderer.send('app:closeAfterSave'),
  onMenu: (cb: (command: string) => void) => {
    const fn = (_e: IpcRendererEvent, cmd: string) => cb(cmd)
    ipcRenderer.on('menu', fn)
    return () => ipcRenderer.removeListener('menu', fn)
  },
  onFileOpened: (cb: (file: { path: string; content: string }) => void) => {
    const fn = (_e: IpcRendererEvent, file: { path: string; content: string }) => cb(file)
    ipcRenderer.on('file:opened', fn)
    return () => ipcRenderer.removeListener('file:opened', fn)
  }
}

export type DesktopApi = typeof api

contextBridge.exposeInMainWorld('api', api)
