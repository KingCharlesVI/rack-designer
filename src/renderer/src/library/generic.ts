import type { ComponentDef } from '../model/types'
import { feed, item, pdu, server, sw, ups, type P } from './builders'

const G = 'Generic'
const out: ComponentDef[] = []

// Servers
for (const u of [1, 2, 3, 4]) {
  const w: Record<number, [number, number]> = { 1: [250, 550], 2: [350, 800], 3: [450, 1100], 4: [550, 1600] }
  out.push(server({ mfr: G, model: `Server ${u}U`, u, w: w[u], nics: [[2, 'rj45', 'NIC', '1G'], [2, 'sfp+', 'SFP', '10G']], generic: true, depthMm: 750 }))
  out.push(server({ mfr: G, model: `Server ${u}U (25G)`, u, w: w[u], nics: [[2, 'sfp28', 'P', '25G']], generic: true, depthMm: 750 }))
}
out.push(server({ mfr: G, model: 'Server 1U short-depth', u: 1, w: [120, 300], psu: 1, fullDepth: false, depthMm: 380, nics: [[4, 'rj45', 'NIC', '1G']], generic: true }))
out.push(server({ mfr: G, model: 'GPU server 4U (8 GPU)', u: 4, w: [3500, 6000], psu: 4, psuType: 'c20', nics: [[2, 'qsfp28', 'P', '100G'], [2, 'rj45', 'NIC', '10G']], generic: true, depthMm: 900 }, 'gpu'))
out.push(server({ mfr: G, model: 'Storage server 4U (60 bay)', u: 4, w: [600, 1200], nics: [[2, 'sfp28', 'P', '25G']], generic: true, depthMm: 1000 }, 'storage'))
out.push(server({ mfr: G, model: 'Desktop PC on shelf', u: 4, w: [80, 250], psu: 1, bmc: '', nics: [[1, 'rj45', 'NIC', '1G']], fullDepth: false, generic: true }, 'other'))

// Switches
for (const n of [8, 16, 24, 48]) {
  out.push(sw({ mfr: G, model: `Switch ${n}-port 1G`, ports: [[n, 'rj45', 'Port', '1G', n > 24 ? 2 : n > 12 ? 2 : 1]], w: [n * 0.6 + 10, n * 0.8 + 20], psu: 1, generic: true, depthMm: 250 }))
  out.push(sw({ mfr: G, model: `Switch ${n}-port 1G + 4 SFP+`, ports: [[n, 'rj45', 'Port', '1G', n > 12 ? 2 : 1], [4, 'sfp+', 'SFP', '10G']], w: [n * 0.6 + 20, n * 0.8 + 40], psu: 1, generic: true, depthMm: 300 }))
  out.push(sw({ mfr: G, model: `PoE switch ${n}-port + 4 SFP+`, ports: [[n, 'rj45-poe', 'Port', '1G', n > 12 ? 2 : 1], [4, 'sfp+', 'SFP', '10G']], w: [n * 3 + 40, n * 15 + 60], psu: 1, generic: true, depthMm: 350 }))
}
out.push(sw({ mfr: G, model: 'Switch 48x 10G SFP+ + 6x 40G', ports: [[48, 'sfp+', 'Eth', '10G', 2], [6, 'qsfp+', 'QSFP', '40G']], w: [200, 350], generic: true, depthMm: 480 }))
out.push(sw({ mfr: G, model: 'Switch 48x 25G SFP28 + 8x 100G', ports: [[48, 'sfp28', 'Eth', '25G', 2], [8, 'qsfp28', 'QSFP', '100G']], w: [300, 500], generic: true, depthMm: 480 }))
out.push(sw({ mfr: G, model: 'Switch 32x 100G QSFP28', ports: [[32, 'qsfp28', 'Eth', '100G', 2]], w: [350, 600], generic: true, depthMm: 480 }))
out.push(sw({ mfr: G, model: 'Switch 32x 400G QSFP-DD', ports: [[32, 'qsfp-dd', 'Eth', '400G', 2]], w: [650, 1400], generic: true, depthMm: 520 }))
out.push(sw({ mfr: G, model: 'Switch 48x 10GBASE-T + 6x 100G', ports: [[48, 'rj45', 'Eth', '10G', 2], [6, 'qsfp28', 'QSFP', '100G']], w: [350, 550], generic: true, depthMm: 480 }))

