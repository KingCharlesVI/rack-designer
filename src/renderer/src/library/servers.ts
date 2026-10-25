// Rack servers. Power figures are nominal typical/max estimates for a common
// configuration and should be checked against the vendor's power calculator.
import type { Category, ComponentDef } from '../model/types'
import { server, type P } from './builders'

type Row = [model: string, u: number, typicalW: number, maxW: number, opts?: { nics?: P[]; psu?: number; psuType?: string; depthMm?: number; kg?: number; cat?: Category; desc?: string }]

function family(mfr: string, bmc: string, defNics: P[], color: string, rows: Row[], prefix = ''): ComponentDef[] {
  return rows.map(([model, u, t, m, o = {}]) =>
    server(
      {
        mfr,
        model: `${prefix}${model}`,
        u,
        w: [t, m],
        bmc,
        nics: o.nics ?? defNics,
        psu: o.psu,
        psuType: o.psuType ?? (m > 2000 ? 'c20' : 'c14'),
        depthMm: o.depthMm,
        weightKg: o.kg,
        color,
        description: o.desc
      },
      o.cat ?? 'server'
    )
  )
}

const LOM_OCP25: P[] = [[2, 'rj45', 'LOM', '1G'], [2, 'sfp28', 'OCP', '25G']]
const NDC10: P[] = [[2, 'sfp+', 'NDC', '10G'], [2, 'rj45', 'NDC', '1G']]
const QSFP100: P[] = [[2, 'qsfp28', 'NIC', '100G'], [2, 'rj45', 'LOM', '1G']]
const GPU400: P[] = [[8, 'osfp', 'GPU-NIC', '400G'], [2, 'qsfp112', 'Storage', '200G'], [2, 'rj45', 'LOM', '10G']]
const DELL = '#2b2f36'
const HPE = '#2f3133'
const LENOVO = '#1f2124'
const CISCO = '#2a3038'
const SMC = '#30343a'

