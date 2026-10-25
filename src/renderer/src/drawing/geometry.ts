import { portType, type PortDef, getPorts } from '../model/ports'
import { getComponent, U_MM } from '../model/project'
import type { ComponentDef, Device, Face, Mount, PortGroup, PortRef, Project, Rack } from '../model/types'

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
  group: PortGroup | undefined
  ports: PortDef[]
  rows: number
  cols: number
  pw: number
  ph: number
  /** Numbering runs down columns first (switch style) rather than along rows. */
  columnMajor: boolean
  blockEvery: number
}

/** Ports that run down columns by default: switches number 1/2 top/bottom. */
const COLUMN_MAJOR: ComponentDef['category'][] = ['switch', 'router', 'firewall']

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
    const group = defs.get(gid)
    const t = portType(list[0].type)
    const pw = t.size[0] * PX_PER_MM
    const ph = Math.min(t.size[1] * PX_PER_MM, crossSize - 4)
    const maxRows = Math.max(1, Math.floor((crossSize - 4) / (ph * 1.25)))
    const auto = list.length <= 12 ? 1 : Math.min(maxRows, Math.ceil(list.length / 24))
    // Explicit rows are honoured even if they need smaller ports; auto rows must fit at full size.
    const rows = Math.max(1, Math.min(group?.rows ?? auto, group?.rows ? 16 : maxRows, list.length))
    const cols = Math.ceil(list.length / rows)
    return {
      group,
      ports: list,
      rows,
      cols,
      pw,
      ph,
      columnMajor: group?.order ? group.order === 'columns' : COLUMN_MAJOR.includes(comp.category),
      blockEvery: group?.blockEvery && group.blockEvery < cols ? group.blockEvery : cols
    }
  })
}

const PORT_PITCH = 1.18
const GROUP_GAP = 7

/** Width of a group at a given scale, including the gaps between blocks. */
function groupWidth(g: GroupPlan, scale: number): number {
  const step = g.pw * PORT_PITCH * scale
  const blocks = Math.ceil(g.cols / g.blockEvery)
  return (g.cols - 1) * step + g.pw * scale + (blocks - 1) * g.pw * 0.9 * scale
}

/**
 * Left edges of every group. Manually placed groups sit at their position (kept on the
 * faceplate); automatic groups flow left to right around them, skipping over them as needed.
 */
function placeGroups(plans: GroupPlan[], scale: number, w: number, right: number, flowStart: number): number[] {
  const gap = GROUP_GAP * scale
  const fixed = plans.map((g) => {
    if (g.group?.x === undefined) return null
    const width = groupWidth(g, scale)
    const left = Math.max(0, Math.min((g.group.x / 100) * w, right - width))
    return { left, right: left + width }
  })
  let cursor = flowStart
  return plans.map((g, i) => {
    if (fixed[i]) return fixed[i]!.left
    const width = groupWidth(g, scale)
    let left = cursor
    for (let moved = true; moved; ) {
      moved = false
      for (const f of fixed) {
        if (f && left < f.right + gap && left + width + gap > f.left) {
          left = f.right + gap
          moved = true
        }
      }
    }
    cursor = left + width + gap
    return left
  })
}

function layoutHorizontal(comp: ComponentDef, face: Face, w: number, h: number): PortBox[] {
  const plans = plan(comp, face, h)
  if (!plans.length) return []
  const labelW = Math.min(64, w * 0.24)
  const right = w - 6
  const fits = (scale: number) => {
    const lefts = placeGroups(plans, scale, w, right, labelW + 2)
    return plans.every((g, i) => lefts[i] + groupWidth(g, scale) <= right)
  }
  // Largest scale (up to 1) at which every group fits on the faceplate.
  let scale = 1
  if (!fits(1)) {
    let lo = 0.15
    let hi = 1
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2
      if (fits(mid)) lo = mid
      else hi = mid
    }
    scale = lo
  }
  // With no manual positions, centre the ports in the space right of the label.
  const allAuto = plans.every((g) => g.group?.x === undefined)
  let flowStart = labelW + 2
  if (allAuto) {
    const natural = plans.reduce((sum, g) => sum + groupWidth(g, scale), 0) + GROUP_GAP * scale * (plans.length - 1)
    flowStart += Math.max(0, (right - flowStart - natural) / 2)
  }
  const lefts = placeGroups(plans, scale, w, right, flowStart)

  const out: PortBox[] = []
  plans.forEach((g, gi) => {
    const pw = g.pw * scale
    const step = g.pw * PORT_PITCH * scale
    const blockGap = g.pw * 0.9 * scale
    const fitH = (h - 4) / (g.rows * 1.25)
    const ph = Math.max(2.5, Math.min(g.ph, Math.max(3, g.ph * Math.max(scale, 0.6)), fitH))
    const rowStep = Math.min(ph * 1.3, (h - 4) / g.rows)
    const blockH = rowStep * (g.rows - 1) + ph
    const align = g.group?.align ?? 'middle'
    const y0 = align === 'top' ? 2 : align === 'bottom' ? h - 2 - blockH : (h - blockH) / 2
    g.ports.forEach((port, i) => {
      const col = g.columnMajor ? Math.floor(i / g.rows) : i % g.cols
      const row = g.columnMajor ? i % g.rows : Math.floor(i / g.cols)
      const x = lefts[gi] + col * step + Math.floor(col / g.blockEvery) * blockGap
      out.push({ port, x, y: y0 + row * rowStep, w: pw, h: ph })
    })
  })
  return out
}

/** Bounding box of each port group in a laid-out panel (used by the port arranger). */
export function groupBounds(boxes: PortBox[]): Map<string, Rect> {
  const out = new Map<string, Rect>()
  for (const b of boxes) {
    const r = out.get(b.port.groupId)
    if (!r) out.set(b.port.groupId, { x: b.x, y: b.y, w: b.w, h: b.h })
    else {
      const x2 = Math.max(r.x + r.w, b.x + b.w)
      const y2 = Math.max(r.y + r.h, b.y + b.h)
      r.x = Math.min(r.x, b.x)
      r.y = Math.min(r.y, b.y)
      r.w = x2 - r.x
      r.h = y2 - r.y
    }
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
      // Along the strip ("row") and across it ("col"); "rows" numbering runs across first.
      const across = g.group?.order === 'columns' ? Math.floor(i / g.cols) : i % g.rows
      const along = g.group?.order === 'columns' ? i % g.cols : Math.floor(i / g.rows)
      out.push({ port, x: 1 + across * colStep + (colStep - pw) / 2, y: y + along * step, w: pw, h: ph })
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
