import { createProject, pruneComponents } from './project'
import type { ComponentDef, Project } from './types'

export { LIBRARY_FORMAT, LIBRARY_VERSION, parseLibrary, serializeLibrary, serializePack, type LibraryPack } from './packs'

export const PROJECT_FORMAT = 'rack-designer-project'
export const PROJECT_VERSION = 1

export interface ProjectFile {
  format: typeof PROJECT_FORMAT
  version: number
  savedAt: string
  app: string
  project: Project
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
