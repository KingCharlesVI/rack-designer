// Pure SVG rendering of a project's racks for one view (front or rear). Used both
// interactively and for SVG/PNG export, so it only uses inline presentation attributes.
import { memo, type MouseEvent as ReactMouseEvent } from 'react'
import { PORT_COLOR_CLASSES, portColor, portColorClass, portType, getPorts } from '../model/ports'
import { getComponent, portKey } from '../model/project'
import type { ComponentDef, Connection, Device, Face, Mount, PortRef, Project, Selection } from '../model/types'
import { appearance, deviceRect, layoutPorts, portPoint, U_PX, type ProjectLayout, type RackLayout, type Rect } from './geometry'

export const FONT = "'Segoe UI', 'Inter', system-ui, sans-serif"

const CATEGORY_COLORS: Partial<Record<ComponentDef['category'], string>> = {
  server: '#2b2f36',
  gpu: '#25292b',
  storage: '#2a2e35',
  switch: '#2f3a46',
  router: '#33404a',
  firewall: '#3d2c2c',
  pdu: '#1a1a1a',
  ups: '#202020',
  feed: '#3b2f12',
  'patch-panel': '#242424',
  'cable-management': '#151515',
  blank: '#0e0e0e',
  shelf: '#2d2d2d',
  kvm: '#262a30',
  'console-server': '#2a2f36',
  wireless: '#2f3a40'
}

export interface Interaction {
  selection: Selection | null
  pending: PortRef | null
  hoverConnection?: string | null
  onDeviceDown?: (e: ReactMouseEvent, d: Device) => void
  onPortDown?: (e: ReactMouseEvent, ref: PortRef) => void
  onConnectionDown?: (e: ReactMouseEvent, c: Connection) => void
  onRackDown?: (e: ReactMouseEvent, rackId: string) => void
  /** Devices currently being dragged are drawn faded. */
  draggingId?: string | null
}

export interface Preview {
  rect: Rect
  ok: boolean
  label: string
}

interface Props {
  project: Project
  layout: ProjectLayout
  face: Face
  showCables: boolean
  interaction?: Interaction
  preview?: Preview | null
}

