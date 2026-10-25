// Rack PDUs and UPSs. Where an exact SKU varies by region, entries are named by
// their electrical spec so the model can be matched to a vendor part number.
import type { ComponentDef } from '../model/types'
import { item, pdu, ups, type P, type PduSpec, type UpsSpec } from './builders'

type PduRow = [model: string, voltage: number, amps: number, input: string, outlets: P[], opts?: Partial<PduSpec>]
type UpsRow = [model: string, u: number, va: number, watts: number, input: string, outlets: P[], opts?: Partial<UpsSpec>]

const pdus = (mfr: string, rows: PduRow[]) =>
  rows.map(([model, voltage, amps, input, outlets, o = {}]) => pdu({ mfr, model, voltage, amps, input, outlets, ...o }))
const upss = (mfr: string, rows: UpsRow[]) =>
  rows.map(([model, u, va, watts, input, outlets, o = {}]) => ups({ mfr, model, u, va, watts, input, outlets, ...o }))

const c13 = (n: number): P => [n, 'c13']
const c19 = (n: number): P => [n, 'c19']
const r515 = (n: number): P => [n, 'nema-5-15r', 'Out']
const r520 = (n: number): P => [n, 'nema-5-20r', 'Out']
const L530 = (n = 1): P => [n, 'nema-l5-30r', 'Out']
const L630 = (n = 1): P => [n, 'nema-l6-30r', 'Out']
const H = { u: 1 }

const apcPdu = pdus('APC', [
  ['AP7900B Switched 1U 120V 15A', 120, 15, 'nema-5-15p', [r515(8)], { ...H, switched: true }],
  ['AP7901B Switched 1U 120V 20A', 120, 20, 'nema-5-20p', [r520(8)], { ...H, switched: true }],
  ['AP7920B Switched 1U 230V 10A', 230, 10, 'c14', [c13(8)], { ...H, switched: true }],
  ['AP7921B Switched 1U 230V 16A', 230, 16, 'c20', [c13(8)], { ...H, switched: true }],
  ['AP7811B Metered 1U 120V 20A', 120, 20, 'nema-5-20p', [r520(8)], { ...H, metered: true }],
  ['AP7820B Metered 1U 230V 10A', 230, 10, 'c14', [c13(8)], { ...H, metered: true }],
  ['AP7821B Metered 1U 230V 16A', 230, 16, 'c20', [c13(8)], { ...H, metered: true }],
  ['AP6015A Basic 1U 120V 15A', 120, 15, 'nema-5-15p', [r515(10)], H],
  ['AP9562 Basic 1U 120V 15A', 120, 15, 'nema-5-15p', [r515(10)], H],
  ['AP9559 Basic 1U 230V 16A', 230, 16, 'iec309-16p', [c13(8), c19(1)], H],
  ['AP7941B Switched 0U 208V 30A', 208, 24, 'nema-l6-30p', [c13(21), c19(3)], { switched: true, lengthMm: 1780 }],
  ['AP7940B Switched 0U 120V 30A', 120, 24, 'nema-l5-30p', [r520(24)], { switched: true, lengthMm: 1780 }],
  ['AP7953 Switched 0U 230V 16A', 230, 16, 'iec309-16p', [c13(21), c19(3)], { switched: true, lengthMm: 1780 }],
  ['AP7954 Switched 0U 230V 32A', 230, 32, 'iec309-32p', [c13(21), c19(3)], { switched: true, lengthMm: 1780 }],
  ['AP8941 Switched 2G 0U 208V 30A', 208, 24, 'nema-l6-30p', [c13(21), c19(3)], { switched: true, lengthMm: 1830 }],
  ['AP8953 Switched 2G 0U 230V 16A', 230, 16, 'iec309-16p', [c13(21), c19(3)], { switched: true, lengthMm: 1830 }],
  ['AP8959 Switched 2G 0U 230V 32A', 230, 32, 'iec309-32p', [c13(21), c19(3)], { switched: true, lengthMm: 1830 }],
  ['AP8961 Switched 2G 0U 208V 3ph 30A', 208, 24, 'nema-l21-30p', [c13(21), c19(3)], { switched: true, threePhase: 208, lengthMm: 1830 }],
  ['AP8966 Switched 2G 0U 400V 3ph 16A', 230, 16, 'iec309-32p-3ph', [c13(21), c19(3)], { switched: true, threePhase: 400, lengthMm: 1830 }],
  ['AP8886 Metered-by-Outlet 2G 0U 400V 3ph 32A', 230, 32, 'iec309-32p-3ph', [c13(36), c19(6)], { metered: true, threePhase: 400, lengthMm: 1990 }],
  ['AP8841 Metered 2G 0U 208V 30A', 208, 24, 'nema-l6-30p', [c13(20), c19(4)], { metered: true, lengthMm: 1830 }],
  ['AP8853 Metered 2G 0U 230V 16A', 230, 16, 'iec309-16p', [c13(20), c19(4)], { metered: true, lengthMm: 1830 }],
  ['AP8858 Metered 2G 0U 230V 32A', 230, 32, 'iec309-32p', [c13(20), c19(4)], { metered: true, lengthMm: 1830 }],
  ['AP8861 Metered 2G 0U 208V 3ph 30A', 208, 24, 'nema-l21-30p', [c13(21), c19(3)], { metered: true, threePhase: 208, lengthMm: 1830 }],
  ['AP7552 Basic 0U 208V 20A', 208, 16, 'nema-l6-20p', [c13(16), c19(2)], { lengthMm: 1780 }],
  ['AP7553 Basic 0U 230V 16A', 230, 16, 'iec309-16p', [c13(20), c19(4)], { lengthMm: 1780 }],
  ['AP7555A Basic 0U 208V 30A', 208, 24, 'nema-l6-30p', [c13(20), c19(4)], { lengthMm: 1780 }],
  ['AP9568 Basic 0U 120V 15A', 120, 15, 'nema-5-15p', [r515(14)], { lengthMm: 1000 }],
  ['AP7802B Metered 0U 120V 20A', 120, 16, 'nema-5-20p', [r520(24)], { metered: true, lengthMm: 1780 }]
])

