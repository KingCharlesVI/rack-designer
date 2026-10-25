// Community packs: validation of untrusted pack data, id namespacing, versions and
// the registry index format. Pure functions, shared by the app and the registry script.
import { PORT_TYPES } from './ports'
import { LIBRARY_FORMAT, LIBRARY_VERSION, type LibraryPack } from './serialize'
import type { Category, ComponentDef, PortGroup, RackDef } from './types'

export const REGISTRY_FORMAT = 'rack-designer-registry'
export const MAX_PACK_BYTES = 5 * 1024 * 1024
export const PACK_ID_RE = /^[a-z0-9][a-z0-9-]{1,40}(\.[a-z0-9][a-z0-9-]{0,40}){1,3}$/
const ITEM_ID_RE = /^[a-z0-9][a-z0-9._/-]{0,159}$/i
const SEMVER_RE = /^\d{1,5}\.\d{1,5}\.\d{1,5}$/
const COLOR_RE = /^#[0-9a-f]{6}$/i

export const CATEGORIES: Category[] = [
  'server', 'switch', 'router', 'firewall', 'storage', 'gpu', 'pdu', 'ups', 'feed',
  'patch-panel', 'cable-management', 'blank', 'shelf', 'kvm', 'console-server', 'wireless', 'other'
]
const RACK_STYLES: RackDef['style'][] = ['4-post-enclosed', '4-post-open', '2-post', 'wall-mount']

