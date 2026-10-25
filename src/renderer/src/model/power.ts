import { getPorts, isPowerSink, isPowerSource, portType } from './ports'
import { getComponent, portKey } from './project'
import type { ComponentDef, Device, PortRef, Project } from './types'

export interface DevicePower {
  deviceId: string
  energized: boolean
  /** Running from its own battery because upstream is lost (UPS only). */
  onBattery: boolean
  /** The device's own consumption, in watts. */
  ownW: number
  /** Total power flowing through the device (own + everything downstream). */
  throughW: number
  voltage: number
  /** Distribution capacity in watts, for feeds, PDUs and UPSs. */
  capacityW?: number
  utilization?: number
  inletCount: number
  connectedInlets: number
  energizedInlets: number
  /** Feeds this device ultimately draws from. */
  feeds: string[]
}

export interface PortLoad {
  watts: number
  amps: number
  ratingA?: number
}

export interface PowerAnalysis {
  devices: Map<string, DevicePower>
  ports: Map<string, PortLoad>
  totalW: number
  totalByRack: Map<string, number>
}

export function deviceDraw(p: Project, d: Device, comp: ComponentDef = getComponent(p, d)): number {
  const basis = p.settings.powerBasis
  const o = d.overrides
  if (basis === 'max') return o?.maxW ?? comp.power?.maxW ?? o?.typicalW ?? comp.power?.typicalW ?? 0
  return o?.typicalW ?? comp.power?.typicalW ?? 0
}

export function feedSpec(d: Device, comp: ComponentDef) {
  const f = comp.feed ?? { voltage: 230, amps: 16, phases: 1 as const }
  return {
    voltage: d.overrides?.voltage ?? f.voltage,
    amps: d.overrides?.amps ?? f.amps,
    phases: d.overrides?.phases ?? f.phases
  }
}

/** Capacity in watts for power distribution equipment. */
export function capacityW(d: Device, comp: ComponentDef, voltage: number): number | undefined {
  if (comp.category === 'feed') {
    const f = feedSpec(d, comp)
    return f.voltage * f.amps * (f.phases === 3 ? Math.sqrt(3) : 1)
  }
  if (comp.ups) return comp.ups.capacityW
  if (comp.pdu) {
    if (comp.pdu.phases === 3) return Math.sqrt(3) * (comp.pdu.inputVoltage ?? comp.pdu.voltage) * comp.pdu.maxAmps
    const v = voltage || comp.pdu.voltage
    return v * comp.pdu.maxAmps
  }
  return undefined
}

/** Voltage a device supplies on its outlets, given the voltage it receives. */
function outputVoltage(comp: ComponentDef, input: number): number {
  if (comp.ups?.outputVoltage) return comp.ups.outputVoltage
  if (comp.pdu?.phases === 3) return comp.pdu.voltage
  return input
}

/** Current drawn through a port; 3-phase connectors carry the load across three lines. */
function portAmps(watts: number, volts: number, typeId: string): number {
  if (!volts) return 0
  return portType(typeId).phases === 3 ? watts / (Math.sqrt(3) * volts) : watts / volts
}

interface Graph {
  /** sink port key -> source port ref */
  upstream: Map<string, PortRef>
  /** source port key -> sink port ref */
  downstream: Map<string, PortRef>
}

function buildGraph(p: Project): Graph {
  const upstream = new Map<string, PortRef>()
  const downstream = new Map<string, PortRef>()
  for (const c of p.connections) {
    if (c.kind !== 'power') continue
    upstream.set(portKey(c.b), c.a)
    downstream.set(portKey(c.a), c.b)
  }
  return { upstream, downstream }
}

/**
 * Analyse power flow. `failed` lists feed device ids that are switched off, used
 * to simulate outages. `baseline` is the analysis without failures, used so that a
 * UPS that was powered keeps running on battery.
 */
