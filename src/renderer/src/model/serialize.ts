import { createProject, pruneComponents } from './project'
import type { ComponentDef, Project, RackDef } from './types'

export const PROJECT_FORMAT = 'rack-designer-project'
export const PROJECT_VERSION = 1
export const LIBRARY_FORMAT = 'rack-designer-library'
export const LIBRARY_VERSION = 1

export interface ProjectFile {
  format: typeof PROJECT_FORMAT
  version: number
  savedAt: string
  app: string
  project: Project
}

export interface LibraryPack {
  format: typeof LIBRARY_FORMAT
  version: number
  name: string
  description?: string
  components: ComponentDef[]
  racks?: RackDef[]
}

export class FileFormatError extends Error {}

export function serializeProject(project: Project): string {
  const p = structuredClone(project)
  pruneComponents(p)
  const file: ProjectFile = { format: PROJECT_FORMAT, version: PROJECT_VERSION, savedAt: new Date().toISOString(), app: 'Rack Designer', project: p }
  return JSON.stringify(file, null, 2)
}

/** Parse and validate a project file, migrating older versions. */
export function parseProject(text: string, lookup?: (id: string) => ComponentDef | undefined): { project: Project; warnings: string[] } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new FileFormatError('The file is not valid JSON')
  }
  if (!isObject(data) || data.format !== PROJECT_FORMAT) throw new FileFormatError('This is not a Rack Designer project file')
  const version = typeof data.version === 'number' ? data.version : 0
  if (version > PROJECT_VERSION) throw new FileFormatError(`This file was made by a newer version of Rack Designer (format v${version})`)
  const raw = data.project
  if (!isObject(raw)) throw new FileFormatError('The file has no project data')

  const warnings: string[] = []
  const base = createProject(typeof raw.name === 'string' ? raw.name : 'Imported design')
  const project: Project = {
    ...base,
    id: typeof raw.id === 'string' ? raw.id : base.id,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    racks: arrayOf(raw.racks, (r) => typeof r.id === 'string' && typeof r.uHeight === 'number', 'rack', warnings),
    devices: arrayOf(raw.devices, (d) => typeof d.id === 'string' && typeof d.componentId === 'string' && isObject(d.mount), 'device', warnings),
    connections: arrayOf(raw.connections, (c) => typeof c.id === 'string' && isObject(c.a) && isObject(c.b), 'connection', warnings),
    components: isObject(raw.components) ? (raw.components as Record<string, ComponentDef>) : {},
    settings: { ...base.settings, ...(isObject(raw.settings) ? raw.settings : {}) }
  }
  for (const r of project.racks) {
    r.widthMm ??= 600
    r.depthMm ??= 1000
    r.style ??= '4-post-enclosed'
    r.name ??= 'Rack'
  }
  for (const d of project.devices) {
    if (project.components[d.componentId]) continue
    const found = lookup?.(d.componentId)
    if (found) {
      project.components[d.componentId] = structuredClone(found)
    } else {
      warnings.push(`Component "${d.componentId}" used by ${d.name} is not defined in the file or library`)
    }
  }
  return { project, warnings }
}

export function serializeLibrary(name: string, components: ComponentDef[], racks: RackDef[] = []): string {
  const pack: LibraryPack = { format: LIBRARY_FORMAT, version: LIBRARY_VERSION, name, components, racks }
  return JSON.stringify(pack, null, 2)
}

export function parseLibrary(text: string): LibraryPack {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new FileFormatError('The file is not valid JSON')
  }
  if (!isObject(data) || data.format !== LIBRARY_FORMAT) throw new FileFormatError('This is not a Rack Designer library pack')
  const warnings: string[] = []
  const components = arrayOf<ComponentDef>(
    data.components,
    (c) => typeof c.id === 'string' && typeof c.model === 'string' && typeof c.uHeight === 'number' && Array.isArray(c.ports),
    'component',
    warnings
  )
  const racks = arrayOf<RackDef>(data.racks ?? [], (r) => typeof r.id === 'string' && typeof r.uHeight === 'number', 'rack', warnings)
  if (warnings.length && !components.length && !racks.length) throw new FileFormatError(warnings.join('\n'))
  return {
    format: LIBRARY_FORMAT,
    version: typeof data.version === 'number' ? data.version : 1,
    name: typeof data.name === 'string' ? data.name : 'Imported library',
    description: typeof data.description === 'string' ? data.description : undefined,
    components,
    racks
  }
}

function isObject(x: unknown): x is Record<string, any> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function arrayOf<T>(x: unknown, ok: (v: Record<string, any>) => boolean, what: string, warnings: string[]): T[] {
  if (!Array.isArray(x)) return []
  const out: T[] = []
  x.forEach((v, i) => {
    if (isObject(v) && ok(v)) out.push(v as T)
    else warnings.push(`Skipped invalid ${what} #${i + 1}`)
  })
  return out
}
