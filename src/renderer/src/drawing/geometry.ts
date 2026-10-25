import { portType, type PortDef, getPorts } from '../model/ports'
import { getComponent, U_MM } from '../model/project'
import type { ComponentDef, Device, Face, Mount, PortRef, Project, Rack } from '../model/types'

export const U_PX = 22
export const PX_PER_MM = U_PX / U_MM
export const RAIL_W = Math.round(482.6 * PX_PER_MM)
const GUTTER = 26
const CAP_TOP = 26
const CAP_BOTTOM = 14
const FEED_ZONE = 58
const RACK_GAP = 70
export const FEED_W = 66
export const FEED_H = 34
export const ORIGIN = { x: 0, y: 0 }

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface RackLayout {
  rack: Rack
  index: number
  /** Outer frame */
  frame: Rect
  /** Mounting area between the rails */
  interior: Rect
  feedY: number
  gutterX: number
}

export interface ProjectLayout {
  racks: RackLayout[]
  byRack: Map<string, RackLayout>
  width: number
  height: number
}

export function layoutProject(p: Project): ProjectLayout {
  const maxU = Math.max(1, ...p.racks.map((r) => r.uHeight))
  const floorY = FEED_ZONE + CAP_TOP + maxU * U_PX
  let x = 0
  const racks = p.racks.map((rack, index) => {
    const frameW = Math.max(RAIL_W + 20, Math.round(rack.widthMm * PX_PER_MM))
    const interiorH = rack.uHeight * U_PX
    const frame: Rect = { x: x + GUTTER, y: floorY - interiorH - CAP_TOP, w: frameW, h: interiorH + CAP_TOP + CAP_BOTTOM }
    const interior: Rect = { x: frame.x + (frameW - RAIL_W) / 2, y: floorY - interiorH, w: RAIL_W, h: interiorH }
    const l: RackLayout = { rack, index, frame, interior, feedY: frame.y - FEED_ZONE + 10, gutterX: x }
    x += GUTTER + frameW + RACK_GAP
    return l
  })
  return {
    racks,
    byRack: new Map(racks.map((r) => [r.rack.id, r])),
    width: Math.max(x - RACK_GAP, 200),
    height: floorY + CAP_BOTTOM + 10
  }
}

/** How a device appears in a given view. */
export type Appearance = { kind: 'panel'; panelFace: Face; vertical: boolean } | { kind: 'ghost' } | { kind: 'hidden' }

export function appearance(comp: ComponentDef, mount: Mount, face: Face): Appearance {
  if (mount.kind === 'feed') return { kind: 'panel', panelFace: 'front', vertical: false }
  if (mount.kind === 'zeroU') return face === 'rear' ? { kind: 'panel', panelFace: 'front', vertical: true } : { kind: 'hidden' }
  if (mount.face === face) return { kind: 'panel', panelFace: 'front', vertical: false }
  return comp.fullDepth ? { kind: 'panel', panelFace: 'rear', vertical: false } : { kind: 'ghost' }
}

export function mountRect(rl: RackLayout, comp: ComponentDef, mount: Mount, sideUse?: { left: number; right: number }): Rect {
  const { rack, interior, frame } = rl
  if (mount.kind === 'rack') {
    const top = mount.u + comp.uHeight - 1
    return { x: interior.x, y: interior.y + (rack.uHeight - top) * U_PX, w: interior.w, h: comp.uHeight * U_PX }
  }
  if (mount.kind === 'feed') {
    return { x: frame.x + 4 + mount.slot * (FEED_W + 6), y: rl.feedY, w: FEED_W, h: FEED_H }
  }
  const gap = interior.x - frame.x
  const lanes = (sideUse?.[mount.side] ?? 1) > 1 ? 2 : 1
  const laneW = (gap - 6) / lanes
  const w = Math.min(laneW - 2, 64 * PX_PER_MM)
  const len = Math.min(interior.h - 8, (comp.lengthMm ?? 1700) * PX_PER_MM)
  const y = interior.y + (interior.h - len) / 2
  const laneIndex = lanes === 1 ? 0 : mount.slot
  // Slot 0 sits next to the rails, slot 1 towards the outside of the frame.
  const x = mount.side === 'left' ? interior.x - 3 - laneW * (laneIndex + 1) + (laneW - w) / 2 : interior.x + interior.w + 3 + laneW * laneIndex + (laneW - w) / 2
  return { x, y, w, h: len }
}