export const Drawing = memo(function Drawing({ project, layout, face, showCables, interaction, preview }: Props) {
  const connected = new Map<string, Connection>()
  for (const c of project.connections) {
    connected.set(portKey(c.a), c)
    connected.set(portKey(c.b), c)
  }
  const sel = interaction?.selection
  const selectedConn = sel?.kind === 'connection' ? sel.id : null
  return (
    <g fontFamily={FONT}>
      {layout.racks.map((rl) => (
        <RackFrame key={rl.rack.id} rl={rl} face={face} selected={sel?.kind === 'rack' && sel.id === rl.rack.id} interaction={interaction} />
      ))}
      {project.devices.map((d) => (
        <DeviceView
          key={d.id}
          project={project}
          layout={layout}
          device={d}
          face={face}
          connected={connected}
          selectedConn={selectedConn}
          interaction={interaction}
        />
      ))}
      {showCables && <Cables project={project} layout={layout} face={face} interaction={interaction} />}
      {preview && (
        <g pointerEvents="none">
          <rect {...rectProps(preview.rect)} fill={preview.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'} stroke={preview.ok ? '#22c55e' : '#ef4444'} strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={preview.rect.x + preview.rect.w + 6} y={preview.rect.y + 12} fontSize={10} fill={preview.ok ? '#86efac' : '#fca5a5'}>
            {preview.label}
          </text>
        </g>
      )}
    </g>
  )
})

const rectProps = (r: Rect) => ({ x: r.x, y: r.y, width: Math.max(0, r.w), height: Math.max(0, r.h) })

function RackFrame({ rl, face, selected, interaction }: { rl: RackLayout; face: Face; selected: boolean; interaction?: Interaction }) {
  const { rack, frame, interior } = rl
  const units = []
  for (let u = 1; u <= rack.uHeight; u++) {
    const y = interior.y + (rack.uHeight - u) * U_PX
    units.push(
      <g key={u}>
        <line x1={interior.x} x2={interior.x + interior.w} y1={y} y2={y} stroke="#20242b" strokeWidth={0.5} />
        <text x={rl.gutterX + 20} y={y + U_PX / 2 + 3.5} fontSize={9} fill="#6b7280" textAnchor="end">
          {u}
        </text>
      </g>
    )
  }
  const railW = 7
  return (
    <g onMouseDown={interaction?.onRackDown ? (e) => interaction.onRackDown!(e, rack.id) : undefined}>
      <rect {...rectProps(frame)} rx={4} fill="#1d2026" stroke={selected ? '#4ea1ff' : '#3a3f48'} strokeWidth={selected ? 2 : 1.5} />
      <rect {...rectProps(interior)} fill="#0c0e11" />
      {units}
      <rect x={interior.x - railW} y={interior.y} width={railW} height={interior.h} fill="#4b515b" />
      <rect x={interior.x + interior.w} y={interior.y} width={railW} height={interior.h} fill="#4b515b" />
      <text x={frame.x + frame.w / 2} y={frame.y + 17} fontSize={12} fontWeight={600} fill="#e5e7eb" textAnchor="middle">
        {rack.name}
        <tspan fill="#9ca3af" fontWeight={400} fontSize={10}>
          {`  ${rack.uHeight}U · ${face === 'front' ? 'Front' : 'Rear'}`}
        </tspan>
      </text>
      {interaction && (
        <text x={frame.x} y={rl.feedY - 4} fontSize={8.5} fill="#6b7280">
          Power feeds
        </text>
      )}
    </g>
  )
}

interface DeviceViewProps {
  project: Project
  layout: ProjectLayout
  device: Device
  face: Face
  connected: Map<string, Connection>
  selectedConn: string | null
  interaction?: Interaction
}

function DeviceView({ project, layout, device, face, connected, selectedConn, interaction }: DeviceViewProps) {
  const comp = getComponent(project, device)
  const look = appearance(comp, device.mount, face)
  if (look.kind === 'hidden') return null
  const r = deviceRect(project, layout, device)
  if (!r) return null
  const sel = interaction?.selection
  const selected = sel?.kind === 'device' && sel.id === device.id
  const down = interaction?.onDeviceDown ? (e: ReactMouseEvent) => interaction.onDeviceDown!(e, device) : undefined
  const faded = interaction?.draggingId === device.id

  if (look.kind === 'ghost') {
    return (
      <g onMouseDown={down} opacity={faded ? 0.3 : 1} style={down ? { cursor: 'pointer' } : undefined}>
        <rect {...rectProps(r)} fill="url(#hatch)" stroke={selected ? '#4ea1ff' : '#3a3f48'} strokeDasharray="3 2" strokeWidth={selected ? 1.5 : 1} />
        <text x={r.x + 8} y={r.y + Math.min(r.h, U_PX) / 2 + 3} fontSize={8} fill="#6b7280">
          {device.name} · mounted on {face === 'front' ? 'rear' : 'front'}
        </text>
      </g>
    )
  }

  const color = comp.color ?? CATEGORY_COLORS[comp.category] ?? '#2b2f36'
  const ports = layoutPorts(comp, look.panelFace, r.w, r.h, look.vertical)
  const light = isLight(color)
  const ink = light ? '#1f2937' : '#e5e7eb'
  const subInk = light ? '#4b5563' : '#9ca3af'
  const isFeed = device.mount.kind === 'feed'
  const pendingKey = interaction?.pending ? portKey(interaction.pending) : null
  const selectedPortKey = sel?.kind === 'port' ? `${sel.deviceId}:${sel.portId}` : null

  return (
    <g opacity={faded ? 0.3 : 1}>
      <g onMouseDown={down} style={down ? { cursor: 'grab' } : undefined}>
        <rect {...rectProps(r)} rx={isFeed ? 3 : 1.5} fill={color} stroke={selected ? '#4ea1ff' : light ? '#9ca3af' : '#000'} strokeWidth={selected ? 2 : 0.8} />
        {device.mount.kind === 'rack' && (
          <>
            <rect x={r.x} y={r.y + 0.5} width={4} height={r.h - 1} fill={light ? '#c7cacd' : '#3d434c'} />
            <rect x={r.x + r.w - 4} y={r.y + 0.5} width={4} height={r.h - 1} fill={light ? '#c7cacd' : '#3d434c'} />
          </>
        )}
        <DeviceLabel device={device} comp={comp} r={r} vertical={look.vertical} rear={look.panelFace === 'rear'} ink={ink} subInk={subInk} hasPorts={ports.length > 0} />
      </g>
      {ports.map((b) => {
        const ref = { deviceId: device.id, portId: b.port.id }
        const key = portKey(ref)
        const conn = connected.get(key)
        const t = portType(b.port.type)
        const isPending = pendingKey === key
        const highlighted = isPending || selectedPortKey === key || (conn && conn.id === selectedConn)
        // Colour code: tinted fill + bright outline by port class; connected ports fill with the cable colour.
        const code = portColor(b.port)
        const fill = conn ? conn.color ?? '#3b82f6' : tint(code)
        const stroke = highlighted ? '#fde047' : code
        return (
          <rect
            key={b.port.id}
            x={r.x + b.x}
            y={r.y + b.y}
            width={b.w}
            height={b.h}
            rx={t.kind === 'power' ? 1.2 : 0.6}
            fill={fill}
            stroke={stroke}
            strokeWidth={highlighted ? 1.4 : 0.7}
            onMouseDown={interaction?.onPortDown ? (e) => interaction.onPortDown!(e, ref) : undefined}
            style={interaction?.onPortDown ? { cursor: 'crosshair' } : undefined}
          >
            <title>{`${device.name} · ${b.port.label}\n${t.name}${b.port.speed ? ` · ${b.port.speed}` : ''}${conn ? '\nConnected' : ''}`}</title>
          </rect>
        )
      })}
    </g>
  )
}

function DeviceLabel(props: { device: Device; comp: ComponentDef; r: Rect; vertical: boolean; rear: boolean; ink: string; subInk: string; hasPorts: boolean }) {
  const { device, comp, r, vertical, rear, ink, subInk, hasPorts } = props
  if (vertical) {
    const cx = r.x + r.w / 2
    return (
      <text x={cx} y={r.y + 4} fontSize={7.5} fill={ink} transform={`rotate(90 ${cx} ${r.y + 4})`} dominantBaseline="middle">
        {truncate(device.name, Math.floor(Math.min(64, Math.max(26, r.h * 0.08)) / 4.2))}
      </text>
    )
  }
  if (device.mount.kind === 'feed') {
    return (
      <>
        <text x={r.x + 4} y={r.y + 10} fontSize={8} fontWeight={600} fill="#fde68a">
          ⚡ {truncate(device.name, 12)}
        </text>
        <text x={r.x + 4} y={r.y + 20} fontSize={7} fill="#d6c7a0">
          {truncate(comp.model.replace(/\s*\(.*\)/, ''), 14)}
        </text>
      </>
    )
  }
  const oneU = r.h <= U_PX + 0.5
  const maxChars = hasPorts ? Math.floor((Math.min(64, r.w * 0.24) - 8) / 4.4) : 60
  const subtitle = `${comp.manufacturer === 'Generic' ? '' : `${comp.manufacturer} `}${comp.model}${rear ? ' (rear)' : ''}`
  const blank = comp.category === 'blank' || comp.category === 'cable-management'
  return (
    <>
      <text x={r.x + 7} y={r.y + (oneU ? 9 : 13)} fontSize={oneU ? 8 : 9.5} fontWeight={600} fill={blank ? '#4b5563' : ink}>
        {truncate(device.name, maxChars)}
      </text>
      {!blank && (
        <text x={r.x + 7} y={r.y + (oneU ? 18 : 25)} fontSize={oneU ? 6.5 : 7.5} fill={subInk}>
          {truncate(subtitle, oneU ? Math.floor(maxChars * 1.25) : Math.floor(maxChars * 1.1))}
        </text>
      )}
    </>
  )
}

function Cables({ project, layout, face, interaction }: { project: Project; layout: ProjectLayout; face: Face; interaction?: Interaction }) {
  const sel = interaction?.selection
  const items = []
  for (const c of project.connections) {
    const a = portPoint(project, layout, c.a, face)
    const b = portPoint(project, layout, c.b, face)
    if (!a || !b) continue
    const d = cablePath(project, layout, c, a, b)
    const selected = sel?.kind === 'connection' && sel.id === c.id
    const related = sel?.kind === 'device' && (c.a.deviceId === sel.id || c.b.deviceId === sel.id)
    const dim = sel && (sel.kind === 'device' || sel.kind === 'connection') && !selected && !related
    items.push(
      <g key={c.id}>
        <path d={d} fill="none" stroke={c.color ?? '#3b82f6'} strokeWidth={selected ? 3 : 1.8} strokeOpacity={dim ? 0.25 : 0.9} strokeLinecap="round" pointerEvents="none" />
        {selected && <path d={d} fill="none" stroke="#fde047" strokeWidth={1} strokeDasharray="4 3" pointerEvents="none" />}
        {interaction?.onConnectionDown && (
          <path d={d} fill="none" stroke="transparent" strokeWidth={8} onMouseDown={(e) => interaction.onConnectionDown!(e, c)} style={{ cursor: 'pointer' }} />
        )}
      </g>
    )
  }
  return <g>{items}</g>
}

function cablePath(p: Project, layout: ProjectLayout, c: Connection, a: { x: number; y: number }, b: { x: number; y: number }): string {
  const da = p.devices.find((d) => d.id === c.a.deviceId)
  const db = p.devices.find((d) => d.id === c.b.deviceId)
  const ra = da && layout.byRack.get(da.rackId)
  const rb = db && layout.byRack.get(db.rackId)
  if (ra && rb && ra !== rb) {
    const top = Math.min(ra.frame.y, rb.frame.y) - 14
    return `M ${a.x} ${a.y} C ${a.x} ${top}, ${b.x} ${top}, ${b.x} ${b.y}`
  }
  if (ra) {
    const mid = ra.interior.x + ra.interior.w / 2
    const right = (a.x + b.x) / 2 > mid
    const edge = right ? ra.interior.x + ra.interior.w + 10 : ra.interior.x - 10
    const bulge = Math.min(40, 8 + Math.abs(a.y - b.y) * 0.08)
    const cx = right ? Math.max(edge, a.x, b.x) + bulge : Math.min(edge, a.x, b.x) - bulge
    return `M ${a.x} ${a.y} C ${cx} ${a.y}, ${cx} ${b.y}, ${b.x} ${b.y}`
  }
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
}

export function SvgDefs() {
  return (
    <defs>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#111318" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#2a2f37" strokeWidth="2" />
      </pattern>
    </defs>
  )
}

function truncate(s: string, n: number): string {
  if (n < 4) return ''
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return false
  const n = parseInt(m[1], 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6
}

export function describeMount(m: Mount): string {
  if (m.kind === 'rack') return `U${m.u} ${m.face}`
  if (m.kind === 'zeroU') return `${m.side} side`
  return `feed slot ${m.slot + 1}`
}

/** Dark fill tinted towards a port's colour code, so unconnected ports still show their class. */
const tintCache = new Map<string, string>()
export function tint(hex: string): string {
  let out = tintCache.get(hex)
  if (!out) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex)
    const n = m ? parseInt(m[1], 16) : 0x59606b
    const mix = (c: number, base: number) => Math.round(base + (c - base) * 0.32)
    const r = mix((n >> 16) & 255, 11)
    const g = mix((n >> 8) & 255, 13)
    const b = mix(n & 255, 16)
    out = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
    tintCache.set(hex, out)
  }
  return out
}

