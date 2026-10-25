import type { ComponentDef, Face, PortGroup } from './types'

export type PowerRole = 'outlet' | 'inlet' | 'plug'

export interface PortType {
  id: string
  name: string
  kind: 'data' | 'power'
  /** Data compatibility family. */
  family?: string
  /** Power: outlet = receptacle that supplies power, inlet = appliance inlet that
   * needs a detachable cord, plug = attached cord plug that goes straight into an outlet. */
  role?: PowerRole
  /** Power: the connector that mates with this one (used to name cords). */
  mate?: string
  /** Power: outlets a plug can go into. */
  fits?: string[]
  /** Power: current rating in amps (per line for 3-phase). */
  ratingA?: number
  phases?: 3
  /** Drawn size in mm (width, height). */
  size: [number, number]
}

const T = (t: PortType): PortType => t

export const PORT_TYPES: Record<string, PortType> = Object.fromEntries(
  [
    // Copper / generic data
    T({ id: 'rj45', name: 'RJ45', kind: 'data', family: 'rj45', size: [14, 12] }),
    T({ id: 'rj45-poe', name: 'RJ45 PoE', kind: 'data', family: 'rj45', size: [14, 12] }),
    T({ id: 'rj45-mgmt', name: 'RJ45 Mgmt', kind: 'data', family: 'rj45', size: [14, 12] }),
    T({ id: 'console-rj45', name: 'Console (RJ45)', kind: 'data', family: 'console', size: [14, 12] }),
    T({ id: 'usb-a', name: 'USB-A', kind: 'data', family: 'usb', size: [12, 6] }),
    T({ id: 'usb-c', name: 'USB-C', kind: 'data', family: 'usb', size: [9, 4] }),
    T({ id: 'db9', name: 'Serial DB9', kind: 'data', family: 'serial', size: [18, 9] }),
    T({ id: 'vga', name: 'VGA', kind: 'data', family: 'video', size: [18, 9] }),
    T({ id: 'hdmi', name: 'HDMI', kind: 'data', family: 'video', size: [14, 6] }),
    T({ id: 'displayport', name: 'DisplayPort', kind: 'data', family: 'video', size: [14, 6] }),
    T({ id: 'coax', name: 'Coax (F/BNC)', kind: 'data', family: 'coax', size: [10, 10] }),
    T({ id: 'stack', name: 'Stacking port', kind: 'data', family: 'stack', size: [20, 10] }),
    T({ id: 'sas', name: 'Mini-SAS HD', kind: 'data', family: 'sas', size: [16, 8] }),
    // Transceiver cages
    T({ id: 'sfp', name: 'SFP (1G)', kind: 'data', family: 'sfp', size: [14, 10] }),
    T({ id: 'sfp+', name: 'SFP+ (10G)', kind: 'data', family: 'sfp', size: [14, 10] }),
    T({ id: 'sfp28', name: 'SFP28 (25G)', kind: 'data', family: 'sfp', size: [14, 10] }),
    T({ id: 'sfp56', name: 'SFP56 (50G)', kind: 'data', family: 'sfp', size: [14, 10] }),
    T({ id: 'sfp-fc', name: 'SFP (Fibre Channel)', kind: 'data', family: 'sfp', size: [14, 10] }),
    T({ id: 'qsfp+', name: 'QSFP+ (40G)', kind: 'data', family: 'qsfp', size: [19, 9] }),
    T({ id: 'qsfp28', name: 'QSFP28 (100G)', kind: 'data', family: 'qsfp', size: [19, 9] }),
    T({ id: 'qsfp56', name: 'QSFP56 (200G)', kind: 'data', family: 'qsfp', size: [19, 9] }),
    T({ id: 'qsfp-dd', name: 'QSFP-DD (400G)', kind: 'data', family: 'qsfp', size: [19, 11] }),
    T({ id: 'qsfp112', name: 'QSFP112 (400G)', kind: 'data', family: 'qsfp', size: [19, 9] }),
    T({ id: 'osfp', name: 'OSFP (400/800G)', kind: 'data', family: 'osfp', size: [23, 11] }),
    // Structured cabling
    T({ id: 'lc', name: 'LC Duplex', kind: 'data', family: 'fiber-lc', size: [13, 9] }),
    T({ id: 'sc', name: 'SC Duplex', kind: 'data', family: 'fiber-sc', size: [18, 10] }),
    T({ id: 'mpo', name: 'MPO/MTP', kind: 'data', family: 'fiber-mpo', size: [14, 8] }),
    T({ id: 'keystone', name: 'Keystone RJ45', kind: 'data', family: 'rj45', size: [15, 15] }),
    // Power: outlets (receptacles)
    T({ id: 'c13', name: 'IEC C13 outlet', kind: 'power', role: 'outlet', mate: 'C14', ratingA: 10, size: [16, 12] }),
    T({ id: 'c19', name: 'IEC C19 outlet', kind: 'power', role: 'outlet', mate: 'C20', ratingA: 16, size: [20, 14] }),
    T({ id: 'nema-5-15r', name: 'NEMA 5-15R', kind: 'power', role: 'outlet', mate: '5-15P', ratingA: 15, size: [18, 20] }),
    T({ id: 'nema-5-20r', name: 'NEMA 5-20R', kind: 'power', role: 'outlet', mate: '5-20P', ratingA: 20, size: [18, 20] }),
    T({ id: 'nema-l5-20r', name: 'NEMA L5-20R', kind: 'power', role: 'outlet', mate: 'L5-20P', ratingA: 20, size: [22, 22] }),
    T({ id: 'nema-l5-30r', name: 'NEMA L5-30R', kind: 'power', role: 'outlet', mate: 'L5-30P', ratingA: 30, size: [24, 24] }),
    T({ id: 'nema-l6-20r', name: 'NEMA L6-20R', kind: 'power', role: 'outlet', mate: 'L6-20P', ratingA: 20, size: [22, 22] }),
    T({ id: 'nema-l6-30r', name: 'NEMA L6-30R', kind: 'power', role: 'outlet', mate: 'L6-30P', ratingA: 30, size: [24, 24] }),
    T({ id: 'nema-l21-30r', name: 'NEMA L21-30R (3ph)', kind: 'power', role: 'outlet', mate: 'L21-30P', ratingA: 30, phases: 3, size: [26, 26] }),
    T({ id: 'nema-l15-30r', name: 'NEMA L15-30R (3ph)', kind: 'power', role: 'outlet', mate: 'L15-30P', ratingA: 30, phases: 3, size: [26, 26] }),
    T({ id: 'iec309-16r', name: 'IEC 60309 16A outlet', kind: 'power', role: 'outlet', mate: 'IEC309 16A', ratingA: 16, size: [26, 26] }),
    T({ id: 'iec309-32r', name: 'IEC 60309 32A outlet', kind: 'power', role: 'outlet', mate: 'IEC309 32A', ratingA: 32, size: [30, 30] }),
    T({ id: 'iec309-32r-3ph', name: 'IEC 60309 32A 3ph outlet', kind: 'power', role: 'outlet', mate: 'IEC309 32A 3ph', ratingA: 32, phases: 3, size: [32, 32] }),
    T({ id: 'schuko-r', name: 'Schuko (CEE 7/3) outlet', kind: 'power', role: 'outlet', mate: 'Schuko', ratingA: 16, size: [22, 22] }),
    T({ id: 'bs1363-r', name: 'BS 1363 (UK) outlet', kind: 'power', role: 'outlet', mate: 'BS 1363', ratingA: 13, size: [22, 22] }),
    T({ id: 'as3112-r', name: 'AS/NZS 3112 outlet', kind: 'power', role: 'outlet', mate: 'AS/NZS 3112', ratingA: 10, size: [22, 22] }),
    T({ id: 'dc-out', name: 'DC output', kind: 'power', role: 'outlet', mate: 'DC', ratingA: 30, size: [14, 14] }),
    T({ id: 'hardwire-out', name: 'Hardwired circuit', kind: 'power', role: 'outlet', mate: 'Hardwire', ratingA: 60, size: [20, 20] }),
    T({ id: 'hardwire-3ph-out', name: 'Hardwired 3-phase circuit', kind: 'power', role: 'outlet', mate: 'Hardwire', ratingA: 60, phases: 3, size: [20, 20] }),
    // Power: appliance inlets (need a detachable cord)
    T({ id: 'c14', name: 'IEC C14 inlet', kind: 'power', role: 'inlet', mate: 'C13', ratingA: 10, size: [16, 12] }),
    T({ id: 'c20', name: 'IEC C20 inlet', kind: 'power', role: 'inlet', mate: 'C19', ratingA: 16, size: [20, 14] }),
    T({ id: 'c16', name: 'IEC C16 inlet', kind: 'power', role: 'inlet', mate: 'C15', ratingA: 10, size: [16, 12] }),
    T({ id: 'c8', name: 'IEC C8 inlet', kind: 'power', role: 'inlet', mate: 'C7', ratingA: 2.5, size: [12, 7] }),
    T({ id: 'dc-in', name: 'DC input', kind: 'power', role: 'inlet', mate: 'DC', ratingA: 30, size: [14, 14] }),
    // Power: attached cord plugs
    T({ id: 'nema-5-15p', name: 'NEMA 5-15P cord', kind: 'power', role: 'plug', fits: ['nema-5-15r', 'nema-5-20r'], ratingA: 15, size: [18, 20] }),
    T({ id: 'nema-5-20p', name: 'NEMA 5-20P cord', kind: 'power', role: 'plug', fits: ['nema-5-20r'], ratingA: 20, size: [18, 20] }),
    T({ id: 'nema-l5-20p', name: 'NEMA L5-20P cord', kind: 'power', role: 'plug', fits: ['nema-l5-20r'], ratingA: 20, size: [22, 22] }),
    T({ id: 'nema-l5-30p', name: 'NEMA L5-30P cord', kind: 'power', role: 'plug', fits: ['nema-l5-30r'], ratingA: 30, size: [24, 24] }),
    T({ id: 'nema-l6-20p', name: 'NEMA L6-20P cord', kind: 'power', role: 'plug', fits: ['nema-l6-20r'], ratingA: 20, size: [22, 22] }),
    T({ id: 'nema-l6-30p', name: 'NEMA L6-30P cord', kind: 'power', role: 'plug', fits: ['nema-l6-30r'], ratingA: 30, size: [24, 24] }),
    T({ id: 'nema-l21-30p', name: 'NEMA L21-30P cord (3ph)', kind: 'power', role: 'plug', fits: ['nema-l21-30r'], ratingA: 30, phases: 3, size: [26, 26] }),
    T({ id: 'nema-l15-30p', name: 'NEMA L15-30P cord (3ph)', kind: 'power', role: 'plug', fits: ['nema-l15-30r'], ratingA: 30, phases: 3, size: [26, 26] }),
    T({ id: 'iec309-16p', name: 'IEC 60309 16A cord', kind: 'power', role: 'plug', fits: ['iec309-16r'], ratingA: 16, size: [26, 26] }),
    T({ id: 'iec309-32p', name: 'IEC 60309 32A cord', kind: 'power', role: 'plug', fits: ['iec309-32r'], ratingA: 32, size: [30, 30] }),
    T({ id: 'iec309-32p-3ph', name: 'IEC 60309 32A 3ph cord', kind: 'power', role: 'plug', fits: ['iec309-32r-3ph'], ratingA: 32, phases: 3, size: [32, 32] }),
    T({ id: 'schuko-p', name: 'Schuko cord', kind: 'power', role: 'plug', fits: ['schuko-r'], ratingA: 16, size: [22, 22] }),
    T({ id: 'bs1363-p', name: 'BS 1363 (UK) cord', kind: 'power', role: 'plug', fits: ['bs1363-r'], ratingA: 13, size: [22, 22] }),
    T({ id: 'hardwire-in', name: 'Hardwired input', kind: 'power', role: 'plug', fits: ['hardwire-out'], ratingA: 60, size: [20, 20] }),
    T({ id: 'hardwire-3ph-in', name: 'Hardwired 3-phase input', kind: 'power', role: 'plug', fits: ['hardwire-3ph-out'], ratingA: 60, phases: 3, size: [20, 20] }),
    T({ id: 'c14-p', name: 'IEC C14 cord', kind: 'power', role: 'plug', fits: ['c13'], ratingA: 10, size: [16, 12] }),
    T({ id: 'c20-p', name: 'IEC C20 cord', kind: 'power', role: 'plug', fits: ['c19'], ratingA: 16, size: [20, 14] })
  ].map((t) => [t.id, t])
)