export function analyzePower(p: Project, failed: Set<string> = new Set(), baseline?: PowerAnalysis): PowerAnalysis {
  const g = buildGraph(p)
  const devs = new Map(p.devices.map((d) => [d.id, d]))
  const comps = new Map(p.devices.map((d) => [d.id, getComponent(p, d)]))
  const sinks = new Map<string, string[]>()
  const sources = new Map<string, string[]>()
  for (const d of p.devices) {
    const ports = getPorts(comps.get(d.id)!)
    sinks.set(d.id, ports.filter((x) => isPowerSink(x.type)).map((x) => x.id))
    sources.set(d.id, ports.filter((x) => isPowerSource(x.type)).map((x) => x.id))
  }

  // Pass 1: which devices are energized, at what voltage and from which feeds.
  const energized = new Map<string, { voltage: number; feeds: Set<string>; onBattery: boolean }>()
  for (const d of p.devices) {
    const comp = comps.get(d.id)!
    if (comp.category === 'feed' && !failed.has(d.id)) {
      energized.set(d.id, { voltage: feedSpec(d, comp).voltage, feeds: new Set([d.id]), onBattery: false })
    }
  }
  let changed = true
  while (changed) {
    changed = false
    for (const d of p.devices) {
      const comp = comps.get(d.id)!
      if (comp.category === 'feed') continue
      let voltage = 0
      let live = false
      const feeds = new Set<string>()
      for (const sinkId of sinks.get(d.id)!) {
        const up = g.upstream.get(`${d.id}:${sinkId}`)
        if (!up) continue
        const e = energized.get(up.deviceId)
        if (!e) continue
        live = true
        voltage ||= e.voltage
        e.feeds.forEach((f) => feeds.add(f))
      }
      const prev = energized.get(d.id)
      if (live) {
        const out = outputVoltage(comp, voltage)
        if (!prev || prev.feeds.size !== feeds.size || prev.onBattery) {
          energized.set(d.id, { voltage: out, feeds, onBattery: false })
          changed = true
        }
      } else if (!prev && comp.ups && baseline?.devices.get(d.id)?.energized) {
        const v = baseline.devices.get(d.id)!.voltage
        energized.set(d.id, { voltage: v, feeds: new Set(), onBattery: true })
        changed = true
      }
    }
  }

  const isLive = (ref: PortRef) => {
    const up = g.upstream.get(portKey(ref))
    return !!up && energized.has(up.deviceId)
  }

  // Pass 2: loads, computed bottom-up.
  const through = new Map<string, number>()
  const visiting = new Set<string>()
  const ports = new Map<string, PortLoad>()

  const throughW = (id: string): number => {
    const cached = through.get(id)
    if (cached !== undefined) return cached
    if (visiting.has(id) || !energized.has(id)) return 0
    visiting.add(id)
    const d = devs.get(id)!
    const comp = comps.get(id)!
    let total = deviceDraw(p, d, comp)
    for (const srcId of sources.get(id)!) {
      const down = g.downstream.get(`${id}:${srcId}`)
      if (!down) continue
      total += sinkLoad(down)
    }
    visiting.delete(id)
    through.set(id, total)
    return total
  }

  /** Power drawn through a specific sink port. */
  const sinkLoad = (ref: PortRef): number => {
    if (!isLive(ref)) return 0
    const live = sinks.get(ref.deviceId)?.filter((s) => isLive({ deviceId: ref.deviceId, portId: s })).length ?? 0
    if (!live) return 0
    return throughW(ref.deviceId) / live
  }

  const result = new Map<string, DevicePower>()
  let totalW = 0
  const totalByRack = new Map<string, number>()
  for (const d of p.devices) {
    const comp = comps.get(d.id)!
    const e = energized.get(d.id)
    const w = throughW(d.id)
    const own = deviceDraw(p, d, comp)
    const voltage = e?.voltage ?? comp.pdu?.voltage ?? comp.feed?.voltage ?? 0
    const cap = capacityW(d, comp, voltage)
    const sinkIds = sinks.get(d.id)!
    const connected = sinkIds.filter((s) => g.upstream.has(`${d.id}:${s}`)).length
    const live = sinkIds.filter((s) => isLive({ deviceId: d.id, portId: s })).length
    result.set(d.id, {
      deviceId: d.id,
      energized: !!e,
      onBattery: !!e?.onBattery,
      ownW: own,
      throughW: w,
      voltage,
      capacityW: cap,
      utilization: cap ? w / cap : undefined,
      inletCount: sinkIds.length,
      connectedInlets: connected,
      energizedInlets: live,
      feeds: e ? [...e.feeds] : []
    })
    if (e) {
      totalW += own
      totalByRack.set(d.rackId, (totalByRack.get(d.rackId) ?? 0) + own)
    }
    for (const sinkId of sinkIds) {
      const ref = { deviceId: d.id, portId: sinkId }
      const watts = sinkLoad(ref)
      const up = g.upstream.get(portKey(ref))
      const v = up ? energized.get(up.deviceId)?.voltage ?? voltage : voltage
      const sinkType = getPorts(comp).find((x) => x.id === sinkId)!.type
      const load: PortLoad = { watts, amps: portAmps(watts, v, sinkType), ratingA: portType(sinkType).ratingA }
      ports.set(portKey(ref), load)
      if (up) {
        const upDev = devs.get(up.deviceId)
        const upPort = upDev && getPorts(comps.get(upDev.id)!).find((x) => x.id === up.portId)
        ports.set(portKey(up), { watts, amps: load.amps, ratingA: upPort ? portType(upPort.type).ratingA : undefined })
      }
    }
  }
  return { devices: result, ports, totalW, totalByRack }
}

export interface FailoverScenario {
  feedId: string
  /** Devices that were powered in the baseline but lose power. */
  lostDevices: string[]
  /** Distribution devices pushed over capacity. */
  overloaded: { deviceId: string; utilization: number }[]
  onBattery: string[]
}

export function analyzeFailover(p: Project, baseline = analyzePower(p)): FailoverScenario[] {
  const feeds = p.devices.filter((d) => getComponent(p, d).category === 'feed')
  return feeds.map((f) => {
    const r = analyzePower(p, new Set([f.id]), baseline)
    const lost: string[] = []
    const overloaded: FailoverScenario['overloaded'] = []
    const onBattery: string[] = []
    for (const [id, dp] of r.devices) {
      const base = baseline.devices.get(id)!
      const comp = getComponent(p, p.devices.find((d) => d.id === id)!)
      if (comp.category === 'feed') continue
      if (base.energized && !dp.energized && base.ownW > 0) lost.push(id)
      if (dp.onBattery) onBattery.push(id)
      if (dp.utilization !== undefined && dp.utilization > 1 && !dp.onBattery) overloaded.push({ deviceId: id, utilization: dp.utilization })
    }
    for (const [id, dp] of r.devices) {
      const comp = getComponent(p, p.devices.find((d) => d.id === id)!)
      if (comp.category === 'feed' && dp.utilization !== undefined && dp.utilization > 1) overloaded.push({ deviceId: id, utilization: dp.utilization })
    }
    return { feedId: f.id, lostDevices: lost, overloaded, onBattery }
  })
}

export function formatW(w: number): string {
  return w >= 10000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`
}
