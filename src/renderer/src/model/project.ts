import { checkCompatibility, defaultCableColor, findPort, getPorts, isPowerSink, isPowerSource, portType, suggestCable } from './ports'
import type { ComponentDef, Connection, Device, Face, Mount, PortRef, Project, Rack, RackDef } from './types'

export const U_MM = 44.45

export function uid(prefix = ''): string {
  const s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
  return prefix ? `${prefix}_${s}` : s
}

export function createProject(name = 'Untitled design'): Project {
  return {
    id: uid('prj'),
    name,
    racks: [],
    devices: [],
    connections: [],
    components: {},
    settings: { powerBasis: 'typical', derating: 0.8 }
  }
}

export function rackFromDef(def: RackDef, name: string): Rack {
  return {
    id: uid('rack'),
    name,
    uHeight: def.uHeight,
    widthMm: def.widthMm,
    depthMm: def.depthMm,
    maxLoadKg: def.maxLoadKg,
    style: def.style,
    manufacturer: def.generic ? undefined : def.manufacturer,
    model: def.model
  }
}

export function nextRackName(p: Project): string {
  for (let i = p.racks.length + 1; ; i++) {
    const name = `Rack ${String(i).padStart(2, '0')}`
    if (!p.racks.some((r) => r.name === name)) return name
  }
}

export type MountKind = Mount['kind']

export function mountKindFor(comp: ComponentDef): MountKind {
  if (comp.category === 'feed') return 'feed'
  if (comp.uHeight === 0) return 'zeroU'
  return 'rack'
}

export function getComponent(p: Project, device: Device): ComponentDef {
  return p.components[device.componentId] ?? missingComponent(device.componentId)
}

const missing = new Map<string, ComponentDef>()
export function missingComponent(id: string): ComponentDef {
  let c = missing.get(id)
  if (!c) {
    c = { id, manufacturer: 'Unknown', model: `Missing component (${id})`, category: 'other', uHeight: 1, fullDepth: true, ports: [] }
    missing.set(id, c)
  }
  return c
}

export function findDevice(p: Project, id: string): Device | undefined {
  return p.devices.find((d) => d.id === id)
}

export function findRack(p: Project, id: string): Rack | undefined {
  return p.racks.find((r) => r.id === id)
}

/** Faces a rack-mounted device blocks. */
export function blockedFaces(comp: ComponentDef, face: Face): Face[] {
  return comp.fullDepth ? ['front', 'rear'] : [face]
}

/** Returns an error message when the mount is not possible, otherwise null. */
export function canPlace(p: Project, comp: ComponentDef, rackId: string, mount: Mount, ignoreId?: string): string | null {
  const rack = findRack(p, rackId)
  if (!rack) return 'Rack not found'
  const kind = mountKindFor(comp)
  if (kind !== mount.kind) {
    return kind === 'zeroU' ? 'This is a zero-U component; mount it on the side of a rack' : kind === 'feed' ? 'Power feeds are placed above a rack' : 'This component must be mounted in rack units'
  }
  const others = p.devices.filter((d) => d.rackId === rackId && d.id !== ignoreId)
  if (mount.kind === 'rack') {
    const top = mount.u + comp.uHeight - 1
    if (!Number.isInteger(mount.u) || mount.u < 1 || top > rack.uHeight) return `Does not fit: needs U${mount.u}–U${top} but rack is ${rack.uHeight}U`
    const faces = blockedFaces(comp, mount.face)
    for (const d of others) {
      if (d.mount.kind !== 'rack') continue
      const oc = getComponent(p, d)
      const oTop = d.mount.u + oc.uHeight - 1
      if (d.mount.u > top || oTop < mount.u) continue
      const of = blockedFaces(oc, d.mount.face)
      if (faces.some((f) => of.includes(f))) return `Overlaps ${d.name} (U${d.mount.u}${oc.uHeight > 1 ? `–U${oTop}` : ''})`
    }
    return null
  }
  if (mount.kind === 'zeroU') {
    const clash = others.find((d) => d.mount.kind === 'zeroU' && d.mount.side === mount.side && d.mount.slot === mount.slot)
    return clash ? `The ${mount.side} side slot ${mount.slot + 1} is used by ${clash.name}` : null
  }
  const clash = others.find((d) => d.mount.kind === 'feed' && d.mount.slot === mount.slot)
  return clash ? `Feed slot used by ${clash.name}` : null
}