const dell = family('Dell', 'iDRAC', LOM_OCP25, DELL, [
  ['PowerEdge R250', 1, 90, 450, { psu: 1, nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 497, kg: 11 }],
  ['PowerEdge R350', 1, 110, 600, { nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 584, kg: 13 }],
  ['PowerEdge R360', 1, 120, 700, { nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 584, kg: 13 }],
  ['PowerEdge R450', 1, 230, 800, { depthMm: 749, kg: 17 }],
  ['PowerEdge R550', 2, 280, 1100, { depthMm: 749, kg: 24 }],
  ['PowerEdge R650', 1, 330, 1400, { depthMm: 751, kg: 21 }],
  ['PowerEdge R650xs', 1, 300, 1100, { depthMm: 751, kg: 20 }],
  ['PowerEdge R660', 1, 380, 1400, { depthMm: 822, kg: 21 }],
  ['PowerEdge R660xs', 1, 330, 1100, { depthMm: 772, kg: 20 }],
  ['PowerEdge R670', 1, 420, 1500, { depthMm: 822, kg: 22 }],
  ['PowerEdge R6515', 1, 220, 800, { depthMm: 733, kg: 17 }],
  ['PowerEdge R6525', 1, 380, 1400, { depthMm: 751, kg: 21 }],
  ['PowerEdge R6615', 1, 280, 1100, { depthMm: 772, kg: 19 }],
  ['PowerEdge R6625', 1, 420, 1400, { depthMm: 822, kg: 22 }],
  ['PowerEdge R6715', 1, 300, 1400, { depthMm: 772, kg: 19 }],
  ['PowerEdge R6725', 1, 450, 1500, { depthMm: 822, kg: 22 }],
  ['PowerEdge R750', 2, 420, 1400, { depthMm: 751, kg: 28 }],
  ['PowerEdge R750xs', 2, 360, 1100, { depthMm: 751, kg: 27 }],
  ['PowerEdge R750xa', 2, 1200, 2400, { depthMm: 869, kg: 33, cat: 'gpu' }],
  ['PowerEdge R760', 2, 450, 1800, { depthMm: 772, kg: 29 }],
  ['PowerEdge R760xs', 2, 380, 1400, { depthMm: 772, kg: 28 }],
  ['PowerEdge R760xa', 2, 1400, 2800, { depthMm: 869, kg: 34, cat: 'gpu' }],
  ['PowerEdge R760xd2', 2, 450, 1400, { depthMm: 869, kg: 32, cat: 'storage' }],
  ['PowerEdge R770', 2, 480, 1800, { depthMm: 772, kg: 29 }],
  ['PowerEdge R7515', 2, 260, 1100, { depthMm: 733, kg: 25 }],
  ['PowerEdge R7525', 2, 450, 1800, { depthMm: 751, kg: 30 }],
  ['PowerEdge R7615', 2, 320, 1400, { depthMm: 772, kg: 27 }],
  ['PowerEdge R7625', 2, 500, 1800, { depthMm: 772, kg: 30 }],
  ['PowerEdge R7715', 2, 340, 1400, { depthMm: 772, kg: 27 }],
  ['PowerEdge R7725', 2, 520, 2400, { depthMm: 772, kg: 31 }],
  ['PowerEdge R860', 2, 900, 2800, { depthMm: 869, kg: 35 }],
  ['PowerEdge R960', 4, 1300, 4800, { psu: 4, depthMm: 869, kg: 52 }],
  ['PowerEdge XE8640', 4, 3000, 5600, { psu: 4, nics: QSFP100, depthMm: 869, kg: 50, cat: 'gpu' }],
  ['PowerEdge XE9640', 2, 3500, 5600, { psu: 4, nics: QSFP100, depthMm: 869, kg: 40, cat: 'gpu', desc: 'Liquid cooled 4-GPU server' }],
  ['PowerEdge XE9680', 6, 8000, 11500, { psu: 6, nics: GPU400, depthMm: 1012, kg: 107, cat: 'gpu', desc: '8x NVIDIA H100/H200 SXM' }],
  ['PowerEdge XE9680L', 4, 7000, 11000, { psu: 8, nics: GPU400, depthMm: 1012, kg: 90, cat: 'gpu', desc: 'Liquid cooled 8-GPU server' }],
  ['PowerEdge XE7100', 5, 900, 2400, { depthMm: 1000, kg: 115, cat: 'storage', desc: '100-drive storage server' }],
  // 14th generation
  ['PowerEdge R240', 1, 80, 250, { psu: 1, nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 497, kg: 11 }],
  ['PowerEdge R340', 1, 100, 350, { nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 584, kg: 13 }],
  ['PowerEdge R440', 1, 200, 550, { nics: NDC10, depthMm: 693, kg: 17 }],
  ['PowerEdge R540', 2, 250, 750, { nics: NDC10, depthMm: 693, kg: 25 }],
  ['PowerEdge R640', 1, 280, 750, { nics: NDC10, depthMm: 734, kg: 21 }],
  ['PowerEdge R740', 2, 350, 1100, { nics: NDC10, depthMm: 715, kg: 28 }],
  ['PowerEdge R740xd', 2, 400, 1100, { nics: NDC10, depthMm: 715, kg: 29 }],
  ['PowerEdge R740xd2', 2, 380, 1100, { nics: NDC10, depthMm: 810, kg: 32, cat: 'storage' }],
  ['PowerEdge R840', 2, 650, 1600, { nics: NDC10, depthMm: 810, kg: 32 }],
  ['PowerEdge R940', 3, 900, 2000, { nics: NDC10, depthMm: 810, kg: 43 }],
  ['PowerEdge R940xa', 4, 1600, 4800, { psu: 4, nics: NDC10, depthMm: 810, kg: 55, cat: 'gpu' }],
  ['PowerEdge R6415', 1, 230, 550, { nics: NDC10, depthMm: 734, kg: 18 }],
  ['PowerEdge R7415', 2, 300, 750, { nics: NDC10, depthMm: 715, kg: 26 }],
  ['PowerEdge R7425', 2, 420, 1100, { nics: NDC10, depthMm: 715, kg: 28 }],
  // 13th generation
  ['PowerEdge R630', 1, 230, 750, { nics: [[4, 'rj45', 'NDC', '1G']], depthMm: 708, kg: 19 }],
  ['PowerEdge R730', 2, 300, 1100, { nics: [[4, 'rj45', 'NDC', '1G']], depthMm: 684, kg: 27 }],
  ['PowerEdge R730xd', 2, 350, 1100, { nics: [[4, 'rj45', 'NDC', '1G']], depthMm: 684, kg: 30 }],
  ['PowerEdge R430', 1, 180, 550, { nics: [[4, 'rj45', 'NIC', '1G']], depthMm: 607, kg: 15 }],
  ['PowerEdge R330', 1, 90, 350, { nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 607, kg: 12 }],
  // Towers in rack configuration
  ['PowerEdge T550 (rack)', 5, 300, 1400, { depthMm: 676, kg: 37 }],
  ['PowerEdge T560 (rack)', 5, 320, 1400, { depthMm: 708, kg: 38 }],
  ['PowerEdge T640 (rack)', 5, 300, 1600, { nics: NDC10, depthMm: 750, kg: 40 }]
])

