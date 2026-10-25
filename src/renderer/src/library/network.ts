// Switches, routers, wireless controllers and SAN switches. Port layouts are the
// base configuration; power figures are nominal typical/max estimates.
import type { Category, ComponentDef } from '../model/types'
import { sw, type P } from './builders'

export interface NetOpts {
  u?: number
  psu?: number
  psuType?: string
  depthMm?: number
  kg?: number
  cat?: Category
  rear?: P[]
  desc?: string
  mgmt?: boolean
  console?: boolean
}
export type NRow = [model: string, ports: P[], w: [number, number], o?: NetOpts]

export function line(mfr: string, color: string, rows: NRow[], defaults: NetOpts = {}): ComponentDef[] {
  return rows.map(([model, ports, w, o = {}]) => {
    const opts = { ...defaults, ...o }
    return sw({
      mfr,
      model,
      u: opts.u,
      ports,
      rear: opts.rear,
      w,
      psu: opts.psu,
      psuType: opts.psuType,
      depthMm: opts.depthMm,
      weightKg: opts.kg,
      category: opts.cat,
      description: opts.desc,
      mgmt: opts.mgmt,
      console: opts.console,
      color
    })
  })
}

// Port shorthands
const rj = (n: number, label = '', speed = '1G'): P => [n, 'rj45', label, speed]
const poe = (n: number, label = '', speed = '1G'): P => [n, 'rj45-poe', label, speed]
const sfp = (n: number, label = '', speed = '1G'): P => [n, 'sfp', label, speed]
const sfpp = (n: number, label = '', speed = '10G'): P => [n, 'sfp+', label, speed]
const sfp28 = (n: number, label = '', speed = '25G'): P => [n, 'sfp28', label, speed]
const sfp56 = (n: number, label = '', speed = '50G'): P => [n, 'sfp56', label, speed]
const q40 = (n: number, label = '', speed = '40G'): P => [n, 'qsfp+', label, speed]
const q100 = (n: number, label = '', speed = '100G'): P => [n, 'qsfp28', label, speed]
const q200 = (n: number, label = '', speed = '200G'): P => [n, 'qsfp56', label, speed]
const qdd = (n: number, label = '', speed = '400G'): P => [n, 'qsfp-dd', label, speed]
const osfp = (n: number, label = '', speed = '800G'): P => [n, 'osfp', label, speed]
const fc = (n: number, label = '', speed = '32G'): P => [n, 'sfp-fc', label, speed]
const stack = (n = 2): P => [n, 'stack', 'Stack']

const CISCO = '#3b4652'
const CISCO_DC = '#2f363f'
const MERAKI = '#3c4a3e'

