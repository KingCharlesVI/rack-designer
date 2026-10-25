// Firewalls and security appliances.
import type { ComponentDef } from '../model/types'
import type { P } from './builders'
import { line, type NRow } from './network'

const rj = (n: number, label = '', speed = '1G'): P => [n, 'rj45', label, speed]
const sfp = (n: number, label = '', speed = '1G'): P => [n, 'sfp', label, speed]
const sfpp = (n: number, label = '', speed = '10G'): P => [n, 'sfp+', label, speed]
const sfp28 = (n: number, label = '', speed = '25G'): P => [n, 'sfp28', label, speed]
const q40 = (n: number, label = '', speed = '40G'): P => [n, 'qsfp+', label, speed]
const q100 = (n: number, label = '', speed = '100G'): P => [n, 'qsfp28', label, speed]
const qdd = (n: number, label = '', speed = '400G'): P => [n, 'qsfp-dd', label, speed]

const fw = (mfr: string, color: string, rows: NRow[]) => line(mfr, color, rows, { cat: 'firewall' })

const fortinet = fw('Fortinet', '#3a2a2a', [
  ['FortiGate 70F', [rj(10, 'port')], [12, 20], { psu: 1, depthMm: 160 }],
  ['FortiGate 100F', [rj(18, 'port'), sfp(8, 'port'), sfpp(2, 'x')], [35, 60], { depthMm: 250 }],
  ['FortiGate 120G', [rj(16, 'port'), sfp(8, 'port'), sfpp(4, 'x')], [40, 70], { depthMm: 250 }],
  ['FortiGate 200F', [rj(18, 'port'), sfp(8, 'port'), sfpp(4, 'x')], [80, 140], { depthMm: 380 }],
  ['FortiGate 200G', [rj(16, 'port'), sfp(8, 'port'), sfpp(8, 'x')], [80, 150], { depthMm: 380 }],
  ['FortiGate 400F', [rj(18, 'port'), sfp(8, 'port'), sfpp(8, 'x')], [120, 220], { depthMm: 450 }],
  ['FortiGate 600F', [rj(18, 'port'), sfp(8, 'port'), sfpp(8, 'x'), sfp28(4, 'x')], [150, 280], { depthMm: 450 }],
  ['FortiGate 900G', [rj(18, 'port'), sfp(8, 'port'), sfpp(8, 'x'), sfp28(8, 'x')], [200, 350], { depthMm: 450 }],
  ['FortiGate 1000F', [rj(18, 'port'), sfpp(16, 'x'), sfp28(8, 'x'), q100(2, 'x')], [300, 550], { u: 2, depthMm: 500 }],
  ['FortiGate 1800F', [rj(18, 'port'), sfp(16, 'port'), sfp28(12, 'x'), q100(4, 'x')], [400, 700], { u: 2, depthMm: 500 }],
  ['FortiGate 2600F', [rj(2, 'mgmt'), sfp28(16, 'x'), q100(4, 'x')], [500, 900], { u: 2, depthMm: 600 }],
  ['FortiGate 3000F', [sfp28(16, 'x'), q100(6, 'x'), qdd(2, 'x')], [700, 1300], { u: 2, depthMm: 600 }],
  ['FortiGate 4200F', [sfp28(16, 'x'), q100(12, 'x')], [1200, 2200], { u: 3, psu: 4, depthMm: 700 }],
  ['FortiAnalyzer 300G', [rj(4, 'port')], [100, 200], { depthMm: 500 }],
  ['FortiAnalyzer 1000G', [rj(4, 'port'), sfpp(2, 'port')], [200, 400], { u: 2, depthMm: 650 }],
  ['FortiManager 200G', [rj(4, 'port')], [80, 150], { depthMm: 450 }],
  ['FortiAuthenticator 300F', [rj(4, 'port')], [60, 120], { psu: 1, depthMm: 400 }],
  ['FortiSandbox 1000F', [rj(4, 'port'), sfpp(2, 'port')], [200, 400], { depthMm: 650 }]
])

const fortiswitch = line('Fortinet', '#3a2a2a', [
  ['FortiSwitch 124F', [rj(24, 'port'), sfpp(4, 'port')], [20, 35], { psu: 1, depthMm: 220 }],
  ['FortiSwitch 148F-FPOE', [[48, 'rj45-poe', 'port', '1G'], sfpp(4, 'port')], [70, 800], { psu: 1, depthMm: 350 }],
  ['FortiSwitch 248E-FPOE', [[48, 'rj45-poe', 'port', '1G'], sfp(4, 'port')], [80, 800], { psu: 1, depthMm: 350 }],
  ['FortiSwitch 448E', [rj(48, 'port'), sfpp(4, 'port')], [60, 120], { depthMm: 350 }],
  ['FortiSwitch 524D', [rj(24, 'port'), sfpp(4, 'port'), q40(2, 'port')], [80, 150], { depthMm: 400 }],
  ['FortiSwitch 1048E', [sfpp(48, 'port'), q100(6, 'port')], [200, 350], { depthMm: 450 }],
  ['FortiSwitch 3032E', [q100(32, 'port')], [300, 550], { depthMm: 520 }]
])

