// Storage arrays, NAS, expansion shelves and tape.
import type { ComponentDef } from '../model/types'
import { finalize, groups, type P } from './builders'

type SRow = [model: string, u: number, typicalW: number, maxW: number, rear: P[], opts?: { psu?: number; psuType?: string; depthMm?: number; kg?: number; desc?: string; front?: P[] }]

function arrays(mfr: string, color: string, rows: SRow[]): ComponentDef[] {
  return rows.map(([model, u, t, m, rear, o = {}]) =>
    finalize({
      manufacturer: mfr,
      model,
      category: 'storage',
      uHeight: u,
      fullDepth: true,
      depthMm: o.depthMm,
      weightKg: o.kg,
      power: { typicalW: t, maxW: m },
      ports: [...groups('front', o.front ?? []), ...groups('rear', [...rear, [o.psu ?? 2, o.psuType ?? (m > 2000 ? 'c20' : 'c14'), 'PSU']])],
      color,
      description: o.desc
    })
  )
}

const rj = (n: number, label = 'LAN', speed = '1G'): P => [n, 'rj45', label, speed]
const sfpp = (n: number, label = 'SFP+', speed = '10G'): P => [n, 'sfp+', label, speed]
const sfp28 = (n: number, label = 'Data', speed = '25G'): P => [n, 'sfp28', label, speed]
const q100 = (n: number, label = 'Data', speed = '100G'): P => [n, 'qsfp28', label, speed]
const fc = (n: number, label = 'FC', speed = '32G'): P => [n, 'sfp-fc', label, speed]
const sas = (n: number, label = 'SAS'): P => [n, 'sas', label, '12G']
const mgmt = (n = 1): P => [n, 'rj45-mgmt', 'Mgmt']

// Dual-controller arrays: ports listed per controller.
const ctl = (a: P[]): P[] => a.flatMap(([n, t, l, s]): P[] => [[n, t, `A-${l}`, s], [n, t, `B-${l}`, s]])

const synology = arrays('Synology', '#2e3135', [
  ['RackStation RS422+', 1, 30, 70, [rj(2)], { psu: 1, depthMm: 480, kg: 7, desc: '4-bay' }],
  ['RackStation RS822+', 1, 35, 80, [rj(4)], { psu: 1, depthMm: 480, kg: 8, desc: '4-bay' }],
  ['RackStation RS822RP+', 1, 40, 90, [rj(4)], { depthMm: 480, kg: 9, desc: '4-bay, redundant PSU' }],
  ['RackStation RS1221+', 2, 50, 120, [rj(4)], { psu: 1, depthMm: 480, kg: 10, desc: '8-bay' }],
  ['RackStation RS1221RP+', 2, 55, 130, [rj(4)], { depthMm: 480, kg: 11, desc: '8-bay, redundant PSU' }],
  ['RackStation RS2423+', 2, 80, 200, [rj(2), [2, 'rj45', 'LAN', '10G']], { psu: 1, depthMm: 640, kg: 13, desc: '12-bay' }],
  ['RackStation RS2423RP+', 2, 85, 210, [rj(2), [2, 'rj45', 'LAN', '10G']], { depthMm: 640, kg: 14, desc: '12-bay, redundant PSU' }],
  ['RackStation RS3621xs+', 2, 120, 300, [rj(4), sfpp(2)], { depthMm: 640, kg: 15, desc: '12-bay' }],
  ['RackStation RS4021xs+', 3, 160, 400, [rj(4), sfpp(2)], { depthMm: 640, kg: 20, desc: '16-bay' }],
  ['SA3400', 2, 110, 300, [rj(4), sfpp(2)], { depthMm: 640, kg: 15, desc: '12-bay' }],
  ['SA3410', 2, 110, 300, [rj(2), sfpp(2)], { depthMm: 640, kg: 15, desc: '12-bay' }],
  ['SA3610', 2, 130, 350, [rj(2), sfpp(2)], { depthMm: 640, kg: 16, desc: '12-bay' }],
  ['SA6400', 2, 180, 450, [rj(2), sfpp(2)], { depthMm: 700, kg: 18, desc: '12-bay' }],
  ['FlashStation FS3410', 2, 120, 300, [rj(2), sfpp(2)], { depthMm: 640, kg: 14, desc: '24-bay all-flash' }],
  ['FlashStation FS6400', 2, 200, 500, [rj(2), sfpp(4)], { depthMm: 700, kg: 18, desc: '24-bay all-flash' }],
  ['HD6500', 4, 450, 1100, [rj(2), sfpp(2)], { depthMm: 1000, kg: 60, desc: '60-bay' }],
  ['UC3400', 2, 150, 350, ctl([rj(2), sfpp(2)]), { depthMm: 640, kg: 18, desc: '12-bay dual-controller SAN' }],
  ['Expansion RX1222sas', 2, 70, 200, [sas(4)], { depthMm: 640, kg: 13, desc: '12-bay expansion' }],
  ['Expansion RX418', 1, 25, 60, [[1, 'usb-a', 'eSATA']], { psu: 1, depthMm: 480, kg: 6, desc: '4-bay expansion' }],
  ['Expansion RX1217RP', 2, 60, 170, [[1, 'usb-a', 'eSATA']], { depthMm: 640, kg: 13, desc: '12-bay expansion' }],
  ['Expansion RXD1219sas', 2, 80, 220, [sas(4)], { depthMm: 640, kg: 14, desc: '12-bay SAS expansion' }]
])

