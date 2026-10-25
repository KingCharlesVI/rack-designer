import { describe, expect, it } from 'vitest'
import { builtinComponents, builtinRacks, buildCatalog, searchComponents } from '../library'
import { genericComponents } from '../library/generic'
import { infrastructureComponents } from '../library/infrastructure'
import { networkComponents } from '../library/network'
import { powerComponents } from '../library/power'
import { securityComponents } from '../library/security'
import { serverComponents } from '../library/servers'
import { storageComponents } from '../library/storage'
import { analyzeFailover, analyzePower } from './power'
import { checkCompatibility, getPorts, PORT_TYPES } from './ports'
import { addDevice, canPlace, connect, createProject, findFreeMount, mergeProject, rackFromDef, removeDevices } from './project'
import { billOfMaterials, cableSchedule, toCsv } from './reports'
import { parseLibrary, parseProject, serializeLibrary, serializeProject } from './serialize'
import type { ComponentDef, Connection, Device, Project } from './types'
import { validate } from './validation'

const catalog = buildCatalog()
const comp = (id: string): ComponentDef => {
  const c = catalog.byId.get(id)
  if (!c) throw new Error(`no component ${id}`)
  return c
}

function setup(): Project {
  const p = createProject('Test')
  p.racks.push(rackFromDef(builtinRacks[0], 'R1'))
  return p
}

function place(p: Project, id: string, mount: Device['mount'], rack = p.racks[0].id): Device {
  const d = addDevice(p, comp(id), rack, mount)
  if (typeof d === 'string') throw new Error(d)
  return d
}

function wire(p: Project, a: Device, ap: string, b: Device, bp: string): Connection {
  const c = connect(p, { deviceId: a.id, portId: ap }, { deviceId: b.id, portId: bp })
  if (typeof c === 'string') throw new Error(c)
  return c
}

const port = (d: Device, p: Project, label: string) => {
  const found = getPorts(p.components[d.componentId]).find((x) => x.label === label)
  if (!found) throw new Error(`no port ${label} on ${d.name}: ${getPorts(p.components[d.componentId]).map((x) => x.label).join(',')}`)
  return found.id
}

describe('library', () => {
  const all = [...genericComponents, ...serverComponents, ...networkComponents, ...securityComponents, ...storageComponents, ...powerComponents, ...infrastructureComponents]

  it('is large', () => {
    expect(builtinComponents.length).toBeGreaterThan(700)
    expect(builtinRacks.length).toBeGreaterThan(50)
  })

  it('has unique component ids', () => {
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const c of all) {
      if (seen.has(c.id)) dupes.push(c.id)
      seen.set(c.id, c.model)
    }
    expect(dupes).toEqual([])
  })

  it('uses known port types and unique port ids', () => {
    for (const c of builtinComponents) {
      const ports = getPorts(c)
      expect(new Set(ports.map((p) => p.id)).size, c.id).toBe(ports.length)
      for (const p of ports) expect(PORT_TYPES[p.type], `${c.id} ${p.type}`).toBeDefined()
      expect(c.uHeight >= 0 && c.uHeight <= 14, c.id).toBe(true)
    }
  })

  it('continues numbering across groups sharing a label', () => {
    const labels = getPorts(comp('cisco-catalyst-c1000-24t-4g-l')).map((p) => p.label)
    expect(labels).toContain('Gi1/0/24')
    expect(labels).toContain('Gi1/0/28')
  })

  it('searches by multiple terms', () => {
    const r = searchComponents(catalog, { query: 'dell r760' })
    expect(r.some((c) => c.model === 'PowerEdge R760')).toBe(true)
    expect(searchComponents(catalog, { query: '', category: 'pdu' }).every((c) => c.category === 'pdu')).toBe(true)
  })
})

