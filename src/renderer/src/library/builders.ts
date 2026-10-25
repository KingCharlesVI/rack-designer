// Compact builders used to define the built-in component library.
import type { Category, ComponentDef, Face, PortGroup } from '../model/types'

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** [count, type, label?, speed?, rows?] */
export type P = [number, string, string?, string?, number?]

export function groups(face: Face, specs: P[]): PortGroup[] {
  return specs.map(([count, type, label, speed, rows]) => ({
    id: '',
    type,
    count,
    face,
    label: label ?? defaultLabel(type),
    speed,
    rows
  }))
}

function defaultLabel(type: string): string {
  if (type.startsWith('nema') || type.startsWith('iec309') || type.endsWith('-p') || type.endsWith('-r')) return 'Plug'
  if (type === 'c13' || type === 'c19') return 'Out'
  if (type === 'c14' || type === 'c20' || type === 'c16') return 'PSU'
  if (type === 'rj45-mgmt') return 'Mgmt'
  if (type === 'console-rj45') return 'Console'
  if (type.startsWith('usb')) return 'USB'
  if (type === 'vga') return 'VGA'
  return 'Port'
}

/** Assign unique, readable group ids. */
export function finalize(c: Omit<ComponentDef, 'id'> & { id?: string }): ComponentDef {
  const used = new Set<string>()
  // Groups sharing a label on the same face continue numbering (Gi1/0/1-24, then Gi1/0/25-28).
  const counters = new Map<string, number>()
  const ports = c.ports.map((g) => {
    const base = g.id || slug(`${g.face === 'rear' ? 'r' : 'f'}-${g.label || g.type}-${g.type}`)
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    // Single ports with a plain label read better without a number.
    const names = g.names ?? (g.count === 1 && g.label && !/\d$/.test(g.label) && !/[/:.-]$/.test(g.label) && !['Port', 'Out', 'PSU'].includes(g.label) ? [g.label] : undefined)
    const key = `${g.face}|${g.label ?? ''}`
    const start = g.start ?? (counters.get(key) ?? 0) + 1
    if (!names) counters.set(key, start + g.count - 1)
    return { ...g, id, names, start }
  })
  return { ...c, id: c.id ?? slug(`${c.manufacturer}-${c.model}`), ports }
}

interface Base {
  mfr: string
  model: string
  u?: number
  depthMm?: number
  weightKg?: number
  w?: [number, number]
  color?: string
  description?: string
  tags?: string[]
  generic?: boolean
  fullDepth?: boolean
}

export interface ServerSpec extends Base {
  u: number
  /** Rear network ports. */
  nics?: P[]
  /** Front ports (USB, VGA, front NICs). */
  front?: P[]
  bmc?: string
  psu?: number
  psuType?: string
  w: [number, number]
}

export function server(s: ServerSpec, category: Category = 'server'): ComponentDef {
  const psuType = s.psuType ?? 'c14'
  const rear: P[] = [...(s.nics ?? [[2, 'rj45', 'NIC', '1G']])]
  if (s.bmc !== '') rear.unshift([1, 'rj45-mgmt', s.bmc ?? 'BMC'])
  rear.push([1, 'vga', 'VGA'], [2, 'usb-a', 'USB'])
  return finalize({
    manufacturer: s.mfr,
    model: s.model,
    category,
    uHeight: s.u,
    fullDepth: s.fullDepth ?? true,
    depthMm: s.depthMm,
    weightKg: s.weightKg,
    power: { typicalW: s.w[0], maxW: s.w[1] },
    ports: [...groups('front', s.front ?? [[1, 'usb-a', 'USB']]), ...groups('rear', rear), ...groups('rear', [[s.psu ?? 2, psuType, 'PSU']])],
    color: s.color,
    description: s.description,
    tags: s.tags,
    generic: s.generic
  })
}

export interface SwitchSpec extends Base {
  /** Front-panel ports. */
  ports: P[]
  /** Rear ports (other than PSUs). */
  rear?: P[]
  mgmt?: boolean
  console?: boolean
  psu?: number
  psuType?: string
  w: [number, number]
  category?: Category
}

export function sw(s: SwitchSpec): ComponentDef {
  const front: P[] = [...s.ports]
  if (s.mgmt !== false) front.push([1, 'rj45-mgmt', 'Mgmt'])
  if (s.console !== false) front.push([1, 'console-rj45', 'Console'])
  return finalize({
    manufacturer: s.mfr,
    model: s.model,
    category: s.category ?? 'switch',
    uHeight: s.u ?? 1,
    fullDepth: s.fullDepth ?? (s.depthMm ?? 400) > 450,
    depthMm: s.depthMm,
    weightKg: s.weightKg,
    power: { typicalW: s.w[0], maxW: s.w[1] },
    ports: [...groups('front', front), ...groups('rear', s.rear ?? []), ...groups('rear', [[s.psu ?? 2, s.psuType ?? 'c14', 'PSU']])],
    color: s.color,
    description: s.description,
    tags: s.tags,
    generic: s.generic
  })
}