/** Find the closest free mount position to the requested one. */
export function findFreeMount(p: Project, comp: ComponentDef, rackId: string, preferred?: Mount): Mount | null {
  const rack = findRack(p, rackId)
  if (!rack) return null
  const kind = mountKindFor(comp)
  if (kind === 'feed') {
    for (let slot = 0; slot < 16; slot++) {
      const m: Mount = { kind: 'feed', slot }
      if (!canPlace(p, comp, rackId, m)) return m
    }
    return null
  }
  if (kind === 'zeroU') {
    const pref = preferred?.kind === 'zeroU' ? preferred : undefined
    const sides: ('left' | 'right')[] = pref?.side === 'right' ? ['right', 'left'] : ['left', 'right']
    for (const slot of [0, 1] as const) {
      for (const side of sides) {
        const m: Mount = { kind: 'zeroU', side, slot }
        if (!canPlace(p, comp, rackId, m)) return m
      }
    }
    return null
  }
  const face = preferred?.kind === 'rack' ? preferred.face : 'front'
  const start = preferred?.kind === 'rack' ? preferred.u : rack.uHeight - comp.uHeight + 1
  for (let delta = 0; delta <= rack.uHeight; delta++) {
    for (const u of delta === 0 ? [start] : [start + delta, start - delta]) {
      const m: Mount = { kind: 'rack', u, face }
      if (u >= 1 && !canPlace(p, comp, rackId, m)) return m
    }
  }
  return null
}

const PREFIX: Partial<Record<ComponentDef['category'], string>> = {
  server: 'srv', switch: 'sw', router: 'rtr', firewall: 'fw', storage: 'stor', gpu: 'gpu', pdu: 'pdu', ups: 'ups',
  feed: 'feed', 'patch-panel': 'pp', kvm: 'kvm', 'console-server': 'con', wireless: 'wlc'
}

export function nextDeviceName(p: Project, comp: ComponentDef): string {
  const prefix = PREFIX[comp.category]
  if (!prefix) return comp.model
  const used = new Set(p.devices.map((d) => d.name))
  for (let i = 1; ; i++) {
    const name = `${prefix}-${String(i).padStart(2, '0')}`
    if (!used.has(name)) return name
  }
}

/** Ensure the project carries a snapshot of the component. */
export function registerComponent(p: Project, comp: ComponentDef): void {
  if (!p.components[comp.id]) p.components[comp.id] = structuredClone(comp)
}

export function addDevice(p: Project, comp: ComponentDef, rackId: string, mount: Mount, name?: string): Device | string {
  const err = canPlace(p, comp, rackId, mount)
  if (err) return err
  registerComponent(p, comp)
  const device: Device = { id: uid('dev'), componentId: comp.id, rackId, mount, name: name ?? nextDeviceName(p, comp) }
  p.devices.push(device)
  return device
}

export function moveDevice(p: Project, deviceId: string, rackId: string, mount: Mount): string | null {
  const d = findDevice(p, deviceId)
  if (!d) return 'Device not found'
  const err = canPlace(p, getComponent(p, d), rackId, mount, deviceId)
  if (err) return err
  d.rackId = rackId
  d.mount = mount
  return null
}

export function removeDevices(p: Project, ids: string[]): void {
  const set = new Set(ids)
  p.devices = p.devices.filter((d) => !set.has(d.id))
  p.connections = p.connections.filter((c) => !set.has(c.a.deviceId) && !set.has(c.b.deviceId))
}

