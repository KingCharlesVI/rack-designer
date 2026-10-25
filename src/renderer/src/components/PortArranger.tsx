// Port group editing for custom components: the group list, per-group layout options
// and a drag-to-arrange faceplate that uses the same layout code as the rack drawing.
import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { tint } from '../drawing/Drawing'
import { groupBounds, layoutPorts, RAIL_W, U_PX } from '../drawing/geometry'
import { PORT_TYPES, portColor, portColorClass, portType } from '../model/ports'
import type { ComponentDef, Face, PortGroup } from '../model/types'

const dataTypes = Object.values(PORT_TYPES).filter((t) => t.kind === 'data')
const powerTypes = Object.values(PORT_TYPES).filter((t) => t.kind === 'power')

export function newGroupId(groups: PortGroup[]): string {
  const used = new Set(groups.map((g) => g.id))
  for (let n = groups.length + 1; ; n++) if (!used.has(`g${n}`)) return `g${n}`
}

interface Props {
  comp: ComponentDef
  onChange: (ports: PortGroup[]) => void
}

export function PortGroupsEditor({ comp, onChange }: Props) {
  const [selected, setSelected] = useState<string | null>(comp.ports[0]?.id ?? null)
  const [face, setFace] = useState<Face>(comp.ports.find((g) => g.id === selected)?.face ?? 'front')
  const groups = comp.ports
  const sel = groups.find((g) => g.id === selected)

  const setGroup = (id: string, patch: Partial<PortGroup>) =>
    onChange(
      groups.map((g) => {
        if (g.id !== id) return g
        const next: PortGroup = { ...g, ...patch }
        // Explicit names no longer line up once the count or prefix changes.
        if (patch.count !== undefined || patch.label !== undefined) delete next.names
        for (const k of Object.keys(next) as (keyof PortGroup)[]) if (next[k] === undefined) delete next[k]
        return next
      })
    )
  const select = (g: PortGroup) => {
    setSelected(g.id)
    setFace(g.face)
  }
  const add = () => {
    const id = newGroupId(groups)
    onChange([...groups, { id, type: 'rj45', count: 8, face, label: 'Port' }])
    setSelected(id)
  }
  const remove = (id: string) => {
    onChange(groups.filter((g) => g.id !== id))
    if (selected === id) setSelected(null)
  }
  const move = (id: string, delta: number) => {
    const i = groups.findIndex((g) => g.id === id)
    const j = i + delta
    if (j < 0 || j >= groups.length) return
    const next = [...groups]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="ports-editor">
      <table className="groups">
        <thead>
          <tr>
            <th />
            <th>Side</th>
            <th>Type</th>
            <th>Count</th>
            <th>Label prefix</th>
            <th>Start #</th>
            <th>Speed</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className={g.id === selected ? 'selected' : ''} onMouseDown={() => select(g)}>
              <td>
                <i className="code-swatch" style={{ background: tint(portColor(g)), borderColor: portColor(g) }} title={g.color ? 'Custom colour' : portColorClass(g.type).label} />
              </td>
              <td>
                <select value={g.face} onChange={(e) => (setGroup(g.id, { face: e.target.value as Face }), setFace(e.target.value as Face))}>
                  <option value="front">Front</option>
                  <option value="rear">Rear</option>
                </select>
              </td>
              <td>
                <select value={g.type} onChange={(e) => setGroup(g.id, { type: e.target.value })}>
                  <optgroup label="Data">
                    {dataTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Power">
                    {powerTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </td>
              <td>
                <input type="number" min={1} max={512} value={g.count} onChange={(e) => setGroup(g.id, { count: Math.max(1, Math.min(512, Number(e.target.value) || 1)) })} />
              </td>
              <td>
                <input value={g.label ?? ''} onChange={(e) => setGroup(g.id, { label: e.target.value })} />
              </td>
              <td>
                <input type="number" min={0} value={g.start ?? ''} placeholder="auto" onChange={(e) => setGroup(g.id, { start: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </td>
              <td>
                <input value={g.speed ?? ''} placeholder="—" onChange={(e) => setGroup(g.id, { speed: e.target.value || undefined })} />
              </td>
              <td className="row-actions">
                <button className="x" title="Move up" onClick={() => move(g.id, -1)}>
                  ↑
                </button>
                <button className="x" title="Move down" onClick={() => move(g.id, 1)}>
                  ↓
                </button>
                <button className="x" title="Remove" onClick={() => remove(g.id)}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={add}>+ Add port group</button>

      {comp.uHeight > 0 && comp.category !== 'feed' && (
        <>
          <h3>Arrange</h3>
          <Arranger comp={comp} face={face} setFace={setFace} selected={selected} onSelect={(id) => select(groups.find((g) => g.id === id)!)} setGroup={setGroup} />
          {sel && sel.face === face && <GroupLayout group={sel} setGroup={(patch) => setGroup(sel.id, patch)} />}
          {sel && sel.face !== face && <div className="muted small">The selected group is on the {sel.face}. Switch sides above to arrange it.</div>}
        </>
      )}
    </div>
  )
}

function GroupLayout({ group: g, setGroup }: { group: PortGroup; setGroup: (patch: Partial<PortGroup>) => void }) {
  const presets: { label: string; patch: Partial<PortGroup> }[] = [
    { label: '1 row', patch: { rows: 1, blockEvery: undefined } },
    { label: '2 rows', patch: { rows: 2, order: 'columns' } },
    { label: '2 rows, blocks of 6', patch: { rows: 2, order: 'columns', blockEvery: 6 } },
    { label: '2 rows, blocks of 12', patch: { rows: 2, order: 'columns', blockEvery: 12 } },
    { label: '4 rows', patch: { rows: 4, order: 'rows' } }
  ]
  return (
    <div className="group-layout">
      <div className="group-layout-title">
        <i className="code-swatch" style={{ background: tint(portColor(g)), borderColor: portColor(g) }} />
        <b>{g.label || portType(g.type).name}</b>
        <span className="muted">
          {g.count}× {portType(g.type).name}
        </span>
        <span className="spacer" />
        {presets.map((p) => (
          <button key={p.label} onClick={() => setGroup(p.patch)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="group-layout-fields">
        <label className="field">
          <span className="field-label">Rows</span>
          <input type="number" min={1} max={16} value={g.rows ?? ''} placeholder="auto" onChange={(e) => setGroup({ rows: Number(e.target.value) || undefined })} />
        </label>
        <label className="field">
          <span className="field-label">Numbering</span>
          <select value={g.order ?? ''} onChange={(e) => setGroup({ order: (e.target.value || undefined) as PortGroup['order'] })}>
            <option value="">Auto</option>
            <option value="columns">Down columns (1↓2, 3↓4)</option>
            <option value="rows">Across rows (1→2→3)</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Blocks of (columns)</span>
          <input type="number" min={1} max={256} value={g.blockEvery ?? ''} placeholder="none" onChange={(e) => setGroup({ blockEvery: Number(e.target.value) || undefined })} />
        </label>
        <label className="field">
          <span className="field-label">Vertical</span>
          <select value={g.align ?? 'middle'} onChange={(e) => setGroup({ align: e.target.value === 'middle' ? undefined : (e.target.value as PortGroup['align']) })}>
            <option value="top">Top</option>
            <option value="middle">Middle</option>
            <option value="bottom">Bottom</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Position (% from left)</span>
          <div className="row">
            <input type="number" min={0} max={99} step={0.5} value={g.x ?? ''} placeholder="auto" onChange={(e) => setGroup({ x: e.target.value === '' ? undefined : Math.max(0, Math.min(99, Number(e.target.value))) })} />
            {g.x !== undefined && (
              <button title="Let the group flow automatically" onClick={() => setGroup({ x: undefined })}>
                Auto
              </button>
            )}
          </div>
        </label>
        <label className="field">
          <span className="field-label">Colour code</span>
          <div className="row">
            <input type="color" value={portColor(g)} onChange={(e) => setGroup({ color: e.target.value })} />
            {g.color ? (
              <button title={`Back to the default for ${portColorClass(g.type).label}`} onClick={() => setGroup({ color: undefined })}>
                Default
              </button>
            ) : (
              <span className="muted small">{portColorClass(g.type).label}</span>
            )}
          </div>
        </label>
      </div>
    </div>
  )
}

const VIEW_W = 820

function Arranger(props: { comp: ComponentDef; face: Face; setFace: (f: Face) => void; selected: string | null; onSelect: (id: string) => void; setGroup: (id: string, patch: Partial<PortGroup>) => void }) {
  const { comp, face, setFace, selected, onSelect, setGroup } = props
  const w = RAIL_W
  const h = comp.uHeight * U_PX
  const scale = VIEW_W / w
  const boxes = useMemo(() => layoutPorts(comp, face, w, h, false), [comp, face, w, h])
  const bounds = useMemo(() => groupBounds(boxes), [boxes])
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const labelW = Math.min(64, w * 0.24)
  const hasFace = { front: comp.ports.some((g) => g.face === 'front'), rear: comp.ports.some((g) => g.face === 'rear') }

  const startDrag = (e: ReactMouseEvent, id: string) => {
    e.preventDefault()
    onSelect(id)
    const svg = svgRef.current
    const b = bounds.get(id)
    if (!svg || !b) return
    const rect = svg.getBoundingClientRect()
    const toX = (clientX: number) => ((clientX - rect.left) / rect.width) * (w + 16) - 8
    const offset = toX(e.clientX) - b.x
    const onMove = (ev: MouseEvent) => {
      setDragging(id)
      const left = toX(ev.clientX) - offset
      const pct = Math.round(Math.max(0, Math.min(99, (left / w) * 100)) * 2) / 2
      setGroup(id, { x: pct })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setDragging(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="arranger">
      <div className="row">
        <div className="segmented">
          {(['front', 'rear'] as Face[]).map((f) => (
            <button key={f} className={face === f ? 'active' : ''} onClick={() => setFace(f)}>
              {f === 'front' ? 'Front' : 'Rear'}
              {hasFace[f] ? '' : ' (empty)'}
            </button>
          ))}
        </div>
        <span className="muted small">Drag a group to position it · double-click to return it to automatic flow</span>
        <span className="spacer" />
        {comp.ports.some((g) => g.face === face && g.x !== undefined) && (
          <button onClick={() => comp.ports.filter((g) => g.face === face && g.x !== undefined).forEach((g) => setGroup(g.id, { x: undefined }))}>Reset positions</button>
        )}
      </div>
      <svg ref={svgRef} width={VIEW_W + 16 * scale} height={(h + 16) * scale} viewBox={`-8 -8 ${w + 16} ${h + 16}`} className={dragging ? 'dragging' : ''}>
        <rect x={0} y={0} width={w} height={h} rx={1.5} fill={comp.color ?? '#2b2f36'} stroke="#000" strokeWidth={0.6} />
        <rect x={0} y={0.5} width={4} height={h - 1} fill="#3d434c" />
        <rect x={w - 4} y={0.5} width={4} height={h - 1} fill="#3d434c" />
        <rect x={4} y={1} width={labelW - 4} height={h - 2} fill="none" stroke="#4b5563" strokeWidth={0.3} strokeDasharray="1.5 1" />
        <text x={7} y={Math.min(h / 2 + 2, 10)} fontSize={5} fill="#6b7280">
          name
        </text>
        {boxes.map((b) => {
          const code = portColor(b.port)
          return (
            <rect key={b.port.id} x={b.x} y={b.y} width={b.w} height={b.h} rx={0.5} fill={tint(code)} stroke={code} strokeWidth={0.5} pointerEvents="none">
              <title>{b.port.label}</title>
            </rect>
          )
        })}
        {boxes
          .filter((b) => b.w * scale > 22 && b.h * scale > 12)
          .map((b) => (
            <text key={`t-${b.port.id}`} x={b.x + b.w / 2} y={b.y + b.h / 2 + 1.1} fontSize={Math.min(3, b.h * 0.45)} fill="#e5e7eb" textAnchor="middle" pointerEvents="none">
              {b.port.label.replace(/^.*?(\d+)$/, '$1')}
            </text>
          ))}
        {[...bounds.entries()].map(([id, b]) => {
          const g = comp.ports.find((x) => x.id === id)
          const isSel = id === selected
          return (
            <rect
              key={`g-${id}`}
              x={b.x - 1.2}
              y={b.y - 1.2}
              width={b.w + 2.4}
              height={b.h + 2.4}
              rx={1}
              fill="rgba(0,0,0,0.001)"
              stroke={isSel ? '#4ea1ff' : '#9ca3af'}
              strokeOpacity={isSel ? 1 : 0.35}
              strokeWidth={isSel ? 0.7 : 0.4}
              strokeDasharray={g?.x !== undefined ? undefined : '1.5 1'}
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => startDrag(e, id)}
              onDoubleClick={() => setGroup(id, { x: undefined })}
            >
              <title>{`${g?.label || portType(g?.type ?? '').name} · ${g?.x !== undefined ? `${g.x}% from left` : 'automatic position'}`}</title>
            </rect>
          )
        })}
      </svg>
    </div>
  )
}