const palo = fw('Palo Alto Networks', '#3b3328', [
  ['PA-820', [rj(4, 'Eth1/'), sfp(8, 'Eth1/')], [60, 100], { psu: 1, depthMm: 420 }],
  ['PA-850', [rj(4, 'Eth1/'), sfp(8, 'Eth1/'), sfpp(4, 'Eth1/')], [70, 120], { depthMm: 420 }],
  ['PA-1410', [rj(8, 'Eth1/'), sfp(4, 'Eth1/'), sfpp(4, 'Eth1/')], [80, 150], { depthMm: 400 }],
  ['PA-1420', [rj(8, 'Eth1/'), sfp(4, 'Eth1/'), sfpp(4, 'Eth1/')], [90, 170], { depthMm: 400 }],
  ['PA-3220', [rj(12, 'Eth1/'), sfp(4, 'Eth1/'), sfpp(4, 'Eth1/')], [150, 250], { depthMm: 500 }],
  ['PA-3250', [rj(12, 'Eth1/'), sfp(8, 'Eth1/'), sfpp(8, 'Eth1/'), q40(2, 'Eth1/')], [200, 350], { u: 2, depthMm: 500 }],
  ['PA-3260', [rj(12, 'Eth1/'), sfp(8, 'Eth1/'), sfpp(8, 'Eth1/'), q100(4, 'Eth1/')], [250, 450], { u: 2, depthMm: 500 }],
  ['PA-3410', [rj(12, 'Eth1/'), sfp(4, 'Eth1/'), sfp28(4, 'Eth1/')], [150, 300], { depthMm: 500 }],
  ['PA-3420', [rj(12, 'Eth1/'), sfp(4, 'Eth1/'), sfp28(8, 'Eth1/')], [170, 330], { depthMm: 500 }],
  ['PA-3430', [rj(12, 'Eth1/'), sfp(4, 'Eth1/'), sfp28(8, 'Eth1/'), q40(2, 'Eth1/')], [200, 380], { depthMm: 500 }],
  ['PA-3440', [rj(12, 'Eth1/'), sfp(4, 'Eth1/'), sfp28(8, 'Eth1/'), q40(2, 'Eth1/')], [230, 420], { depthMm: 500 }],
  ['PA-5220', [rj(4, 'Eth1/'), sfpp(16, 'Eth1/'), q40(4, 'Eth1/')], [500, 900], { u: 3, depthMm: 600 }],
  ['PA-5250', [rj(4, 'Eth1/'), sfp28(16, 'Eth1/'), q100(4, 'Eth1/')], [600, 1100], { u: 3, depthMm: 600 }],
  ['PA-5410', [rj(4, 'Eth1/'), sfp28(16, 'Eth1/'), q100(4, 'Eth1/')], [400, 800], { u: 2, depthMm: 600 }],
  ['PA-5420', [rj(4, 'Eth1/'), sfp28(16, 'Eth1/'), q100(4, 'Eth1/')], [450, 900], { u: 2, depthMm: 600 }],
  ['PA-5430', [rj(4, 'Eth1/'), sfp28(16, 'Eth1/'), q100(6, 'Eth1/')], [500, 1000], { u: 2, depthMm: 600 }],
  ['PA-5440', [rj(4, 'Eth1/'), sfp28(16, 'Eth1/'), q100(6, 'Eth1/')], [550, 1100], { u: 2, depthMm: 600 }],
  ['PA-5450 (example config)', [sfp28(16, 'Eth1/'), q100(24, 'Eth2/')], [2000, 4000], { u: 5, psu: 4, psuType: 'c20', depthMm: 700 }],
  ['Panorama M-300', [rj(4, 'Eth1/'), sfpp(2, 'Eth1/')], [250, 500], { u: 1, depthMm: 600 }],
  ['Panorama M-700', [rj(4, 'Eth1/'), sfpp(2, 'Eth1/')], [400, 800], { u: 2, depthMm: 700 }]
])

