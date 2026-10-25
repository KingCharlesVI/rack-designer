import { produce } from 'immer'
import { create } from 'zustand'
import { buildCatalog, builtinRacks, type Catalog } from './library'
import { createProject, rackFromDef } from './model/project'
import { parseLibrary, type LibraryPack } from './model/serialize'
import type { Face, PortRef, Project, Selection } from './model/types'

const HISTORY_LIMIT = 200

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  text: string
}

export interface UserPack {
  file: string
  pack: LibraryPack
}

export interface DialogState {
  kind: 'custom-component'
  /** Component to edit, or a template to start from. */
  componentId?: string
  duplicate?: boolean
}

interface State {
  project: Project
  filePath: string | null
  version: number
  savedVersion: number
  past: Project[]
  future: Project[]
  selection: Selection | null
  /** First end of a connection being drawn. */
  pending: PortRef | null
  face: Face
  showCables: boolean
  zoom: number
  pan: { x: number; y: number }
  catalog: Catalog
  userPacks: UserPack[]
  toasts: Toast[]
  dialog: DialogState | null

  /** Apply an edit. The recipe may return an error string, in which case nothing changes. */
  edit: (recipe: (draft: Project) => string | null | void, opts?: { select?: Selection | null }) => string | null
  undo: () => void
  redo: () => void
  load: (project: Project, filePath: string | null) => void
  markSaved: (filePath: string) => void
  select: (s: Selection | null) => void
  setPending: (p: PortRef | null) => void
  setFace: (f: Face) => void
  toggleCables: () => void
  setView: (zoom: number, pan: { x: number; y: number }) => void
  setUserPacks: (files: { name: string; content: string }[]) => void
  toast: (text: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
  openDialog: (d: DialogState | null) => void
}

export function starterProject(): Project {
  const p = createProject()
  p.racks.push(rackFromDef(builtinRacks[0], 'Rack 01'))
  return p
}

let toastId = 0

export const useStore = create<State>((set, get) => ({
  project: starterProject(),
  filePath: null,
  version: 0,
  savedVersion: 0,
  past: [],
  future: [],
  selection: null,
  pending: null,
  face: 'front',
  showCables: true,
  zoom: 1,
  pan: { x: 40, y: 20 },
  catalog: buildCatalog(),
  userPacks: [],
  toasts: [],
  dialog: null,

  edit: (recipe, opts) => {
    const { project, past, version } = get()
    let error: string | null = null
    const next = produce(project, (draft) => {
      error = recipe(draft) || null
    })
    if (error) return error
    if (next === project) return null
    set({
      project: next,
      past: [...past.slice(-HISTORY_LIMIT + 1), project],
      future: [],
      version: version + 1,
      ...(opts && 'select' in opts ? { selection: opts.select ?? null } : {})
    })
    return null
  },
  undo: () => {
    const { past, project, future, version } = get()
    if (!past.length) return
    set({ project: past[past.length - 1], past: past.slice(0, -1), future: [project, ...future], version: version + 1, pending: null })
    get().select(validSelection(get().project, get().selection))
  },
  redo: () => {
    const { past, project, future, version } = get()
    if (!future.length) return
    set({ project: future[0], future: future.slice(1), past: [...past, project], version: version + 1, pending: null })
    get().select(validSelection(get().project, get().selection))
  },
  load: (project, filePath) => set({ project, filePath, past: [], future: [], selection: null, pending: null, version: 0, savedVersion: 0 }),
  markSaved: (filePath) => set({ filePath, savedVersion: get().version }),
  select: (selection) => set({ selection }),
  setPending: (pending) => set({ pending }),
  setFace: (face) => set({ face }),
  toggleCables: () => set({ showCables: !get().showCables }),
  setView: (zoom, pan) => set({ zoom, pan }),
  setUserPacks: (files) => {
    const packs: UserPack[] = []
    for (const f of files) {
      try {
        packs.push({ file: f.name, pack: parseLibrary(f.content) })
      } catch (e) {
        get().toast(`Library ${f.name}: ${(e as Error).message}`, 'error')
      }
    }
    set({ userPacks: packs, catalog: buildCatalog(packs.map((p) => ({ pack: p.pack, source: p.file }))) })
  },
  toast: (text, kind = 'info') => {
    const id = ++toastId
    set({ toasts: [...get().toasts.slice(-4), { id, kind, text }] })
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 3500)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  openDialog: (dialog) => set({ dialog })
}))

function validSelection(p: Project, s: Selection | null): Selection | null {
  if (!s) return null
  switch (s.kind) {
    case 'rack':
      return p.racks.some((r) => r.id === s.id) ? s : null
    case 'device':
      return p.devices.some((d) => d.id === s.id) ? s : null
    case 'connection':
      return p.connections.some((c) => c.id === s.id) ? s : null
    case 'port':
      return p.devices.some((d) => d.id === s.deviceId) ? s : null
  }
}

export const isDirty = (s: Pick<State, 'version' | 'savedVersion'>) => s.version !== s.savedVersion