const hpe = family('HPE', 'iLO', LOM_OCP25, HPE, [
  ['ProLiant DL20 Gen10 Plus', 1, 80, 290, { psu: 1, nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 395, kg: 8 }],
  ['ProLiant DL20 Gen11', 1, 90, 290, { psu: 1, nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 395, kg: 8 }],
  ['ProLiant DL320 Gen11', 1, 200, 1000, { depthMm: 749, kg: 15 }],
  ['ProLiant DL325 Gen10 Plus v2', 1, 220, 800, { depthMm: 749, kg: 15 }],
  ['ProLiant DL325 Gen11', 1, 260, 1000, { depthMm: 749, kg: 16 }],
  ['ProLiant DL345 Gen11', 2, 300, 1000, { depthMm: 749, kg: 22 }],
  ['ProLiant DL360 Gen10', 1, 280, 800, { nics: [[4, 'rj45', 'LOM', '1G']], depthMm: 707, kg: 16 }],
  ['ProLiant DL360 Gen10 Plus', 1, 320, 1600, { depthMm: 749, kg: 17 }],
  ['ProLiant DL360 Gen11', 1, 380, 1600, { depthMm: 749, kg: 17 }],
  ['ProLiant DL360 Gen12', 1, 420, 1800, { depthMm: 749, kg: 18 }],
  ['ProLiant DL365 Gen10 Plus', 1, 330, 1600, { depthMm: 749, kg: 17 }],
  ['ProLiant DL365 Gen11', 1, 400, 1600, { depthMm: 749, kg: 18 }],
  ['ProLiant DL380 Gen9', 2, 300, 800, { nics: [[4, 'rj45', 'LOM', '1G']], depthMm: 679, kg: 23 }],
  ['ProLiant DL380 Gen10', 2, 340, 1600, { nics: [[4, 'rj45', 'LOM', '1G']], depthMm: 679, kg: 24 }],
  ['ProLiant DL380 Gen10 Plus', 2, 400, 1600, { depthMm: 733, kg: 25 }],
  ['ProLiant DL380 Gen11', 2, 450, 1800, { depthMm: 733, kg: 26 }],
  ['ProLiant DL380 Gen12', 2, 480, 1800, { depthMm: 733, kg: 27 }],
  ['ProLiant DL380a Gen11', 2, 1500, 3200, { psu: 4, depthMm: 820, kg: 32, cat: 'gpu' }],
  ['ProLiant DL385 Gen10 Plus v2', 2, 420, 1600, { depthMm: 733, kg: 25 }],
  ['ProLiant DL385 Gen11', 2, 480, 1800, { depthMm: 733, kg: 26 }],
  ['ProLiant DL560 Gen10', 2, 700, 1600, { nics: [[4, 'rj45', 'LOM', '1G']], depthMm: 750, kg: 29 }],
  ['ProLiant DL560 Gen11', 2, 900, 2800, { depthMm: 773, kg: 32 }],
  ['ProLiant DL580 Gen10', 4, 1100, 3200, { psu: 4, nics: [[4, 'rj45', 'LOM', '1G']], depthMm: 751, kg: 50 }],
  ['ProLiant ML350 Gen11 (rack)', 4, 300, 1600, { depthMm: 749, kg: 30 }],
  ['ProLiant ML110 Gen11 (rack)', 4, 120, 500, { psu: 1, nics: [[2, 'rj45', 'LOM', '1G']], kg: 18 }],
  ['Apollo 4200 Gen10 Plus', 2, 500, 1600, { depthMm: 812, kg: 39, cat: 'storage' }],
  ['Apollo 6500 Gen10 Plus', 4, 3200, 6000, { psu: 4, nics: QSFP100, depthMm: 870, kg: 60, cat: 'gpu' }],
  ['Cray XD670', 5, 7500, 10800, { psu: 6, nics: GPU400, depthMm: 940, kg: 105, cat: 'gpu', desc: '8x NVIDIA H100 SXM' }],
  ['Synergy 12000 Frame', 10, 3500, 13000, { psu: 6, psuType: 'c20', nics: [[2, 'qsfp28', 'ICM', '100G'], [2, 'rj45', 'FLM', '10G']], depthMm: 990, kg: 180, desc: 'Composable infrastructure frame (12 compute modules)' }]
])