export function portType(id: string): PortType {
  return PORT_TYPES[id] ?? { id, name: id, kind: 'data', family: id, size: [14, 12] }
}

export const isPowerSource = (typeId: string) => portType(typeId).role === 'outlet'
export const isPowerSink = (typeId: string) => {
  const r = portType(typeId).role
  return r === 'inlet' || r === 'plug'
}

/** A fully expanded port on a component. */
export interface PortDef {
  id: string
  groupId: string
  type: string
  face: Face
  label: string
  speed?: string
  /** Per-group colour override. */
  color?: string
}

const portCache = new WeakMap<ComponentDef, PortDef[]>()

export function expandGroup(g: PortGroup): PortDef[] {
  const out: PortDef[] = []
  const start = g.start ?? 1
  for (let i = 0; i < g.count; i++) {
    const label = g.names?.[i] ?? `${g.label ?? ''}${start + i}`
    out.push({ id: `${g.id}-${i + 1}`, groupId: g.id, type: g.type, face: g.face, label, speed: g.speed, color: g.color })
  }
  return out
}

export function getPorts(comp: ComponentDef): PortDef[] {
  let ports = portCache.get(comp)
  if (!ports) {
    ports = comp.ports.flatMap(expandGroup)
    portCache.set(comp, ports)
  }
  return ports
}