export function sideUsage(p: Project, rackId: string) {
  const use = { left: 0, right: 0 }
  for (const d of p.devices) if (d.rackId === rackId && d.mount.kind === 'zeroU') use[d.mount.side]++
  return use
}

export function deviceRect(p: Project, layout: ProjectLayout, d: Device): Rect | null {
  const rl = layout.byRack.get(d.rackId)
  if (!rl) return null
  return mountRect(rl, getComponent(p, d), d.mount, d.mount.kind === 'zeroU' ? sideUsage(p, d.rackId) : undefined)
}

export interface PortBox extends Rect {
  port: PortDef
}

const layoutCache = new WeakMap<ComponentDef, Map<string, PortBox[]>>()

/** Lay out the ports of one face of a component within a w×h panel (relative coordinates). */
export function layoutPorts(comp: ComponentDef, face: Face, w: number, h: number, vertical: boolean): PortBox[] {
  const key = `${face}|${w.toFixed(1)}|${h.toFixed(1)}|${vertical}`
  let byKey = layoutCache.get(comp)
  if (!byKey) layoutCache.set(comp, (byKey = new Map()))
  const cached = byKey.get(key)
  if (cached) return cached
  const boxes = vertical ? layoutVertical(comp, face, w, h) : layoutHorizontal(comp, face, w, h)
  byKey.set(key, boxes)
  return boxes
}

interface GroupPlan {
  ports: PortDef[]
  rows: number
  cols: number
  pw: number
  ph: number
}

function plan(comp: ComponentDef, face: Face, crossSize: number): GroupPlan[] {
  const ports = getPorts(comp).filter((p) => p.face === face)
  const groups = new Map<string, PortDef[]>()
  for (const p of ports) {
    const list = groups.get(p.groupId)
    if (list) list.push(p)
    else groups.set(p.groupId, [p])
  }
  const defs = new Map(comp.ports.map((g) => [g.id, g]))
  return [...groups.entries()].map(([gid, list]) => {
    const t = portType(list[0].type)
    const pw = t.size[0] * PX_PER_MM
    const ph = Math.min(t.size[1] * PX_PER_MM, crossSize - 4)
    const maxRows = Math.max(1, Math.floor((crossSize - 4) / (ph * 1.25)))
    const auto = list.length <= 12 ? 1 : Math.min(maxRows, Math.ceil(list.length / 24))
    const rows = Math.max(1, Math.min(defs.get(gid)?.rows ?? auto, maxRows, list.length))
    return { ports: list, rows, cols: Math.ceil(list.length / rows), pw, ph }
  })
}

function layoutHorizontal(comp: ComponentDef, face: Face, w: number, h: number): PortBox[] {
  const plans = plan(comp, face, h)
  if (!plans.length) return []
  const labelW = Math.min(64, w * 0.24)
  const avail = w - labelW - 8
  const gap = 7
  const natural = plans.reduce((s, g) => s + g.cols * g.pw * 1.18, 0) + gap * (plans.length - 1)
  const scale = Math.min(1, avail / natural)
  const out: PortBox[] = []
  let x = labelW + Math.max(0, (avail - natural * scale) / 2) + 2
  const columnMajor = comp.category === 'switch' || comp.category === 'router' || comp.category === 'firewall'
  for (const g of plans) {
    const pw = g.pw * scale
    const step = g.pw * 1.18 * scale
    const ph = Math.min(g.ph, Math.max(3, g.ph * Math.max(scale, 0.6)))
    const rowStep = Math.min(ph * 1.3, (h - 4) / g.rows)
    const y0 = (h - (rowStep * (g.rows - 1) + ph)) / 2
    g.ports.forEach((port, i) => {
      const col = columnMajor ? Math.floor(i / g.rows) : i % g.cols
      const row = columnMajor ? i % g.rows : Math.floor(i / g.cols)
      out.push({ port, x: x + col * step, y: y0 + row * rowStep, w: pw, h: ph })
    })
    x += g.cols * step + gap * scale
  }
  return out
}