// Routers & firewalls
out.push(sw({ mfr: G, model: 'Router 1U (4x 1G, 2x SFP+)', category: 'router', ports: [[4, 'rj45', 'Gi', '1G'], [2, 'sfp+', 'Te', '10G']], w: [60, 150], psu: 1, generic: true, depthMm: 300 }))
out.push(sw({ mfr: G, model: 'Firewall 1U (8x 1G, 4x SFP+)', category: 'firewall', ports: [[8, 'rj45', 'Port', '1G'], [4, 'sfp+', 'X', '10G']], w: [80, 180], psu: 2, generic: true, depthMm: 400 }))
out.push(sw({ mfr: G, model: 'ISP modem/ONT on shelf', category: 'router', u: 1, ports: [[1, 'coax', 'WAN'], [4, 'rj45', 'LAN', '1G']], mgmt: false, console: false, w: [10, 20], psu: 1, psuType: 'c8', generic: true }))
out.push(sw({ mfr: G, model: 'Wireless LAN controller 1U', category: 'wireless', ports: [[4, 'sfp+', 'Port', '10G']], w: [120, 250], generic: true, depthMm: 450 }))

// Storage
for (const [u, bays] of [[1, 4], [2, 12], [2, 24], [4, 24], [4, 36]] as const) {
  out.push(server({ mfr: G, model: `Storage array ${u}U ${bays}-bay`, u, w: [bays * 9 + 120, bays * 14 + 250], nics: [[4, 'sfp+', 'Data', '10G'], [2, 'rj45', 'Mgmt', '1G']], bmc: '', generic: true, depthMm: 700 }, 'storage'))
}
out.push(server({ mfr: G, model: 'JBOD 2U 24-bay (SAS)', u: 2, w: [250, 450], bmc: '', nics: [[4, 'rj45', 'SAS', '12G']], generic: true }, 'storage'))
out.push(server({ mfr: G, model: 'Tape library 2U', u: 2, w: [70, 150], bmc: '', nics: [[2, 'sfp-fc', 'FC', '16G'], [1, 'rj45', 'Mgmt', '1G']], generic: true }, 'storage'))