const apcUps = upss('APC', [
  ['Smart-UPS SMT750RM2U', 2, 750, 500, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 457, weightKg: 25 }],
  ['Smart-UPS SMT1000RM2U', 2, 1000, 700, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 457, weightKg: 28 }],
  ['Smart-UPS SMT1500RM2U', 2, 1440, 1000, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 483, weightKg: 29 }],
  ['Smart-UPS SMT2200RM2U', 2, 1920, 1920, 'nema-5-20p', [r520(8)], { voltage: 120, depthMm: 584, weightKg: 43 }],
  ['Smart-UPS SMT3000RM2U', 2, 2880, 2700, 'nema-l5-30p', [r520(8), L530()], { voltage: 120, depthMm: 660, weightKg: 44 }],
  ['Smart-UPS SMT1500RMI2U', 2, 1500, 1000, 'c14', [c13(4)], { voltage: 230, depthMm: 483, weightKg: 29 }],
  ['Smart-UPS SMT2200RMI2U', 2, 2200, 1980, 'c20', [c13(8), c19(1)], { voltage: 230, depthMm: 584, weightKg: 43 }],
  ['Smart-UPS SMT3000RMI2U', 2, 3000, 2700, 'c20', [c13(8), c19(1)], { voltage: 230, depthMm: 660, weightKg: 44 }],
  ['Smart-UPS SMTL1500RMI2U (Li-ion)', 2, 1500, 1350, 'c14', [c13(6)], { voltage: 230, depthMm: 480, weightKg: 20 }],
  ['Smart-UPS SMX1500RM2U', 2, 1440, 1200, 'nema-5-15p', [r515(8)], { voltage: 120, depthMm: 483, weightKg: 26 }],
  ['Smart-UPS SMX3000RMHV2U', 2, 3000, 2700, 'c20', [c13(8), c19(2)], { voltage: 230, depthMm: 609, weightKg: 42 }],
  ['Smart-UPS SRT1000RMXLA', 2, 1000, 1000, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 610, weightKg: 26 }],
  ['Smart-UPS SRT1500RMXLA', 2, 1500, 1500, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 610, weightKg: 26 }],
  ['Smart-UPS SRT2200RMXLA', 2, 2200, 1980, 'nema-5-20p', [r520(6)], { voltage: 120, depthMm: 640, weightKg: 34 }],
  ['Smart-UPS SRT3000RMXLA', 2, 3000, 2700, 'nema-l5-30p', [r520(6), L530()], { voltage: 120, depthMm: 640, weightKg: 34 }],
  ['Smart-UPS SRT3000RMXLI', 2, 3000, 2700, 'c20', [c13(8), c19(2)], { voltage: 230, depthMm: 640, weightKg: 34 }],
  ['Smart-UPS SRT5KRMXLT', 3, 5000, 4500, 'nema-l6-30p', [c13(6), c19(4), L630()], { voltage: 208, depthMm: 693, weightKg: 54 }],
  ['Smart-UPS SRT5KRMXLI', 3, 5000, 4500, 'hardwire-in', [c13(6), c19(4)], { voltage: 230, depthMm: 693, weightKg: 54 }],
  ['Smart-UPS SRT6KRMXLT', 4, 6000, 6000, 'hardwire-in', [c13(4), c19(4), L630(2)], { voltage: 208, depthMm: 693, weightKg: 62 }],
  ['Smart-UPS SRT8KRMXLT', 6, 8000, 8000, 'hardwire-in', [c13(4), c19(4), L630(2)], { voltage: 208, depthMm: 693, weightKg: 85 }],
  ['Smart-UPS SRT10KRMXLT', 6, 10000, 10000, 'hardwire-in', [c13(4), c19(4), L630(2)], { voltage: 208, depthMm: 693, weightKg: 90 }],
  ['Smart-UPS SRT10KRMXLI', 6, 10000, 10000, 'hardwire-in', [c13(4), c19(4)], { voltage: 230, depthMm: 693, weightKg: 90 }],
  ['Back-UPS Pro BR1500MS2 (rack kit)', 2, 1500, 900, 'nema-5-15p', [r515(10)], { voltage: 120, nmc: false }]
])