const qnap = arrays('QNAP', '#2a2d33', [
  ['TS-464U', 1, 30, 70, [rj(2, 'LAN', '2.5G')], { psu: 1, depthMm: 400, kg: 7, desc: '4-bay' }],
  ['TS-873AeU', 2, 50, 110, [rj(4, 'LAN', '2.5G')], { psu: 1, depthMm: 300, kg: 9, desc: '8-bay short depth' }],
  ['TS-1673AU-RP', 2, 90, 230, [rj(4, 'LAN', '2.5G'), sfpp(2)], { depthMm: 550, kg: 15, desc: '16-bay' }],
  ['TS-h987XU-RP', 1, 60, 150, [rj(2, 'LAN', '10G'), rj(2, 'LAN', '2.5G'), sfpp(2)], { depthMm: 500, kg: 8, desc: '9-bay' }],
  ['TS-h1886XU-RP R2', 2, 120, 300, [rj(4), sfpp(2)], { depthMm: 550, kg: 16, desc: '18-bay' }],
  ['TS-h2490FU', 2, 200, 500, [rj(2, 'LAN', '2.5G'), sfp28(2)], { depthMm: 550, kg: 16, desc: '24-bay NVMe' }],
  ['TS-h3087XU-RP', 2, 200, 500, [rj(4), sfpp(2)], { depthMm: 650, kg: 20, desc: '30-bay' }],
  ['TL-R1200S-RP JBOD', 2, 60, 180, [[2, 'sas', 'SAS', '6G']], { depthMm: 550, kg: 12, desc: '12-bay expansion' }],
  ['TL-R1620Sdc JBOD', 3, 80, 250, [sas(4)], { depthMm: 550, kg: 18, desc: '16-bay expansion' }]
])