// Power
const outlets120: P[] = [[8, 'nema-5-15r', 'Out']]
out.push(pdu({ mfr: G, model: 'PDU 1U 120V 15A (8x 5-15R)', u: 1, voltage: 120, amps: 15, input: 'nema-5-15p', outlets: outlets120, generic: true }))
out.push(pdu({ mfr: G, model: 'PDU 1U 120V 20A (12x 5-20R)', u: 1, voltage: 120, amps: 20, input: 'nema-5-20p', outlets: [[12, 'nema-5-20r', 'Out']], generic: true }))
out.push(pdu({ mfr: G, model: 'PDU 1U 230V 10A (8x C13)', u: 1, voltage: 230, amps: 10, input: 'c14', outlets: [[8, 'c13']], generic: true }))
out.push(pdu({ mfr: G, model: 'PDU 1U 230V 16A (8x C13, 2x C19)', u: 1, voltage: 230, amps: 16, input: 'iec309-16p', outlets: [[8, 'c13'], [2, 'c19']], generic: true }))
out.push(pdu({ mfr: G, model: 'PDU 1U 230V 16A (8x Schuko)', u: 1, voltage: 230, amps: 16, input: 'schuko-p', outlets: [[8, 'schuko-r']], generic: true }))
out.push(pdu({ mfr: G, model: 'PDU 1U 230V 13A (8x UK)', u: 1, voltage: 230, amps: 13, input: 'bs1363-p', outlets: [[8, 'bs1363-r']], generic: true }))
out.push(pdu({ mfr: G, model: 'Vertical PDU 0U 208V 30A (24x C13, 6x C19)', voltage: 208, amps: 24, input: 'nema-l6-30p', outlets: [[24, 'c13'], [6, 'c19']], metered: true, generic: true, description: 'Metered PDU, 208V L6-30P (24A continuous)' }))
out.push(pdu({ mfr: G, model: 'Vertical PDU 0U 230V 16A (20x C13, 4x C19)', voltage: 230, amps: 16, input: 'iec309-16p', outlets: [[20, 'c13'], [4, 'c19']], metered: true, generic: true }))
out.push(pdu({ mfr: G, model: 'Vertical PDU 0U 230V 32A (36x C13, 6x C19)', voltage: 230, amps: 32, input: 'iec309-32p', outlets: [[36, 'c13'], [6, 'c19']], metered: true, generic: true }))
out.push(pdu({ mfr: G, model: 'Vertical PDU 0U 400V 3ph 32A (36x C13, 6x C19)', voltage: 230, amps: 32, threePhase: 400, input: 'iec309-32p-3ph', outlets: [[36, 'c13'], [6, 'c19']], metered: true, generic: true }))
out.push(pdu({ mfr: G, model: 'Vertical PDU 0U 208V 3ph 30A (30x C13, 6x C19)', voltage: 208, amps: 24, threePhase: 208, input: 'nema-l21-30p', outlets: [[30, 'c13'], [6, 'c19']], metered: true, generic: true }))
out.push(pdu({ mfr: G, model: 'Vertical PDU 0U 120V 20A (24x 5-20R)', voltage: 120, amps: 16, input: 'nema-5-20p', outlets: [[24, 'nema-5-20r', 'Out']], generic: true }))
out.push(ups({ mfr: G, model: 'UPS 1U 1000VA', u: 1, va: 1000, watts: 800, input: 'c14', outlets: [[6, 'c13']], generic: true }))
out.push(ups({ mfr: G, model: 'UPS 2U 1500VA (120V)', u: 2, va: 1500, watts: 1000, input: 'nema-5-15p', outlets: [[6, 'nema-5-15r']], voltage: 120, generic: true }))
out.push(ups({ mfr: G, model: 'UPS 2U 3000VA (230V)', u: 2, va: 3000, watts: 2700, input: 'c20', outlets: [[8, 'c13'], [1, 'c19']], voltage: 230, generic: true }))
out.push(ups({ mfr: G, model: 'UPS 3U 6kVA online (230V)', u: 3, va: 6000, watts: 6000, input: 'iec309-32p', outlets: [[6, 'c13'], [4, 'c19']], voltage: 230, generic: true }))
out.push(item(G, 'Battery pack 2U', 'ups', 2, { fullDepth: true, weightKg: 45, generic: true }))
out.push(item(G, 'Automatic transfer switch 1U', 'pdu', 1, { generic: true, front: [[1, 'c20', 'Input A'], [1, 'c20', 'Input B'], [8, 'c13', 'Out']] }))