const catalyst = line('Cisco', CISCO, [
  ['Catalyst C1000-8T-2G-L', [rj(8, 'Gi1/0/'), sfp(2, 'Gi1/0/', '1G')], [10, 20], { psu: 1, depthMm: 160 }],
  ['Catalyst C1000-24T-4G-L', [rj(24, 'Gi1/0/'), sfp(4, 'Gi1/0/')], [20, 35], { psu: 1, depthMm: 260 }],
  ['Catalyst C1000-24P-4G-L', [poe(24, 'Gi1/0/'), sfp(4, 'Gi1/0/')], [40, 250], { psu: 1, depthMm: 300 }],
  ['Catalyst C1000-48T-4G-L', [rj(48, 'Gi1/0/'), sfp(4, 'Gi1/0/')], [30, 50], { psu: 1, depthMm: 260 }],
  ['Catalyst C1000-48P-4X-L', [poe(48, 'Gi1/0/'), sfpp(4, 'Te1/0/')], [60, 480], { psu: 1, depthMm: 360 }],
  ['Catalyst C1200-24T-4G', [rj(24, 'GE'), sfp(4, 'GE')], [18, 30], { psu: 1 }],
  ['Catalyst C1200-48P-4X', [poe(48, 'GE'), sfpp(4, 'XG')], [55, 450], { psu: 1 }],
  ['Catalyst C1300-24T-4X', [rj(24, 'GE'), sfpp(4, 'XG')], [25, 40], { psu: 1 }],
  ['Catalyst C1300-48P-4X', [poe(48, 'GE'), sfpp(4, 'XG')], [60, 480], { psu: 1 }],
  ['Business CBS350-24T-4G', [rj(24, 'GE'), sfp(4, 'GE')], [18, 30], { psu: 1 }],
  ['Business CBS350-48P-4G', [poe(48, 'GE'), sfp(4, 'GE')], [55, 450], { psu: 1 }],
  ['Catalyst 2960X-24TS-L', [rj(24, 'Gi1/0/'), sfp(4, 'Gi1/0/')], [30, 50], { psu: 1, depthMm: 280 }],
  ['Catalyst 2960X-48TS-L', [rj(48, 'Gi1/0/'), sfp(4, 'Gi1/0/')], [40, 60], { psu: 1, depthMm: 280 }],
  ['Catalyst 2960X-48FPS-L', [poe(48, 'Gi1/0/'), sfp(4, 'Gi1/0/')], [70, 800], { psu: 1, depthMm: 380 }],
  ['Catalyst 3650-48PS', [poe(48, 'Gi1/0/'), sfp(4, 'Gi1/1/')], [90, 640], { depthMm: 450 }],
  ['Catalyst 3850-48P', [poe(48, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [110, 1100], { depthMm: 450, rear: [stack()] }],
  ['Catalyst C9200L-24T-4G', [rj(24, 'Gi1/0/'), sfp(4, 'Gi1/1/')], [35, 50], { psu: 1, depthMm: 290 }],
  ['Catalyst C9200L-24P-4G', [poe(24, 'Gi1/0/'), sfp(4, 'Gi1/1/')], [45, 450], { psu: 1, depthMm: 290 }],
  ['Catalyst C9200L-24T-4X', [rj(24, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [38, 55], { psu: 1, depthMm: 290 }],
  ['Catalyst C9200L-48T-4G', [rj(48, 'Gi1/0/'), sfp(4, 'Gi1/1/')], [45, 65], { psu: 1, depthMm: 290 }],
  ['Catalyst C9200L-48T-4X', [rj(48, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [48, 70], { psu: 1, depthMm: 290 }],
  ['Catalyst C9200L-48P-4G', [poe(48, 'Gi1/0/'), sfp(4, 'Gi1/1/')], [60, 600], { psu: 1, depthMm: 290 }],
  ['Catalyst C9200L-48P-4X', [poe(48, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [62, 600], { psu: 1, depthMm: 290 }],
  ['Catalyst C9200-24T', [rj(24, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [40, 60], { depthMm: 290, rear: [stack()] }],
  ['Catalyst C9200-24P', [poe(24, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [50, 500], { depthMm: 290, rear: [stack()] }],
  ['Catalyst C9200-48T', [rj(48, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [50, 75], { depthMm: 290, rear: [stack()] }],
  ['Catalyst C9200-48P', [poe(48, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [65, 800], { depthMm: 290, rear: [stack()] }],
  ['Catalyst C9300-24T', [rj(24, 'Gi1/0/'), sfpp(8, 'Te1/1/')], [70, 110], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-24P', [poe(24, 'Gi1/0/'), sfpp(8, 'Te1/1/')], [90, 560], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-24U', [poe(24, 'Gi1/0/'), sfpp(8, 'Te1/1/')], [95, 1100], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-24UX', [poe(24, 'Te1/0/', '10G'), sfpp(8, 'Te1/1/')], [130, 1150], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-48T', [rj(48, 'Gi1/0/'), sfpp(8, 'Te1/1/')], [85, 125], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-48P', [poe(48, 'Gi1/0/'), sfpp(8, 'Te1/1/')], [110, 1100], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-48U', [poe(48, 'Gi1/0/'), sfpp(8, 'Te1/1/')], [115, 1900], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-48UXM', [poe(36, 'Tw1/0/', '2.5G'), poe(12, 'Te1/0/', '10G'), sfpp(8, 'Te1/1/')], [150, 1900], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-48UN', [poe(48, 'Fi1/0/', '5G'), sfpp(8, 'Te1/1/')], [150, 1900], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-24S', [sfp(24, 'Gi1/0/'), sfpp(8, 'Te1/1/')], [90, 130], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300-48S', [sfp(48, 'Gi1/0/'), sfpp(8, 'Te1/1/')], [120, 160], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300L-24T-4X', [rj(24, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [60, 90], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300L-24P-4X', [poe(24, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [80, 560], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300L-48T-4X', [rj(48, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [75, 110], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300L-48P-4X', [poe(48, 'Gi1/0/'), sfpp(4, 'Te1/1/')], [100, 1100], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300L-48UXG-4X', [poe(36, 'Gi1/0/'), poe(12, 'Te1/0/', '10G'), sfpp(4, 'Te1/1/')], [130, 1500], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300X-12Y', [sfp28(12, 'Twe1/0/'), sfpp(8, 'Te1/1/')], [180, 300], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300X-24Y', [sfp28(24, 'Twe1/0/'), sfpp(8, 'Te1/1/')], [220, 350], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300X-48HX', [poe(48, 'Te1/0/', '10G'), q100(2, 'Hu1/1/')], [250, 1900], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9300X-48TX', [rj(48, 'Te1/0/', '10G'), q100(2, 'Hu1/1/')], [220, 350], { depthMm: 445, rear: [stack()] }],
  ['Catalyst C9500-16X', [sfpp(16, 'Te1/0/'), q40(2, 'Fo1/1/')], [180, 250], { depthMm: 445 }],
  ['Catalyst C9500-24Y4C', [sfp28(24, 'Twe1/0/'), q100(4, 'Hu1/0/')], [250, 400], { depthMm: 445 }],
  ['Catalyst C9500-32C', [q100(32, 'Hu1/0/')], [350, 650], { depthMm: 445 }],
  ['Catalyst C9500-32QC', [q100(32, 'Fo1/0/', '40G/100G')], [300, 550], { depthMm: 445 }],
  ['Catalyst C9500-40X', [sfpp(40, 'Te1/0/')], [220, 330], { depthMm: 445 }],
  ['Catalyst C9500-48Y4C', [sfp28(48, 'Twe1/0/'), q100(4, 'Hu1/0/')], [300, 450], { depthMm: 445 }],
  ['Catalyst C9404R (example config)', [sfpp(8, 'Sup Te'), poe(96, 'Gi', '1G')], [600, 3200], { u: 4, psu: 4, psuType: 'c20', depthMm: 400, desc: '4-slot chassis: 1 supervisor + 2x 48-port PoE line cards' }],
  ['Catalyst C9407R (example config)', [sfpp(8, 'Sup Te'), poe(240, 'Gi', '1G')], [900, 6400], { u: 10, psu: 8, psuType: 'c20', depthMm: 400, desc: '7-slot chassis: 1 supervisor + 5x 48-port PoE line cards' }],
  ['Catalyst C9410R (example config)', [sfpp(16, 'Sup Te'), poe(384, 'Gi', '1G')], [1400, 9600], { u: 13, psu: 8, psuType: 'c20', depthMm: 400, desc: '10-slot chassis: 2 supervisors + 8x 48-port PoE line cards' }],
  ['Catalyst C9606R (example config)', [sfpp(16, 'Sup Te'), q100(96, 'Hu')], [1800, 4500], { u: 8, psu: 4, psuType: 'c20', depthMm: 500, desc: '6-slot chassis: 2 supervisors + 4x 24-port 100G line cards' }],
  ['Catalyst 9800-40 WLC', [sfpp(4, 'Te0/0/')], [150, 250], { cat: 'wireless', depthMm: 450 }],
  ['Catalyst 9800-80 WLC', [sfpp(8, 'Te0/0/'), q40(2, 'Fo0/1/')], [250, 500], { cat: 'wireless', u: 2, depthMm: 480 }],
  ['Catalyst 9800-L WLC', [rj(2, 'Gi0/0/', '2.5G'), sfpp(2, 'Te0/0/')], [60, 90], { cat: 'wireless', psu: 1 }],
  ['AIR-CT5520 WLC', [sfpp(2, 'Te0/0/')], [150, 250], { cat: 'wireless', depthMm: 450 }]
])

const nexus = line('Cisco', CISCO_DC, [
  ['Nexus N3K-C3048TP-1GE', [rj(48, 'Eth1/'), sfpp(4, 'Eth1/')], [120, 200], { depthMm: 438 }],
  ['Nexus N3K-C3172PQ-10GE', [sfpp(48, 'Eth1/'), q40(6, 'Eth1/')], [250, 350], { depthMm: 438 }],
  ['Nexus N9K-C92348GC-X', [rj(48, 'Eth1/'), sfp28(4, 'Eth1/'), q100(2, 'Eth1/')], [130, 250], { depthMm: 438 }],
  ['Nexus N9K-C9348GC-FXP', [rj(48, 'Eth1/'), sfp28(4, 'Eth1/'), q100(2, 'Eth1/')], [140, 300], { depthMm: 438 }],
  ['Nexus N9K-C93108TC-FX', [rj(48, 'Eth1/', '10G'), q100(6, 'Eth1/')], [300, 650], { depthMm: 559 }],
  ['Nexus N9K-C93108TC-FX3P', [poe(48, 'Eth1/', '10G'), q100(6, 'Eth1/')], [320, 1500], { depthMm: 559 }],
  ['Nexus N9K-C93180YC-EX', [sfp28(48, 'Eth1/'), q100(6, 'Eth1/')], [250, 470], { depthMm: 559 }],
  ['Nexus N9K-C93180YC-FX', [sfp28(48, 'Eth1/'), q100(6, 'Eth1/')], [260, 500], { depthMm: 559 }],
  ['Nexus N9K-C93180YC-FX3', [sfp28(48, 'Eth1/'), q100(6, 'Eth1/')], [250, 500], { depthMm: 559 }],
  ['Nexus N9K-C93240YC-FX2', [sfp28(48, 'Eth1/'), q100(12, 'Eth1/')], [350, 650], { depthMm: 559 }],
  ['Nexus N9K-C93360YC-FX2', [sfp28(96, 'Eth1/'), q100(12, 'Eth1/')], [500, 1000], { u: 2, depthMm: 559 }],
  ['Nexus N9K-C9336C-FX2', [q100(36, 'Eth1/')], [400, 800], { depthMm: 559 }],
  ['Nexus N9K-C9332C', [q100(32, 'Eth1/'), sfpp(2, 'Eth1/')], [300, 600], { depthMm: 559 }],
  ['Nexus N9K-C9364C', [q100(64, 'Eth1/'), sfpp(2, 'Eth1/')], [700, 1400], { u: 2, depthMm: 559 }],
  ['Nexus N9K-C9316D-GX', [qdd(16, 'Eth1/')], [500, 1100], { depthMm: 559 }],
  ['Nexus N9K-C93600CD-GX', [q100(28, 'Eth1/'), qdd(8, 'Eth1/')], [550, 1100], { depthMm: 559 }],
  ['Nexus N9K-C9332D-GX2B', [qdd(32, 'Eth1/'), sfpp(2, 'Eth1/')], [700, 1500], { depthMm: 559 }],
  ['Nexus N9K-C9364D-GX2A', [qdd(64, 'Eth1/'), sfpp(2, 'Eth1/')], [1300, 3000], { u: 2, psu: 2, psuType: 'c20', depthMm: 600 }],
  ['Nexus N9K-C9408 (example config)', [qdd(64, 'Eth')], [2000, 6000], { u: 4, psu: 4, psuType: 'c20', depthMm: 750, desc: '8-slot chassis with 4x 16-port 400G LEMs' }],
  ['Nexus N9K-C9504 (example config)', [q100(144, 'Eth')], [2500, 6000], { u: 7, psu: 4, psuType: 'c20', depthMm: 800, desc: '4-slot chassis with 4x 36-port 100G line cards' }],
  ['Nexus N2K-C2232PP-10GE FEX', [sfpp(32, 'Eth100/1/'), sfpp(8, 'Fabric')], [200, 280], { depthMm: 450, mgmt: false }],
  ['Nexus N2K-C2348UPQ FEX', [sfpp(48, 'Eth100/1/'), q40(6, 'Fabric')], [250, 350], { depthMm: 450, mgmt: false }],
  ['Nexus N2K-C2248TP-E-1GE FEX', [rj(48, 'Eth100/1/'), sfpp(4, 'Fabric')], [100, 150], { depthMm: 450, mgmt: false }],
  ['UCS-FI-6248UP Fabric Interconnect', [sfpp(32, 'Eth1/'), sfpp(16, 'Eth2/')], [350, 600], { depthMm: 760 }],
  ['UCS-FI-6332 Fabric Interconnect', [q40(32, 'Eth1/')], [330, 600], { depthMm: 760 }],
  ['UCS-FI-6454 Fabric Interconnect', [sfp28(48, 'Eth1/'), q100(6, 'Eth1/')], [400, 700], { depthMm: 760 }],
  ['UCS-FI-6536 Fabric Interconnect', [q100(36, 'Eth1/')], [450, 800], { depthMm: 760 }],
  ['MDS 9132T', [fc(32, 'fc1/')], [130, 300], { cat: 'switch', depthMm: 440 }],
  ['MDS 9148T', [fc(48, 'fc1/')], [180, 400], { depthMm: 440 }],
  ['MDS 9396T', [fc(96, 'fc1/')], [350, 800], { u: 2, depthMm: 520 }],
  ['MDS 9124V', [fc(24, 'fc1/', '64G')], [150, 350], { depthMm: 440 }],
  ['MDS 9148V', [fc(48, 'fc1/', '64G')], [220, 500], { depthMm: 440 }]
])

const ciscoRouters = line('Cisco', CISCO, [
  ['ISR4321', [rj(2, 'Gi0/0/'), sfp(1, 'Gi0/0/')], [40, 250], { psu: 1, cat: 'router', depthMm: 312 }],
  ['ISR4331', [rj(3, 'Gi0/0/'), sfp(2, 'Gi0/0/')], [50, 250], { psu: 1, cat: 'router', depthMm: 312 }],
  ['ISR4351', [rj(3, 'Gi0/0/'), sfp(3, 'Gi0/0/')], [70, 450], { u: 2, cat: 'router', depthMm: 420 }],
  ['ISR4431', [rj(4, 'Gi0/0/'), sfp(4, 'Gi0/0/')], [80, 250], { cat: 'router', depthMm: 450 }],
  ['ISR4451-X', [rj(4, 'Gi0/0/'), sfp(4, 'Gi0/0/')], [120, 450], { u: 2, cat: 'router', depthMm: 480 }],
  ['ISR4461', [rj(4, 'Gi0/0/'), sfpp(2, 'Te0/0/')], [150, 700], { u: 3, cat: 'router', depthMm: 480 }],
  ['Catalyst C8200-1N-4T', [rj(4, 'Gi0/0/'), sfp(2, 'Gi0/0/')], [40, 150], { psu: 1, cat: 'router', depthMm: 300 }],
  ['Catalyst C8300-1N1S-4T2X', [rj(4, 'Gi0/0/'), sfpp(2, 'Te0/0/')], [70, 250], { cat: 'router', depthMm: 450 }],
  ['Catalyst C8300-1N1S-6T', [rj(6, 'Gi0/0/'), sfp(2, 'Gi0/0/')], [60, 250], { cat: 'router', depthMm: 450 }],
  ['Catalyst C8300-2N2S-4T2X', [rj(4, 'Gi0/0/'), sfpp(2, 'Te0/0/')], [90, 450], { u: 2, cat: 'router', depthMm: 450 }],
  ['Catalyst C8500-12X', [sfpp(12, 'Te0/0/')], [250, 400], { cat: 'router', depthMm: 500 }],
  ['Catalyst C8500-12X4QC', [sfpp(12, 'Te0/0/'), q100(4, 'Hu0/1/')], [300, 450], { cat: 'router', depthMm: 500 }],
  ['Catalyst C8500L-8S4X', [sfp(8, 'Gi0/0/'), sfpp(4, 'Te0/1/')], [120, 200], { cat: 'router', depthMm: 450 }],
  ['ASR1001-X', [sfp(6, 'Gi0/0/'), sfpp(2, 'Te0/0/')], [200, 400], { cat: 'router', depthMm: 470 }],
  ['ASR1001-HX', [sfp(8, 'Gi0/0/'), sfpp(8, 'Te0/1/')], [300, 600], { cat: 'router', depthMm: 470 }],
  ['ASR1002-HX', [sfp(8, 'Gi0/0/'), sfpp(8, 'Te0/1/')], [400, 1000], { u: 2, cat: 'router', depthMm: 560 }],
  ['ASR 9901', [sfp28(24, 'Te0/0/0/'), q100(4, 'Hu0/0/0/')], [500, 1200], { u: 2, cat: 'router', depthMm: 600 }],
  ['ASR 9903', [sfpp(16, 'Te0/0/0/'), q100(20, 'Hu0/0/0/')], [700, 2000], { u: 3, psu: 4, cat: 'router', depthMm: 600 }],
  ['NCS 540 (N540-24Z8Q2C-M)', [sfp28(24, 'Te0/0/0/'), q100(8, 'Hu0/0/0/', '40G/100G'), q100(2, 'Hu0/0/1/')], [200, 400], { cat: 'router', depthMm: 300 }],
  ['Cisco 8201-32FH', [qdd(32, 'FH0/0/0/')], [600, 1300], { cat: 'router', depthMm: 600 }],
  ['Cisco 8201-24H8FH', [q100(24, 'Hu0/0/0/'), qdd(8, 'FH0/0/0/')], [500, 1000], { cat: 'router', depthMm: 600 }]
])

const meraki = line('Cisco Meraki', MERAKI, [
  ['MS120-24P', [poe(24), sfp(4)], [40, 370], { psu: 1, mgmt: false, console: false }],
  ['MS120-48LP', [poe(48), sfp(4)], [55, 370], { psu: 1, mgmt: false, console: false }],
  ['MS125-24P', [poe(24), sfpp(4)], [45, 370], { psu: 1, mgmt: false, console: false }],
  ['MS125-48FP', [poe(48), sfpp(4)], [70, 740], { psu: 1, mgmt: false, console: false }],
  ['MS130-24P', [poe(24), sfpp(4)], [45, 370], { psu: 1, mgmt: false, console: false }],
  ['MS130-48P', [poe(48), sfpp(4)], [65, 740], { psu: 1, mgmt: false, console: false }],
  ['MS210-24P', [poe(24), sfp(4)], [50, 370], { psu: 1, mgmt: false, console: false, rear: [stack()] }],
  ['MS225-48LP', [poe(48), sfpp(4)], [65, 370], { psu: 1, mgmt: false, console: false, rear: [stack()] }],
  ['MS250-48FP', [poe(48), sfpp(4)], [90, 800], { mgmt: false, console: false, rear: [stack()] }],
  ['MS350-24X', [poe(24, '', '10G'), sfpp(4)], [140, 800], { mgmt: false, console: false, rear: [stack()] }],
  ['MS355-48X2', [poe(48, '', '10G'), sfpp(4), q40(2)], [200, 1100], { mgmt: false, console: false, rear: [stack()] }],
  ['MS390-48UX', [poe(48, '', '10G'), sfpp(8)], [180, 1500], { mgmt: false, console: false, rear: [stack()] }],
  ['MS410-16', [sfp(16), sfpp(2)], [80, 150], { mgmt: false, console: false }],
  ['MS425-32', [sfpp(32), q40(2)], [200, 300], { mgmt: false, console: false }],
  ['MS450-12', [q40(12), q100(2)], [250, 400], { mgmt: false, console: false }],
  ['MX85', [rj(8), sfp(2), rj(2, 'WAN')], [30, 75], { psu: 1, cat: 'firewall', mgmt: false, console: false }],
  ['MX95', [rj(4), sfp(2), rj(2, 'WAN', '2.5G'), sfpp(2, 'WAN')], [40, 90], { psu: 1, cat: 'firewall', mgmt: false, console: false }],
  ['MX105', [rj(4), sfp(2), rj(2, 'WAN', '2.5G'), sfpp(2, 'WAN')], [45, 100], { cat: 'firewall', mgmt: false, console: false }],
  ['MX250', [rj(8), sfp(8), sfpp(8)], [120, 250], { cat: 'firewall', mgmt: false, console: false }],
  ['MX450', [rj(8), sfp(8), sfpp(8)], [150, 300], { cat: 'firewall', mgmt: false, console: false }]
])

const juniper = line('Juniper', '#2e3a3f', [
  ['EX2300-24T', [rj(24, 'ge-0/0/'), sfpp(4, 'xe-0/1/')], [35, 55], { psu: 1, depthMm: 260 }],
  ['EX2300-24P', [poe(24, 'ge-0/0/'), sfpp(4, 'xe-0/1/')], [45, 450], { psu: 1, depthMm: 310 }],
  ['EX2300-48T', [rj(48, 'ge-0/0/'), sfpp(4, 'xe-0/1/')], [45, 70], { psu: 1, depthMm: 260 }],
  ['EX2300-48P', [poe(48, 'ge-0/0/'), sfpp(4, 'xe-0/1/')], [60, 900], { psu: 1, depthMm: 310 }],
  ['EX3400-24T', [rj(24, 'ge-0/0/'), sfpp(4, 'xe-0/2/'), q40(2, 'et-0/1/')], [70, 110], { depthMm: 350 }],
  ['EX3400-24P', [poe(24, 'ge-0/0/'), sfpp(4, 'xe-0/2/'), q40(2, 'et-0/1/')], [80, 600], { depthMm: 350 }],
  ['EX3400-48T', [rj(48, 'ge-0/0/'), sfpp(4, 'xe-0/2/'), q40(2, 'et-0/1/')], [85, 125], { depthMm: 350 }],
  ['EX3400-48P', [poe(48, 'ge-0/0/'), sfpp(4, 'xe-0/2/'), q40(2, 'et-0/1/')], [100, 1100], { depthMm: 350 }],
  ['EX4100-24T', [rj(24, 'ge-0/0/'), sfp28(4, 'et-0/2/'), sfpp(4, 'xe-0/1/')], [70, 120], { depthMm: 370 }],
  ['EX4100-48P', [poe(48, 'ge-0/0/'), sfp28(4, 'et-0/2/'), sfpp(4, 'xe-0/1/')], [110, 1100], { depthMm: 370 }],
  ['EX4100-48MP', [poe(16, 'mge-0/0/', '10G'), poe(32, 'ge-0/0/', '2.5G'), sfp28(4, 'et-0/2/'), sfpp(4, 'xe-0/1/')], [140, 1300], { depthMm: 370 }],
  ['EX4300-48T', [rj(48, 'ge-0/0/'), q40(4, 'et-0/1/')], [120, 180], { depthMm: 450, rear: [q40(4, 'vcp-255/1/')] }],
  ['EX4300-48P', [poe(48, 'ge-0/0/'), q40(4, 'et-0/1/')], [140, 1100], { depthMm: 450, rear: [q40(4, 'vcp-255/1/')] }],
  ['EX4300-32F', [sfp(32, 'ge-0/0/'), sfpp(4, 'xe-0/1/'), q40(2, 'et-0/2/')], [130, 200], { depthMm: 450 }],
  ['EX4400-24T', [rj(24, 'ge-0/0/'), q100(2, 'et-0/1/')], [110, 180], { depthMm: 445 }],
  ['EX4400-48T', [rj(48, 'ge-0/0/'), q100(2, 'et-0/1/')], [130, 200], { depthMm: 445 }],
  ['EX4400-48P', [poe(48, 'ge-0/0/'), q100(2, 'et-0/1/')], [150, 1400], { depthMm: 445 }],
  ['EX4400-48F', [sfpp(36, 'xe-0/0/', '1/10G'), sfp28(12, 'et-0/0/'), q100(2, 'et-0/1/')], [180, 300], { depthMm: 445 }],
  ['EX4650-48Y', [sfp28(48, 'et-0/0/'), q100(8, 'et-0/0/')], [300, 500], { depthMm: 510 }],
  ['QFX5110-48S', [sfpp(48, 'xe-0/0/'), q100(4, 'et-0/0/')], [230, 400], { depthMm: 510 }],
  ['QFX5120-48T', [rj(48, 'xe-0/0/', '10G'), q100(6, 'et-0/0/')], [300, 500], { depthMm: 510 }],
  ['QFX5120-48Y', [sfp28(48, 'et-0/0/'), q100(8, 'et-0/0/')], [300, 500], { depthMm: 510 }],
  ['QFX5120-48YM', [sfp28(48, 'et-0/0/'), q100(8, 'et-0/0/')], [320, 550], { depthMm: 510 }],
  ['QFX5120-32C', [q100(32, 'et-0/0/'), sfpp(2, 'xe-0/0/')], [350, 600], { depthMm: 510 }],
  ['QFX5130-32CD', [qdd(32, 'et-0/0/'), sfpp(2, 'xe-0/0/')], [650, 1300], { depthMm: 560 }],
  ['QFX5130-48C', [sfp56(48, 'et-0/0/'), qdd(8, 'et-0/0/')], [500, 1000], { depthMm: 560 }],
  ['QFX5200-32C', [q100(32, 'et-0/0/'), sfpp(2, 'xe-0/0/')], [350, 600], { depthMm: 510 }],
  ['QFX5220-32CD', [qdd(32, 'et-0/0/'), sfpp(2, 'xe-0/0/')], [700, 1400], { depthMm: 560 }],
  ['QFX5230-64CD', [qdd(64, 'et-0/0/'), sfpp(2, 'xe-0/0/')], [1500, 3000], { u: 2, psuType: 'c20', depthMm: 600 }],
  ['QFX5240-64OD', [osfp(64, 'et-0/0/')], [2000, 3500], { u: 2, psuType: 'c20', depthMm: 650 }],
  ['QFX10002-36Q', [q40(36, 'et-0/0/')], [500, 1100], { u: 2, depthMm: 750 }],
  ['QFX10002-72Q', [q40(72, 'et-0/0/')], [900, 1700], { u: 2, psu: 4, depthMm: 750 }],
  ['MX204', [q100(4, 'et-0/0/'), sfpp(8, 'xe-0/1/')], [350, 600], { cat: 'router', depthMm: 470 }],
  ['MX304', [q100(48, 'et-0/0/', '100G/400G')], [1000, 2500], { u: 2, psu: 2, psuType: 'c20', cat: 'router', depthMm: 600 }],
  ['MX10003', [q100(36, 'et-0/0/')], [1500, 3000], { u: 3, psu: 4, psuType: 'c20', cat: 'router', depthMm: 750 }],
  ['ACX7100-48L', [sfp56(48, 'et-0/0/'), qdd(6, 'et-0/0/')], [450, 900], { cat: 'router', depthMm: 560 }],
  ['ACX7024', [sfp28(24, 'et-0/0/'), q100(4, 'et-0/0/')], [120, 250], { cat: 'router', depthMm: 250 }],
  ['PTX10001-36MR', [qdd(36, 'et-0/0/')], [1300, 2600], { u: 1, psuType: 'c20', cat: 'router', depthMm: 750 }],
  ['SRX340', [rj(8, 'ge-0/0/'), sfp(8, 'ge-0/0/')], [60, 150], { psu: 1, cat: 'firewall', depthMm: 440 }],
  ['SRX345', [rj(8, 'ge-0/0/'), sfp(8, 'ge-0/0/')], [65, 150], { cat: 'firewall', depthMm: 440 }],
  ['SRX380', [poe(16, 'ge-0/0/'), sfpp(4, 'xe-0/0/')], [90, 600], { cat: 'firewall', depthMm: 440 }],
  ['SRX1500', [rj(12, 'ge-0/0/'), sfp(4, 'ge-0/0/'), sfpp(4, 'xe-0/0/')], [180, 300], { cat: 'firewall', depthMm: 500 }],
  ['SRX1600', [rj(16, 'ge-0/0/'), sfpp(8, 'xe-0/0/'), sfp28(4, 'et-0/0/')], [200, 350], { cat: 'firewall', depthMm: 500 }],
  ['SRX2300', [rj(8, 'ge-0/0/'), sfpp(8, 'xe-0/0/'), sfp28(8, 'et-0/0/'), q100(2, 'et-0/1/')], [300, 500], { cat: 'firewall', depthMm: 500 }],
  ['SRX4100', [sfpp(8, 'xe-0/0/')], [250, 400], { cat: 'firewall', depthMm: 600 }],
  ['SRX4200', [sfpp(8, 'xe-0/0/')], [300, 450], { cat: 'firewall', depthMm: 600 }],
  ['SRX4600', [sfpp(8, 'xe-0/0/'), q100(4, 'et-0/1/')], [500, 900], { cat: 'firewall', depthMm: 650 }],
  ['SRX4700', [sfp28(16, 'et-0/0/'), qdd(8, 'et-0/1/')], [900, 1800], { cat: 'firewall', depthMm: 700 }]
])

const arista = line('Arista', '#2c3138', [
  ['DCS-7010TX-48', [rj(48, 'Et'), sfpp(4, 'Et')], [80, 150], { depthMm: 330 }],
  ['DCS-7010TX-48-DC', [rj(48, 'Et'), sfpp(4, 'Et')], [80, 150], { depthMm: 330, psuType: 'dc-in' }],
  ['DCS-7050TX3-48C8', [rj(48, 'Et', '10G'), q100(8, 'Et')], [300, 500], { depthMm: 520 }],
  ['DCS-7050SX3-48YC8', [sfp28(48, 'Et'), q100(8, 'Et')], [250, 450], { depthMm: 520 }],
  ['DCS-7050SX3-48YC12', [sfp28(48, 'Et'), q100(12, 'Et')], [280, 500], { depthMm: 520 }],
  ['DCS-7050SX3-96YC8', [sfp28(96, 'Et'), q100(8, 'Et')], [450, 800], { u: 2, depthMm: 520 }],
  ['DCS-7050CX3-32S', [q100(32, 'Et'), sfpp(2, 'Et')], [300, 550], { depthMm: 520 }],
  ['DCS-7050CX4-24D8', [q100(24, 'Et', '200G'), qdd(8, 'Et')], [450, 800], { depthMm: 520 }],
  ['DCS-7060CX-32S', [q100(32, 'Et'), sfpp(2, 'Et')], [300, 600], { depthMm: 520 }],
  ['DCS-7060CX2-32S', [q100(32, 'Et'), sfpp(2, 'Et')], [300, 600], { depthMm: 520 }],
  ['DCS-7060DX5-32', [qdd(32, 'Et'), sfpp(2, 'Et')], [700, 1500], { depthMm: 560 }],
  ['DCS-7060DX5-64S', [qdd(64, 'Et'), sfpp(2, 'Et')], [1300, 2800], { u: 2, psuType: 'c20', depthMm: 600 }],
  ['DCS-7060X6-64PE', [osfp(64, 'Et')], [1800, 3500], { u: 2, psuType: 'c20', depthMm: 650 }],
  ['DCS-7280SR3-48YC8', [sfp28(48, 'Et'), q100(8, 'Et')], [350, 600], { depthMm: 560 }],
  ['DCS-7280CR3-32P4', [q100(32, 'Et'), qdd(4, 'Et')], [500, 900], { depthMm: 560 }],
  ['DCS-7280CR3-32D4', [q100(32, 'Et'), qdd(4, 'Et')], [500, 900], { depthMm: 560 }],
  ['DCS-7280DR3-24', [qdd(24, 'Et')], [700, 1300], { depthMm: 600 }],
  ['DCS-7280PR3-24', [osfp(24, 'Et', '400G')], [700, 1300], { depthMm: 600 }],
  ['DCS-7800R3-4 (example config)', [q100(144, 'Et')], [3000, 8000], { u: 7, psu: 6, psuType: 'c20', depthMm: 800, desc: '4-slot chassis with 4x 36-port 100G line cards' }],
  ['CCS-720XP-24ZY4', [poe(16, 'Et', '2.5G'), poe(8, 'Et', '5G'), sfp28(4, 'Et')], [120, 900], { depthMm: 400 }],
  ['CCS-720XP-48ZC2', [poe(40, 'Et', '2.5G'), poe(8, 'Et', '5G'), sfp28(4, 'Et'), q100(2, 'Et')], [180, 1500], { depthMm: 450 }],
  ['CCS-720XP-48Y6', [poe(48, 'Et', '1G'), sfp28(6, 'Et')], [150, 1100], { depthMm: 450 }],
  ['CCS-720DP-48S-2F', [poe(48, 'Et', '1G'), sfpp(4, 'Et'), sfp28(2, 'Et')], [90, 900], { depthMm: 400 }],
  ['CCS-722XPM-48Y4', [poe(48, 'Et', '1G'), sfp28(4, 'Et')], [130, 1100], { depthMm: 450 }]
])

const aruba = line('HPE Aruba', '#3a3d40', [
  ['2530-24G (J9776A)', [rj(24), sfp(4)], [20, 35], { psu: 1, depthMm: 250 }],
  ['2530-48G (J9775A)', [rj(48), sfp(4)], [30, 50], { psu: 1, depthMm: 250 }],
  ['2530-48G-PoE+ (J9772A)', [poe(48), sfp(4)], [60, 480], { psu: 1, depthMm: 330 }],
  ['2540-24G-4SFP+ (JL354A)', [rj(24), sfpp(4)], [25, 40], { psu: 1, depthMm: 250 }],
  ['2540-48G-4SFP+ (JL355A)', [rj(48), sfpp(4)], [35, 55], { psu: 1, depthMm: 250 }],
  ['2930F-24G-4SFP+ (JL253A)', [rj(24), sfpp(4)], [30, 50], { psu: 1, depthMm: 320 }],
  ['2930F-48G-4SFP+ (JL254A)', [rj(48), sfpp(4)], [40, 65], { psu: 1, depthMm: 320 }],
  ['2930F-48G-PoE+-4SFP+ (JL256A)', [poe(48), sfpp(4)], [70, 850], { psu: 1, depthMm: 320 }],
  ['2930M-48G (JL321A)', [rj(48), sfpp(4)], [60, 120], { depthMm: 430, rear: [stack()] }],
  ['CX 6000 48G 4SFP (R8N86A)', [rj(48), sfp(4)], [30, 55], { psu: 1, depthMm: 250 }],
  ['CX 6100 24G 4SFP+ (JL678A)', [rj(24), sfpp(4)], [25, 45], { psu: 1, depthMm: 250 }],
  ['CX 6100 48G 4SFP+ (JL675A)', [rj(48), sfpp(4)], [35, 60], { psu: 1, depthMm: 250 }],
  ['CX 6100 48G PoE 4SFP+ (JL674A)', [poe(48), sfpp(4)], [65, 450], { psu: 1, depthMm: 320 }],
  ['CX 6200F 24G 4SFP+ (JL724A)', [rj(24), sfpp(4)], [40, 60], { psu: 1, depthMm: 320 }],
  ['CX 6200F 48G 4SFP+ (JL726A)', [rj(48), sfpp(4)], [50, 80], { psu: 1, depthMm: 320 }],
  ['CX 6200F 48G PoE 4SFP+ (JL727A)', [poe(48), sfpp(4)], [80, 850], { psu: 1, depthMm: 320 }],
  ['CX 6300M 48G 4SFP56 (JL663A)', [poe(48), sfp56(4)], [120, 1500], { depthMm: 430 }],
  ['CX 6300M 24G 4SFP56 (JL662A)', [poe(24), sfp56(4)], [90, 800], { depthMm: 430 }],
  ['CX 6300F 48G 4SFP56 (JL667A)', [rj(48), sfp56(4)], [80, 130], { psu: 1, depthMm: 430 }],
  ['CX 6300M 48SR5 (JL659A)', [poe(36, '', '2.5G'), poe(12, '', '5G'), sfp56(4)], [150, 1800], { depthMm: 430 }],
  ['CX 6405 (example config)', [poe(240)], [600, 5000], { u: 7, psu: 4, psuType: 'c20', depthMm: 450, desc: '5-slot chassis with 5x 48-port PoE line cards' }],
  ['CX 8320 48SFP+ 6QSFP+ (JL479A)', [sfpp(48), q40(6)], [200, 350], { depthMm: 450 }],
  ['CX 8325-48Y8C (JL624A)', [sfp28(48), q100(8)], [250, 450], { depthMm: 520 }],
  ['CX 8325-32C (JL626A)', [q100(32)], [280, 500], { depthMm: 520 }],
  ['CX 8360-48Y6C (JL706A)', [sfp28(48), q100(6)], [250, 450], { depthMm: 520 }],
  ['CX 8360-32Y4C (JL710A)', [sfp28(32), q100(4)], [200, 400], { depthMm: 520 }],
  ['CX 8360-48XT4C (JL708A)', [rj(48, '', '10G'), q100(4)], [300, 500], { depthMm: 520 }],
  ['CX 9300-32D (R9A29A)', [qdd(32), sfpp(2)], [700, 1400], { depthMm: 560 }],
  ['CX 10000-48Y6C (R8P13A)', [sfp28(48), q100(6)], [400, 700], { depthMm: 560 }],
  ['Instant On 1930 24G 4SFP+ (JL682A)', [rj(24), sfpp(4)], [20, 30], { psu: 1, depthMm: 250, console: false }],
  ['Instant On 1930 48G 4SFP+ (JL685A)', [rj(48), sfpp(4)], [30, 50], { psu: 1, depthMm: 250, console: false }],
  ['Instant On 1960 48G 2XGT 2SFP+ (JL808A)', [poe(48), rj(2, '', '10G'), sfpp(2)], [70, 700], { psu: 1, depthMm: 330, console: false }],
  ['7210 Mobility Controller', [sfpp(4), rj(2)], [100, 180], { cat: 'wireless', psu: 1, depthMm: 400 }],
  ['7240XM Mobility Controller', [sfpp(4), rj(4)], [200, 350], { cat: 'wireless', depthMm: 500 }],
  ['9240 Gateway', [sfp28(4), rj(4, '', '10G')], [200, 350], { cat: 'router', depthMm: 450 }]
])

const dellNet = line('Dell', '#2b2f36', [
  ['PowerSwitch N1124T-ON', [rj(24), sfpp(4)], [25, 40], { psu: 1, depthMm: 260 }],
  ['PowerSwitch N1148P-ON', [poe(48), sfpp(4)], [70, 600], { psu: 1, depthMm: 330 }],
  ['PowerSwitch N1148T-ON', [rj(48), sfpp(4)], [35, 60], { psu: 1, depthMm: 260 }],
  ['PowerSwitch N2248PX-ON', [poe(40), poe(8, '', '2.5G'), sfp28(4), q100(2)], [140, 1400], { depthMm: 450, rear: [stack()] }],
  ['PowerSwitch N3248TE-ON', [rj(48), sfpp(4), q100(2)], [80, 150], { depthMm: 450 }],
  ['PowerSwitch N3248P-ON', [poe(48), sfpp(4), q100(2)], [110, 1400], { depthMm: 450 }],
  ['PowerSwitch N3224PX-ON', [poe(24, '', '10G'), sfp28(4), q100(2)], [150, 1200], { depthMm: 450 }],
  ['PowerSwitch S3048-ON', [rj(48), sfpp(4)], [80, 150], { depthMm: 380 }],
  ['PowerSwitch S4048-ON', [sfpp(48), q40(6)], [200, 350], { depthMm: 470 }],
  ['PowerSwitch S4128T-ON', [rj(28, '', '10G'), q100(2)], [150, 280], { depthMm: 470 }],
  ['PowerSwitch S4148F-ON', [sfpp(48), q40(2), q100(4)], [180, 350], { depthMm: 470 }],
  ['PowerSwitch S4148T-ON', [rj(48, '', '10G'), q40(2), q100(4)], [280, 450], { depthMm: 470 }],
  ['PowerSwitch S5212F-ON', [sfp28(12), q100(3)], [100, 200], { depthMm: 390, desc: 'Half-width (mount two side by side)' }],
  ['PowerSwitch S5224F-ON', [sfp28(24), q100(4)], [150, 280], { depthMm: 470 }],
  ['PowerSwitch S5248F-ON', [sfp28(48), qdd(2, '', '2x100G'), q100(4)], [250, 450], { depthMm: 470 }],
  ['PowerSwitch S5296F-ON', [sfp28(96), q100(8)], [450, 800], { u: 2, depthMm: 470 }],
  ['PowerSwitch S5232F-ON', [q100(32), sfpp(2)], [300, 550], { depthMm: 470 }],
  ['PowerSwitch S5448F-ON', [sfp28(48), qdd(8), q100(2)], [400, 750], { depthMm: 520 }],
  ['PowerSwitch Z9264F-ON', [q100(64), sfpp(2)], [600, 1200], { u: 2, depthMm: 560 }],
  ['PowerSwitch Z9332F-ON', [qdd(32), sfpp(2)], [700, 1400], { depthMm: 560 }],
  ['PowerSwitch Z9432F-ON', [qdd(32), sfpp(2)], [700, 1500], { depthMm: 560 }],
  ['PowerSwitch Z9864F-ON', [osfp(64)], [1800, 3500], { u: 2, psuType: 'c20', depthMm: 650 }],
  ['PowerEdge MX7000 Chassis (example config)', [q100(8, 'Fabric A'), q100(8, 'Fabric B')], [3500, 9000], { u: 7, psu: 6, psuType: 'c20', depthMm: 900, cat: 'server', desc: '8 sleds, 2x MX9116n fabric engines' }]
])

const ubnt = line('Ubiquiti', '#d9dadb', [
  ['USW-24', [rj(24), sfp(2)], [15, 25], { psu: 1, mgmt: false, depthMm: 200 }],
  ['USW-24-PoE', [poe(24), sfp(2)], [25, 120], { psu: 1, mgmt: false, depthMm: 245 }],
  ['USW-48', [rj(48), sfp(4)], [25, 45], { psu: 1, mgmt: false, depthMm: 200 }],
  ['USW-48-PoE', [poe(48), sfp(4)], [35, 200], { psu: 1, mgmt: false, depthMm: 245 }],
  ['USW-16-PoE', [poe(16), sfp(2)], [15, 45], { psu: 1, mgmt: false, depthMm: 200 }],
  ['USW-Pro-24', [rj(24), sfpp(2)], [25, 35], { psu: 1, mgmt: false, depthMm: 285 }],
  ['USW-Pro-24-PoE', [poe(24), sfpp(2)], [40, 400], { psu: 1, mgmt: false, depthMm: 285 }],
  ['USW-Pro-48', [rj(48), sfpp(4)], [35, 66], { psu: 1, mgmt: false, depthMm: 285 }],
  ['USW-Pro-48-PoE', [poe(48), sfpp(4)], [60, 660], { psu: 1, mgmt: false, depthMm: 400 }],
  ['USW-Pro-Max-24', [rj(16), rj(8, '', '2.5G'), sfpp(2)], [25, 40], { psu: 1, mgmt: false, depthMm: 285 }],
  ['USW-Pro-Max-24-PoE', [poe(16), poe(8, '', '2.5G'), sfpp(2)], [45, 400], { psu: 1, mgmt: false, depthMm: 285 }],
  ['USW-Pro-Max-48', [rj(32), rj(16, '', '2.5G'), sfpp(4)], [40, 70], { psu: 1, mgmt: false, depthMm: 285 }],
  ['USW-Pro-Max-48-PoE', [poe(32), poe(16, '', '2.5G'), sfpp(4)], [70, 720], { psu: 1, mgmt: false, depthMm: 400 }],
  ['USW-Pro-HD-24', [rj(22, '', '2.5G'), rj(2, '', '10G'), sfpp(4)], [40, 60], { psu: 1, mgmt: false, depthMm: 285 }],
  ['USW-Pro-HD-24-PoE', [poe(22, '', '2.5G'), poe(2, '', '10G'), sfpp(4)], [60, 600], { psu: 1, mgmt: false, depthMm: 400 }],
  ['USW-Aggregation', [sfpp(8)], [10, 20], { psu: 1, mgmt: false, depthMm: 200 }],
  ['USW-Pro-Aggregation', [sfpp(28), sfp28(4)], [50, 100], { psu: 1, mgmt: false, depthMm: 285 }],
  ['USW-EnterpriseXG-24', [rj(24, '', '10G'), sfp28(2)], [80, 200], { mgmt: false, depthMm: 400 }],
  ['USW-Enterprise-24-PoE', [poe(12), poe(12, '', '2.5G'), sfpp(2)], [50, 400], { psu: 1, mgmt: false, depthMm: 285 }],
  ['USW-Enterprise-48-PoE', [poe(48, '', '2.5G'), sfpp(4)], [80, 720], { psu: 1, mgmt: false, depthMm: 400 }],
  ['ECS-Aggregation', [sfp28(48), q100(6)], [250, 450], { depthMm: 480 }],
  ['UDM-Pro', [rj(8, 'LAN'), rj(1, 'WAN'), sfpp(1, 'LAN SFP+'), sfpp(1, 'WAN SFP+')], [20, 50], { cat: 'router', psu: 1, mgmt: false, console: false, depthMm: 285 }],
  ['UDM-SE', [poe(8, 'LAN'), rj(1, 'WAN', '2.5G'), sfpp(1, 'LAN SFP+'), sfpp(1, 'WAN SFP+')], [25, 180], { cat: 'router', psu: 1, mgmt: false, console: false, depthMm: 285 }],
  ['UDM-Pro-Max', [rj(8, 'LAN', '2.5G'), rj(1, 'WAN', '2.5G'), sfpp(1, 'LAN SFP+'), sfpp(1, 'WAN SFP+')], [30, 60], { cat: 'router', psu: 1, mgmt: false, console: false, depthMm: 285 }],
  ['UXG-Pro', [rj(2, 'WAN/LAN'), sfpp(2, 'WAN/LAN')], [15, 30], { cat: 'router', psu: 1, mgmt: false, console: false, depthMm: 200 }],
  ['UXG-Enterprise', [sfp28(2, 'WAN/LAN'), rj(2, 'WAN/LAN', '10G')], [40, 80], { cat: 'router', mgmt: false, console: false, depthMm: 285 }],
  ['EFG (Enterprise Fortress Gateway)', [sfp28(2), sfpp(4), rj(2, '', '10G')], [60, 120], { cat: 'router', mgmt: false, console: false, depthMm: 300 }],
  ['UNVR', [rj(1, 'LAN'), sfpp(1, 'SFP+')], [25, 60], { cat: 'storage', psu: 1, mgmt: false, console: false, depthMm: 285 }],
  ['UNVR-Pro', [rj(1, 'LAN'), sfpp(1, 'SFP+')], [45, 120], { cat: 'storage', u: 2, psu: 1, mgmt: false, console: false, depthMm: 400 }],
  ['UNAS-Pro', [rj(1, 'LAN'), sfpp(1, 'SFP+')], [30, 80], { cat: 'storage', u: 2, psu: 1, mgmt: false, console: false, depthMm: 400 }],
  ['EdgeRouter Infinity (ER-8-XG)', [sfpp(8), rj(1)], [40, 80], { cat: 'router', psu: 2, depthMm: 340 }],
  ['EdgeSwitch 48 Lite (ES-48-LITE)', [rj(48), sfpp(2), sfp(2)], [35, 56], { psu: 1, depthMm: 285 }]
])

const mikrotik = line('MikroTik', '#2f3a4a', [
  ['CRS326-24G-2S+RM', [rj(24, 'ether'), sfpp(2, 'sfp-sfpplus')], [10, 19], { psu: 1, depthMm: 140 }],
  ['CRS328-24P-4S+RM', [poe(24, 'ether'), sfpp(4, 'sfp-sfpplus')], [25, 500], { psu: 1, depthMm: 250 }],
  ['CRS317-1G-16S+RM', [sfpp(16, 'sfp-sfpplus'), rj(1, 'ether')], [25, 50], { psu: 2, depthMm: 250 }],
  ['CRS326-24S+2Q+RM', [sfpp(24, 'sfp-sfpplus'), q40(2, 'qsfpplus')], [30, 60], { psu: 2, depthMm: 250 }],
  ['CRS354-48G-4S+2Q+RM', [rj(48, 'ether'), sfpp(4, 'sfp-sfpplus'), q40(2, 'qsfpplus')], [30, 60], { psu: 2, depthMm: 250 }],
  ['CRS354-48P-4S+2Q+RM', [poe(48, 'ether'), sfpp(4, 'sfp-sfpplus'), q40(2, 'qsfpplus')], [50, 800], { psu: 2, depthMm: 300 }],
  ['CRS518-16XS-2XQ-RM', [sfp28(16, 'sfp28-'), q100(2, 'qsfp28-')], [50, 100], { psu: 2, depthMm: 300 }],
  ['CRS520-4XS-16XQ-RM', [q100(16, 'qsfp28-'), sfp28(4, 'sfp28-'), rj(2, 'ether', '10G')], [100, 200], { psu: 2, depthMm: 400 }],
  ['CRS812-8DS-2DQ-2DDQ-RM', [sfp56(8, 'sfp56-'), q200(2, 'qsfp56-'), qdd(2, 'qsfpdd-')], [120, 250], { psu: 2, depthMm: 400 }],
  ['CCR2004-16G-2S+', [rj(16, 'ether'), sfpp(2, 'sfp-sfpplus')], [15, 35], { cat: 'router', psu: 2, depthMm: 230 }],
  ['CCR2004-1G-12S+2XS', [sfpp(12, 'sfp-sfpplus'), sfp28(2, 'sfp28-'), rj(1, 'ether')], [20, 40], { cat: 'router', psu: 2, depthMm: 230 }],
  ['CCR2116-12G-4S+', [rj(13, 'ether'), sfpp(4, 'sfp-sfpplus')], [20, 45], { cat: 'router', psu: 2, depthMm: 230 }],
  ['CCR2216-1G-12XS-2XQ', [sfp28(12, 'sfp28-'), q100(2, 'qsfp28-'), rj(1, 'ether')], [60, 120], { cat: 'router', psu: 2, depthMm: 300 }],
  ['CCR1036-8G-2S+', [rj(8, 'ether'), sfpp(2, 'sfp-sfpplus')], [35, 70], { cat: 'router', psu: 2, depthMm: 260 }],
  ['CCR1072-1G-8S+', [sfpp(8, 'sfp-sfpplus'), rj(1, 'ether')], [80, 140], { cat: 'router', psu: 2, depthMm: 400 }],
  ['RB1100AHx4 Dude Edition', [rj(13, 'ether')], [15, 30], { cat: 'router', psu: 2, depthMm: 220 }],
  ['RB5009UPr+S+IN (rack shelf)', [poe(8, 'ether'), sfpp(1, 'sfp-sfpplus')], [10, 150], { cat: 'router', psu: 1, mgmt: false, depthMm: 220 }]
])

const netgear = line('Netgear', '#262b31', [
  ['GS724T', [rj(24), sfp(2)], [15, 25], { psu: 1, depthMm: 200 }],
  ['GS748T', [rj(48), sfp(4)], [25, 40], { psu: 1, depthMm: 240 }],
  ['GS752TP', [poe(48), sfp(4)], [50, 380], { psu: 1, depthMm: 330 }],
  ['M4250-26G4F-PoE+ (GSM4230P)', [poe(26), sfp(4)], [40, 300], { psu: 1, depthMm: 300 }],
  ['M4250-40G8XF-PoE+ (GSM4248P)', [poe(40), sfpp(8)], [70, 900], { psu: 1, depthMm: 350 }],
  ['M4300-52G (GSM4352S)', [rj(48), rj(2, '', '10G'), sfpp(2)], [60, 100], { depthMm: 330 }],
  ['M4300-24X (XSM4324CS)', [rj(24, '', '10G'), sfpp(4)], [100, 170], { depthMm: 330 }],
  ['M4300-48X (XSM4348CS)', [rj(48, '', '10G'), sfpp(4)], [180, 300], { u: 2, depthMm: 330 }],
  ['M4350-48G4XF (GSM4352)', [rj(48), sfpp(4)], [55, 90], { depthMm: 330 }],
  ['M4500-32C (CSM4532)', [q100(32)], [350, 600], { depthMm: 470 }],
  ['XS728T', [rj(24, '', '10G'), sfpp(4)], [80, 130], { psu: 1, depthMm: 300 }],
  ['XS748T', [rj(44, '', '10G'), sfpp(4)], [150, 230], { psu: 1, depthMm: 330 }],
  ['MS510TXM', [rj(4, '', '2.5G'), rj(4, '', '10G'), sfpp(2)], [25, 40], { psu: 1, depthMm: 200 }]
])

const tplink = line('TP-Link', '#2a2e33', [
  ['Omada TL-SG3428', [rj(24), sfp(4)], [15, 25], { psu: 1, depthMm: 220 }],
  ['Omada TL-SG3452', [rj(48), sfp(4)], [25, 40], { psu: 1, depthMm: 220 }],
  ['Omada TL-SG3428X', [rj(24), sfpp(4)], [20, 30], { psu: 1, depthMm: 220 }],
  ['Omada TL-SG3452X', [rj(48), sfpp(4)], [30, 45], { psu: 1, depthMm: 220 }],
  ['Omada TL-SG3428MP', [poe(24), sfp(4)], [40, 420], { psu: 1, depthMm: 300 }],
  ['Omada TL-SG3452P', [poe(48), sfp(4)], [50, 420], { psu: 1, depthMm: 330 }],
  ['Omada SX3016F', [sfpp(16)], [25, 45], { psu: 1, depthMm: 220 }],
  ['Omada SX3832', [rj(24, '', '10G'), sfpp(8)], [80, 150], { depthMm: 300 }],
  ['Omada ER8411', [rj(8), sfpp(2)], [15, 30], { cat: 'router', psu: 1, depthMm: 200 }],
  ['Omada ER7206', [rj(5), sfp(1)], [8, 15], { cat: 'router', psu: 1, depthMm: 160 }]
])

const extreme = line('Extreme Networks', '#3a2f4a', [
  ['X440-G2-48p-10GE4', [poe(48), sfpp(4)], [70, 900], { depthMm: 330 }],
  ['X465-48P', [poe(48), sfpp(4), sfp28(2)], [120, 1100], { depthMm: 450, rear: [stack()] }],
  ['X590-24x-1q-2c', [sfpp(24), q40(1), q100(2)], [200, 350], { depthMm: 450 }],
  ['X695-48Y-8C', [sfp28(48), q100(8)], [280, 500], { depthMm: 520 }],
  ['5320-48P-8XE', [poe(48), sfpp(8)], [80, 900], { depthMm: 330 }],
  ['5420F-48P-4XE', [poe(48), sfpp(4)], [70, 850], { depthMm: 330 }],
  ['5520-48W', [poe(48), sfpp(4)], [120, 1100], { depthMm: 450, rear: [stack()] }],
  ['7520-48Y-8C', [sfp28(48), q100(8)], [300, 550], { depthMm: 520 }],
  ['7720-32C', [q100(32)], [350, 600], { depthMm: 520 }]
])

const nvidiaNet = line('NVIDIA', '#21251c', [
  ['Spectrum SN2010', [sfp28(18, 'swp'), q100(4, 'swp')], [60, 110], { depthMm: 450, desc: 'Half-width' }],
  ['Spectrum SN2100', [q100(16, 'swp')], [80, 140], { depthMm: 450, desc: 'Half-width' }],
  ['Spectrum SN2410', [sfp28(48, 'swp'), q100(8, 'swp')], [200, 300], { depthMm: 520 }],
  ['Spectrum SN2700', [q100(32, 'swp')], [250, 400], { depthMm: 520 }],
  ['Spectrum-2 SN3420', [sfp28(48, 'swp'), q100(12, 'swp')], [250, 450], { depthMm: 520 }],
  ['Spectrum-2 SN3700', [q200(32, 'swp')], [350, 600], { depthMm: 520 }],
  ['Spectrum-2 SN3700C', [q100(32, 'swp')], [300, 550], { depthMm: 520 }],
  ['Spectrum-3 SN4600C', [q100(64, 'swp')], [600, 1100], { u: 2, depthMm: 560 }],
  ['Spectrum-3 SN4700', [qdd(32, 'swp')], [700, 1300], { depthMm: 560 }],
  ['Spectrum-4 SN5400', [qdd(64, 'swp')], [1300, 2600], { u: 2, psuType: 'c20', depthMm: 600 }],
  ['Spectrum-4 SN5600', [osfp(64, 'swp')], [1800, 3500], { u: 2, psuType: 'c20', depthMm: 650 }],
  ['Quantum MSB7800 (EDR IB)', [q100(36, 'IB', '100G EDR')], [150, 300], { depthMm: 600 }],
  ['Quantum QM8700 (HDR IB)', [q200(40, 'IB', '200G HDR')], [250, 450], { depthMm: 600 }],
  ['Quantum-2 QM9700 (NDR IB)', [osfp(32, 'IB', '2x400G NDR')], [750, 1700], { depthMm: 650 }],
  ['Quantum-X800 Q3400 (XDR IB)', [osfp(144, 'IB', '800G XDR')], [3000, 6000], { u: 4, psu: 6, psuType: 'c20', depthMm: 750 }]
])

const fcSwitches = line('Broadcom Brocade', '#3a3530', [
  ['G610', [fc(24, 'Port')], [80, 150], { psu: 1, depthMm: 400 }],
  ['G620', [fc(48, 'Port'), q100(4, 'ICL', '4x32G')], [180, 350], { depthMm: 450 }],
  ['G720', [fc(56, 'Port', '64G'), q100(8, 'ICL', '4x64G')], [250, 450], { depthMm: 450 }],
  ['G730', [fc(128, 'Port', '64G')], [500, 900], { u: 2, depthMm: 500 }],
  ['7810 Extension Switch', [fc(12, 'FC'), rj(6, 'GE'), sfpp(2, 'GE')], [120, 200], { depthMm: 450 }]
])

const misc = [
  ...line('Allied Telesis', '#2f3a3f', [
    ['x230-28GT', [rj(24), sfp(4)], [20, 35], { psu: 1, depthMm: 210 }],
    ['x530-28GPXm', [poe(24), sfpp(4)], [60, 600], { depthMm: 330 }],
    ['x930-28GTX', [rj(24), sfpp(4)], [60, 120], { depthMm: 420 }]
  ]),
  ...line('Huawei', '#3a3030', [
    ['S5735-L48T4X-A1', [rj(48), sfpp(4)], [40, 65], { psu: 1, depthMm: 220 }],
    ['S6730-H48X6C', [sfpp(48), q100(6)], [200, 350], { depthMm: 420 }],
    ['CE6881-48S6CQ', [sfpp(48), q100(6)], [220, 400], { depthMm: 450 }],
    ['CE8851-32CQ8DQ-P', [q100(32), qdd(8)], [600, 1200], { depthMm: 600 }]
  ]),
  ...line('Ruckus', '#2e2f35', [
    ['ICX 7150-48P', [poe(48), sfpp(4)], [70, 500], { psu: 1, depthMm: 290 }],
    ['ICX 7550-48P', [poe(48), q40(2)], [120, 1100], { depthMm: 430 }],
    ['ICX 7850-48F', [sfp28(48), q100(8)], [300, 500], { depthMm: 520 }],
    ['SmartZone 300 (SZ-300)', [sfpp(4), rj(4)], [300, 500], { cat: 'wireless', u: 2, depthMm: 600 }]
  ]),
  ...line('FS.com', '#2a2f35', [
    ['S3900-24T4S', [rj(24), sfpp(4)], [20, 35], { psu: 1, depthMm: 220 }],
    ['S3910-48TS', [rj(48), sfpp(4)], [30, 50], { psu: 1, depthMm: 250 }],
    ['S5850-48S6Q', [sfpp(48), q40(6)], [150, 250], { depthMm: 420 }],
    ['N5850-48S6Q', [sfpp(48), q40(6)], [150, 250], { depthMm: 420 }],
    ['N8550-48B8C', [sfp28(48), q100(8)], [250, 450], { depthMm: 520 }],
    ['N8560-32C', [q100(32)], [300, 550], { depthMm: 520 }],
    ['N9550-32D', [qdd(32)], [700, 1400], { depthMm: 560 }]
  ])
]

export const networkComponents: ComponentDef[] = [
  ...catalyst,
  ...nexus,
  ...ciscoRouters,
  ...meraki,
  ...juniper,
  ...arista,
  ...aruba,
  ...dellNet,
  ...ubnt,
  ...mikrotik,
  ...netgear,
  ...tplink,
  ...extreme,
  ...nvidiaNet,
  ...fcSwitches,
  ...misc
]
