// Builds a realistic two-rack sample design with A/B power and redundant networking.
import { builtinRacks, type Catalog } from '../library'
import { getPorts } from './ports'
import { addDevice, connect, createProject, rackFromDef } from './project'
import type { Device, Mount, Project } from './types'

export function buildExample(catalog: Catalog): Project {
  const p = createProject('Example: compute pod')
  p.notes = 'Two 42U racks with A/B power feeds, top-of-rack switching and cross-rack uplinks.'
  const rackDef = builtinRacks.find((r) => r.id === 'rack-apc-netshelter-sx-ar3300-42u-600-1200') ?? builtinRacks[0]
  const rackA = rackFromDef(rackDef, 'A01')
  const rackB = rackFromDef(rackDef, 'A02')
  p.racks.push(rackA, rackB)

  const add = (componentId: string, rackId: string, mount: Mount, name?: string): Device => {
    const comp = catalog.byId.get(componentId)
    if (!comp) throw new Error(`Example uses unknown component ${componentId}`)
    const d = addDevice(p, comp, rackId, mount, name)
    if (typeof d === 'string') throw new Error(`${componentId}: ${d}`)
    return d
  }
  const port = (d: Device, label: string) => {
    const found = getPorts(p.components[d.componentId]).find((x) => x.label === label)
    if (!found) throw new Error(`${d.name} has no port ${label}`)
    return found.id
  }
  const wire = (a: Device, al: string, b: Device, bl: string, label?: string, color?: string) => {
    const c = connect(p, { deviceId: a.id, portId: port(a, al) }, { deviceId: b.id, portId: port(b, bl) }, { label, color })
    if (typeof c === 'string') throw new Error(`${a.name} ${al} → ${b.name} ${bl}: ${c}`)
  }
  const rack = (u: number, face: 'front' | 'rear' = 'front'): Mount => ({ kind: 'rack', u, face })

  const racks = [rackA, rackB].map((r, i) => {
    const feedA = add('feed-208v-30a-l6-30r', r.id, { kind: 'feed', slot: 0 }, `${r.name}-FEED-A`)
    const feedB = add('feed-208v-30a-l6-30r', r.id, { kind: 'feed', slot: 1 }, `${r.name}-FEED-B`)
    const pduA = add('apc-ap8941-switched-2g-0u-208v-30a', r.id, { kind: 'zeroU', side: 'left', slot: 0 }, `${r.name}-PDU-A`)
    const pduB = add('apc-ap8941-switched-2g-0u-208v-30a', r.id, { kind: 'zeroU', side: 'right', slot: 0 }, `${r.name}-PDU-B`)
    wire(feedA, 'Out', pduA, 'Input')
    wire(feedB, 'Out', pduB, 'Input')
    return { r, pduA, pduB, n: i, outlet: 1 }
  })

  const power = (rk: (typeof racks)[number], d: Device, psus = 2) => {
    const o = rk.outlet++
    wire(rk.pduA, `C13-${o}`, d, 'PSU1', undefined, '#ef4444')
    if (psus > 1) wire(rk.pduB, `C13-${o}`, d, 'PSU2', undefined, '#3b82f6')
  }

  // Rack A01: network + compute
  const [ra, rb] = racks
  add('generic-cat6-patch-panel-48-port', rackA.id, rack(41), 'PP-A01-1')
  add('generic-horizontal-cable-manager-1u', rackA.id, rack(40))
  const leafA = add('cisco-nexus-n9k-c93180yc-fx', rackA.id, rack(39, 'rear'), 'leaf-a')
  const leafB = add('cisco-nexus-n9k-c93180yc-fx', rackA.id, rack(38, 'rear'), 'leaf-b')
  const oob = add('cisco-catalyst-c9300-48p', rackA.id, rack(37, 'rear'), 'oob-sw-01')
  add('generic-horizontal-cable-manager-1u', rackA.id, rack(36))
  const fw = add('palo-alto-networks-pa-3410', rackA.id, rack(35), 'fw-01')
  const con = add('opengear-cm8148-console-manager', rackA.id, rack(34), 'con-01')
  for (const d of [leafA, leafB, oob, fw, con]) power(ra, d)

  // vPC peer links and firewall uplinks
  wire(leafA, 'Eth1/49', leafB, 'Eth1/49', 'VPC-1', '#a855f7')
  wire(leafA, 'Eth1/50', leafB, 'Eth1/50', 'VPC-2', '#a855f7')
  wire(fw, 'Eth1/17', leafA, 'Eth1/47', 'FW-A', '#f97316')
  wire(fw, 'Eth1/18', leafB, 'Eth1/47', 'FW-B', '#f97316')
  wire(leafA, 'Console', con, 'Serial1')
  wire(leafB, 'Console', con, 'Serial2')
  wire(oob, 'Console', con, 'Serial3')
  wire(leafA, 'Mgmt', oob, 'Gi1/0/45')
  wire(leafB, 'Mgmt', oob, 'Gi1/0/46')
  wire(fw, 'Mgmt', oob, 'Gi1/0/47')

  let leafPort = 1
  let oobPort = 1
  const server = (rk: (typeof racks)[number], model: string, u: number, name: string) => {
    const s = add(model, rk.r.id, rack(u), name)
    power(rk, s)
    wire(s, 'OCP1', leafA, `Eth1/${leafPort}`, undefined, '#06b6d4')
    wire(s, 'OCP2', leafB, `Eth1/${leafPort}`, undefined, '#06b6d4')
    wire(s, 'iDRAC', oob, `Gi1/0/${oobPort}`, undefined, '#eab308')
    leafPort++
    oobPort++
    return s
  }

  for (let i = 0; i < 6; i++) server(ra, 'dell-poweredge-r760', 20 + i * 2, `esx-${String(i + 1).padStart(2, '0')}`)
  add('generic-blanking-panel-2u', rackA.id, rack(32))

  // Rack A02: storage + more compute, uplinked to A01
  add('generic-cat6-patch-panel-48-port', rackB.id, rack(41), 'PP-A02-1')
  const store = add('dell-powerstore-500t', rackB.id, rack(36), 'pstore-01')
  power(rb, store)
  wire(store, 'A-Mezz1', leafA, 'Eth1/40', 'PS-A1', '#22c55e')
  wire(store, 'B-Mezz1', leafB, 'Eth1/40', 'PS-B1', '#22c55e')
  wire(store, 'A-Mgmt', oob, 'Gi1/0/40')
  wire(store, 'B-Mgmt', oob, 'Gi1/0/41')
  for (let i = 0; i < 6; i++) server(rb, 'dell-poweredge-r660', 22 + i, `k8s-${String(i + 1).padStart(2, '0')}`)
  return p
}