const eaton = [
  ...upss('Eaton', [
    ['5P 1550 Rack 1U (5P1550R)', 1, 1440, 1100, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 520, weightKg: 19 }],
    ['5PX 1500 RT2U (5PX1500RT)', 2, 1440, 1440, 'nema-5-15p', [r515(8)], { voltage: 120, depthMm: 500, weightKg: 26 }],
    ['5PX 2200 RT2U (5PX2200RT)', 2, 1920, 1920, 'nema-5-20p', [r520(8)], { voltage: 120, depthMm: 600, weightKg: 32 }],
    ['5PX 3000 RT2U (5PX3000RTN)', 2, 2880, 2880, 'nema-l5-30p', [r520(6), L530()], { voltage: 120, depthMm: 650, weightKg: 35 }],
    ['5PX 1500i RT2U', 2, 1500, 1500, 'c14', [c13(8)], { voltage: 230, depthMm: 500, weightKg: 26 }],
    ['5PX 3000i RT2U', 2, 3000, 3000, 'c20', [c13(8), c19(1)], { voltage: 230, depthMm: 650, weightKg: 35 }],
    ['9PX 1500 RT2U', 2, 1500, 1500, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 500, weightKg: 22 }],
    ['9PX 3000 RT2U', 2, 3000, 2700, 'nema-l5-30p', [r520(6), L530()], { voltage: 120, depthMm: 600, weightKg: 32 }],
    ['9PX 6K RT3U (208V)', 3, 6000, 6000, 'hardwire-in', [c19(4), L630(2)], { voltage: 208, depthMm: 650, weightKg: 54 }],
    ['9PX 11K RT6U (208V)', 6, 11000, 10000, 'hardwire-in', [c19(4), L630(2)], { voltage: 208, depthMm: 700, weightKg: 95 }],
    ['9PX 6Ki RT3U (230V)', 3, 6000, 6000, 'hardwire-in', [c13(8), c19(2)], { voltage: 230, depthMm: 650, weightKg: 54 }],
    ['9SX 3000i RT3U', 3, 3000, 2700, 'c20', [c13(8), c19(1)], { voltage: 230, depthMm: 600, weightKg: 32 }],
    ['5S 1500 Rack (5S1500R)', 2, 1500, 900, 'nema-5-15p', [r515(8)], { voltage: 120, nmc: false }]
  ]),
  ...pdus('Eaton', [
    ['ePDU G3 Basic 1U 120V 15A (12x 5-15R)', 120, 15, 'nema-5-15p', [r515(12)], H],
    ['ePDU G3 Metered Input 1U 230V 16A (12x C13)', 230, 16, 'iec309-16p', [c13(12)], { ...H, metered: true }],
    ['ePDU G3 Metered Input 0U 208V 30A (20x C13, 4x C19)', 208, 24, 'nema-l6-30p', [c13(20), c19(4)], { metered: true }],
    ['ePDU G3 Metered Outlet 0U 208V 30A (20x C13, 4x C19)', 208, 24, 'nema-l6-30p', [c13(20), c19(4)], { metered: true }],
    ['ePDU G3 Switched 0U 208V 30A (20x C13, 4x C19)', 208, 24, 'nema-l6-30p', [c13(20), c19(4)], { switched: true }],
    ['ePDU G3 Managed 0U 208V 3ph 30A (30x C13, 6x C19)', 208, 24, 'nema-l21-30p', [c13(30), c19(6)], { switched: true, threePhase: 208 }],
    ['ePDU G3 Metered Input 0U 230V 16A (20x C13, 4x C19)', 230, 16, 'iec309-16p', [c13(20), c19(4)], { metered: true }],
    ['ePDU G3 Metered Input 0U 230V 32A (36x C13, 6x C19)', 230, 32, 'iec309-32p', [c13(36), c19(6)], { metered: true }],
    ['ePDU G3 Switched 0U 400V 3ph 32A (36x C13, 6x C19)', 230, 32, 'iec309-32p-3ph', [c13(36), c19(6)], { switched: true, threePhase: 400 }],
    ['ePDU G4 Managed 0U 400V 3ph 32A (42x C13/C19 combo)', 230, 32, 'iec309-32p-3ph', [c13(36), c19(6)], { switched: true, threePhase: 400 }]
  ])
]

