// Structured cabling, cable management, KVM, console servers and other rack infrastructure.
import type { ComponentDef } from '../model/types'
import { item, type P } from './builders'

const panel = (mfr: string, model: string, u: number, n: number, type: string, opts: { rear?: P[]; rows?: number; color?: string; description?: string } = {}) =>
  item(mfr, model, 'patch-panel', u, {
    front: [[n, type, '', undefined, opts.rows]],
    rear: opts.rear ?? [[n, type, '', undefined, opts.rows]],
    depthMm: 120,
    color: opts.color ?? '#242424',
    description: opts.description
  })

const patch: ComponentDef[] = [
  panel('Panduit', 'CP24BLY 24-port modular (Mini-Com)', 1, 24, 'keystone'),
  panel('Panduit', 'CP48BLY 48-port modular (Mini-Com)', 2, 48, 'keystone'),
  panel('Panduit', 'CPP48HDEWBL 48-port angled (1U)', 1, 48, 'keystone'),
  panel('Panduit', 'DP246X88TGY Cat6 24-port', 1, 24, 'rj45'),
  panel('Panduit', 'DP486X88TGY Cat6 48-port', 2, 48, 'rj45'),
  panel('Panduit', 'DP24106X88TGY Cat6A 24-port', 1, 24, 'rj45'),
  panel('Panduit', 'FLEX-1U fibre enclosure (48x LC)', 1, 48, 'lc'),
  panel('Panduit', 'FLEX-2U fibre enclosure (96x LC)', 2, 96, 'lc'),
  panel('Panduit', 'HD Flex 1U (72x LC)', 1, 72, 'lc', { rear: [[6, 'mpo', 'MPO']] }),
  panel('Leviton', '69586-U24 Cat6 24-port', 1, 24, 'rj45'),
  panel('Leviton', '69586-U48 Cat6 48-port', 2, 48, 'rj45'),
  panel('Leviton', '6A586-U24 Cat6A 24-port', 1, 24, 'rj45'),
  panel('Leviton', '49255-H24 QuickPort 24-port', 1, 24, 'keystone'),
  panel('Leviton', '49255-H48 QuickPort 48-port', 2, 48, 'keystone'),
  panel('Leviton', 'Opt-X 1RU SDX (48x LC)', 1, 48, 'lc'),
  panel('Leviton', 'Opt-X 2RU SDX (96x LC)', 2, 96, 'lc'),
  panel('CommScope', 'SYSTIMAX 1100GS3 24-port', 1, 24, 'rj45'),
  panel('CommScope', 'SYSTIMAX 1100GS3 48-port', 2, 48, 'rj45'),
  panel('CommScope', 'SYSTIMAX 360 1U HD (72x LC)', 1, 72, 'lc'),
  panel('CommScope', 'Propel 1U (72x LC)', 1, 72, 'lc', { rear: [[6, 'mpo', 'MPO']] }),
  panel('CommScope', 'Propel 2U (144x LC)', 2, 144, 'lc', { rear: [[12, 'mpo', 'MPO']] }),
  panel('Corning', 'CCH-01U closet connector housing (48x LC)', 1, 48, 'lc'),
  panel('Corning', 'CCH-02U closet connector housing (96x LC)', 2, 96, 'lc'),
  panel('Corning', 'CCH-04U closet connector housing (144x LC)', 4, 144, 'lc'),
  panel('Corning', 'EDGE 1U housing (72x LC)', 1, 72, 'lc', { rear: [[6, 'mpo', 'MPO']] }),
  panel('Corning', 'EDGE8 1U housing (96x LC)', 1, 96, 'lc', { rear: [[12, 'mpo', 'MPO']] }),
  panel('Corning', 'EDGE 4U housing (288x LC)', 4, 288, 'lc', { rear: [[24, 'mpo', 'MPO']] }),
  panel('FS.com', 'FHD 1U enclosure (96x LC)', 1, 96, 'lc', { rear: [[8, 'mpo', 'MPO']] }),
  panel('FS.com', 'FHD 4U enclosure (288x LC)', 4, 288, 'lc', { rear: [[24, 'mpo', 'MPO']] }),
  panel('FS.com', 'Cat6A 24-port shielded', 1, 24, 'rj45'),
  panel('FS.com', 'Cat6 48-port 1U high density', 1, 48, 'rj45'),
  panel('Belden', 'KeyConnect 24-port', 1, 24, 'keystone'),
  panel('Belden', 'KeyConnect 48-port', 2, 48, 'keystone'),
  panel('Tripp Lite', 'N252-024 Cat6 24-port', 1, 24, 'rj45'),
  panel('Tripp Lite', 'N252-048 Cat6 48-port', 2, 48, 'rj45'),
  panel('Ubiquiti', 'UACC-Rack-Panel-Patch-Blank-24', 1, 24, 'keystone', { color: '#cfd1d3' }),
  panel('Ubiquiti', 'UACC-Rack-Panel-Patch-24 (Cat6)', 1, 24, 'rj45', { color: '#cfd1d3' }),
  panel('Ubiquiti', 'UniFi Patch Panel Pro 24-port', 1, 24, 'rj45', { color: '#cfd1d3' }),
  panel('StarTech', 'C6PATCH24BK Cat6 24-port', 1, 24, 'rj45'),
  panel('StarTech', 'C6PATCH48BK Cat6 48-port', 2, 48, 'rj45')
]