export function removeRack(p: Project, rackId: string): void {
  removeDevices(p, p.devices.filter((d) => d.rackId === rackId).map((d) => d.id))
  p.racks = p.racks.filter((r) => r.id !== rackId)
}

/** Drop component snapshots no device uses any more. */
export function pruneComponents(p: Project): void {
  const used = new Set(p.devices.map((d) => d.componentId))
  for (const id of Object.keys(p.components)) if (!used.has(id)) delete p.components[id]
}

export const portKey = (r: PortRef) => `${r.deviceId}:${r.portId}`
export const sameRef = (a: PortRef, b: PortRef) => a.deviceId === b.deviceId && a.portId === b.portId

export function connectionAt(p: Project, ref: PortRef): Connection | undefined {
  return p.connections.find((c) => sameRef(c.a, ref) || sameRef(c.b, ref))
}

export function otherEnd(c: Connection, ref: PortRef): PortRef {
  return sameRef(c.a, ref) ? c.b : c.a
}

export function resolvePort(p: Project, ref: PortRef) {
  const device = findDevice(p, ref.deviceId)
  if (!device) return undefined
  const comp = getComponent(p, device)
  const port = findPort(comp, ref.portId)
  if (!port) return undefined
  return { device, comp, port }
}

export function describePort(p: Project, ref: PortRef): string {
  const r = resolvePort(p, ref)
  return r ? `${r.device.name} ${r.port.label}` : `${ref.deviceId}:${ref.portId}`
}

export interface ConnectOptions {
  cableType?: string
  lengthM?: number
  color?: string
  label?: string
}

export function connect(p: Project, a: PortRef, b: PortRef, opts: ConnectOptions = {}): Connection | string {
  if (sameRef(a, b)) return 'Cannot connect a port to itself'
  const ra = resolvePort(p, a)
  const rb = resolvePort(p, b)
  if (!ra || !rb) return 'Port not found'
  if (a.deviceId === b.deviceId && portType(ra.port.type).kind === 'power') return 'Cannot power a device from itself'
  for (const ref of [a, b]) {
    const existing = connectionAt(p, ref)
    if (existing) return `${describePort(p, ref)} is already connected to ${describePort(p, otherEnd(existing, ref))}`
  }
  const compat = checkCompatibility(ra.port.type, rb.port.type)
  if (!compat.ok) return compat.message ?? 'Incompatible ports'
  const kind = portType(ra.port.type).kind
  let [src, dst, srcType, dstType] = [a, b, ra.port.type, rb.port.type]
  if (kind === 'power' && !isPowerSource(srcType) && isPowerSink(srcType)) {
    ;[src, dst, srcType, dstType] = [b, a, rb.port.type, ra.port.type]
  }
  const lengthM = opts.lengthM ?? (portType(dstType).role === 'plug' ? undefined : estimateCableLength(p, src, dst))
  const conn: Connection = {
    id: uid('cbl'),
    a: src,
    b: dst,
    kind,
    cableType: opts.cableType ?? suggestCable(srcType, dstType, lengthM),
    lengthM,
    color: opts.color ?? defaultCableColor(kind, srcType),
    label: opts.label
  }
  p.connections.push(conn)
  return conn
}

export function disconnect(p: Project, connectionIds: string[]): void {
  const set = new Set(connectionIds)
  p.connections = p.connections.filter((c) => !set.has(c.id))
}

const STANDARD_LENGTHS = [0.5, 1, 1.5, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50, 75, 100]