export function findPort(comp: ComponentDef, portId: string): PortDef | undefined {
  return getPorts(comp).find((p) => p.id === portId)
}

export interface Compatibility {
  ok: boolean
  /** Severity of the note when ok, or the reason when not ok. */
  level: 'ok' | 'info' | 'warning' | 'error'
  message?: string
}

const DATA_PAIRS: Record<string, Compatibility> = {
  'qsfp|sfp': { ok: true, level: 'info', message: 'QSFP to SFP requires a breakout cable or QSA adapter' },
  'osfp|qsfp': { ok: true, level: 'info', message: 'OSFP to QSFP requires a breakout or adapter cable' },
  'osfp|sfp': { ok: true, level: 'info', message: 'OSFP to SFP requires a breakout cable' },
  'rj45|sfp': { ok: true, level: 'warning', message: 'RJ45 to SFP cage requires an RJ45 (copper) SFP transceiver' },
  'fiber-lc|sfp': { ok: true, level: 'ok' },
  'fiber-lc|qsfp': { ok: true, level: 'ok' },
  'fiber-mpo|qsfp': { ok: true, level: 'ok' },
  'fiber-mpo|osfp': { ok: true, level: 'ok' },
  'fiber-lc|osfp': { ok: true, level: 'ok' },
  'fiber-lc|fiber-sc': { ok: true, level: 'info', message: 'LC to SC hybrid patch cord required' },
  'console|rj45': { ok: true, level: 'ok' },
  'console|usb': { ok: true, level: 'ok' },
  'console|serial': { ok: true, level: 'ok' },
  'serial|usb': { ok: true, level: 'info', message: 'USB to serial adapter required' }
}