describe('placement', () => {
  it('prevents overlaps and respects depth', () => {
    const p = setup()
    place(p, 'dell-poweredge-r760', { kind: 'rack', u: 10, face: 'front' })
    expect(canPlace(p, comp('dell-poweredge-r650'), p.racks[0].id, { kind: 'rack', u: 11, face: 'front' })).toMatch(/Overlaps/)
    expect(canPlace(p, comp('dell-poweredge-r650'), p.racks[0].id, { kind: 'rack', u: 12, face: 'front' })).toBeNull()
    // Half-depth patch panels can share a U front and rear.
    const panel = comp('generic-cat6-patch-panel-24-port')
    place(p, panel.id, { kind: 'rack', u: 40, face: 'front' })
    expect(canPlace(p, panel, p.racks[0].id, { kind: 'rack', u: 40, face: 'rear' })).toBeNull()
    expect(canPlace(p, comp('dell-poweredge-r650'), p.racks[0].id, { kind: 'rack', u: 40, face: 'rear' })).toMatch(/Overlaps/)
    expect(canPlace(p, comp('dell-poweredge-r650'), p.racks[0].id, { kind: 'rack', u: 42, face: 'front' })).toBeNull()
    expect(canPlace(p, comp('dell-poweredge-r760'), p.racks[0].id, { kind: 'rack', u: 42, face: 'front' })).toMatch(/Does not fit/)
  })

  it('finds a free slot near the requested one', () => {
    const p = setup()
    place(p, 'dell-poweredge-r760', { kind: 'rack', u: 10, face: 'front' })
    const m = findFreeMount(p, comp('dell-poweredge-r650'), p.racks[0].id, { kind: 'rack', u: 10, face: 'front' })
    expect(m).toEqual({ kind: 'rack', u: 9, face: 'front' })
  })

  it('removes connections with devices', () => {
    const p = setup()
    const a = place(p, 'dell-poweredge-r650', { kind: 'rack', u: 1, face: 'front' })
    const b = place(p, 'generic-switch-24-port-1g', { kind: 'rack', u: 2, face: 'front' })
    wire(p, a, port(a, p, 'LOM1'), b, port(b, p, 'Port1'))
    removeDevices(p, [b.id])
    expect(p.connections).toHaveLength(0)
  })
})

describe('connections', () => {
  it('checks compatibility', () => {
    expect(checkCompatibility('rj45', 'c13').ok).toBe(false)
    expect(checkCompatibility('c13', 'c14').ok).toBe(true)
    expect(checkCompatibility('nema-l6-30r', 'nema-l6-30p').ok).toBe(true)
    expect(checkCompatibility('nema-l5-30r', 'nema-l6-30p').ok).toBe(false)
    expect(checkCompatibility('c13', 'c13').ok).toBe(false)
    expect(checkCompatibility('sfp28', 'qsfp28').level).toBe('info')
  })

  it('normalises power direction and refuses double connections', () => {
    const p = setup()
    const pdu = place(p, 'generic-pdu-1u-230v-10a-8x-c13', { kind: 'rack', u: 1, face: 'rear' })
    const srv = place(p, 'dell-poweredge-r650', { kind: 'rack', u: 5, face: 'front' })
    const c = wire(p, srv, port(srv, p, 'PSU1'), pdu, port(pdu, p, 'C13-1'))
    expect(c.a.deviceId).toBe(pdu.id)
    expect(c.kind).toBe('power')
    expect(c.cableType).toBe('Power cord C14–C13')
    expect(connect(p, { deviceId: srv.id, portId: port(srv, p, 'PSU1') }, { deviceId: pdu.id, portId: port(pdu, p, 'C13-2') })).toMatch(/already connected/)
  })
})