const netapp = arrays('NetApp', '#273038', [
  ['AFF A150', 2, 450, 900, ctl([sfpp(4, 'e0'), mgmt()]), { depthMm: 610, kg: 30 }],
  ['AFF A250', 2, 600, 1100, ctl([sfp28(4, 'e0'), [2, 'rj45', 'e0', '10G'], mgmt()]), { depthMm: 610, kg: 32 }],
  ['AFF A400', 4, 800, 1600, ctl([q100(4, 'e3'), sfp28(4, 'e0'), mgmt()]), { depthMm: 760, kg: 45 }],
  ['AFF A700', 8, 1500, 3000, ctl([q100(4, 'e3'), sfp28(8, 'e0'), mgmt()]), { psu: 4, psuType: 'c20', depthMm: 760, kg: 120 }],
  ['AFF A800', 4, 1100, 2000, ctl([q100(4, 'e3'), sfp28(4, 'e0'), mgmt()]), { depthMm: 760, kg: 56 }],
  ['AFF A900', 8, 1800, 3600, ctl([q100(8, 'e3'), sfp28(8, 'e0'), mgmt()]), { psu: 4, psuType: 'c20', depthMm: 760, kg: 120 }],
  ['AFF A20', 2, 500, 1000, ctl([sfp28(4, 'e0'), mgmt()]), { depthMm: 610, kg: 30 }],
  ['AFF A30', 2, 600, 1200, ctl([sfp28(4, 'e0'), q100(2, 'e1'), mgmt()]), { depthMm: 610, kg: 32 }],
  ['AFF A50', 2, 700, 1400, ctl([sfp28(4, 'e0'), q100(2, 'e1'), mgmt()]), { depthMm: 610, kg: 33 }],
  ['AFF A70', 4, 1000, 2000, ctl([q100(4, 'e1'), sfp28(4, 'e0'), mgmt()]), { depthMm: 760, kg: 45 }],
  ['AFF A90', 4, 1200, 2400, ctl([q100(4, 'e1'), sfp28(4, 'e0'), mgmt()]), { psuType: 'c20', depthMm: 760, kg: 47 }],
  ['AFF C250', 2, 600, 1100, ctl([sfp28(4, 'e0'), mgmt()]), { depthMm: 610, kg: 32 }],
  ['AFF C400', 4, 800, 1600, ctl([q100(4, 'e3'), sfp28(4, 'e0'), mgmt()]), { depthMm: 760, kg: 45 }],
  ['FAS2750', 2, 450, 900, ctl([[2, 'rj45', 'e0', '10G'], sfpp(4, 'e0'), mgmt()]), { depthMm: 610, kg: 30 }],
  ['FAS2820', 2, 500, 1000, ctl([sfp28(4, 'e0'), mgmt()]), { depthMm: 610, kg: 30 }],
  ['FAS8300', 4, 800, 1600, ctl([sfp28(4, 'e0'), q100(2, 'e3'), sas(4, 'SAS'), mgmt()]), { depthMm: 760, kg: 45 }],
  ['FAS8700', 4, 900, 1800, ctl([sfp28(4, 'e0'), q100(2, 'e3'), sas(4, 'SAS'), mgmt()]), { depthMm: 760, kg: 45 }],
  ['DS224C disk shelf', 2, 300, 650, ctl([sas(2, 'IOM')]), { depthMm: 520, kg: 25, desc: '24x 2.5" SAS' }],
  ['DS212C disk shelf', 2, 220, 500, ctl([sas(2, 'IOM')]), { depthMm: 520, kg: 30, desc: '12x 3.5" SAS' }],
  ['DS460C disk shelf', 4, 800, 1600, ctl([sas(2, 'IOM')]), { psu: 2, psuType: 'c20', depthMm: 900, kg: 110, desc: '60x 3.5" SAS' }],
  ['NS224 NVMe shelf', 2, 450, 900, ctl([q100(2, 'NSM')]), { depthMm: 520, kg: 28, desc: '24x NVMe' }],
  ['E2812', 2, 300, 700, ctl([fc(4, 'Host'), mgmt()]), { depthMm: 550, kg: 28 }],
  ['E5760', 4, 900, 1800, ctl([fc(4, 'Host'), mgmt()]), { psuType: 'c20', depthMm: 900, kg: 110, desc: '60-drive' }],
  ['EF600', 2, 600, 1200, ctl([q100(2, 'Host'), mgmt()]), { depthMm: 550, kg: 28 }],
  ['StorageGRID SG6060', 5, 800, 1600, [sfp28(4, 'Grid'), rj(2, 'Mgmt')], { psuType: 'c20', depthMm: 900, kg: 120 }]
])