/** Can a cable connect these two port types? Order does not matter. */
export function checkCompatibility(typeA: string, typeB: string): Compatibility {
  const a = portType(typeA)
  const b = portType(typeB)
  if (a.kind !== b.kind) {
    return { ok: false, level: 'error', message: 'Cannot connect a power port to a data port' }
  }
  if (a.kind === 'power') {
    const src = a.role === 'outlet' ? a : b.role === 'outlet' ? b : undefined
    const sink = src === a ? b : a
    if (!src || sink.role === 'outlet') {
      return { ok: false, level: 'error', message: 'A power connection needs exactly one outlet and one inlet/plug' }
    }
    if (sink.role === 'plug' && !sink.fits?.includes(src.id)) {
      return { ok: false, level: 'error', message: `${sink.name} does not fit a ${src.name}` }
    }
    if (sink.role === 'inlet' && (src.ratingA ?? 0) < (sink.ratingA ?? 0)) {
      return { ok: true, level: 'warning', message: `${src.name} (${src.ratingA}A) is rated lower than ${sink.name} (${sink.ratingA}A)` }
    }
    return { ok: true, level: 'ok' }
  }
  if (a.family === b.family) return { ok: true, level: 'ok' }
  const key = [a.family, b.family].sort().join('|')
  return DATA_PAIRS[key] ?? { ok: true, level: 'warning', message: `${a.name} and ${b.name} are not directly compatible` }
}