function poweredRack() {
  const p = setup()
  const feedA = place(p, 'feed-208v-30a-l6-30r', { kind: 'feed', slot: 0 })
  const feedB = place(p, 'feed-208v-30a-l6-30r', { kind: 'feed', slot: 1 })
  const pduA = place(p, 'apc-ap8941-switched-2g-0u-208v-30a', { kind: 'zeroU', side: 'left', slot: 0 })
  const pduB = place(p, 'apc-ap8941-switched-2g-0u-208v-30a', { kind: 'zeroU', side: 'right', slot: 0 })
  wire(p, feedA, 'out-1', pduA, port(pduA, p, 'Input'))
  wire(p, feedB, 'out-1', pduB, port(pduB, p, 'Input'))
  const servers: Device[] = []
  for (let i = 0; i < 4; i++) {
    const s = place(p, 'dell-poweredge-r760', { kind: 'rack', u: 1 + i * 2, face: 'front' })
    wire(p, pduA, port(pduA, p, `C13-${i + 1}`), s, port(s, p, 'PSU1'))
    wire(p, pduB, port(pduB, p, `C13-${i + 1}`), s, port(s, p, 'PSU2'))
    servers.push(s)
  }
  return { p, feedA, feedB, pduA, pduB, servers }
}

describe('power analysis', () => {
  it('splits load across redundant supplies', () => {
    const { p, feedA, pduA, servers } = poweredRack()
    const r = analyzePower(p)
    const per = 450 // typical R760 draw
    expect(r.totalW).toBe(per * 4)
    expect(r.devices.get(pduA.id)!.throughW).toBeCloseTo(per * 2)
    expect(r.devices.get(feedA.id)!.throughW).toBeCloseTo(per * 2)
    expect(r.devices.get(servers[0].id)!.feeds).toHaveLength(2)
    expect(r.devices.get(feedA.id)!.capacityW).toBe(208 * 30)
  })

  it('simulates a feed failure', () => {
    const { p, feedA, pduB } = poweredRack()
    const base = analyzePower(p)
    const s = analyzeFailover(p, base).find((x) => x.feedId === feedA.id)!
    expect(s.lostDevices).toEqual([])
    const r = analyzePower(p, new Set([feedA.id]), base)
    expect(r.devices.get(pduB.id)!.throughW).toBeCloseTo(450 * 4)
  })

  it('flags single-corded devices and overloads', () => {
    const { p, pduA } = poweredRack()
    const lone = place(p, 'dell-poweredge-xe9680', { kind: 'rack', u: 20, face: 'front' })
    p.settings.powerBasis = 'max'
    const issues = validate(p)
    expect(issues.some((i) => i.message.includes(`${lone.name} has no power connected`))).toBe(true)
    // Put lots of load on one PDU to overload it.
    for (let i = 0; i < 6; i++) {
      const s = place(p, 'dell-poweredge-r760', { kind: 'rack', u: 26 + i * 2, face: 'front' })
      wire(p, pduA, port(pduA, p, `C13-${10 + i}`), s, port(s, p, 'PSU1'))
    }
    const after = validate(p)
    expect(after.some((i) => i.severity === 'error' && i.message.includes('overloaded'))).toBe(true)
    expect(after.some((i) => i.message.includes('PSU2 not connected'))).toBe(true)
  })

  it('handles UPS battery ride-through', () => {
    const p = setup()
    const feed = place(p, 'feed-120v-30a-l5-30r', { kind: 'feed', slot: 0 })
    const u = place(p, 'apc-smart-ups-smt3000rm2u', { kind: 'rack', u: 1, face: 'front' })
    const sw = place(p, 'cisco-catalyst-c9300-48p', { kind: 'rack', u: 10, face: 'front' })
    wire(p, feed, 'out-1', u, port(u, p, 'Input'))
    wire(p, u, port(u, p, 'Out1'), sw, port(sw, p, 'PSU1'))
    const base = analyzePower(p)
    expect(base.devices.get(sw.id)!.energized).toBe(true)
    const out = analyzePower(p, new Set([feed.id]), base)
    expect(out.devices.get(u.id)!.onBattery).toBe(true)
    expect(out.devices.get(sw.id)!.energized).toBe(true)
  })

  it('computes 3-phase current per line', () => {
    const p = setup()
    const feed = place(p, 'feed-400v-32a-3-phase-iec-60309', { kind: 'feed', slot: 0 })
    const pdu = place(p, 'generic-vertical-pdu-0u-400v-3ph-32a-36x-c13-6x-c19', { kind: 'zeroU', side: 'left', slot: 0 })
    wire(p, feed, 'out-1', pdu, port(pdu, p, 'Input'))
    const s = place(p, 'dell-poweredge-r760', { kind: 'rack', u: 1, face: 'front' })
    wire(p, pdu, port(pdu, p, 'C13-1'), s, port(s, p, 'PSU1'))
    const r = analyzePower(p)
    expect(r.devices.get(pdu.id)!.capacityW).toBeCloseTo(Math.sqrt(3) * 400 * 32)
    expect(r.devices.get(s.id)!.voltage).toBe(230)
    const inlet = r.ports.get(`${pdu.id}:${port(pdu, p, 'Input')}`)!
    expect(inlet.amps).toBeCloseTo(450 / (Math.sqrt(3) * 400))
  })
})

