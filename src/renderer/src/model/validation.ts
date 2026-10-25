import { analyzeFailover, analyzePower, formatW, type PowerAnalysis } from './power'
import { checkCompatibility, getPorts, isPowerSink, portType } from './ports'
import { canPlace, describePort, findDevice, getComponent, portKey, rackWeightKg, resolvePort } from './project'
import type { Project, Selection } from './types'

export interface Issue {
  severity: 'error' | 'warning' | 'info'
  message: string
  target?: Selection
}

const pct = (x: number) => `${Math.round(x * 100)}%`

export function validate(p: Project, power: PowerAnalysis = analyzePower(p)): Issue[] {
  const issues: Issue[] = []
  const devSel = (id: string): Selection => ({ kind: 'device', id })

  for (const d of p.devices) {
    const comp = getComponent(p, d)
    if (!p.components[d.componentId]) {
      issues.push({ severity: 'error', message: `${d.name}: component definition "${d.componentId}" is missing`, target: devSel(d.id) })
    }
    if (!p.racks.some((r) => r.id === d.rackId)) {
      issues.push({ severity: 'error', message: `${d.name} is assigned to a rack that does not exist`, target: devSel(d.id) })
      continue
    }
    const err = canPlace(p, comp, d.rackId, d.mount, d.id)
    if (err) issues.push({ severity: 'error', message: `${d.name}: ${err}`, target: devSel(d.id) })

    const dp = power.devices.get(d.id)
    if (!dp || comp.category === 'feed') continue
    const sinks = getPorts(comp).filter((x) => isPowerSink(x.type))
    if (sinks.length > 0 && dp.ownW + dp.throughW > 0) {
      if (dp.connectedInlets === 0) {
        issues.push({ severity: 'warning', message: `${d.name} has no power connected`, target: devSel(d.id) })
      } else if (!dp.energized) {
        issues.push({ severity: 'warning', message: `${d.name} is connected but not energized (no path to a power feed)`, target: devSel(d.id) })
      } else if (dp.connectedInlets < sinks.length) {
        const missing = sinks.filter((s) => !p.connections.some((c) => c.kind === 'power' && c.b.deviceId === d.id && c.b.portId === s.id))
        issues.push({ severity: 'warning', message: `${d.name}: ${missing.map((m) => m.label).join(', ')} not connected (no PSU redundancy)`, target: devSel(d.id) })
      }
    }
    if (dp.utilization !== undefined && dp.capacityW) {
      if (dp.utilization > 1) {
        issues.push({ severity: 'error', message: `${d.name} is overloaded: ${formatW(dp.throughW)} of ${formatW(dp.capacityW)} (${pct(dp.utilization)})`, target: devSel(d.id) })
      } else if (dp.utilization > p.settings.derating) {
        issues.push({ severity: 'warning', message: `${d.name} is above the ${pct(p.settings.derating)} continuous-load limit (${pct(dp.utilization)})`, target: devSel(d.id) })
      }
    }
  }

  // Feed capacity
  for (const d of p.devices) {
    const comp = getComponent(p, d)
    if (comp.category !== 'feed') continue
    const dp = power.devices.get(d.id)
    if (!dp?.capacityW || dp.utilization === undefined) continue
    if (dp.utilization > 1) issues.push({ severity: 'error', message: `Feed ${d.name} is overloaded (${pct(dp.utilization)})`, target: devSel(d.id) })
    else if (dp.utilization > p.settings.derating) issues.push({ severity: 'warning', message: `Feed ${d.name} is at ${pct(dp.utilization)}, above the ${pct(p.settings.derating)} limit`, target: devSel(d.id) })
  }

  // Per-port current ratings
  for (const [key, load] of power.ports) {
    if (!load.ratingA || load.amps <= load.ratingA) continue
    const [deviceId, portId] = splitKey(key)
    issues.push({
      severity: 'error',
      message: `${describePort(p, { deviceId, portId })} carries ${load.amps.toFixed(1)}A, above its ${load.ratingA}A rating`,
      target: { kind: 'port', deviceId, portId }
    })
  }

  // Connections
  for (const c of p.connections) {
    const a = resolvePort(p, c.a)
    const b = resolvePort(p, c.b)
    const target: Selection = { kind: 'connection', id: c.id }
    if (!a || !b) {
      issues.push({ severity: 'error', message: `Cable ${c.label ?? c.id} references a port that no longer exists`, target })
      continue
    }
    const compat = checkCompatibility(a.port.type, b.port.type)
    const name = `${describePort(p, c.a)} → ${describePort(p, c.b)}`
    if (!compat.ok) issues.push({ severity: 'error', message: `${name}: ${compat.message}`, target })
    else if (compat.level === 'warning' || compat.level === 'info') issues.push({ severity: compat.level, message: `${name}: ${compat.message}`, target })
    if (a.port.speed && b.port.speed && a.port.speed !== b.port.speed && portType(a.port.type).kind === 'data') {
      issues.push({ severity: 'info', message: `${name}: speed mismatch (${a.port.speed} vs ${b.port.speed})`, target })
    }
  }
  const seen = new Map<string, string>()
  for (const c of p.connections) {
    for (const end of [c.a, c.b]) {
      const k = portKey(end)
      if (seen.has(k) && seen.get(k) !== c.id) {
        issues.push({ severity: 'error', message: `${describePort(p, end)} has more than one cable`, target: { kind: 'connection', id: c.id } })
      }
      seen.set(k, c.id)
    }
  }

  // Single points of failure
  const failover = analyzeFailover(p, power)
  for (const s of failover) {
    const feed = findDevice(p, s.feedId)
    if (!feed) continue
    const redundantLost = s.lostDevices.filter((id) => (power.devices.get(id)?.connectedInlets ?? 0) > 1)
    if (redundantLost.length) {
      const names = redundantLost.map((id) => findDevice(p, id)?.name).join(', ')
      issues.push({ severity: 'warning', message: `Losing feed ${feed.name} takes down dual-corded devices: ${names}`, target: devSel(s.feedId) })
    }
    for (const o of s.overloaded) {
      const d = findDevice(p, o.deviceId)
      issues.push({ severity: 'warning', message: `If feed ${feed.name} fails, ${d?.name} is overloaded (${pct(o.utilization)})`, target: devSel(o.deviceId) })
    }
  }

  // Racks
  for (const r of p.racks) {
    if (!r.maxLoadKg) continue
    const w = rackWeightKg(p, r.id)
    if (w.total > r.maxLoadKg) {
      issues.push({ severity: 'error', message: `${r.name} weighs ${Math.round(w.total)} kg, above its ${r.maxLoadKg} kg rating`, target: { kind: 'rack', id: r.id } })
    }
  }

  const order = { error: 0, warning: 1, info: 2 }
  return issues.sort((a, b) => order[a.severity] - order[b.severity])
}

function splitKey(key: string): [string, string] {
  const i = key.indexOf(':')
  return [key.slice(0, i), key.slice(i + 1)]
}