export const LICENSES = ['CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'MIT', 'Apache-2.0']

export interface PackValidation {
  pack: LibraryPack | null
  errors: string[]
  warnings: string[]
}

/**
 * Validate and sanitise a library pack. Only known fields are copied, so the result is
 * safe to store and render. `strict` applies the rules for community packs: full
 * metadata, known port types and no unknown values.
 */
export function validatePack(data: unknown, opts: { strict?: boolean } = {}): PackValidation {
  const strict = !!opts.strict
  const errors: string[] = []
  const warnings: string[] = []
  const problem = (msg: string) => (strict ? errors : warnings).push(msg)
  if (!isObj(data) || data.format !== LIBRARY_FORMAT) return { pack: null, errors: ['This is not a Rack Designer library pack'], warnings }
  if (typeof data.version === 'number' && data.version > LIBRARY_VERSION) errors.push(`Pack format v${data.version} needs a newer version of Rack Designer`)

  const name = str(data.name, 80)
  if (!name) errors.push('Pack name is required')
  const id = str(data.id, 90)
  if (id !== undefined && !PACK_ID_RE.test(id)) errors.push(`Pack id "${id}" must look like "author.pack-name" (lowercase letters, digits, dashes)`)
  else if (strict && !id) errors.push('Pack id is required (e.g. "yourname.homelab-gear")')
  const packVersion = str(data.packVersion, 20)
  if (packVersion !== undefined && !SEMVER_RE.test(packVersion)) errors.push(`Version "${packVersion}" must be like 1.0.0`)
  else if (strict && !packVersion) errors.push('Pack version is required (e.g. 1.0.0)')
  const author = str(data.author, 80)
  if (strict && !author) errors.push('Author is required')
  const description = str(data.description, 600)
  if (strict && !description) errors.push('Description is required')
  const license = str(data.license, 40)
  if (strict && !license) errors.push('License is required')
  const homepage = str(data.homepage, 300)
  if (homepage && !/^https:\/\//.test(homepage)) problem('Homepage must be an https:// link')
  const tags = Array.isArray(data.tags) ? data.tags.map((t) => str(t, 30)?.toLowerCase()).filter((t): t is string => !!t).slice(0, 12) : undefined

  const rawComponents = Array.isArray(data.components) ? data.components : []
  const rawRacks = Array.isArray(data.racks) ? data.racks : []
  if (rawComponents.length > 5000 || rawRacks.length > 1000) errors.push('Pack is too large (max 5000 components and 1000 racks)')
  const components: ComponentDef[] = []
  const ids = new Set<string>()
  rawComponents.slice(0, 5000).forEach((raw, i) => {
    const r = sanitizeComponent(raw, strict)
    const where = `Component ${i + 1}${isObj(raw) && typeof raw.model === 'string' ? ` (${raw.model.slice(0, 60)})` : ''}`
    r.errors.forEach((e) => errors.push(`${where}: ${e}`))
    r.warnings.forEach((e) => warnings.push(`${where}: ${e}`))
    if (!r.comp) return
    if (ids.has(r.comp.id)) return errors.push(`${where}: duplicate id "${r.comp.id}"`)
    ids.add(r.comp.id)
    components.push(r.comp)
  })
  const racks: RackDef[] = []
  const rackIds = new Set<string>()
  rawRacks.slice(0, 1000).forEach((raw, i) => {
    const r = sanitizeRack(raw)
    const where = `Rack ${i + 1}${isObj(raw) && typeof raw.model === 'string' ? ` (${raw.model.slice(0, 60)})` : ''}`
    r.errors.forEach((e) => errors.push(`${where}: ${e}`))
    if (!r.rack) return
    if (rackIds.has(r.rack.id)) return errors.push(`${where}: duplicate id "${r.rack.id}"`)
    rackIds.add(r.rack.id)
    racks.push(r.rack)
  })
  if (!components.length && !racks.length) errors.push('The pack contains no valid components or racks')
  if (strict && errors.length) return { pack: null, errors, warnings }
  if (!name || (id !== undefined && !PACK_ID_RE.test(id)) || (!components.length && !racks.length)) return { pack: null, errors, warnings }

  const pack: LibraryPack = clean({
    format: LIBRARY_FORMAT,
    version: LIBRARY_VERSION,
    id,
    name,
    packVersion: packVersion && SEMVER_RE.test(packVersion) ? packVersion : undefined,
    author,
    description,
    license,
    homepage: homepage && /^https:\/\//.test(homepage) ? homepage : undefined,
    tags: tags?.length ? tags : undefined,
    components,
    racks
  })
  return { pack, errors, warnings }
}

function sanitizeComponent(raw: unknown, strict: boolean): { comp: ComponentDef | null; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const problem = (m: string) => (strict ? errors : warnings).push(m)
  if (!isObj(raw)) return { comp: null, errors: ['not an object'], warnings }
  const id = str(raw.id, 160)
  if (!id || !ITEM_ID_RE.test(id)) errors.push('id must use letters, digits, ".", "-", "_" or "/"')
  const manufacturer = str(raw.manufacturer, 120)
  const model = str(raw.model, 160)
  if (!manufacturer) errors.push('manufacturer is required')
  if (!model) errors.push('model is required')
  const category = CATEGORIES.includes(raw.category as Category) ? (raw.category as Category) : undefined
  if (!category) errors.push(`unknown category "${String(raw.category)}"`)
  const uHeight = int(raw.uHeight, 0, 60)
  if (uHeight === undefined) errors.push('uHeight must be a whole number from 0 to 60')
  if (typeof raw.fullDepth !== 'boolean') problem('fullDepth should be true or false')
  const color = typeof raw.color === 'string' && COLOR_RE.test(raw.color) ? raw.color : undefined
  if (raw.color !== undefined && !color) problem('color must be a hex colour like #2b2f36')

  const ports: PortGroup[] = []
  const groupIds = new Set<string>()
  const rawPorts = Array.isArray(raw.ports) ? raw.ports : []
  if (!Array.isArray(raw.ports)) problem('ports should be a list')
  if (rawPorts.length > 64) errors.push('too many port groups (max 64)')
  let total = 0
  rawPorts.slice(0, 64).forEach((g, i) => {
    if (!isObj(g)) return errors.push(`port group ${i + 1} is not an object`)
    const gid = str(g.id, 60)
    const type = str(g.type, 40)
    const count = int(g.count, 1, 1024)
    const face = g.face === 'front' || g.face === 'rear' ? g.face : undefined
    if (!gid || !/^[\w.-]+$/.test(gid)) return errors.push(`port group ${i + 1}: invalid id`)
    if (groupIds.has(gid)) return errors.push(`port group ${i + 1}: duplicate id "${gid}"`)
    if (!type) return errors.push(`port group ${gid}: type is required`)
    if (!PORT_TYPES[type]) problem(`port group ${gid}: unknown port type "${type}"`)
    if (count === undefined) return errors.push(`port group ${gid}: count must be 1–1024`)
    if (!face) return errors.push(`port group ${gid}: face must be "front" or "rear"`)
    total += count
    groupIds.add(gid)
    const names = Array.isArray(g.names) ? g.names.slice(0, count).map((n) => str(n, 40) ?? '') : undefined
    ports.push(
      clean({
        id: gid,
        type,
        count,
        face,
        label: str(g.label, 40),
        start: int(g.start, 0, 100000),
        names: names?.length ? names : undefined,
        rows: int(g.rows, 1, 16),
        speed: str(g.speed, 20)
      })
    )
  })
  if (total > 4096) errors.push('too many ports (max 4096)')

  const power = isObj(raw.power) ? { typicalW: num(raw.power.typicalW, 0, 200000) ?? 0, maxW: num(raw.power.maxW, 0, 200000) ?? 0 } : undefined
  const pdu = isObj(raw.pdu)
    ? clean({
        voltage: num(raw.pdu.voltage, 1, 1000) ?? 230,
        maxAmps: num(raw.pdu.maxAmps, 0.1, 1000) ?? 16,
        phases: raw.pdu.phases === 3 ? (3 as const) : undefined,
        inputVoltage: num(raw.pdu.inputVoltage, 1, 1000),
        metered: raw.pdu.metered === true || undefined,
        switched: raw.pdu.switched === true || undefined
      })
    : undefined
  const ups = isObj(raw.ups)
    ? clean({ capacityW: num(raw.ups.capacityW, 0, 2000000) ?? 0, capacityVA: num(raw.ups.capacityVA, 0, 2000000) ?? 0, outputVoltage: num(raw.ups.outputVoltage, 1, 1000) })
    : undefined
  const feed = isObj(raw.feed) ? { voltage: num(raw.feed.voltage, 1, 1000) ?? 230, amps: num(raw.feed.amps, 0.1, 5000) ?? 16, phases: raw.feed.phases === 3 ? (3 as const) : (1 as const) } : undefined
  if (category === 'feed' && !feed) problem('power feeds need a "feed" section')

  if (errors.length || !id || !manufacturer || !model || !category || uHeight === undefined) return { comp: null, errors, warnings }
  const comp: ComponentDef = clean({
    id,
    manufacturer,
    model,
    category,
    uHeight: category === 'feed' ? 0 : uHeight,
    fullDepth: raw.fullDepth !== false,
    depthMm: num(raw.depthMm, 0, 3000),
    lengthMm: num(raw.lengthMm, 0, 3000),
    weightKg: num(raw.weightKg, 0, 3000),
    power,
    pdu,
    ups,
    feed,
    ports,
    color,
    description: str(raw.description, 500),
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => str(t, 30)).filter((t): t is string => !!t).slice(0, 12) : undefined,
    generic: raw.generic === true || undefined
  })
  return { comp, errors, warnings }
}

function sanitizeRack(raw: unknown): { rack: RackDef | null; errors: string[] } {
  const errors: string[] = []
  if (!isObj(raw)) return { rack: null, errors: ['not an object'] }
  const id = str(raw.id, 160)
  const manufacturer = str(raw.manufacturer, 120)
  const model = str(raw.model, 160)
  const uHeight = int(raw.uHeight, 1, 60)
  const widthMm = num(raw.widthMm, 300, 1500)
  const depthMm = num(raw.depthMm, 150, 2000)
  const style = RACK_STYLES.includes(raw.style as RackDef['style']) ? (raw.style as RackDef['style']) : undefined
  if (!id || !ITEM_ID_RE.test(id)) errors.push('invalid id')
  if (!manufacturer) errors.push('manufacturer is required')
  if (!model) errors.push('model is required')
  if (uHeight === undefined) errors.push('uHeight must be 1–60')
  if (widthMm === undefined) errors.push('widthMm must be 300–1500')
  if (depthMm === undefined) errors.push('depthMm must be 150–2000')
  if (!style) errors.push(`style must be one of ${RACK_STYLES.join(', ')}`)
  if (errors.length) return { rack: null, errors }
  return { rack: clean({ id: id!, manufacturer: manufacturer!, model: model!, uHeight: uHeight!, widthMm: widthMm!, depthMm: depthMm!, maxLoadKg: num(raw.maxLoadKg, 0, 10000), style: style! }), errors }
}

/** Prefix item ids with the pack id so packs can never collide with each other or the built-in library. */
export function namespacePack(pack: LibraryPack): LibraryPack {
  if (!pack.id) return pack
  const prefix = `${pack.id}/`
  const ns = (id: string) => (id.startsWith(prefix) ? id : prefix + id)
  return {
    ...pack,
    components: pack.components.map((c) => ({ ...c, id: ns(c.id) })),
    racks: (pack.racks ?? []).map((r) => ({ ...r, id: ns(r.id) }))
  }
}

/** Remove a pack-id prefix (used when re-publishing items from an installed pack). */
export function localId(id: string): string {
  const i = id.lastIndexOf('/')
  return i >= 0 ? id.slice(i + 1) : id
}

export function compareVersions(a = '0.0.0', b = '0.0.0'): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d) return d
  }
  return 0
}