/** Suggest a cable description for a connection between two port types. */
export function suggestCable(typeA: string, typeB: string, lengthM?: number): string {
  const a = portType(typeA)
  const b = portType(typeB)
  if (a.kind === 'power') {
    const src = a.role === 'outlet' ? a : b
    const sink = src === a ? b : a
    if (sink.role === 'plug') return 'Direct (attached cord)'
    return `Power cord ${src.mate}–${sink.mate}`
  }
  const fams = new Set([a.family, b.family])
  if (fams.has('console')) return 'Console cable'
  if (fams.size === 1 && fams.has('rj45')) return 'Cat6A patch cable'
  if (fams.has('fiber-mpo')) return 'MPO-12 OM4 trunk'
  if (fams.has('fiber-lc')) return 'OM4 LC duplex patch'
  if (fams.has('fiber-sc')) return 'OS2 SC duplex patch'
  const cage = (t: PortType) => t.family === 'sfp' || t.family === 'qsfp' || t.family === 'osfp'
  if (cage(a) && cage(b)) {
    const breakout = a.family !== b.family ? ' breakout' : ''
    const speed = [a, b].map((t) => /\((.*)\)/.exec(t.name)?.[1]).find(Boolean) ?? ''
    if (lengthM !== undefined && lengthM > 5) return `${speed} AOC${breakout}`.trim()
    return `${speed} DAC${breakout}`.trim()
  }
  if (fams.has('usb')) return 'USB cable'
  if (fams.has('video')) return 'Video cable'
  if (fams.has('serial')) return 'Serial cable'
  return 'Patch cable'
}

/** Colour-coding of ports on the drawing, by class of port. */
export interface PortColorClass {
  id: string
  label: string
  color: string
}

export const PORT_COLOR_CLASSES: PortColorClass[] = [
  { id: 'copper', label: 'Copper (RJ45)', color: '#9ca3af' },
  { id: 'poe', label: 'PoE (RJ45)', color: '#f59e0b' },
  { id: 'mgmt', label: 'Management', color: '#3b82f6' },
  { id: 'console', label: 'Console / serial', color: '#2dd4bf' },
  { id: 'sfp', label: 'SFP / SFP+ / SFP28', color: '#a78bfa' },
  { id: 'qsfp', label: 'QSFP / OSFP', color: '#f472b6' },
  { id: 'fc', label: 'Fibre Channel', color: '#4ade80' },
  { id: 'fiber', label: 'Fibre (LC / SC / MPO)', color: '#22d3ee' },
  { id: 'stack', label: 'Stacking', color: '#e2e8f0' },
  { id: 'peripheral', label: 'USB / video / SAS / coax', color: '#64748b' },
  { id: 'power-out', label: 'Power outlet', color: '#ef4444' },
  { id: 'power-in', label: 'Power inlet / plug', color: '#fca5a5' }
]

const COLOR_BY_CLASS = new Map(PORT_COLOR_CLASSES.map((c) => [c.id, c]))

export function portColorClass(typeId: string): PortColorClass {
  const t = portType(typeId)
  let id: string
  if (t.kind === 'power') id = t.role === 'outlet' ? 'power-out' : 'power-in'
  else if (typeId === 'rj45-poe') id = 'poe'
  else if (typeId === 'rj45-mgmt') id = 'mgmt'
  else if (typeId === 'sfp-fc') id = 'fc'
  else {
    const byFamily: Record<string, string> = {
      rj45: 'copper', console: 'console', serial: 'console', sfp: 'sfp', qsfp: 'qsfp', osfp: 'qsfp',
      'fiber-lc': 'fiber', 'fiber-sc': 'fiber', 'fiber-mpo': 'fiber', stack: 'stack'
    }
    id = byFamily[t.family ?? ''] ?? 'peripheral'
  }
  return COLOR_BY_CLASS.get(id)!
}

/** Colour of a port on the drawing: the group's override, else its class colour. */
export function portColor(port: Pick<PortDef, 'type' | 'color'>): string {
  return port.color ?? portColorClass(port.type).color
}

export const CABLE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#f5f5f5', '#9ca3af'
]

export function defaultCableColor(kind: 'data' | 'power', typeA: string): string {
  if (kind === 'power') return '#e11d48'
  const fam = portType(typeA).family
  if (fam === 'fiber-lc' || fam === 'fiber-mpo' || fam === 'qsfp' || fam === 'osfp') return '#06b6d4'
  if (fam === 'sfp') return '#a855f7'
  if (fam === 'console') return '#eab308'
  return '#3b82f6'
}