/** Approximate physical position (metres) of a device, for cable estimates. */
function physicalPosition(p: Project, d: Device): { x: number; y: number; face: Face | 'side'; rackIdx: number; rackTop: number } {
  const rackIdx = p.racks.findIndex((r) => r.id === d.rackId)
  let x = 0
  for (let i = 0; i < rackIdx; i++) x += p.racks[i].widthMm / 1000
  const rack = p.racks[rackIdx]
  const plinth = 0.1
  const rackTop = plinth + ((rack?.uHeight ?? 42) * U_MM) / 1000
  const comp = getComponent(p, d)
  x += (rack?.widthMm ?? 600) / 2000
  if (d.mount.kind === 'rack') {
    const y = plinth + ((d.mount.u - 1 + comp.uHeight / 2) * U_MM) / 1000
    return { x, y, face: d.mount.face, rackIdx, rackTop }
  }
  if (d.mount.kind === 'zeroU') return { x, y: rackTop / 2, face: 'side', rackIdx, rackTop }
  return { x, y: rackTop + 0.3, face: 'side', rackIdx, rackTop }
}

export function estimateCableLength(p: Project, a: PortRef, b: PortRef): number {
  const da = findDevice(p, a.deviceId)
  const db = findDevice(p, b.deviceId)
  if (!da || !db) return 1
  const pa = physicalPosition(p, da)
  const pb = physicalPosition(p, db)
  let meters: number
  if (pa.rackIdx === pb.rackIdx) {
    meters = Math.abs(pa.y - pb.y) + 0.4
    const rack = p.racks[pa.rackIdx]
    if (pa.face !== pb.face && pa.face !== 'side' && pb.face !== 'side') meters += (rack?.depthMm ?? 1000) / 1000
  } else {
    // Up to the overhead tray, across, and back down.
    const tray = 0.3
    meters = pa.rackTop - pa.y + (pb.rackTop - pb.y) + 2 * tray + Math.abs(pa.x - pb.x) + 0.5
  }
  const withSlack = meters * 1.1
  return STANDARD_LENGTHS.find((l) => l >= withSlack) ?? Math.ceil(withSlack)
}

export function portsOf(p: Project, device: Device) {
  return getPorts(getComponent(p, device))
}

export function rackWeightKg(p: Project, rackId: string): { total: number; unknown: number } {
  let total = 0
  let unknown = 0
  for (const d of p.devices) {
    if (d.rackId !== rackId) continue
    const w = getComponent(p, d).weightKg
    if (w === undefined) unknown++
    else total += w
  }
  return { total, unknown }
}

export function usedUnits(p: Project, rackId: string): number {
  const occupied = new Set<number>()
  for (const d of p.devices) {
    if (d.rackId !== rackId || d.mount.kind !== 'rack') continue
    const h = getComponent(p, d).uHeight
    for (let u = d.mount.u; u < d.mount.u + h; u++) occupied.add(u)
  }
  return occupied.size
}

/** Copy racks/devices/connections from another project, giving them fresh ids. */
export function mergeProject(into: Project, from: Project): { racks: number; devices: number } {
  const rackMap = new Map<string, string>()
  const devMap = new Map<string, string>()
  const names = new Set(into.racks.map((r) => r.name))
  for (const r of from.racks) {
    const id = uid('rack')
    rackMap.set(r.id, id)
    let name = r.name
    while (names.has(name)) name = `${name} (imported)`
    names.add(name)
    into.racks.push({ ...structuredClone(r), id, name })
  }
  for (const [id, comp] of Object.entries(from.components)) if (!into.components[id]) into.components[id] = structuredClone(comp)
  for (const d of from.devices) {
    const rackId = rackMap.get(d.rackId)
    if (!rackId) continue
    const id = uid('dev')
    devMap.set(d.id, id)
    into.devices.push({ ...structuredClone(d), id, rackId })
  }
  for (const c of from.connections) {
    const a = devMap.get(c.a.deviceId)
    const b = devMap.get(c.b.deviceId)
    if (!a || !b) continue
    into.connections.push({ ...structuredClone(c), id: uid('cbl'), a: { ...c.a, deviceId: a }, b: { ...c.b, deviceId: b } })
  }
  return { racks: from.racks.length, devices: devMap.size }
}