const dell = arrays('Dell', '#2b2f36', [
  ['PowerVault ME5012', 2, 300, 600, ctl([sfp28(4, 'Host'), sas(1, 'Exp'), mgmt()]), { depthMm: 580, kg: 28, desc: '12x 3.5"' }],
  ['PowerVault ME5024', 2, 320, 650, ctl([sfp28(4, 'Host'), sas(1, 'Exp'), mgmt()]), { depthMm: 580, kg: 27, desc: '24x 2.5"' }],
  ['PowerVault ME5084', 5, 900, 2200, ctl([sfp28(4, 'Host'), sas(1, 'Exp'), mgmt()]), { psuType: 'c20', depthMm: 980, kg: 130, desc: '84x 3.5"' }],
  ['PowerVault ME4024', 2, 300, 600, ctl([fc(4, 'Host', '16G'), sas(1, 'Exp'), mgmt()]), { depthMm: 580, kg: 27 }],
  ['PowerVault ME412 expansion', 2, 200, 450, ctl([sas(3, 'Exp')]), { depthMm: 580, kg: 26 }],
  ['PowerVault ME484 expansion', 5, 700, 1800, ctl([sas(3, 'Exp')]), { psuType: 'c20', depthMm: 980, kg: 125 }],
  ['PowerStore 500T', 2, 700, 1400, ctl([sfp28(4, 'Mezz'), mgmt()]), { depthMm: 800, kg: 40 }],
  ['PowerStore 1200T', 2, 900, 1800, ctl([sfp28(4, 'Mezz'), sfp28(4, 'IO'), mgmt()]), { depthMm: 800, kg: 45 }],
  ['PowerStore 3200T', 2, 1100, 2000, ctl([sfp28(4, 'Mezz'), q100(2, 'IO'), mgmt()]), { depthMm: 800, kg: 46 }],
  ['PowerStore 5200T', 2, 1300, 2200, ctl([sfp28(4, 'Mezz'), q100(2, 'IO'), mgmt()]), { psuType: 'c20', depthMm: 800, kg: 47 }],
  ['PowerStore 9200T', 2, 1500, 2400, ctl([sfp28(4, 'Mezz'), q100(2, 'IO'), mgmt()]), { psuType: 'c20', depthMm: 800, kg: 48 }],
  ['PowerStore ENS24 expansion', 2, 400, 800, ctl([q100(2, 'NVMe')]), { depthMm: 650, kg: 28 }],
  ['PowerScale F200', 1, 300, 600, [sfp28(2, 'Front'), sfp28(2, 'Back'), mgmt()], { depthMm: 750, kg: 18 }],
  ['PowerScale F210', 1, 320, 650, [q100(2, 'Front'), q100(2, 'Back'), mgmt()], { depthMm: 750, kg: 18 }],
  ['PowerScale F600', 1, 500, 900, [q100(2, 'Front'), q100(2, 'Back'), mgmt()], { depthMm: 750, kg: 20 }],
  ['PowerScale F710', 1, 550, 1000, [q100(2, 'Front'), q100(2, 'Back'), mgmt()], { depthMm: 750, kg: 20 }],
  ['PowerScale F900', 2, 700, 1300, [q100(2, 'Front'), q100(2, 'Back'), mgmt()], { depthMm: 750, kg: 30 }],
  ['PowerScale H700 chassis', 4, 1200, 2400, [sfp28(8, 'Front'), sfp28(8, 'Back'), mgmt(4)], { psu: 4, psuType: 'c20', depthMm: 900, kg: 120, desc: '4-node chassis' }],
  ['PowerScale A300 chassis', 4, 900, 1900, [sfp28(8, 'Front'), sfp28(8, 'Back'), mgmt(4)], { psu: 4, psuType: 'c20', depthMm: 900, kg: 120, desc: '4-node chassis' }],
  ['Unity XT 380', 2, 500, 1000, ctl([sfpp(4, 'Host'), mgmt()]), { depthMm: 790, kg: 39 }],
  ['Unity XT 480', 2, 600, 1200, ctl([sfp28(4, 'Host'), mgmt()]), { depthMm: 790, kg: 41 }],
  ['Unity XT 680', 2, 750, 1400, ctl([sfp28(4, 'Host'), mgmt()]), { depthMm: 790, kg: 42 }],
  ['Unity XT 880', 2, 900, 1600, ctl([sfp28(4, 'Host'), mgmt()]), { depthMm: 790, kg: 43 }],
  ['PowerProtect DD3300', 2, 300, 650, [rj(4, 'eth', '10G'), mgmt()], { depthMm: 750, kg: 28 }],
  ['PowerProtect DD6900', 2, 700, 1400, [sfp28(4, 'eth'), mgmt()], { depthMm: 800, kg: 35 }],
  ['PowerProtect DD9400', 4, 1100, 2200, [sfp28(8, 'eth'), mgmt()], { depthMm: 850, kg: 50 }],
  ['PowerProtect DD9900', 4, 1300, 2600, [q100(4, 'eth'), sfp28(4, 'eth'), mgmt()], { psuType: 'c20', depthMm: 850, kg: 52 }]
])