const cyberpower = [
  ...pdus('CyberPower', [
    ['CPS1215RMS 1U 120V 15A', 120, 15, 'nema-5-15p', [r515(10)], H],
    ['PDU15B10R 1U 120V 15A Basic', 120, 15, 'nema-5-15p', [r515(10)], H],
    ['PDU20B10R 1U 120V 20A Basic', 120, 20, 'nema-5-20p', [r520(10)], H],
    ['PDU15SW8FNET Switched 1U 120V 15A', 120, 15, 'nema-5-15p', [r515(8)], { ...H, switched: true }],
    ['PDU81005 Switched 1U 120V 20A', 120, 20, 'nema-5-20p', [r520(8)], { ...H, switched: true }],
    ['PDU30MVHV36AT Metered ATS 0U 208V 30A', 208, 24, 'nema-l6-30p', [c13(30), c19(6)], { metered: true }],
    ['PDU30SWV36AT Switched 0U 208V 30A', 208, 24, 'nema-l6-30p', [c13(30), c19(6)], { switched: true }],
    ['PDU81403 Switched 0U 230V 16A', 230, 16, 'iec309-16p', [c13(18), c19(6)], { switched: true }]
  ]),
  ...upss('CyberPower', [
    ['OR1500LCDRM1U', 1, 1500, 900, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 450, weightKg: 17, nmc: false }],
    ['OR2200LCDRM2U', 2, 2200, 1320, 'nema-5-20p', [r520(8)], { voltage: 120, depthMm: 450, weightKg: 28, nmc: false }],
    ['PR1500LCDRT2U', 2, 1500, 1500, 'nema-5-15p', [r515(8)], { voltage: 120, depthMm: 490, weightKg: 27 }],
    ['PR2200LCDRT2U', 2, 2200, 1980, 'nema-5-20p', [r520(9)], { voltage: 120, depthMm: 600, weightKg: 35 }],
    ['PR3000LCDRT2U', 2, 3000, 3000, 'nema-l5-30p', [r520(6), L530()], { voltage: 120, depthMm: 640, weightKg: 37 }],
    ['PR1500ELCDRT2U (230V)', 2, 1500, 1500, 'c14', [c13(8)], { voltage: 230, depthMm: 490, weightKg: 27 }],
    ['PR3000ELCDRT2U (230V)', 2, 3000, 3000, 'c20', [c13(8), c19(1)], { voltage: 230, depthMm: 640, weightKg: 37 }],
    ['OL1500RTXL2U (online)', 2, 1500, 1350, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 480, weightKg: 20 }],
    ['OL3000RTXL2U (online)', 2, 3000, 2700, 'nema-l5-30p', [r520(6), L530()], { voltage: 120, depthMm: 630, weightKg: 32 }],
    ['OL6KRT (online, 208V)', 3, 6000, 5400, 'hardwire-in', [c13(8), c19(2), L630(2)], { voltage: 208, depthMm: 650, weightKg: 50 }],
    ['OL10KRT (online, 208V)', 6, 10000, 9000, 'hardwire-in', [c13(8), c19(2), L630(2)], { voltage: 208, depthMm: 650, weightKg: 85 }]
  ])
]