const lenovo = family('Lenovo', 'XCC', LOM_OCP25, LENOVO, [
  ['ThinkSystem SR250 V2', 1, 90, 450, { psu: 1, nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 474, kg: 10 }],
  ['ThinkSystem SR250 V3', 1, 100, 450, { nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 474, kg: 10 }],
  ['ThinkSystem SR530', 1, 200, 750, { nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 715, kg: 17 }],
  ['ThinkSystem SR550', 2, 250, 750, { nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 715, kg: 22 }],
  ['ThinkSystem SR590', 2, 280, 750, { nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 715, kg: 24 }],
  ['ThinkSystem SR630', 1, 280, 1100, { nics: NDC10, depthMm: 778, kg: 19 }],
  ['ThinkSystem SR630 V2', 1, 330, 1100, { depthMm: 773, kg: 19 }],
  ['ThinkSystem SR630 V3', 1, 380, 1800, { depthMm: 793, kg: 20 }],
  ['ThinkSystem SR630 V4', 1, 420, 1800, { depthMm: 793, kg: 21 }],
  ['ThinkSystem SR635', 1, 240, 1100, { depthMm: 773, kg: 17 }],
  ['ThinkSystem SR635 V3', 1, 280, 1100, { depthMm: 773, kg: 18 }],
  ['ThinkSystem SR645', 1, 380, 1800, { depthMm: 773, kg: 20 }],
  ['ThinkSystem SR645 V3', 1, 420, 1800, { depthMm: 793, kg: 21 }],
  ['ThinkSystem SR650', 2, 340, 1100, { nics: NDC10, depthMm: 763, kg: 26 }],
  ['ThinkSystem SR650 V2', 2, 400, 1800, { depthMm: 763, kg: 27 }],
  ['ThinkSystem SR650 V3', 2, 450, 1800, { depthMm: 763, kg: 28 }],
  ['ThinkSystem SR650 V4', 2, 480, 2000, { depthMm: 763, kg: 29 }],
  ['ThinkSystem SR655', 2, 280, 1100, { depthMm: 763, kg: 24 }],
  ['ThinkSystem SR655 V3', 2, 320, 1800, { depthMm: 763, kg: 26 }],
  ['ThinkSystem SR665', 2, 450, 1800, { depthMm: 763, kg: 28 }],
  ['ThinkSystem SR665 V3', 2, 500, 1800, { depthMm: 763, kg: 29 }],
  ['ThinkSystem SR850 V2', 2, 800, 2600, { depthMm: 802, kg: 33 }],
  ['ThinkSystem SR850 V3', 2, 900, 2600, { depthMm: 802, kg: 34 }],
  ['ThinkSystem SR860 V2', 4, 1100, 3600, { psu: 4, depthMm: 800, kg: 52 }],
  ['ThinkSystem SR860 V3', 4, 1200, 3600, { psu: 4, depthMm: 800, kg: 54 }],
  ['ThinkSystem SR950', 4, 1500, 4800, { psu: 4, nics: NDC10, depthMm: 800, kg: 58 }],
  ['ThinkSystem SR670 V2', 3, 2500, 4800, { psu: 4, nics: QSFP100, depthMm: 890, kg: 45, cat: 'gpu' }],
  ['ThinkSystem SR675 V3', 3, 2800, 5400, { psu: 4, nics: QSFP100, depthMm: 890, kg: 47, cat: 'gpu' }],
  ['ThinkSystem SR680a V3', 8, 8000, 11500, { psu: 8, nics: GPU400, depthMm: 900, kg: 110, cat: 'gpu', desc: '8x NVIDIA H100/H200 SXM' }],
  ['ThinkSystem SR780a V3', 5, 7500, 11000, { psu: 8, nics: GPU400, depthMm: 900, kg: 90, cat: 'gpu', desc: 'Liquid cooled 8-GPU server' }],
  ['ThinkSystem ST650 V3 (rack)', 5, 300, 1800, { depthMm: 760, kg: 40 }],
  ['ThinkSystem DE4000H 2U24', 2, 300, 800, { nics: [[4, 'sfp-fc', 'FC', '32G'], [2, 'rj45', 'Mgmt', '1G']], depthMm: 483, kg: 27, cat: 'storage' }],
  ['ThinkSystem DM5100F', 2, 600, 1100, { nics: [[8, 'sfp28', 'Data', '25G'], [2, 'rj45', 'Mgmt', '1G']], depthMm: 600, kg: 30, cat: 'storage' }]
])

