// Core data model for rack designs. Everything in a Project is plain JSON so it
// can be saved to disk as-is.

export type Face = 'front' | 'rear'

export type Category =
  | 'server'
  | 'switch'
  | 'router'
  | 'firewall'
  | 'storage'
  | 'gpu'
  | 'pdu'
  | 'ups'
  | 'feed'
  | 'patch-panel'
  | 'cable-management'
  | 'blank'
  | 'shelf'
  | 'kvm'
  | 'console-server'
  | 'wireless'
  | 'other'

/** A group of identical ports on a component, e.g. "48x RJ45 on the front". */
export interface PortGroup {
  /** Unique within the component; used to build stable port ids. */
  id: string
  type: string
  count: number
  face: Face
  /** Label prefix; port n gets `${label}${start + n}`. */
  label?: string
  /** First port number (default 1). */
  start?: number
  /** Explicit names, overriding label/start. */
  names?: string[]
  /** Number of rows to lay ports out in (auto when omitted). */
  rows?: number
  /** Free-form speed note, e.g. "10G". */
  speed?: string
}

export interface ComponentDef {
  id: string
  manufacturer: string
  model: string
  category: Category
  /** Rack units. 0 means a zero-U (side mounted) or feed component. */
  uHeight: number
  /** Full-depth devices block both the front and rear of the U space they occupy. */
  fullDepth: boolean
  depthMm?: number
  /** Physical length for zero-U components (vertical PDUs). */
  lengthMm?: number
  weightKg?: number
  power?: { typicalW: number; maxW: number }
  /** Power distribution capacity (PDUs). */
  pdu?: {
    /** Outlet voltage. For single-phase PDUs the actual voltage comes from upstream. */
    voltage: number
    /** Rated current per line. */
    maxAmps: number
    phases?: 1 | 3
    /** Line-to-line input voltage of a 3-phase PDU. */
    inputVoltage?: number
    metered?: boolean
    switched?: boolean
  }
  /** UPS capacity. */
  ups?: { capacityW: number; capacityVA: number; outputVoltage?: number }
  /** Facility power feed defaults. 3-phase feeds use the line-to-line voltage. */
  feed?: { voltage: number; amps: number; phases: 1 | 3 }
  ports: PortGroup[]
  color?: string
  description?: string
  tags?: string[]
  generic?: boolean
  /** Set for components that came from a user library pack. */
  source?: string
}

export interface RackDef {
  id: string
  manufacturer: string
  model: string
  uHeight: number
  widthMm: number
  depthMm: number
  maxLoadKg?: number
  style: '4-post-enclosed' | '4-post-open' | '2-post' | 'wall-mount'
  generic?: boolean
  /** Set for racks that came from a user library pack. */
  source?: string
}

export interface Rack {
  id: string
  name: string
  uHeight: number
  widthMm: number
  depthMm: number
  maxLoadKg?: number
  style: RackDef['style']
  manufacturer?: string
  model?: string
  notes?: string
}

export type Mount =
  /** u is the lowest rack unit occupied (1-based, numbered from the bottom). */
  | { kind: 'rack'; u: number; face: Face }
  | { kind: 'zeroU'; side: 'left' | 'right'; slot: 0 | 1 }
  | { kind: 'feed'; slot: number }

export interface DeviceOverrides {
  typicalW?: number
  maxW?: number
  voltage?: number
  amps?: number
  phases?: 1 | 3
}

export interface Device {
  id: string
  componentId: string
  rackId: string
  mount: Mount
  name: string
  assetTag?: string
  notes?: string
  overrides?: DeviceOverrides
}

export interface PortRef {
  deviceId: string
  portId: string
}

export interface Connection {
  id: string
  /** For power connections `a` is always the supplying side. */
  a: PortRef
  b: PortRef
  kind: 'data' | 'power'
  cableType?: string
  lengthM?: number
  color?: string
  label?: string
  notes?: string
}

export interface ProjectSettings {
  powerBasis: 'typical' | 'max'
  /** Continuous-load derating threshold, e.g. 0.8 for 80%. */
  derating: number
}

export interface Project {
  id: string
  name: string
  notes?: string
  racks: Rack[]
  devices: Device[]
  connections: Connection[]
  /** Snapshot of every component definition used, so files are self-contained. */
  components: Record<string, ComponentDef>
  settings: ProjectSettings
}

export type Selection =
  | { kind: 'rack'; id: string }
  | { kind: 'device'; id: string }
  | { kind: 'connection'; id: string }
  | { kind: 'port'; deviceId: string; portId: string }