export function packFileName(id: string): string {
  return `pack-${id}.json`
}

export function slugify(s: string, max = 40): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '')
}

// ---- Registry index ----

export interface RegistryEntry {
  id: string
  name: string
  packVersion: string
  author: string
  description: string
  license: string
  homepage?: string
  tags: string[]
  components: number
  racks: number
  manufacturers: string[]
  /** Path of the pack file, relative to the index URL (or an absolute https URL). */
  path: string
  sha256: string
  size: number
}

export interface RegistryIndex {
  format: typeof REGISTRY_FORMAT
  version: 1
  name: string
  updated: string
  packs: RegistryEntry[]
}

export function registryEntry(pack: LibraryPack, path: string, sha256: string, size: number): RegistryEntry {
  return clean({
    id: pack.id!,
    name: pack.name,
    packVersion: pack.packVersion ?? '1.0.0',
    author: pack.author ?? '',
    description: pack.description ?? '',
    license: pack.license ?? '',
    homepage: pack.homepage,
    tags: pack.tags ?? [],
    components: pack.components.length,
    racks: pack.racks?.length ?? 0,
    manufacturers: [...new Set(pack.components.map((c) => c.manufacturer).concat((pack.racks ?? []).map((r) => r.manufacturer)))].sort().slice(0, 30),
    path,
    sha256,
    size
  })
}