const cisco = family('Cisco', 'CIMC', [[2, 'rj45', 'LOM', '10G'], [2, 'sfp28', 'VIC', '25G']], CISCO, [
  ['UCS C220 M5', 1, 300, 1050, { depthMm: 760, kg: 17 }],
  ['UCS C220 M6', 1, 350, 1200, { depthMm: 762, kg: 17 }],
  ['UCS C220 M7', 1, 400, 1200, { depthMm: 762, kg: 18 }],
  ['UCS C220 M8', 1, 420, 1600, { depthMm: 762, kg: 18 }],
  ['UCS C225 M6', 1, 330, 1200, { depthMm: 762, kg: 17 }],
  ['UCS C225 M8', 1, 380, 1600, { depthMm: 762, kg: 18 }],
  ['UCS C240 M5', 2, 380, 1600, { depthMm: 760, kg: 25 }],
  ['UCS C240 M6', 2, 420, 1600, { depthMm: 762, kg: 26 }],
  ['UCS C240 M7', 2, 450, 2300, { depthMm: 762, kg: 27 }],
  ['UCS C240 M8', 2, 480, 2300, { depthMm: 762, kg: 28 }],
  ['UCS C245 M6', 2, 450, 2300, { depthMm: 762, kg: 27 }],
  ['UCS C245 M8', 2, 500, 2300, { depthMm: 762, kg: 28 }],
  ['UCS C480 M5', 4, 1200, 6400, { psu: 4, depthMm: 820, kg: 66 }],
  ['UCS C845A M8', 8, 6000, 10000, { psu: 6, nics: GPU400, depthMm: 900, kg: 95, cat: 'gpu' }],
  ['UCS C885A M8', 8, 8000, 12000, { psu: 8, nics: GPU400, depthMm: 900, kg: 110, cat: 'gpu', desc: '8x NVIDIA H100/H200 or AMD MI300X' }],
  ['UCS 5108 Blade Chassis', 6, 2500, 7500, { psu: 4, psuType: 'c20', nics: [[8, 'sfp+', 'IOM-A', '10G'], [8, 'sfp+', 'IOM-B', '10G']], depthMm: 813, kg: 115, desc: 'Holds 8 half-width B-Series blades' }],
  ['UCS X9508 Chassis', 7, 3500, 15000, { psu: 6, psuType: 'c20', nics: [[8, 'qsfp28', 'IFM-A', '100G'], [8, 'qsfp28', 'IFM-B', '100G']], depthMm: 925, kg: 150, desc: 'Holds 8 X-Series compute nodes' }],
  ['HyperFlex HX220c M6', 1, 380, 1200, { depthMm: 762, kg: 17 }],
  ['HyperFlex HX240c M6', 2, 450, 1600, { depthMm: 762, kg: 27 }]
])