const cm = (mfr: string, model: string, u: number, description?: string) => item(mfr, model, 'cable-management', u, { depthMm: 100, color: '#141414', description })

const cableMgmt: ComponentDef[] = [
  cm('Panduit', 'NCMHAB1 NetManager horizontal 1U', 1),
  cm('Panduit', 'NCMHAB2 NetManager horizontal 2U', 2),
  cm('Panduit', 'NCMHEF1 NetManager front-only 1U', 1),
  cm('Panduit', 'CMPHH1 PatchLink horizontal 1U', 1),
  cm('Panduit', 'CMPHH2 PatchLink horizontal 2U', 2),
  cm('Panduit', 'CMBP1 brush panel 1U', 1),
  cm('APC', 'AR8602A horizontal cable organizer 1U', 1),
  cm('APC', 'AR8606 horizontal cable manager 2U', 2),
  cm('APC', 'AR8429 brush strip 1U', 1),
  cm('Tripp Lite', 'SRCABLEDUCT1U', 1),
  cm('Tripp Lite', 'SRCABLEDUCT2U', 2),
  cm('Tripp Lite', 'SRBRUSH1U', 1),
  cm('Leviton', '49253-HCM horizontal cable manager 1U', 1),
  cm('Leviton', '49253-HCM2 horizontal cable manager 2U', 2),
  cm('Chatsworth', 'MCC horizontal manager 1U', 1),
  cm('Chatsworth', 'MCC horizontal manager 2U', 2),
  cm('Ubiquiti', 'UACC-Rack-Panel-Brush-1U', 1),
  cm('StarTech', 'CMHOOK1UN 1U horizontal', 1),
  item('APC', 'AR8136BLK blanking panel 1U (toolless, 10 pk)', 'blank', 1, { color: '#0e0e0e' }),
  item('APC', 'AR8108BLK blanking panel 1U', 'blank', 1, { color: '#0e0e0e' }),
  item('APC', 'AR8101BLK blanking panel 2U', 'blank', 2, { color: '#0e0e0e' }),
  item('APC', 'AR8126ABLK shelf 1U fixed', 'shelf', 1, { fullDepth: true, color: '#2d2d2d' }),
  item('APC', 'AR8123BLK sliding shelf 1U', 'shelf', 1, { fullDepth: true, color: '#2d2d2d' }),
  item('Tripp Lite', 'SRSHELF2P1U cantilever shelf 1U', 'shelf', 1, { color: '#2d2d2d' }),
  item('Tripp Lite', 'SRSHELF4PSL sliding shelf 1U', 'shelf', 1, { fullDepth: true, color: '#2d2d2d' }),
  item('Tripp Lite', 'SRSHELF4P 4-post fixed shelf 1U', 'shelf', 1, { fullDepth: true, color: '#2d2d2d' }),
  item('StarTech', 'CABSHELF 1U vented shelf', 'shelf', 1, { color: '#2d2d2d' }),
  item('StarTech', 'CABSHELF2U 2U cantilever shelf', 'shelf', 2, { color: '#2d2d2d' }),
  item('Ubiquiti', 'UACC-Rack-Shelf', 'shelf', 1, { color: '#cfd1d3' })
]