const hpe = arrays('HPE', '#2f3133', [
  ['MSA 2060 SAN', 2, 300, 600, ctl([fc(4, 'Host', '16G'), sas(1, 'Exp'), mgmt()]), { depthMm: 570, kg: 28 }],
  ['MSA 2062 SAN', 2, 320, 650, ctl([fc(4, 'Host', '16G'), sas(1, 'Exp'), mgmt()]), { depthMm: 570, kg: 28 }],
  ['MSA 2060 iSCSI', 2, 300, 600, ctl([sfpp(4, 'Host'), sas(1, 'Exp'), mgmt()]), { depthMm: 570, kg: 28 }],
  ['MSA 2060 LFF disk enclosure', 2, 200, 450, ctl([sas(2, 'Exp')]), { depthMm: 570, kg: 27 }],
  ['Alletra 5010', 4, 700, 1400, ctl([sfp28(4, 'Host'), mgmt()]), { depthMm: 760, kg: 60 }],
  ['Alletra 5030', 4, 800, 1600, ctl([sfp28(4, 'Host'), mgmt()]), { depthMm: 760, kg: 62 }],
  ['Alletra 6010', 4, 900, 1800, ctl([sfp28(4, 'Host'), mgmt()]), { depthMm: 760, kg: 58 }],
  ['Alletra 6030', 4, 1000, 2000, ctl([sfp28(4, 'Host'), mgmt()]), { depthMm: 760, kg: 60 }],
  ['Alletra 6070', 4, 1200, 2400, ctl([sfp28(4, 'Host'), mgmt()]), { psuType: 'c20', depthMm: 760, kg: 62 }],
  ['Alletra 9060', 4, 1500, 3000, ctl([fc(8, 'Host'), mgmt()]), { psuType: 'c20', depthMm: 760, kg: 70 }],
  ['Alletra Storage MP B10000', 2, 800, 1600, ctl([q100(2, 'Host'), sfp28(4, 'Host'), mgmt()]), { depthMm: 750, kg: 35 }],
  ['Alletra Storage MP X10000', 2, 800, 1600, [q100(4, 'Data'), mgmt()], { depthMm: 750, kg: 35 }],
  ['Nimble HF20', 4, 700, 1400, ctl([sfpp(4, 'Host'), mgmt()]), { depthMm: 760, kg: 60 }],
  ['Nimble AF40', 4, 900, 1700, ctl([sfp28(4, 'Host'), mgmt()]), { depthMm: 760, kg: 58 }],
  ['StoreOnce 3660', 2, 500, 900, [sfpp(4, 'eth'), mgmt()], { depthMm: 750, kg: 30 }],
  ['StoreOnce 5260', 2, 700, 1300, [sfp28(4, 'eth'), mgmt()], { depthMm: 750, kg: 32 }],
  ['StoreEver MSL3040 (3U base)', 3, 80, 200, [fc(2, 'Drive', '8G'), mgmt()], { depthMm: 870, kg: 45, desc: 'Tape library base module' }]
])

const pure = arrays('Pure Storage', '#e86c2c', [
  ['FlashArray//X20 R4', 3, 750, 1300, ctl([sfp28(4, 'eth'), fc(4, 'fc'), mgmt()]), { depthMm: 750, kg: 44 }],
  ['FlashArray//X50 R4', 3, 900, 1500, ctl([sfp28(4, 'eth'), fc(4, 'fc'), mgmt()]), { depthMm: 750, kg: 46 }],
  ['FlashArray//X70 R4', 3, 1100, 1800, ctl([sfp28(4, 'eth'), fc(4, 'fc'), mgmt()]), { depthMm: 750, kg: 47 }],
  ['FlashArray//X90 R4', 3, 1300, 2000, ctl([q100(2, 'eth'), fc(4, 'fc'), mgmt()]), { depthMm: 750, kg: 48 }],
  ['FlashArray//C60 R4', 3, 1000, 1700, ctl([sfp28(4, 'eth'), mgmt()]), { depthMm: 750, kg: 46 }],
  ['FlashArray//C90 R4', 3, 1200, 1900, ctl([q100(2, 'eth'), mgmt()]), { depthMm: 750, kg: 48 }],
  ['FlashArray//XL130', 5, 1800, 2800, ctl([q100(4, 'eth'), fc(8, 'fc'), mgmt()]), { psu: 4, psuType: 'c20', depthMm: 800, kg: 75 }],
  ['FlashArray//E', 3, 900, 1500, ctl([sfp28(4, 'eth'), mgmt()]), { depthMm: 750, kg: 46 }],
  ['FlashBlade//S (5U chassis)', 5, 1800, 3000, [q100(8, 'FM'), mgmt(2)], { psu: 4, psuType: 'c20', depthMm: 800, kg: 90 }],
  ['DirectFlash Shelf', 3, 500, 900, ctl([q100(2, 'NVMe-oF')]), { depthMm: 750, kg: 40 }]
])