const smc = family('Supermicro', 'IPMI', [[2, 'rj45', 'LAN', '10G']], SMC, [
  ['SYS-1029P-WTR', 1, 300, 750, { depthMm: 690, kg: 17 }],
  ['SYS-2029P-C1R', 2, 300, 800, { depthMm: 650, kg: 20 }],
  ['SYS-1029U-TRT', 1, 350, 1000, { depthMm: 749, kg: 18 }],
  ['SYS-2029U-TR4', 2, 400, 1000, { depthMm: 749, kg: 24 }],
  ['SYS-120U-TNR', 1, 380, 1200, { depthMm: 749, kg: 18 }],
  ['SYS-220U-TNR', 2, 420, 1600, { depthMm: 749, kg: 25 }],
  ['SYS-121H-TNR', 1, 420, 1600, { depthMm: 749, kg: 19 }],
  ['SYS-221H-TNR', 2, 450, 2000, { depthMm: 749, kg: 26 }],
  ['SYS-111C-NR', 1, 250, 860, { depthMm: 600, kg: 13 }],
  ['SYS-211C-NR', 2, 280, 860, { depthMm: 600, kg: 18 }],
  ['SYS-510T-MR', 1, 70, 400, { depthMm: 249, kg: 6, desc: 'Short-depth edge server' }],
  ['SYS-5019C-M', 1, 60, 350, { psu: 1, nics: [[2, 'rj45', 'LAN', '1G']], depthMm: 503, kg: 8 }],
  ['SYS-6019P-WT', 1, 220, 600, { psu: 1, depthMm: 650, kg: 13 }],
  ['SYS-6029P-TR', 2, 300, 1000, { depthMm: 650, kg: 23 }],
  ['SYS-620P-TRT', 2, 380, 1200, { depthMm: 749, kg: 24 }],
  ['AS-1114S-WN10RT', 1, 280, 750, { depthMm: 749, kg: 17 }],
  ['AS-1124US-TNRP', 1, 350, 1000, { depthMm: 749, kg: 18 }],
  ['AS-2124US-TNRP', 2, 420, 1200, { depthMm: 749, kg: 25 }],
  ['AS-1115CS-TNR', 1, 300, 1200, { depthMm: 749, kg: 17 }],
  ['AS-2015CS-TNR', 2, 320, 1200, { depthMm: 749, kg: 22 }],
  ['AS-1125HS-TNR', 1, 420, 1600, { depthMm: 749, kg: 19 }],
  ['AS-2125HS-TNR', 2, 480, 2000, { depthMm: 749, kg: 26 }],
  ['SSG-6049P-E1CR36L', 4, 600, 1200, { depthMm: 699, kg: 45, cat: 'storage', desc: '36-bay storage server' }],
  ['SSG-640P-E1CR36H', 4, 650, 1600, { depthMm: 699, kg: 46, cat: 'storage' }],
  ['SSG-6049SP-DE1CR90', 4, 900, 2600, { psu: 2, depthMm: 1000, kg: 90, cat: 'storage', desc: '90-bay top-loading storage' }],
  ['SYS-421GE-TNRT', 4, 3000, 6000, { psu: 4, nics: QSFP100, depthMm: 813, kg: 50, cat: 'gpu', desc: '10x double-width PCIe GPU' }],
  ['SYS-821GE-TNHR', 8, 8000, 12000, { psu: 6, nics: GPU400, depthMm: 900, kg: 120, cat: 'gpu', desc: 'HGX H100/H200 8-GPU' }],
  ['AS-8125GS-TNHR', 8, 8000, 12000, { psu: 6, nics: GPU400, depthMm: 900, kg: 120, cat: 'gpu', desc: 'HGX H100/H200 8-GPU (AMD EPYC)' }],
  ['SYS-F620P3-RTBN (FatTwin 4-node)', 4, 1400, 4400, { psu: 2, nics: [[8, 'rj45', 'LAN', '10G']], depthMm: 790, kg: 60 }],
  ['SYS-2029BT-HNR (BigTwin 4-node)', 2, 1300, 2200, { psu: 2, nics: [[8, 'sfp28', 'LAN', '25G']], depthMm: 750, kg: 40 }]
])