const tripplite = [
  ...pdus('Tripp Lite', [
    ['PDUMH15 Metered 1U 120V 15A', 120, 15, 'nema-5-15p', [r515(13)], { ...H, metered: true }],
    ['PDUMH20 Metered 1U 120V 20A', 120, 20, 'nema-5-20p', [r520(13)], { ...H, metered: true }],
    ['PDU1215 Basic 1U 120V 15A', 120, 15, 'nema-5-15p', [r515(13)], H],
    ['PDU1220 Basic 1U 120V 20A', 120, 20, 'nema-5-20p', [r520(13)], H],
    ['PDUMH15NET Monitored 1U 120V 15A', 120, 15, 'nema-5-15p', [r515(8)], { ...H, metered: true }],
    ['PDUH20HV Basic 1U 230V 16A', 230, 16, 'c20', [c13(8)], H],
    ['Metered 0U 208V 30A (L6-30P, 20x C13, 4x C19)', 208, 24, 'nema-l6-30p', [c13(20), c19(4)], { metered: true }],
    ['Switched 0U 208V 30A (L6-30P, 20x C13, 4x C19)', 208, 24, 'nema-l6-30p', [c13(20), c19(4)], { switched: true }],
    ['Metered 0U 208V 3ph 30A (L21-30P, 30x C13, 6x C19)', 208, 24, 'nema-l21-30p', [c13(30), c19(6)], { metered: true, threePhase: 208 }],
    ['Metered 0U 120V 30A (L5-30P, 24x 5-20R)', 120, 24, 'nema-l5-30p', [r520(24)], { metered: true }]
  ]),
  ...upss('Tripp Lite', [
    ['SmartPro SMART1500RM2U', 2, 1500, 900, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 450, weightKg: 23, nmc: false }],
    ['SmartPro SMART1500LCDXL (rack)', 2, 1500, 900, 'nema-5-15p', [r515(8)], { voltage: 120, nmc: false }],
    ['SmartPro SMART2200RMXL2U', 2, 2200, 1920, 'nema-5-20p', [r520(6)], { voltage: 120, depthMm: 500, weightKg: 32 }],
    ['SmartPro SMART3000RM2U', 2, 3000, 2880, 'nema-l5-30p', [r520(6), L530()], { voltage: 120, depthMm: 560, weightKg: 37 }],
    ['SmartOnline SU1500RTXLCD2U', 2, 1500, 1350, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 480, weightKg: 25 }],
    ['SmartOnline SU3000RTXLCD3U', 3, 3000, 2700, 'nema-l5-30p', [r520(6), L530()], { voltage: 120, depthMm: 580, weightKg: 39 }],
    ['SmartOnline SU6000RT3UHV', 3, 6000, 5400, 'hardwire-in', [c13(6), c19(2), L630(2)], { voltage: 208, depthMm: 650, weightKg: 54 }],
    ['SmartOnline SU10KRT3UHW', 3, 10000, 9000, 'hardwire-in', [c19(4), L630(2)], { voltage: 208, depthMm: 650, weightKg: 34, description: 'Power module only; add battery packs' }]
  ])
]