const misc: ComponentDef[] = [
  ...arrays('IBM', '#1b1d21', [
    ['FlashSystem 5045', 2, 400, 800, ctl([sfpp(2, 'Host'), sas(1, 'Exp'), mgmt()]), { depthMm: 760, kg: 28 }],
    ['FlashSystem 5300', 1, 600, 1100, ctl([sfp28(2, 'Host'), fc(4, 'Host'), mgmt()]), { depthMm: 760, kg: 22 }],
    ['FlashSystem 7300', 2, 900, 1500, ctl([sfp28(4, 'Host'), fc(8, 'Host'), mgmt()]), { depthMm: 760, kg: 40 }],
    ['FlashSystem 9500', 4, 1700, 2900, ctl([q100(4, 'Host'), fc(12, 'Host'), mgmt()]), { psu: 4, psuType: 'c20', depthMm: 850, kg: 70 }],
    ['TS4300 Tape Library (3U base)', 3, 60, 150, [fc(2, 'Drive', '8G'), mgmt()], { psu: 1, depthMm: 900, kg: 40 }]
  ]),
  ...arrays('iXsystems', '#26303a', [
    ['TrueNAS R20', 2, 180, 500, [rj(2, 'LAN', '10G'), sfpp(2)], { depthMm: 700, kg: 25, desc: '12-bay' }],
    ['TrueNAS R30', 2, 250, 700, [sfp28(2), rj(2, 'LAN', '10G')], { depthMm: 750, kg: 26, desc: '12-bay NVMe' }],
    ['TrueNAS R50', 4, 400, 1000, [sfp28(2), q100(2)], { depthMm: 900, kg: 60, desc: '48-bay' }],
    ['TrueNAS M30', 3, 400, 900, ctl([sfp28(2), mgmt()]), { depthMm: 750, kg: 35 }],
    ['TrueNAS M40', 3, 450, 1000, ctl([sfp28(2), mgmt()]), { depthMm: 750, kg: 36 }],
    ['TrueNAS M50', 3, 550, 1200, ctl([q100(2), mgmt()]), { depthMm: 750, kg: 37 }],
    ['TrueNAS M60', 3, 650, 1400, ctl([q100(2), mgmt()]), { depthMm: 750, kg: 38 }],
    ['TrueNAS F100', 2, 700, 1300, ctl([q100(2), mgmt()]), { depthMm: 750, kg: 32, desc: '24-bay NVMe' }],
    ['TrueNAS ES24 expansion', 2, 250, 550, ctl([sas(2, 'Exp')]), { depthMm: 600, kg: 25 }],
    ['TrueNAS ES60 expansion', 4, 700, 1400, ctl([sas(2, 'Exp')]), { depthMm: 900, kg: 100 }],
    ['TrueNAS ES102 expansion', 4, 1000, 2000, ctl([sas(4, 'Exp')]), { psuType: 'c20', depthMm: 1000, kg: 120 }]
  ]),
  ...arrays('Hitachi Vantara', '#2c2c34', [
    ['VSP E590', 2, 700, 1300, ctl([fc(8, 'Host'), mgmt()]), { depthMm: 800, kg: 40 }],
    ['VSP E790', 2, 800, 1500, ctl([fc(8, 'Host'), mgmt()]), { depthMm: 800, kg: 42 }],
    ['VSP One Block 24', 2, 600, 1200, ctl([sfp28(4, 'Host'), fc(4, 'Host'), mgmt()]), { depthMm: 800, kg: 38 }]
  ]),
  ...arrays('Quantum', '#2a2a2a', [
    ['Scalar i3 (3U)', 3, 60, 160, [fc(2, 'Drive', '8G'), mgmt()], { psu: 1, depthMm: 900, kg: 40 }],
    ['Scalar i6 (6U)', 6, 100, 300, [fc(4, 'Drive', '8G'), mgmt()], { depthMm: 900, kg: 70 }]
  ]),
  ...arrays('Infortrend', '#26292e', [
    ['EonStor GS 3016R', 3, 300, 700, ctl([sfp28(2, 'Host'), mgmt()]), { depthMm: 600, kg: 30 }],
    ['EonStor GS 3024B', 2, 280, 650, ctl([sfp28(2, 'Host'), mgmt()]), { depthMm: 500, kg: 25 }]
  ])
]

export const storageComponents: ComponentDef[] = [...synology, ...qnap, ...netapp, ...dell, ...hpe, ...pure, ...misc]