export interface LegendEntry {
  color: string
  label: string
}

/** Colour codes actually used by the ports in a design (class colours plus custom group colours). */
export function legendEntries(project: Project): LegendEntry[] {
  const classes = new Set<string>()
  const custom = new Map<string, string>()
  const seen = new Set<string>()
  for (const d of project.devices) {
    const comp = getComponent(project, d)
    if (seen.has(comp.id)) continue
    seen.add(comp.id)
    for (const p of getPorts(comp)) {
      if (p.color) {
        const g = comp.ports.find((x) => x.id === p.groupId)
        if (!custom.has(p.color.toLowerCase())) custom.set(p.color.toLowerCase(), `${(g?.label || portType(p.type).name).replace(/[\s/:.-]+$/, '')} (custom)`)
      } else classes.add(portColorClass(p.type).id)
    }
  }
  const out: LegendEntry[] = PORT_COLOR_CLASSES.filter((c) => classes.has(c.id)).map((c) => ({ color: c.color, label: c.label }))
  for (const [color, label] of custom) out.push({ color, label })
  return out
}

/** Port colour legend for exported drawings. Returns its height so the caller can reserve space. */
export function SvgLegend({ entries, x, y, width }: { entries: LegendEntry[]; x: number; y: number; width: number }) {
  const colW = 190
  const perRow = Math.max(1, Math.floor(width / colW))
  return (
    <g transform={`translate(${x} ${y})`} fontFamily={FONT}>
      <text x={0} y={0} fontSize={11} fontWeight={700} fill="#9ca3af" letterSpacing={1.5}>
        PORT COLOURS
      </text>
      {entries.map((e, i) => (
        <g key={e.label + e.color} transform={`translate(${(i % perRow) * colW} ${14 + Math.floor(i / perRow) * 18})`}>
          <rect width={14} height={10} rx={1.5} fill={tint(e.color)} stroke={e.color} strokeWidth={1.2} />
          <text x={20} y={9} fontSize={11} fill="#d1d5db">
            {e.label}
          </text>
        </g>
      ))}
    </g>
  )
}

export function legendHeight(count: number, width: number): number {
  if (!count) return 0
  return 20 + Math.ceil(count / Math.max(1, Math.floor(width / 190))) * 18
}