function layoutVertical(comp: ComponentDef, face: Face, w: number, h: number): PortBox[] {
  // Lay out as if the strip were horizontal, then rotate 90 degrees.
  const plans = plan(comp, face, w)
  if (!plans.length) return []
  // Leave room at the top for the rotated name label.
  const head = Math.min(64, Math.max(26, h * 0.08))
  const avail = h - head - 8
  const gap = 10
  const natural = plans.reduce((s, g) => s + g.cols * g.ph * 1.5, 0) + gap * (plans.length - 1)
  const scale = Math.min(1, avail / natural)
  // Real vertical PDUs spread their outlets along the strip.
  const spread = scale < 1 ? 1 : Math.min(2.4, avail / natural)
  const out: PortBox[] = []
  let y = head
  for (const g of plans) {
    const pw = Math.min(g.pw, (w - 4) / g.rows)
    const ph = g.ph * Math.max(scale, 0.5)
    const step = g.ph * 1.5 * scale * spread
    const colStep = (w - 2) / g.rows
    g.ports.forEach((port, i) => {
      const row = Math.floor(i / g.rows)
      const col = i % g.rows
      out.push({ port, x: 1 + col * colStep + (colStep - pw) / 2, y: y + row * step, w: pw, h: ph })
    })
    y += g.cols * step + gap * scale * spread
  }
  return out
}

/** Absolute centre of a port in the given view, or null when it is not visible. */
export function portPoint(p: Project, layout: ProjectLayout, ref: PortRef, face: Face): { x: number; y: number } | null {
  const d = p.devices.find((x) => x.id === ref.deviceId)
  if (!d) return null
  const comp = getComponent(p, d)
  const a = appearance(comp, d.mount, face)
  if (a.kind !== 'panel') return null
  const r = deviceRect(p, layout, d)
  if (!r) return null
  const box = layoutPorts(comp, a.panelFace, r.w, r.h, a.vertical).find((b) => b.port.id === ref.portId)
  if (!box) return null
  return { x: r.x + box.x + box.w / 2, y: r.y + box.y + box.h / 2 }
}

/** Translate a canvas point to a mount position in a rack. */
export function hitMount(
  layout: ProjectLayout,
  comp: ComponentDef,
  pt: { x: number; y: number },
  face: Face,
  grabDy = 0
): { rackId: string; mount: Mount } | null {
  const rl = layout.racks.find((r) => pt.x >= r.frame.x - 20 && pt.x <= r.frame.x + r.frame.w + 20)
  if (!rl) return null
  if (comp.category === 'feed') {
    const slot = Math.max(0, Math.floor((pt.x - rl.frame.x - 4) / (FEED_W + 6)))
    return { rackId: rl.rack.id, mount: { kind: 'feed', slot } }
  }
  if (comp.uHeight === 0) {
    const side = pt.x < rl.frame.x + rl.frame.w / 2 ? 'left' : 'right'
    const edge = side === 'left' ? rl.interior.x - pt.x : pt.x - (rl.interior.x + rl.interior.w)
    const slot: 0 | 1 = edge > (rl.interior.x - rl.frame.x) / 2 ? 1 : 0
    return { rackId: rl.rack.id, mount: { kind: 'zeroU', side, slot } }
  }
  const topEdge = pt.y - grabDy
  const topU = rl.rack.uHeight - Math.round((topEdge - rl.interior.y) / U_PX)
  const u = Math.max(1, Math.min(rl.rack.uHeight - comp.uHeight + 1, topU - comp.uHeight + 1))
  return { rackId: rl.rack.id, mount: { kind: 'rack', u, face } }
}
