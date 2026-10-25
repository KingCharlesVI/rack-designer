import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Drawing, SvgDefs, type Interaction, type Preview } from '../drawing/Drawing'
import { hitMount, layoutProject, mountRect, sideUsage, type ProjectLayout } from '../drawing/geometry'
import { addDevice, canPlace, connect, connectionAt, describePort, getComponent, moveDevice } from '../model/project'
import type { ComponentDef, Connection, Device, Mount, PortRef } from '../model/types'
import { useStore } from '../store'

/** Component id being dragged from the library (dataTransfer can't be read during dragover). */
export const libraryDrag: { componentId: string | null } = { componentId: null }

/** Lets menu commands drive the view. */
export const canvasControls = { fit: () => {}, zoomBy: (_f: number) => {} }

const MIN_ZOOM = 0.15
const MAX_ZOOM = 6

type Drag =
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number; moved: boolean; deselect: boolean }
  | { kind: 'device'; device: Device; comp: ComponentDef; startX: number; startY: number; grabDy: number; moved: boolean; target: { rackId: string; mount: Mount } | null }

export function Canvas() {
  const project = useStore((s) => s.project)
  const face = useStore((s) => s.face)
  const showCables = useStore((s) => s.showCables)
  const selection = useStore((s) => s.selection)
  const pending = useStore((s) => s.pending)
  const zoom = useStore((s) => s.zoom)
  const pan = useStore((s) => s.pan)
  const catalog = useStore((s) => s.catalog)
  const layout = useMemo(() => layoutProject(project), [project])
  const host = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const r = host.current!.getBoundingClientRect()
      const { zoom, pan } = useStore.getState()
      return { x: (clientX - r.left - pan.x) / zoom, y: (clientY - r.top - pan.y) / zoom }
    },
    []
  )

  const fit = useCallback(() => {
    const el = host.current
    if (!el) return
    const l = layoutProject(useStore.getState().project)
    const w = el.clientWidth
    const h = el.clientHeight
    const z = Math.max(MIN_ZOOM, Math.min(2, (w - 80) / l.width, (h - 40) / l.height))
    useStore.getState().setView(z, { x: Math.max(40, (w - l.width * z) / 2), y: Math.max(16, (h - l.height * z) / 2) })
  }, [])

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const el = host.current
    if (!el) return
    const { zoom, pan, setView } = useStore.getState()
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor))
    const px = cx ?? el.clientWidth / 2
    const py = cy ?? el.clientHeight / 2
    setView(z, { x: px - ((px - pan.x) * z) / zoom, y: py - ((py - pan.y) * z) / zoom })
  }, [])

  useEffect(() => {
    canvasControls.fit = fit
    canvasControls.zoomBy = (f) => zoomAt(f)
  }, [fit, zoomAt])

  // Fit when a different design is loaded.
  useEffect(() => {
    requestAnimationFrame(fit)
  }, [project.id, fit])

  useEffect(() => {
    const el = host.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
      } else {
        const { zoom, pan, setView } = useStore.getState()
        const dx = e.shiftKey ? e.deltaY : e.deltaX
        const dy = e.shiftKey ? 0 : e.deltaY
        setView(zoom, { x: pan.x - dx, y: pan.y - dy })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const previewFor = useCallback(
    (comp: ComponentDef, target: { rackId: string; mount: Mount } | null, ignoreId?: string): Preview | null => {
      if (!target) return null
      const p = useStore.getState().project
      const l = layoutProject(p)
      const rl = l.byRack.get(target.rackId)
      if (!rl) return null
      const err = canPlace(p, comp, target.rackId, target.mount, ignoreId)
      const use = sideUsage(p, target.rackId)
      if (target.mount.kind === 'zeroU') use[target.mount.side] = Math.max(use[target.mount.side], target.mount.slot + 1)
      const m = target.mount
      const label = err ?? (m.kind === 'rack' ? `U${m.u}${comp.uHeight > 1 ? `–U${m.u + comp.uHeight - 1}` : ''}` : m.kind === 'zeroU' ? `${m.side} side` : `Feed ${m.slot + 1}`)
      return { rect: mountRect(rl, comp, m, use), ok: !err, label }
    },
    []
  )

  // Window-level drag tracking
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current
      if (!d) return
      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
      if (!d.moved && dist < 4) return
      d.moved = true
      if (d.kind === 'pan') {
        useStore.getState().setView(useStore.getState().zoom, { x: d.panX + e.clientX - d.startX, y: d.panY + e.clientY - d.startY })
        return
      }
      setDraggingId(d.device.id)
      const s = useStore.getState()
      const hit = hitMount(layoutProject(s.project), d.comp, toWorld(e.clientX, e.clientY), d.device.mount.kind === 'rack' ? d.device.mount.face : s.face, d.grabDy)
      d.target = hit
      setPreview(previewFor(d.comp, hit, d.device.id))
    }
    const onUp = () => {
      const d = drag.current
      drag.current = null
      if (!d) return
      const s = useStore.getState()
      if (d.kind === 'pan') {
        if (!d.moved && d.deselect) s.select(null)
        return
      }
      setDraggingId(null)
      setPreview(null)
      if (d.moved && d.target) {
        const { rackId, mount } = d.target
        const err = s.edit((p) => moveDevice(p, d.device.id, rackId, mount))
        if (err) s.toast(err, 'error')
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [previewFor, toWorld])

  const startPan = (e: ReactMouseEvent, deselect: boolean) => {
    if (e.button !== 0 && e.button !== 1) return
    e.preventDefault()
    const { pan } = useStore.getState()
    drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y, moved: false, deselect }
  }

  const interaction: Interaction = useMemo(
    () => ({
      selection,
      pending,
      draggingId,
      onDeviceDown: (e, device) => {
        if (e.button !== 0) return
        e.stopPropagation()
        e.preventDefault()
        const s = useStore.getState()
        s.select({ kind: 'device', id: device.id })
        const comp = getComponent(s.project, device)
        const world = toWorld(e.clientX, e.clientY)
        const r = mountRect(layoutProject(s.project).byRack.get(device.rackId)!, comp, device.mount, sideUsage(s.project, device.rackId))
        drag.current = { kind: 'device', device, comp, startX: e.clientX, startY: e.clientY, grabDy: world.y - r.y, moved: false, target: null }
      },
      onPortDown: (e, ref) => {
        if (e.button !== 0) return
        e.stopPropagation()
        e.preventDefault()
        portClick(ref)
      },
      onConnectionDown: (e: ReactMouseEvent, c: Connection) => {
        e.stopPropagation()
        useStore.getState().select({ kind: 'connection', id: c.id })
      },
      onRackDown: (e, rackId) => {
        if (e.button !== 0) return
        e.stopPropagation()
        useStore.getState().select({ kind: 'rack', id: rackId })
        startPan(e, false)
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selection, pending, draggingId, toWorld]
  )

  const onDragOver = (e: React.DragEvent) => {
    const comp = libraryDrag.componentId ? catalog.byId.get(libraryDrag.componentId) : undefined
    if (!comp) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const s = useStore.getState()
    const hit = hitMount(layout, comp, toWorld(e.clientX, e.clientY), s.face, (comp.uHeight * 22) / 2)
    setPreview(previewFor(comp, hit))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setPreview(null)
    const comp = libraryDrag.componentId ? catalog.byId.get(libraryDrag.componentId) : undefined
    libraryDrag.componentId = null
    if (!comp) return
    const s = useStore.getState()
    const hit = hitMount(layout, comp, toWorld(e.clientX, e.clientY), s.face, (comp.uHeight * 22) / 2)
    if (!hit) {
      s.toast('Drop components onto a rack', 'error')
      return
    }
    let id = ''
    const err = s.edit((p) => {
      const d = addDevice(p, comp, hit.rackId, hit.mount)
      if (typeof d === 'string') return d
      id = d.id
    })
    if (err) s.toast(err, 'error')
    else s.select({ kind: 'device', id })
  }

  return (
    <div
      ref={host}
      className={`canvas${pending ? ' connecting' : ''}`}
      onMouseDown={(e) => startPan(e, true)}
      onDragOver={onDragOver}
      onDragLeave={() => setPreview(null)}
      onDrop={onDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg width="100%" height="100%">
        <SvgDefs />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          <Drawing project={project} layout={layout} face={face} showCables={showCables} interaction={interaction} preview={preview} />
        </g>
      </svg>
      {project.racks.length === 0 && <div className="canvas-hint">Add a rack from the Racks tab of the library to get started.</div>}
      {pending && (
        <div className="canvas-banner">
          Connecting from <b>{describePort(project, pending)}</b> — click another port (switch Front/Rear with F/R if needed). <kbd>Esc</kbd> to cancel.
        </div>
      )}
      <div className="canvas-zoom">
        <button onClick={() => zoomAt(1 / 1.2)} title="Zoom out (Ctrl -)">−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => zoomAt(1.2)} title="Zoom in (Ctrl +)">+</button>
        <button onClick={fit} title="Fit (Ctrl 0)">Fit</button>
      </div>
      <Legend layout={layout} />
    </div>
  )
}

function Legend({ layout }: { layout: ProjectLayout }) {
  if (!layout.racks.length) return null
  return (
    <div className="canvas-legend">
      Drag to pan · Ctrl+wheel to zoom · Click a port to start a cable · Drag devices to move
    </div>
  )
}

export function portClick(ref: PortRef) {
  const s = useStore.getState()
  const { pending, project } = s
  if (!pending) {
    const existing = connectionAt(project, ref)
    if (existing) {
      s.select({ kind: 'connection', id: existing.id })
      return
    }
    s.setPending(ref)
    s.select({ kind: 'port', deviceId: ref.deviceId, portId: ref.portId })
    return
  }
  if (pending.deviceId === ref.deviceId && pending.portId === ref.portId) {
    s.setPending(null)
    return
  }
  let id = ''
  const err = s.edit((p) => {
    const c = connect(p, pending, ref)
    if (typeof c === 'string') return c
    id = c.id
  })
  if (err) {
    s.toast(err, 'error')
    return
  }
  s.setPending(null)
  s.select({ kind: 'connection', id })
  s.toast(`Connected ${describePort(useStore.getState().project, pending)} → ${describePort(useStore.getState().project, ref)}`, 'success')
}