// Facility feeds
out.push(feed('120V 15A (5-15R)', 120, 15, 'nema-5-15r'))
out.push(feed('120V 20A (5-20R)', 120, 20, 'nema-5-20r'))
out.push(feed('120V 30A (L5-30R)', 120, 30, 'nema-l5-30r'))
out.push(feed('208V 20A (L6-20R)', 208, 20, 'nema-l6-20r'))
out.push(feed('208V 30A (L6-30R)', 208, 30, 'nema-l6-30r'))
out.push(feed('208V 30A 3-phase (L21-30R)', 208, 30, 'nema-l21-30r', 3))
out.push(feed('208V 30A 3-phase (L15-30R)', 208, 30, 'nema-l15-30r', 3))
out.push(feed('230V 16A (IEC 60309)', 230, 16, 'iec309-16r'))
out.push(feed('230V 32A (IEC 60309)', 230, 32, 'iec309-32r'))
out.push(feed('400V 32A 3-phase (IEC 60309)', 400, 32, 'iec309-32r-3ph', 3))
out.push(feed('230V 16A wall socket (Schuko)', 230, 16, 'schuko-r'))
out.push(feed('230V 13A wall socket (UK)', 230, 13, 'bs1363-r'))
out.push(feed('230V 10A wall socket (AU/NZ)', 230, 10, 'as3112-r'))
out.push(feed('48V DC 30A', 48, 30, 'dc-out'))
out.push(feed('208V 50A hardwired', 208, 50, 'hardwire-out'))
out.push(feed('208V 60A 3-phase hardwired', 208, 60, 'hardwire-3ph-out', 3))
out.push(feed('400V 63A 3-phase hardwired', 400, 63, 'hardwire-3ph-out', 3))

// Patch panels
for (const cat of ['Cat5e', 'Cat6', 'Cat6A']) {
  for (const n of [12, 24, 48]) {
    const u = n === 48 ? 2 : 1
    out.push(item(G, `${cat} patch panel ${n}-port`, 'patch-panel', u, {
      front: [[n, 'rj45', '', undefined, n > 24 ? 2 : 1]],
      rear: [[n, 'rj45', '', undefined, n > 24 ? 2 : 1]],
      generic: true,
      depthMm: 100,
      color: '#262626'
    }))
  }
}
out.push(item(G, 'Keystone patch panel 24-port', 'patch-panel', 1, { front: [[24, 'keystone', '']], rear: [[24, 'keystone', '']], generic: true }))
out.push(item(G, 'Keystone patch panel 48-port 1U (high density)', 'patch-panel', 1, { front: [[48, 'keystone', '', undefined, 2]], rear: [[48, 'keystone', '', undefined, 2]], generic: true }))
for (const [n, u] of [[12, 1], [24, 1], [48, 1], [72, 2], [96, 2], [144, 4]] as const) {
  const rows = Math.ceil(n / 24)
  out.push(item(G, `Fibre panel LC ${n}-port (${u}U)`, 'patch-panel', u, { front: [[n, 'lc', '', undefined, rows]], rear: [[n, 'lc', '', undefined, rows]], generic: true, color: '#2a2a2a' }))
}
out.push(item(G, 'Fibre panel SC 24-port', 'patch-panel', 1, { front: [[24, 'sc', '']], rear: [[24, 'sc', '']], generic: true }))
out.push(item(G, 'MPO-LC cassette panel 1U (4x MPO → 48 LC)', 'patch-panel', 1, { front: [[48, 'lc', '', undefined, 2]], rear: [[4, 'mpo', 'MPO']], generic: true }))
out.push(item(G, 'MPO-LC cassette panel 2U (12x MPO → 144 LC)', 'patch-panel', 2, { front: [[144, 'lc', '', undefined, 4]], rear: [[12, 'mpo', 'MPO']], generic: true }))
out.push(item(G, 'MPO pass-through panel 24-port', 'patch-panel', 1, { front: [[24, 'mpo', '']], rear: [[24, 'mpo', '']], generic: true }))
out.push(item(G, 'Coax patch panel 24-port', 'patch-panel', 1, { front: [[24, 'coax', '']], rear: [[24, 'coax', '']], generic: true }))