const vertiv = [
  ...upss('Vertiv', [
    ['Liebert GXT5-1000LVRT2UXL', 2, 1000, 1000, 'nema-5-15p', [r515(6)], { voltage: 120, depthMm: 430, weightKg: 18 }],
    ['Liebert GXT5-1500LVRT2UXL', 2, 1500, 1350, 'nema-5-15p', [r515(8)], { voltage: 120, depthMm: 430, weightKg: 19 }],
    ['Liebert GXT5-2000LVRT2UXL', 2, 2000, 1800, 'nema-5-20p', [r520(8)], { voltage: 120, depthMm: 500, weightKg: 26 }],
    ['Liebert GXT5-3000LVRT2UXL', 2, 3000, 2700, 'nema-l5-30p', [r520(6), L530()], { voltage: 120, depthMm: 600, weightKg: 31 }],
    ['Liebert GXT5-5000HVRT2UXL', 2, 5000, 5000, 'nema-l6-30p', [c13(6), c19(2), L630()], { voltage: 208, depthMm: 600, weightKg: 43 }],
    ['Liebert GXT5-6000HVRT5UXLN', 5, 6000, 6000, 'hardwire-in', [c13(6), c19(2), L630(2)], { voltage: 208, depthMm: 650, weightKg: 85 }],
    ['Liebert GXT5-10KHVRT5UXLN', 5, 10000, 10000, 'hardwire-in', [c13(6), c19(2), L630(2)], { voltage: 208, depthMm: 650, weightKg: 95 }],
    ['Liebert GXT5-1500IRT2UXL', 2, 1500, 1350, 'c14', [c13(8)], { voltage: 230, depthMm: 430, weightKg: 19 }],
    ['Liebert GXT5-3000IRT2UXL', 2, 3000, 2700, 'c20', [c13(8), c19(1)], { voltage: 230, depthMm: 600, weightKg: 31 }],
    ['Liebert PSI5-1500RT120', 2, 1500, 1350, 'nema-5-15p', [r515(8)], { voltage: 120, depthMm: 450, weightKg: 22 }],
    ['Liebert PSI5-3000RT120', 2, 3000, 2700, 'nema-l5-30p', [r520(6), L530()], { voltage: 120, depthMm: 600, weightKg: 32 }],
    ['Liebert EDGE-1500IRT2UXL', 2, 1500, 1350, 'c14', [c13(8)], { voltage: 230, depthMm: 430, weightKg: 20 }]
  ]),
  ...pdus('Vertiv', [
    ['Geist rPDU Basic 0U 208V 30A (L6-30P, 24x C13, 6x C19)', 208, 24, 'nema-l6-30p', [c13(24), c19(6)], {}],
    ['Geist rPDU Metered 0U 208V 30A (L6-30P, 24x C13, 6x C19)', 208, 24, 'nema-l6-30p', [c13(24), c19(6)], { metered: true }],
    ['Geist rPDU Switched 0U 208V 3ph 30A (L21-30P, 36x C13, 6x C19)', 208, 24, 'nema-l21-30p', [c13(36), c19(6)], { switched: true, threePhase: 208 }],
    ['Geist rPDU Switched 0U 400V 3ph 32A (36x C13, 6x C19)', 230, 32, 'iec309-32p-3ph', [c13(36), c19(6)], { switched: true, threePhase: 400 }],
    ['MPH2 Metered 0U 230V 16A (24x C13, 4x C19)', 230, 16, 'iec309-16p', [c13(24), c19(4)], { metered: true }],
    ['MPH2 Switched 0U 230V 32A (36x C13, 6x C19)', 230, 32, 'iec309-32p', [c13(36), c19(6)], { switched: true }],
    ['VP Basic 1U 120V 20A (12x 5-20R)', 120, 20, 'nema-5-20p', [r520(12)], H]
  ])
]

