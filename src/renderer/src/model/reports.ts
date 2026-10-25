import { analyzePower, type PowerAnalysis } from './power'
import { findPort } from './ports'
import { findDevice, findRack, getComponent, resolvePort } from './project'
import type { Device, Project } from './types'

export interface BomLine {
  category: string
  manufacturer: string
  model: string
  quantity: number
  uHeight?: number
  unitWeightKg?: number
}

export function billOfMaterials(p: Project): BomLine[] {
  const lines = new Map<string, BomLine>()
  const add = (key: string, line: Omit<BomLine, 'quantity'>) => {
    const existing = lines.get(key)
    if (existing) existing.quantity++
    else lines.set(key, { ...line, quantity: 1 })
  }
  for (const r of p.racks) {
    add(`rack|${r.manufacturer}|${r.model}|${r.uHeight}`, {
      category: 'rack',
      manufacturer: r.manufacturer ?? 'Generic',
      model: r.model ?? `${r.uHeight}U rack ${r.widthMm}×${r.depthMm} mm`,
      uHeight: r.uHeight
    })
  }
  for (const d of p.devices) {
    const c = getComponent(p, d)
    if (c.category === 'feed') continue
    add(`dev|${c.id}`, { category: c.category, manufacturer: c.manufacturer, model: c.model, uHeight: c.uHeight, unitWeightKg: c.weightKg })
  }
  for (const c of p.connections) {
    if (c.cableType === 'Direct (attached cord)') continue
    const len = c.lengthM !== undefined ? `${c.lengthM} m` : 'length TBD'
    add(`cable|${c.cableType}|${c.lengthM}|${c.color}`, { category: 'cable', manufacturer: '', model: `${c.cableType ?? 'Cable'} ${len}` })
  }
  const rank = (l: BomLine) => (l.category === 'rack' ? 0 : l.category === 'cable' ? 2 : 1)
  return [...lines.values()].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.category.localeCompare(b.category) ||
      a.manufacturer.localeCompare(b.manufacturer) ||
      a.model.localeCompare(b.model)
  )
}

export function location(p: Project, d: Device): string {
  const rack = findRack(p, d.rackId)?.name ?? '?'
  const m = d.mount
  if (m.kind === 'rack') {
    const h = getComponent(p, d).uHeight
    return `${rack} U${m.u}${h > 1 ? `-${m.u + h - 1}` : ''}${m.face === 'rear' ? ' (rear)' : ''}`
  }
  if (m.kind === 'zeroU') return `${rack} ${m.side} side${m.slot ? ' (outer)' : ''}`
  return `${rack} feed ${m.slot + 1}`
}

export interface CableRow {
  id: string
  label: string
  kind: string
  fromDevice: string
  fromPort: string
  fromLocation: string
  toDevice: string
  toPort: string
  toLocation: string
  cableType: string
  lengthM: string
  color: string
}

export function cableSchedule(p: Project): CableRow[] {
  return p.connections.map((c, i) => {
    const a = resolvePort(p, c.a)
    const b = resolvePort(p, c.b)
    return {
      id: c.id,
      label: c.label ?? `C${String(i + 1).padStart(3, '0')}`,
      kind: c.kind,
      fromDevice: a?.device.name ?? '?',
      fromPort: a?.port.label ?? c.a.portId,
      fromLocation: a ? location(p, a.device) : '',
      toDevice: b?.device.name ?? '?',
      toPort: b?.port.label ?? c.b.portId,
      toLocation: b ? location(p, b.device) : '',
      cableType: c.cableType ?? '',
      lengthM: c.lengthM?.toString() ?? '',
      color: c.color ?? ''
    }
  })
}

export function powerReport(p: Project, power: PowerAnalysis = analyzePower(p)) {
  return p.devices
    .map((d) => {
      const c = getComponent(p, d)
      const dp = power.devices.get(d.id)!
      return {
        device: d.name,
        model: `${c.manufacturer} ${c.model}`,
        category: c.category,
        location: location(p, d),
        energized: dp.energized ? 'yes' : 'no',
        drawW: Math.round(dp.ownW),
        throughW: Math.round(dp.throughW),
        capacityW: dp.capacityW ? Math.round(dp.capacityW) : '',
        utilization: dp.utilization !== undefined ? `${Math.round(dp.utilization * 100)}%` : '',
        inlets: `${dp.connectedInlets}/${dp.inletCount}`,
        feeds: dp.feeds.map((f) => findDevice(p, f)?.name ?? f).join(' + ')
      }
    })
    .sort((a, b) => a.location.localeCompare(b.location, undefined, { numeric: true }))
}

export function toCsv(rows: Record<string, unknown>[], headers?: Record<string, string>): string {
  if (!rows.length) return ''
  const keys = Object.keys(headers ?? rows[0])
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = keys.map((k) => esc(headers?.[k] ?? k)).join(',')
  return [head, ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\r\n') + '\r\n'
}

export function portSummary(p: Project, d: Device) {
  const comp = getComponent(p, d)
  return comp.ports.map((g) => {
    let used = 0
    for (let i = 1; i <= g.count; i++) {
      const id = `${g.id}-${i}`
      if (p.connections.some((c) => (c.a.deviceId === d.id && c.a.portId === id) || (c.b.deviceId === d.id && c.b.portId === id))) used++
    }
    return { group: g, used, port: findPort(comp, `${g.id}-1`) }
  })
}