const kvm: ComponentDef[] = [
  item('Vertiv Avocent', 'AutoView AV2108 (8-port)', 'kvm', 1, { w: [10, 20], rear: [[8, 'rj45', 'ARI'], [1, 'vga', 'Console VGA'], [2, 'usb-a', 'Console USB'], [1, 'c14', 'PSU']] }),
  item('Vertiv Avocent', 'AutoView AV2216 (16-port)', 'kvm', 1, { w: [12, 25], rear: [[16, 'rj45', 'ARI'], [1, 'vga', 'Console VGA'], [2, 'usb-a', 'Console USB'], [1, 'c14', 'PSU']] }),
  item('Vertiv Avocent', 'MergePoint Unity MPU2032DAC (IP KVM)', 'kvm', 1, { w: [30, 60], rear: [[32, 'rj45', 'ARI'], [2, 'rj45', 'LAN'], [2, 'c14', 'PSU']] }),
  item('Vertiv Avocent', 'ACS 8008 console server', 'console-server', 1, { w: [12, 25], front: [[8, 'console-rj45', 'Port']], rear: [[2, 'rj45', 'Eth', '1G'], [2, 'c14', 'PSU']] }),
  item('Vertiv Avocent', 'ACS 8016 console server', 'console-server', 1, { w: [14, 28], front: [[16, 'console-rj45', 'Port']], rear: [[2, 'rj45', 'Eth', '1G'], [2, 'c14', 'PSU']] }),
  item('Vertiv Avocent', 'ACS 8048 console server', 'console-server', 1, { w: [18, 35], front: [[48, 'console-rj45', 'Port']], rear: [[2, 'rj45', 'Eth', '1G'], [2, 'c14', 'PSU']] }),
  item('Raritan', 'Dominion KX IV-101', 'kvm', 1, { w: [15, 25], rear: [[1, 'hdmi', 'Target'], [1, 'usb-a', 'Target USB'], [2, 'rj45', 'LAN', '1G'], [1, 'c14', 'PSU']] }),
  item('Raritan', 'Dominion KX III DKX3-108', 'kvm', 1, { w: [25, 45], rear: [[8, 'rj45', 'Target'], [2, 'rj45', 'LAN', '1G'], [2, 'c14', 'PSU']] }),
  item('Raritan', 'Dominion KX III DKX3-116', 'kvm', 1, { w: [28, 50], rear: [[16, 'rj45', 'Target'], [2, 'rj45', 'LAN', '1G'], [2, 'c14', 'PSU']] }),
  item('Raritan', 'Dominion KX III DKX3-132', 'kvm', 1, { w: [30, 55], rear: [[32, 'rj45', 'Target'], [2, 'rj45', 'LAN', '1G'], [2, 'c14', 'PSU']] }),
  item('Raritan', 'Dominion SX II DSX2-48', 'console-server', 1, { w: [20, 40], front: [[48, 'console-rj45', 'Port']], rear: [[2, 'rj45', 'LAN', '1G'], [2, 'c14', 'PSU']] }),
  item('Raritan', 'Dominion SX II DSX2-16', 'console-server', 1, { w: [15, 30], front: [[16, 'console-rj45', 'Port']], rear: [[2, 'rj45', 'LAN', '1G'], [2, 'c14', 'PSU']] }),
  item('ATEN', 'CS1708A (8-port VGA KVM)', 'kvm', 1, { w: [5, 10], rear: [[8, 'vga', 'PC'], [1, 'vga', 'Console'], [2, 'usb-a', 'Console USB'], [1, 'c14', 'PSU']] }),
  item('ATEN', 'CS1716A (16-port VGA KVM)', 'kvm', 1, { w: [6, 12], rear: [[16, 'vga', 'PC'], [1, 'vga', 'Console'], [2, 'usb-a', 'Console USB'], [1, 'c14', 'PSU']] }),
  item('ATEN', 'KN2132VA (32-port IP KVM)', 'kvm', 1, { w: [25, 45], rear: [[32, 'rj45', 'KVM'], [2, 'rj45', 'LAN', '1G'], [2, 'c14', 'PSU']] }),
  item('ATEN', 'CL5708IM LCD KVM console (8-port)', 'kvm', 1, { fullDepth: true, w: [30, 50], rear: [[8, 'rj45', 'KVM'], [1, 'rj45', 'LAN'], [1, 'c14', 'PSU']] }),
  item('ATEN', 'CL3000 LCD console drawer', 'kvm', 1, { fullDepth: true, w: [25, 40], rear: [[1, 'vga', 'VGA'], [1, 'usb-a', 'USB'], [1, 'c14', 'PSU']] }),
  item('Dell', 'DKMMLED185 18.5" LED KMM console', 'kvm', 1, { fullDepth: true, w: [25, 40], rear: [[1, 'vga', 'VGA'], [1, 'usb-a', 'USB'], [1, 'c14', 'PSU']] }),
  item('Dell', 'DAV2216 16-port analog KVM', 'kvm', 1, { w: [12, 25], rear: [[16, 'rj45', 'ARI'], [1, 'vga', 'Console'], [2, 'usb-a', 'Console USB'], [1, 'c14', 'PSU']] }),
  item('HPE', 'TFT7600 G2 rackmount console', 'kvm', 1, { fullDepth: true, w: [25, 40], rear: [[1, 'vga', 'VGA'], [1, 'usb-a', 'USB'], [1, 'c14', 'PSU']] }),
  item('Tripp Lite', 'B020-U16-19-IP LCD KVM (16-port)', 'kvm', 1, { fullDepth: true, w: [30, 50], rear: [[16, 'rj45', 'KVM'], [1, 'rj45', 'LAN'], [1, 'c14', 'PSU']] }),
  item('Opengear', 'CM8116 console manager', 'console-server', 1, { w: [15, 30], front: [[16, 'console-rj45', 'Serial']], rear: [[2, 'rj45', 'Net', '1G'], [2, 'c14', 'PSU']] }),
  item('Opengear', 'CM8148 console manager', 'console-server', 1, { w: [20, 40], front: [[48, 'console-rj45', 'Serial']], rear: [[2, 'rj45', 'Net', '1G'], [2, 'c14', 'PSU']] }),
  item('Opengear', 'OM1208-8E operations manager', 'console-server', 1, { w: [18, 35], front: [[8, 'console-rj45', 'Serial'], [8, 'rj45', 'Switch', '1G']], rear: [[2, 'sfp', 'Net'], [2, 'c14', 'PSU']] }),
  item('Opengear', 'OM2248-L operations manager (LTE)', 'console-server', 1, { w: [25, 50], front: [[48, 'console-rj45', 'Serial']], rear: [[2, 'sfp', 'Net'], [2, 'rj45', 'Net', '1G'], [2, 'c14', 'PSU']] }),
  item('Opengear', 'IM7248-2-DAC infrastructure manager', 'console-server', 1, { w: [25, 50], front: [[48, 'console-rj45', 'Serial']], rear: [[2, 'rj45', 'Net', '1G'], [2, 'c14', 'PSU']] }),
  item('Lantronix', 'SLC 8000 (48-port)', 'console-server', 1, { w: [20, 40], front: [[48, 'console-rj45', 'Port']], rear: [[2, 'rj45', 'Eth', '1G'], [2, 'c14', 'PSU']] }),
  item('Lantronix', 'SLC 8000 (16-port)', 'console-server', 1, { w: [15, 30], front: [[16, 'console-rj45', 'Port']], rear: [[2, 'rj45', 'Eth', '1G'], [2, 'c14', 'PSU']] }),
  item('Digi', 'Connect IT 48', 'console-server', 1, { w: [20, 40], front: [[48, 'console-rj45', 'Port']], rear: [[2, 'sfp', 'Net'], [2, 'rj45', 'Net', '1G'], [2, 'c14', 'PSU']] }),
  item('Digi', 'Connect IT 16', 'console-server', 1, { w: [15, 30], front: [[16, 'console-rj45', 'Port']], rear: [[2, 'rj45', 'Net', '1G'], [1, 'c14', 'PSU']] }),
  item('Perle', 'IOLAN SCG48 console server', 'console-server', 1, { w: [20, 40], front: [[48, 'console-rj45', 'Port']], rear: [[2, 'sfp', 'Net'], [2, 'c14', 'PSU']] })
]