const raritan = pdus('Raritan', [
  ['PX3 Switched 0U 208V 30A (L6-30P, 24x C13, 6x C19)', 208, 24, 'nema-l6-30p', [c13(24), c19(6)], { switched: true }],
  ['PX3 Metered Outlet 0U 208V 30A (L6-30P, 24x C13, 6x C19)', 208, 24, 'nema-l6-30p', [c13(24), c19(6)], { metered: true }],
  ['PX3 Switched 0U 208V 3ph 30A (L21-30P, 36x C13, 6x C19)', 208, 24, 'nema-l21-30p', [c13(36), c19(6)], { switched: true, threePhase: 208 }],
  ['PX3 Switched 0U 400V 3ph 32A (36x C13, 6x C19)', 230, 32, 'iec309-32p-3ph', [c13(36), c19(6)], { switched: true, threePhase: 400 }],
  ['PX3 Metered 0U 230V 16A (20x C13, 4x C19)', 230, 16, 'iec309-16p', [c13(20), c19(4)], { metered: true }],
  ['PX3 Metered 0U 230V 32A (36x C13, 6x C19)', 230, 32, 'iec309-32p', [c13(36), c19(6)], { metered: true }],
  ['PX3 Switched 1U 120V 20A (8x 5-20R)', 120, 16, 'nema-5-20p', [r520(8)], { ...H, switched: true }],
  ['PX4 Switched 0U 400V 3ph 32A (48x C13/C19 combo)', 230, 32, 'iec309-32p-3ph', [c13(42), c19(6)], { switched: true, threePhase: 400 }]
])

const servertech = pdus('Server Technology', [
  ['PRO3X Switched 0U 208V 30A (L6-30P, 24x C13, 6x C19)', 208, 24, 'nema-l6-30p', [c13(24), c19(6)], { switched: true }],
  ['PRO3X Switched 0U 208V 3ph 30A (L21-30P, 36x C13, 6x C19)', 208, 24, 'nema-l21-30p', [c13(36), c19(6)], { switched: true, threePhase: 208 }],
  ['PRO3X Switched 0U 400V 3ph 32A (42x C13/C19 combo)', 230, 32, 'iec309-32p-3ph', [c13(36), c19(6)], { switched: true, threePhase: 400 }],
  ['PRO2 Metered 0U 208V 30A (L6-30P, 24x C13, 6x C19)', 208, 24, 'nema-l6-30p', [c13(24), c19(6)], { metered: true }],
  ['Basic 0U 230V 32A (36x C13, 6x C19)', 230, 32, 'iec309-32p', [c13(36), c19(6)], {}]
])

const misc: ComponentDef[] = [
  ...pdus('Panduit', [
    ['SmartZone G5 Monitored 0U 208V 30A (L6-30P, 24x C13, 6x C19)', 208, 24, 'nema-l6-30p', [c13(24), c19(6)], { metered: true }],
    ['SmartZone G5 Switched 0U 400V 3ph 32A (36x C13, 6x C19)', 230, 32, 'iec309-32p-3ph', [c13(36), c19(6)], { switched: true, threePhase: 400 }]
  ]),
  ...pdus('Ubiquiti', [['USP-PDU-Pro 1U 120V 20A', 120, 16, 'nema-5-20p', [r520(16)], { ...H, metered: true, description: 'UniFi SmartPower PDU Pro' }]]),
  ...pdus('Middle Atlantic', [['PDT-1415C-NS 1U 120V 15A', 120, 15, 'nema-5-15p', [r515(14)], H]]),
  item('APC', 'Smart-UPS SRT96RMBP battery pack', 'ups', 2, { fullDepth: true, weightKg: 38, depthMm: 640, color: '#202020', description: 'External battery pack for SRT 3kVA' }),
  item('APC', 'Smart-UPS SRT192RMBP battery pack', 'ups', 3, { fullDepth: true, weightKg: 62, depthMm: 693, color: '#202020', description: 'External battery pack for SRT 5/6kVA' }),
  item('Eaton', '9PX EBM 3U battery module', 'ups', 3, { fullDepth: true, weightKg: 60, depthMm: 650, color: '#202020' }),
  item('CyberPower', 'BP48V75ART2U battery pack', 'ups', 2, { fullDepth: true, weightKg: 34, depthMm: 600, color: '#202020' })
]

export const powerComponents: ComponentDef[] = [...apcPdu, ...apcUps, ...eaton, ...cyberpower, ...tripplite, ...vertiv, ...raritan, ...servertech, ...misc]
