import type { Category, ComponentDef, RackDef } from '../model/types'
import type { LibraryPack } from '../model/serialize'
import { genericComponents } from './generic'
import { infrastructureComponents } from './infrastructure'
import { networkComponents } from './network'
import { powerComponents } from './power'
import { rackModels } from './racks'
import { securityComponents } from './security'
import { serverComponents } from './servers'
import { storageComponents } from './storage'

export const CATEGORY_LABELS: Record<Category, string> = {
  server: 'Servers',
  switch: 'Switches',
  router: 'Routers',
  firewall: 'Firewalls & security',
  storage: 'Storage',
  gpu: 'GPU / AI systems',
  pdu: 'PDUs',
  ups: 'UPS & batteries',
  feed: 'Power feeds',
  'patch-panel': 'Patch panels',
  'cable-management': 'Cable management',
  blank: 'Blanking panels',
  shelf: 'Shelves & drawers',
  kvm: 'KVM & consoles',
  'console-server': 'Console servers',
  wireless: 'Wireless controllers',
  other: 'Other'
}

export const CATEGORY_SINGULAR: Record<Category, string> = {
  server: 'Server',
  switch: 'Switch',
  router: 'Router',
  firewall: 'Firewall / security',
  storage: 'Storage',
  gpu: 'GPU / AI system',
  pdu: 'PDU',
  ups: 'UPS',
  feed: 'Power feed',
  'patch-panel': 'Patch panel',
  'cable-management': 'Cable management',
  blank: 'Blanking panel',
  shelf: 'Shelf / drawer',
  kvm: 'KVM / console',
  'console-server': 'Console server',
  wireless: 'Wireless controller',
  other: 'Other'
}

function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Map<string, T>()
  for (const item of items) if (!seen.has(item.id)) seen.set(item.id, item)
  return [...seen.values()]
}

export const builtinComponents: ComponentDef[] = dedupe([
  ...genericComponents,
  ...serverComponents,
  ...networkComponents,
  ...securityComponents,
  ...storageComponents,
  ...powerComponents,
  ...infrastructureComponents
])

export const builtinRacks: RackDef[] = dedupe(rackModels)

export interface CatalogSource {
  file: string
  name: string
  pack: LibraryPack
}

export interface Catalog {
  components: ComponentDef[]
  racks: RackDef[]
  byId: Map<string, ComponentDef>
  rackById: Map<string, RackDef>
  manufacturers: string[]
  /** User library packs (custom components, imported and community packs) by file name. */
  sources: Map<string, CatalogSource>
}

/** Merge the built-in library with user packs. User entries override built-ins with the same id. */
export function buildCatalog(packs: { pack: LibraryPack; source: string }[] = []): Catalog {
  const byId = new Map<string, ComponentDef>()
  for (const c of builtinComponents) byId.set(c.id, c)
  const rackById = new Map<string, RackDef>()
  for (const r of builtinRacks) rackById.set(r.id, r)
  const sources = new Map<string, CatalogSource>()
  for (const { pack, source } of packs) {
    sources.set(source, { file: source, name: pack.name, pack })
    for (const c of pack.components) byId.set(c.id, { ...c, source })
    for (const r of pack.racks ?? []) rackById.set(r.id, { ...r, source })
  }
  const components = [...byId.values()]
  const manufacturers = [...new Set(components.map((c) => c.manufacturer))].sort((a, b) => a.localeCompare(b))
  return { components, racks: [...rackById.values()], byId, rackById, manufacturers, sources }
}

const searchText = new WeakMap<ComponentDef, string>()
function textOf(c: ComponentDef): string {
  let t = searchText.get(c)
  if (!t) {
    t = [c.manufacturer, c.model, c.category, CATEGORY_LABELS[c.category], `${c.uHeight}u`, c.description ?? '', ...(c.tags ?? [])].join(' ').toLowerCase()
    searchText.set(c, t)
  }
  return t
}

export interface SearchFilter {
  query: string
  category?: Category | ''
  manufacturer?: string
  uHeight?: number
  /** "builtin", or a user library file name. */
  source?: string
}

export function searchComponents(catalog: Catalog, f: SearchFilter): ComponentDef[] {
  const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean)
  return catalog.components.filter((c) => {
    if (f.category && c.category !== f.category) return false
    if (f.manufacturer && c.manufacturer !== f.manufacturer) return false
    if (f.uHeight !== undefined && c.uHeight !== f.uHeight) return false
    if (f.source && (f.source === 'builtin' ? !!c.source : c.source !== f.source)) return false
    if (!terms.length) return true
    const t = textOf(c)
    return terms.every((term) => t.includes(term))
  })
}