const ciscoSec = fw('Cisco', '#3b4652', [
  ['ASA 5516-X', [rj(8, 'Gi1/')], [50, 80], { psu: 1, depthMm: 300 }],
  ['ASA 5525-X', [rj(8, 'Gi0/')], [110, 200], { psu: 1, depthMm: 500 }],
  ['ASA 5555-X', [rj(8, 'Gi0/')], [150, 250], { depthMm: 500 }],
  ['Firepower 1150', [rj(8, 'Eth1/'), sfp(4, 'Eth1/')], [50, 100], { psu: 1, depthMm: 400 }],
  ['Firepower 2110', [rj(12, 'Eth1/'), sfp(4, 'Eth1/')], [100, 200], { psu: 1, depthMm: 500 }],
  ['Firepower 2120', [rj(12, 'Eth1/'), sfp(4, 'Eth1/')], [110, 220], { psu: 1, depthMm: 500 }],
  ['Firepower 2130', [rj(12, 'Eth1/'), sfpp(4, 'Eth1/')], [150, 280], { depthMm: 500 }],
  ['Firepower 2140', [rj(12, 'Eth1/'), sfpp(4, 'Eth1/')], [170, 300], { depthMm: 500 }],
  ['Secure Firewall 1230', [rj(8, 'Eth1/'), sfp(4, 'Eth1/')], [50, 100], { psu: 1, depthMm: 400 }],
  ['Secure Firewall 1250', [rj(8, 'Eth1/'), sfpp(4, 'Eth1/')], [60, 120], { psu: 1, depthMm: 400 }],
  ['Secure Firewall 3105', [rj(8, 'Eth1/'), sfp28(8, 'Eth1/')], [200, 400], { depthMm: 500 }],
  ['Secure Firewall 3110', [rj(8, 'Eth1/'), sfp28(8, 'Eth1/')], [220, 420], { depthMm: 500 }],
  ['Secure Firewall 3120', [rj(8, 'Eth1/'), sfp28(8, 'Eth1/')], [250, 450], { depthMm: 500 }],
  ['Secure Firewall 3130', [rj(8, 'Eth1/'), sfp28(8, 'Eth1/'), q100(4, 'Eth2/')], [300, 550], { depthMm: 500 }],
  ['Secure Firewall 3140', [rj(8, 'Eth1/'), sfp28(8, 'Eth1/'), q100(4, 'Eth2/')], [350, 600], { depthMm: 500 }],
  ['Secure Firewall 4215', [sfp28(8, 'Eth1/'), q100(8, 'Eth2/')], [600, 1100], { u: 2, depthMm: 650 }],
  ['Secure Firewall 4225', [sfp28(8, 'Eth1/'), q100(8, 'Eth2/')], [700, 1300], { u: 2, depthMm: 650 }],
  ['Secure Firewall 4245', [sfp28(8, 'Eth1/'), q100(8, 'Eth2/')], [800, 1500], { u: 2, depthMm: 650 }],
  ['Firepower 4112', [sfpp(8, 'Eth1/')], [400, 800], { depthMm: 750 }],
  ['Firepower 4115', [sfpp(8, 'Eth1/'), q40(4, 'Eth2/')], [450, 900], { depthMm: 750 }],
  ['Firepower 4145', [sfpp(8, 'Eth1/'), q100(4, 'Eth2/')], [550, 1100], { depthMm: 750 }],
  ['Firepower 9300 (example config)', [sfpp(8, 'Eth1/'), q100(8, 'Eth2/')], [2500, 4800], { u: 3, psu: 2, psuType: 'c20', depthMm: 750 }],
  ['Secure Email Gateway C395', [rj(6, 'Data')], [200, 400], { depthMm: 700 }],
  ['Identity Services Engine SNS-3715', [rj(4, 'Gi'), sfpp(2, 'Te')], [200, 450], { depthMm: 750 }],
  ['Identity Services Engine SNS-3755', [rj(4, 'Gi'), sfpp(2, 'Te')], [300, 700], { depthMm: 750 }]
])

const sonicwall = fw('SonicWall', '#2f3640', [
  ['NSa 2700', [rj(16, 'X'), sfpp(3, 'X')], [50, 100], { psu: 1, depthMm: 400 }],
  ['NSa 3700', [rj(8, 'X'), sfp(4, 'X'), sfpp(6, 'X')], [80, 160], { depthMm: 450 }],
  ['NSa 4700', [rj(16, 'X'), sfpp(8, 'X'), sfp28(2, 'X')], [120, 230], { depthMm: 450 }],
  ['NSa 5700', [rj(16, 'X'), sfpp(8, 'X'), sfp28(4, 'X')], [150, 280], { depthMm: 450 }],
  ['NSa 6700', [rj(16, 'X'), sfpp(8, 'X'), sfp28(6, 'X'), q40(2, 'X')], [200, 350], { depthMm: 500 }],
  ['NSsp 13700', [rj(16, 'X'), sfpp(8, 'X'), sfp28(10, 'X'), q100(2, 'X')], [350, 650], { depthMm: 550 }]
])