export function parseRegistry(text: string): RegistryIndex {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('The registry index is not valid JSON')
  }
  if (!isObj(data) || data.format !== REGISTRY_FORMAT || !Array.isArray(data.packs)) throw new Error('This URL is not a Rack Designer pack registry')
  const packs: RegistryEntry[] = []
  for (const p of data.packs.slice(0, 5000)) {
    if (!isObj(p)) continue
    const id = str(p.id, 90)
    const path = str(p.path, 400)
    const sha256 = str(p.sha256, 64)
    if (!id || !PACK_ID_RE.test(id) || !path || !sha256 || !/^[0-9a-f]{64}$/.test(sha256)) continue
    if (/^[a-z]+:/i.test(path) && !/^https:\/\//.test(path)) continue
    packs.push({
      id,
      name: str(p.name, 80) ?? id,
      packVersion: SEMVER_RE.test(String(p.packVersion)) ? String(p.packVersion) : '0.0.0',
      author: str(p.author, 80) ?? '',
      description: str(p.description, 600) ?? '',
      license: str(p.license, 40) ?? '',
      homepage: typeof p.homepage === 'string' && /^https:\/\//.test(p.homepage) ? p.homepage.slice(0, 300) : undefined,
      tags: Array.isArray(p.tags) ? p.tags.map((t) => str(t, 30)).filter((t): t is string => !!t).slice(0, 12) : [],
      components: int(p.components, 0, 100000) ?? 0,
      racks: int(p.racks, 0, 100000) ?? 0,
      manufacturers: Array.isArray(p.manufacturers) ? p.manufacturers.map((m) => str(m, 120)).filter((m): m is string => !!m).slice(0, 30) : [],
      path,
      sha256,
      size: int(p.size, 0, MAX_PACK_BYTES) ?? 0
    })
  }
  return { format: REGISTRY_FORMAT, version: 1, name: str(data.name, 80) ?? 'Pack registry', updated: str(data.updated, 40) ?? '', packs }
}

/** For a registry hosted in a GitHub repo, the page where contributors upload new packs (GitHub forks and opens a PR). */
export function githubUploadUrl(indexUrl: string): string | null {
  const m = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*\/)?index\.json$/.exec(indexUrl)
  if (!m) return null
  const [, owner, repo, branch, dir = ''] = m
  return `https://github.com/${owner}/${repo}/upload/${branch}/${dir}packs`
}

export function githubRepoUrl(indexUrl: string): string | null {
  const m = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//.exec(indexUrl)
  return m ? `https://github.com/${m[1]}/${m[2]}` : null
}

// ---- helpers ----

function isObj(x: unknown): x is Record<string, any> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}
function str(x: unknown, max: number): string | undefined {
  if (typeof x !== 'string') return undefined
  const t = x.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  return t ? t.slice(0, max) : undefined
}
function num(x: unknown, min: number, max: number): number | undefined {
  return typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max ? x : undefined
}
function int(x: unknown, min: number, max: number): number | undefined {
  const n = num(x, min, max)
  return n !== undefined && Number.isInteger(n) ? n : undefined
}
/** Drop undefined fields so serialised packs stay tidy. */
function clean<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k]
  return o
}