// Cable management, blanks and shelves
for (const u of [1, 2]) {
  out.push(item(G, `Horizontal cable manager ${u}U`, 'cable-management', u, { generic: true, color: '#151515', depthMm: 90 }))
  out.push(item(G, `Cable manager with D-rings ${u}U`, 'cable-management', u, { generic: true, color: '#151515' }))
}
out.push(item(G, 'Brush panel 1U', 'cable-management', 1, { generic: true, color: '#111111' }))
out.push(item(G, 'Brush panel 2U', 'cable-management', 2, { generic: true, color: '#111111' }))
out.push(item(G, 'Pass-through panel 1U', 'cable-management', 1, { generic: true, color: '#131313' }))
for (const u of [1, 2, 3, 4, 5, 6, 8, 10]) out.push(item(G, `Blanking panel ${u}U`, 'blank', u, { generic: true, color: '#0e0e0e', depthMm: 20 }))
out.push(item(G, 'Vented blanking panel 1U', 'blank', 1, { generic: true, color: '#0e0e0e' }))
out.push(item(G, 'Vented blanking panel 2U', 'blank', 2, { generic: true, color: '#0e0e0e' }))
for (const u of [1, 2, 3, 4]) {
  out.push(item(G, `Fixed shelf ${u}U`, 'shelf', u, { generic: true, color: '#2d2d2d', fullDepth: true }))
  out.push(item(G, `Cantilever shelf ${u}U`, 'shelf', u, { generic: true, color: '#2d2d2d' }))
}
out.push(item(G, 'Sliding shelf 1U', 'shelf', 1, { generic: true, color: '#2d2d2d', fullDepth: true }))
out.push(item(G, 'Sliding shelf 2U', 'shelf', 2, { generic: true, color: '#2d2d2d', fullDepth: true }))
out.push(item(G, 'Keyboard drawer 1U', 'shelf', 1, { generic: true, color: '#232323', fullDepth: true, rear: [[1, 'usb-a', 'USB']] }))
out.push(item(G, 'Drawer 2U', 'shelf', 2, { generic: true, color: '#2d2d2d' }))
out.push(item(G, 'Drawer 3U', 'shelf', 3, { generic: true, color: '#2d2d2d' }))
out.push(item(G, 'Fan tray 1U', 'other', 1, { generic: true, w: [40, 80], rear: [[1, 'c14', 'PSU']], fullDepth: true }))
out.push(item(G, 'Rack-mount monitor 1U (LCD console)', 'kvm', 1, { generic: true, fullDepth: true, w: [25, 40], rear: [[1, 'vga', 'VGA'], [1, 'usb-a', 'USB'], [1, 'c14', 'PSU']] }))
out.push(item(G, 'Environmental monitor 1U', 'other', 1, { generic: true, w: [5, 10], front: [[4, 'rj45', 'Sensor']], rear: [[1, 'rj45', 'LAN'], [1, 'c14', 'PSU']] }))
out.push(item(G, 'NUC / mini PC tray 1U', 'server', 1, { generic: true, w: [30, 65], rear: [[2, 'rj45', 'NIC', '1G'], [1, 'c14', 'PSU']] }))
out.push(item(G, 'Raspberry Pi tray 1U (4x)', 'server', 1, { generic: true, w: [20, 40], front: [[4, 'rj45', 'Pi', '1G']], rear: [[1, 'c14', 'PSU']] }))

// KVM & console
for (const n of [8, 16, 32]) {
  out.push(item(G, `KVM switch ${n}-port`, 'kvm', 1, { generic: true, w: [10, 20], rear: [[n, 'rj45', 'CPU'], [1, 'vga', 'Console VGA'], [2, 'usb-a', 'Console USB'], [1, 'c14', 'PSU']] }))
}
for (const n of [8, 16, 32, 48]) {
  out.push(item(G, `Console server ${n}-port`, 'console-server', 1, { generic: true, w: [12, 25], front: [[n, 'console-rj45', 'Port', undefined, n > 16 ? 2 : 1]], rear: [[2, 'rj45', 'Net', '1G'], [2, 'c14', 'PSU']] }))
}

export const genericComponents = out