export interface PduSpec extends Base {
  voltage: number
  amps: number
  input: string
  outlets: P[]
  lengthMm?: number
  metered?: boolean
  switched?: boolean
  network?: boolean
  /** 3-phase PDUs: line-to-line input voltage. */
  threePhase?: number
}

export function pdu(s: PduSpec): ComponentDef {
  const extras: P[] = s.network ?? (s.metered || s.switched) ? [[1, 'rj45-mgmt', 'Net']] : []
  const outlets = s.outlets.map(([count, type, label, speed, rows]): P => [count, type, label ?? (type === 'c19' ? 'C19-' : type === 'c13' ? 'C13-' : 'Out'), speed, rows])
  const kind = s.switched ? 'Switched' : s.metered ? 'Metered' : 'Basic'
  return finalize({
    manufacturer: s.mfr,
    model: s.model,
    category: 'pdu',
    uHeight: s.u ?? 0,
    fullDepth: false,
    depthMm: s.depthMm ?? 60,
    lengthMm: s.u ? undefined : s.lengthMm ?? 1700,
    weightKg: s.weightKg,
    power: { typicalW: 0, maxW: 0 },
    pdu: {
      voltage: s.voltage,
      maxAmps: s.amps,
      metered: s.metered || s.switched,
      switched: s.switched,
      ...(s.threePhase ? { phases: 3 as const, inputVoltage: s.threePhase } : {})
    },
    ports: [...groups('front', [[1, s.input, 'Input'], ...outlets, ...extras])],
    color: s.color ?? '#1a1a1a',
    description: s.description ?? `${kind} PDU, ${s.threePhase ? `3-phase ${s.threePhase}V` : `${s.voltage}V`} ${s.amps}A`,
    tags: s.tags,
    generic: s.generic
  })
}

export interface UpsSpec extends Base {
  u: number
  va: number
  watts: number
  input: string
  outlets: P[]
  voltage?: number
  nmc?: boolean
}

export function ups(s: UpsSpec): ComponentDef {
  const rear: P[] = [[1, s.input, 'Input'], ...s.outlets.map(([c, t, l, sp, r]): P => [c, t, l ?? 'Out', sp, r])]
  if (s.nmc !== false) rear.push([1, 'rj45-mgmt', 'NMC'])
  rear.push([1, 'usb-a', 'USB'])
  // Standby losses of a line-interactive/online UPS, roughly 3% of capacity.
  const loss = Math.round(s.watts * 0.03)
  return finalize({
    manufacturer: s.mfr,
    model: s.model,
    category: 'ups',
    uHeight: s.u,
    fullDepth: true,
    depthMm: s.depthMm,
    weightKg: s.weightKg,
    power: { typicalW: loss, maxW: loss * 2 },
    ups: { capacityW: s.watts, capacityVA: s.va, outputVoltage: s.voltage },
    ports: groups('rear', rear),
    color: s.color ?? '#202020',
    description: s.description ?? `${s.va} VA / ${s.watts} W UPS`,
    tags: s.tags,
    generic: s.generic
  })
}

export function feed(name: string, voltage: number, amps: number, receptacle: string, phases: 1 | 3 = 1, model?: string): ComponentDef {
  return finalize({
    id: slug(`feed-${model ?? name}`),
    manufacturer: 'Facility',
    model: model ?? name,
    category: 'feed',
    uHeight: 0,
    fullDepth: false,
    feed: { voltage, amps, phases },
    ports: [{ id: 'out', type: receptacle, count: 1, face: 'front', names: ['Out'] }],
    description: `Facility circuit: ${phases === 3 ? '3-phase ' : ''}${voltage}V ${amps}A`,
    generic: true
  })
}

/** Simple passive or generic item. */
export function item(
  mfr: string,
  model: string,
  category: Category,
  u: number,
  opts: { front?: P[]; rear?: P[]; fullDepth?: boolean; depthMm?: number; weightKg?: number; w?: [number, number]; color?: string; description?: string; generic?: boolean; tags?: string[]; id?: string } = {}
): ComponentDef {
  return finalize({
    id: opts.id,
    manufacturer: mfr,
    model,
    category,
    uHeight: u,
    fullDepth: opts.fullDepth ?? false,
    depthMm: opts.depthMm,
    weightKg: opts.weightKg,
    power: opts.w ? { typicalW: opts.w[0], maxW: opts.w[1] } : undefined,
    ports: [...groups('front', opts.front ?? []), ...groups('rear', opts.rear ?? [])],
    color: opts.color,
    description: opts.description,
    tags: opts.tags,
    generic: opts.generic
  })
}