const others: ComponentDef[] = [
  ...family('Gigabyte', 'BMC', LOM_OCP25, '#2f3236', [
    ['R182-Z90', 1, 330, 1200, { depthMm: 815, kg: 18 }],
    ['R282-Z90', 2, 420, 1600, { depthMm: 815, kg: 25 }],
    ['R163-Z30', 1, 280, 1000, { depthMm: 730, kg: 16 }],
    ['R263-Z30', 2, 320, 1300, { depthMm: 730, kg: 22 }],
    ['G293-Z40', 2, 2000, 4000, { psu: 4, nics: QSFP100, depthMm: 900, kg: 33, cat: 'gpu' }],
    ['G593-SD0', 5, 7500, 11000, { psu: 6, nics: GPU400, depthMm: 900, kg: 95, cat: 'gpu', desc: 'HGX H100 8-GPU' }]
  ]),
  ...family('NVIDIA', 'BMC', GPU400, '#1d1f1a', [
    ['DGX A100', 6, 5000, 6500, { psu: 6, depthMm: 897, kg: 123, cat: 'gpu', desc: '8x A100 80GB' }],
    ['DGX H100', 8, 8000, 10200, { psu: 6, depthMm: 897, kg: 130, cat: 'gpu', desc: '8x H100 SXM5' }],
    ['DGX H200', 8, 8000, 10200, { psu: 6, depthMm: 897, kg: 130, cat: 'gpu', desc: '8x H200 SXM5' }],
    ['DGX B200', 10, 11000, 14300, { psu: 6, depthMm: 897, kg: 142, cat: 'gpu', desc: '8x B200' }]
  ]),
  ...family('Fujitsu', 'iRMC', LOM_OCP25, '#2a2c30', [
    ['PRIMERGY RX1330 M5', 1, 100, 450, { nics: [[2, 'rj45', 'LOM', '1G']], depthMm: 590, kg: 11 }],
    ['PRIMERGY RX2530 M6', 1, 330, 1300, { depthMm: 762, kg: 19 }],
    ['PRIMERGY RX2530 M7', 1, 380, 1600, { depthMm: 762, kg: 20 }],
    ['PRIMERGY RX2540 M6', 2, 400, 1600, { depthMm: 762, kg: 26 }],
    ['PRIMERGY RX2540 M7', 2, 450, 1800, { depthMm: 762, kg: 27 }],
    ['PRIMERGY RX4770 M7', 2, 900, 2600, { depthMm: 800, kg: 33 }]
  ]),
  ...family('ASUS', 'ASMB', LOM_OCP25, '#2d2f33', [
    ['RS500A-E12', 1, 330, 1200, { depthMm: 760, kg: 17 }],
    ['RS700-E11', 1, 380, 1600, { depthMm: 760, kg: 18 }],
    ['RS720-E11', 2, 420, 1600, { depthMm: 760, kg: 26 }],
    ['ESC8000A-E12', 4, 3500, 6000, { psu: 4, nics: QSFP100, depthMm: 900, kg: 55, cat: 'gpu' }]
  ]),
  ...family('Oracle', 'ILOM', [[4, 'rj45', 'NET', '10G']], '#2b2b2b', [
    ['Server X9-2', 1, 400, 1200, { depthMm: 765, kg: 19 }],
    ['Server X9-2L', 2, 450, 1200, { depthMm: 765, kg: 27 }],
    ['Server X10M', 1, 450, 1600, { depthMm: 765, kg: 20 }]
  ]),
  ...family('IBM', 'eBMC', [[4, 'rj45', 'ETH', '10G']], '#1b1d21', [
    ['Power S1022', 2, 900, 2000, { depthMm: 813, kg: 30 }],
    ['Power S1024', 4, 1300, 3000, { psu: 4, depthMm: 813, kg: 48 }],
    ['Power E1050', 4, 2000, 6000, { psu: 4, depthMm: 900, kg: 60 }],
    ['Power E1080 system node', 5, 3000, 7800, { psu: 4, depthMm: 900, kg: 90 }]
  ]),
  ...family('Nutanix', 'IPMI', LOM_OCP25, '#262a2e', [
    ['NX-1065-G8 (4-node)', 2, 900, 2000, { nics: [[8, 'sfp28', 'Node', '25G']], depthMm: 790, kg: 38 }],
    ['NX-3060-G8 (4-node)', 2, 1300, 2200, { nics: [[8, 'sfp28', 'Node', '25G']], depthMm: 790, kg: 40 }],
    ['NX-3170-G8', 1, 450, 1600, { depthMm: 760, kg: 18 }],
    ['NX-8155-G8', 2, 500, 1600, { depthMm: 760, kg: 27 }]
  ]),
  ...family('Apple', '', [[1, 'rj45', 'Ethernet', '10G']], '#b9bcc0', [
    ['Mac Pro (Rack, 2023)', 5, 300, 1400, { psu: 2, depthMm: 530, kg: 17 }]
  ]),
  ...family('Sonnet', '', [[2, 'rj45', 'Ethernet', '10G']], '#808388', [['RackMac mini (2x Mac mini)', 1, 40, 300, { psu: 2, depthMm: 400, kg: 6 }]])
]

smc.push(server({ mfr: 'Supermicro', model: 'SYS-E300-12D (rack shelf)', u: 1, w: [40, 150], psu: 1, bmc: '', nics: [[4, 'rj45', 'LAN', '1G'], [2, 'sfp+', 'SFP', '10G']], color: SMC }))

export const serverComponents: ComponentDef[] = [...dell, ...hpe, ...lenovo, ...cisco, ...smc, ...others]