const misc: ComponentDef[] = [
  item('APC', 'NetBotz Rack Monitor 250 (NBRK0250)', 'other', 1, { w: [10, 20], front: [[6, 'rj45', 'Sensor'], [1, 'usb-a', 'USB']], rear: [[1, 'rj45', 'LAN'], [1, 'c14', 'PSU']] }),
  item('APC', 'NetBotz Rack Monitor 750 (NBRK0750)', 'other', 1, { w: [15, 30], front: [[6, 'rj45', 'Sensor'], [5, 'rj45', 'A-Link']], rear: [[1, 'rj45', 'LAN'], [1, 'c14', 'PSU']] }),
  item('Vertiv', 'Geist Watchdog 100 environmental monitor', 'other', 1, { w: [3, 5], front: [[2, 'rj45', 'Sensor']], rear: [[1, 'rj45', 'LAN'], [1, 'c14', 'PSU']] }),
  item('AKCP', 'sensorProbe8 (1U)', 'other', 1, { w: [3, 5], front: [[8, 'rj45', 'Sensor']], rear: [[1, 'rj45', 'LAN'], [1, 'c14', 'PSU']] }),
  item('Meinberg', 'LANTIME M300 time server', 'other', 1, { w: [20, 40], front: [[1, 'coax', 'Antenna'], [4, 'rj45', 'LAN', '1G']], rear: [[2, 'c14', 'PSU']], fullDepth: true }),
  item('Microchip', 'SyncServer S650 time server', 'other', 1, { w: [30, 50], front: [[1, 'coax', 'GNSS'], [6, 'rj45', 'LAN', '1G'], [2, 'sfp', 'SFP']], rear: [[2, 'c14', 'PSU']], fullDepth: true }),
  item('Tripp Lite', 'SRXFAN1U rack fan', 'other', 1, { w: [20, 40], rear: [[1, 'nema-5-15p', 'Plug']] }),
  item('APC', 'ACF002 rack air distribution unit (2U)', 'other', 2, { w: [60, 150], fullDepth: true, rear: [[1, 'c14', 'PSU']] }),
  item('Avigilon', 'NVR5 Standard (2U)', 'storage', 2, { w: [150, 400], fullDepth: true, rear: [[4, 'rj45', 'LAN', '1G'], [2, 'c14', 'PSU']] }),
  item('Milestone', 'Husky IVO 1800R (2U)', 'storage', 2, { w: [150, 450], fullDepth: true, rear: [[2, 'rj45', 'LAN', '1G'], [2, 'sfp+', 'SFP', '10G'], [2, 'c14', 'PSU']] }),
  item('Crestron', 'CP4N control processor (rack shelf)', 'other', 1, { w: [10, 20], rear: [[2, 'rj45', 'LAN'], [1, 'c14', 'PSU']] }),
  item('Extron', 'DTP CrossPoint 84 matrix (3U)', 'other', 3, { w: [60, 120], fullDepth: true, rear: [[8, 'hdmi', 'In'], [4, 'hdmi', 'Out'], [1, 'rj45', 'LAN'], [1, 'c14', 'PSU']] }),
  item('Shure', 'ULXD4Q quad receiver (1U)', 'other', 1, { w: [20, 40], rear: [[4, 'coax', 'Ant'], [2, 'rj45', 'Dante'], [1, 'c14', 'PSU']] }),
  item('Sangoma', 'PBXact 1U appliance', 'server', 1, { w: [40, 90], rear: [[2, 'rj45', 'LAN', '1G'], [1, 'c14', 'PSU']] })
]

export const infrastructureComponents: ComponentDef[] = [...patch, ...cableMgmt, ...kvm, ...misc]