describe('files', () => {
  it('round-trips a project', () => {
    const { p } = poweredRack()
    const text = serializeProject(p)
    const { project, warnings } = parseProject(text)
    expect(warnings).toEqual([])
    expect(project.devices).toHaveLength(p.devices.length)
    expect(project.connections).toHaveLength(p.connections.length)
    expect(Object.keys(project.components).sort()).toEqual([...new Set(p.devices.map((d) => d.componentId))].sort())
  })

  it('rejects non-project files and recovers missing components from the library', () => {
    expect(() => parseProject('{}')).toThrow(/not a Rack Designer project/)
    expect(() => parseProject('nope')).toThrow(/not valid JSON/)
    const { p } = poweredRack()
    const data = JSON.parse(serializeProject(p))
    data.project.components = {}
    const { project, warnings } = parseProject(JSON.stringify(data), (id) => catalog.byId.get(id))
    expect(warnings).toEqual([])
    expect(Object.keys(project.components).length).toBeGreaterThan(0)
  })

  it('round-trips a library pack', () => {
    const pack = parseLibrary(serializeLibrary('Mine', [comp('dell-poweredge-r760')], [builtinRacks[0]]))
    expect(pack.components[0].model).toBe('PowerEdge R760')
    expect(() => parseLibrary('{"format":"x"}')).toThrow()
  })

  it('merges projects with fresh ids', () => {
    const a = poweredRack().p
    const b = poweredRack().p
    mergeProject(a, b)
    expect(a.racks).toHaveLength(2)
    expect(new Set(a.devices.map((d) => d.id)).size).toBe(a.devices.length)
    expect(validate(a).filter((i) => i.severity === 'error')).toEqual([])
  })
})

describe('reports', () => {
  it('builds BOM and cable schedule', () => {
    const { p } = poweredRack()
    const bom = billOfMaterials(p)
    expect(bom.find((l) => l.model === 'PowerEdge R760')?.quantity).toBe(4)
    expect(bom.some((l) => l.category === 'feed')).toBe(false)
    const rows = cableSchedule(p)
    expect(rows).toHaveLength(p.connections.length)
    const csv = toCsv(rows as unknown as Record<string, unknown>[])
    expect(csv.split('\r\n')[0]).toContain('fromDevice')
  })
})

describe('example design', () => {
  it('builds without errors', async () => {
    const { buildExample } = await import('./example')
    const p = buildExample(catalog)
    const errors = validate(p).filter((i) => i.severity === 'error')
    expect(errors).toEqual([])
    const r = analyzePower(p)
    expect(r.totalW).toBeGreaterThan(5000)
    expect(analyzeFailover(p, r).every((s) => s.lostDevices.length === 0)).toBe(true)
  })
})