const sophos = fw('Sophos', '#2c3646', [
  ['XGS 2300', [rj(8, 'Port'), sfp(2, 'Port'), sfpp(2, 'Port')], [40, 80], { psu: 1, depthMm: 300 }],
  ['XGS 3100', [rj(8, 'Port'), sfp(2, 'Port'), sfpp(2, 'Port')], [50, 100], { psu: 1, depthMm: 400 }],
  ['XGS 3300', [rj(8, 'Port'), sfp(2, 'Port'), sfpp(2, 'Port')], [60, 120], { psu: 1, depthMm: 400 }],
  ['XGS 4300', [rj(8, 'Port'), sfp(2, 'Port'), sfpp(2, 'Port')], [90, 170], { depthMm: 450 }],
  ['XGS 4500', [rj(8, 'Port'), sfp(2, 'Port'), sfpp(4, 'Port')], [110, 200], { depthMm: 450 }],
  ['XGS 5500', [rj(8, 'Port'), sfpp(4, 'Port'), sfp28(2, 'Port')], [200, 380], { u: 2, depthMm: 550 }],
  ['XGS 6500', [rj(8, 'Port'), sfpp(4, 'Port'), sfp28(4, 'Port')], [250, 450], { u: 2, depthMm: 550 }],
  ['XGS 7500', [rj(8, 'Port'), sfpp(8, 'Port'), q100(2, 'Port')], [300, 550], { u: 2, depthMm: 600 }]
])

const checkpoint = fw('Check Point', '#3b2d3a', [
  ['Quantum 3600', [rj(6, 'eth')], [30, 60], { psu: 1, depthMm: 300 }],
  ['Quantum 6200', [rj(10, 'eth')], [60, 120], { psu: 1, depthMm: 400 }],
  ['Quantum 6400', [rj(10, 'eth'), sfpp(4, 'eth')], [80, 150], { depthMm: 450 }],
  ['Quantum 6600', [rj(10, 'eth'), sfpp(4, 'eth')], [100, 180], { depthMm: 450 }],
  ['Quantum 6700', [rj(10, 'eth'), sfpp(4, 'eth')], [120, 220], { depthMm: 450 }],
  ['Quantum 6900', [rj(10, 'eth'), sfpp(4, 'eth')], [140, 250], { depthMm: 450 }],
  ['Quantum 7000', [rj(10, 'eth'), sfpp(8, 'eth')], [180, 300], { depthMm: 500 }],
  ['Quantum 16200', [rj(10, 'eth'), sfpp(8, 'eth'), q40(2, 'eth')], [250, 450], { u: 2, depthMm: 600 }],
  ['Quantum 26000', [rj(10, 'eth'), sfpp(16, 'eth'), q100(4, 'eth')], [400, 750], { u: 3, depthMm: 650 }],
  ['Quantum 28000', [rj(10, 'eth'), sfpp(16, 'eth'), q100(8, 'eth')], [500, 900], { u: 3, depthMm: 650 }]
])

const netgate = fw('Netgate', '#2c3a44', [
  ['8200 MAX', [rj(4, 'ix', '2.5G'), sfpp(2, 'ix'), sfp28(2, 'ice')], [40, 70], { psu: 1, depthMm: 300 }],
  ['1537 1U', [rj(2, 'igb'), sfpp(2, 'ix')], [45, 80], { psu: 1, depthMm: 400 }],
  ['1541 1U', [rj(2, 'igb'), sfpp(2, 'ix')], [55, 100], { psu: 1, depthMm: 400 }],
  ['8300 MAX', [rj(4, 'igc', '2.5G'), sfpp(4, 'ix'), sfp28(2, 'ice')], [60, 110], { psu: 2, depthMm: 400 }]
])

const misc = fw('Barracuda', '#2a3540', [
  ['CloudGen Firewall F380', [rj(8, 'p'), sfp(2, 'p')], [60, 110], { psu: 1, depthMm: 400 }],
  ['CloudGen Firewall F600', [rj(8, 'p'), sfpp(4, 'p')], [120, 200], { depthMm: 450 }],
  ['CloudGen Firewall F900', [rj(8, 'p'), sfpp(8, 'p'), q40(2, 'p')], [250, 400], { u: 2, depthMm: 550 }]
])

export const securityComponents: ComponentDef[] = [...fortinet, ...fortiswitch, ...palo, ...ciscoSec, ...sonicwall, ...sophos, ...checkpoint, ...netgate, ...misc]
