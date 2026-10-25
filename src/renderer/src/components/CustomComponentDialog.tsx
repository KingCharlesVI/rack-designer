import { useMemo, useState } from 'react'
import { Drawing, SvgDefs } from '../drawing/Drawing'
import { layoutProject } from '../drawing/geometry'
import { CATEGORY_LABELS } from '../library'
import { newCustomId, saveCustomComponent } from '../lib/commands'
import { PORT_TYPES } from '../model/ports'
import { createProject } from '../model/project'
import type { Category, ComponentDef, Face, PortGroup, Project } from '../model/types'
import { useStore } from '../store'

const blank = (): ComponentDef => ({
  id: '',
  manufacturer: '',
  model: '',
  category: 'server',
  uHeight: 1,
  fullDepth: true,
  power: { typicalW: 100, maxW: 300 },
  ports: [
    { id: 'nic', type: 'rj45', count: 2, face: 'rear', label: 'NIC', speed: '1G' },
    { id: 'psu', type: 'c14', count: 2, face: 'rear', label: 'PSU' }
  ]
})

const dataTypes = Object.values(PORT_TYPES).filter((t) => t.kind === 'data')
const powerTypes = Object.values(PORT_TYPES).filter((t) => t.kind === 'power')

export function CustomComponentDialog() {
  const dialog = useStore((s) => (s.dialog?.kind === 'custom-component' ? s.dialog : null))
  const catalog = useStore((s) => s.catalog)
  const close = () => useStore.getState().openDialog(null)
  const initial = useMemo(() => {
    const src = dialog?.componentId ? catalog.byId.get(dialog.componentId) ?? useStore.getState().project.components[dialog.componentId] : undefined
    if (!src) return blank()
    const copy = structuredClone(src)
    delete copy.source
    if (dialog?.duplicate) {
      copy.id = ''
      copy.model = `${copy.model} (custom)`
      copy.generic = undefined
    }
    return copy
  }, [dialog, catalog])
  const [c, setC] = useState<ComponentDef>(initial)
  const [error, setError] = useState('')
  const isNew = !c.id
  const update = (patch: Partial<ComponentDef>) => setC((x) => ({ ...x, ...patch }))
  const setGroup = (i: number, patch: Partial<PortGroup>) => setC((x) => ({ ...x, ports: x.ports.map((g, j) => (j === i ? { ...g, ...patch, names: patch.names ?? (patch.count !== undefined || patch.label !== undefined ? undefined : g.names) } : g)) }))

  const save = async () => {
    if (!c.model.trim()) return setError('Model name is required')
    if (c.ports.some((g) => g.count < 1)) return setError('Every port group needs at least one port')
    const ids = new Set<string>()
    const ports = c.ports.map((g, i) => {
      let id = g.id || `g${i + 1}`
      while (ids.has(id)) id = `${id}x`
      ids.add(id)
      return { ...g, id }
    })
    const final: ComponentDef = { ...c, id: c.id || newCustomId(c.model), manufacturer: c.manufacturer.trim() || 'Custom', model: c.model.trim(), ports }
    if (final.category === 'feed') final.uHeight = 0
    try {
      await saveCustomComponent(final)
      useStore.getState().toast(`Saved ${final.model} to your library`, 'success')
      close()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const preview = useMemo(() => previewProject(c), [c])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal wide" role="dialog">
        <header>
          <h2>{isNew ? 'New custom component' : `Edit ${initial.model}`}</h2>
          <button onClick={close}>×</button>
        </header>
        <div className="modal-body custom-editor">
          <div className="grid2">
            <label className="field">
              <span className="field-label">Manufacturer</span>
              <input value={c.manufacturer} onChange={(e) => update({ manufacturer: e.target.value })} placeholder="e.g. Acme" />
            </label>
            <label className="field">
              <span className="field-label">Model</span>
              <input value={c.model} onChange={(e) => update({ model: e.target.value })} placeholder="e.g. X1000" autoFocus />
            </label>
            <label className="field">
              <span className="field-label">Category</span>
              <select value={c.category} onChange={(e) => update({ category: e.target.value as Category })}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Height (U, 0 = zero-U)</span>
              <input type="number" min={0} max={20} value={c.uHeight} onChange={(e) => update({ uHeight: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })} disabled={c.category === 'feed'} />
            </label>
            <label className="field check">
              <input type="checkbox" checked={c.fullDepth} onChange={(e) => update({ fullDepth: e.target.checked })} />
              <span>Full depth (blocks front and rear)</span>
            </label>
            <label className="field">
              <span className="field-label">{c.uHeight === 0 ? 'Length (mm)' : 'Depth (mm)'}</span>
              <input
                type="number"
                min={0}
                value={(c.uHeight === 0 ? c.lengthMm : c.depthMm) ?? ''}
                onChange={(e) => update(c.uHeight === 0 ? { lengthMm: Number(e.target.value) || undefined } : { depthMm: Number(e.target.value) || undefined })}
              />
            </label>
            <label className="field">
              <span className="field-label">Weight (kg)</span>
              <input type="number" min={0} value={c.weightKg ?? ''} onChange={(e) => update({ weightKg: Number(e.target.value) || undefined })} />
            </label>
            <label className="field">
              <span className="field-label">Faceplate colour</span>
              <input type="color" value={c.color ?? '#2b2f36'} onChange={(e) => update({ color: e.target.value })} />
            </label>
            {c.category !== 'feed' && (
              <>
                <label className="field">
                  <span className="field-label">Typical draw (W)</span>
                  <input type="number" min={0} value={c.power?.typicalW ?? 0} onChange={(e) => update({ power: { typicalW: Number(e.target.value) || 0, maxW: c.power?.maxW ?? 0 } })} />
                </label>
                <label className="field">
                  <span className="field-label">Maximum draw (W)</span>
                  <input type="number" min={0} value={c.power?.maxW ?? 0} onChange={(e) => update({ power: { typicalW: c.power?.typicalW ?? 0, maxW: Number(e.target.value) || 0 } })} />
                </label>
              </>
            )}
            {c.category === 'pdu' && (
              <>
                <label className="field">
                  <span className="field-label">PDU outlet voltage</span>
                  <input type="number" value={c.pdu?.voltage ?? 230} onChange={(e) => update({ pdu: { maxAmps: 16, ...c.pdu, voltage: Number(e.target.value) || 230 } })} />
                </label>
                <label className="field">
                  <span className="field-label">PDU rated current (A)</span>
                  <input type="number" value={c.pdu?.maxAmps ?? 16} onChange={(e) => update({ pdu: { voltage: 230, ...c.pdu, maxAmps: Number(e.target.value) || 16 } })} />
                </label>
              </>
            )}
            {c.category === 'ups' && (
              <>
                <label className="field">
                  <span className="field-label">UPS capacity (W)</span>
                  <input type="number" value={c.ups?.capacityW ?? 1000} onChange={(e) => update({ ups: { capacityVA: c.ups?.capacityVA ?? 1500, ...c.ups, capacityW: Number(e.target.value) || 0 } })} />
                </label>
                <label className="field">
                  <span className="field-label">UPS capacity (VA)</span>
                  <input type="number" value={c.ups?.capacityVA ?? 1500} onChange={(e) => update({ ups: { capacityW: c.ups?.capacityW ?? 1000, ...c.ups, capacityVA: Number(e.target.value) || 0 } })} />
                </label>
              </>
            )}
            {c.category === 'feed' && (
              <>
                <label className="field">
                  <span className="field-label">Feed voltage</span>
                  <input type="number" value={c.feed?.voltage ?? 230} onChange={(e) => update({ feed: { amps: 16, phases: 1, ...c.feed, voltage: Number(e.target.value) || 230 } })} />
                </label>
                <label className="field">
                  <span className="field-label">Breaker (A)</span>
                  <input type="number" value={c.feed?.amps ?? 16} onChange={(e) => update({ feed: { voltage: 230, phases: 1, ...c.feed, amps: Number(e.target.value) || 16 } })} />
                </label>
              </>
            )}
          </div>
          <label className="field">
            <span className="field-label">Description</span>
            <input value={c.description ?? ''} onChange={(e) => update({ description: e.target.value || undefined })} />
          </label>

          <h3>Ports</h3>
          <table className="groups">
            <thead>
              <tr>
                <th>Side</th>
                <th>Type</th>
                <th>Count</th>
                <th>Label prefix</th>
                <th>Start #</th>
                <th>Speed</th>
                <th>Rows</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.ports.map((g, i) => (
                <tr key={i}>
                  <td>
                    <select value={g.face} onChange={(e) => setGroup(i, { face: e.target.value as Face })}>
                      <option value="front">Front</option>
                      <option value="rear">Rear</option>
                    </select>
                  </td>
                  <td>
                    <select value={g.type} onChange={(e) => setGroup(i, { type: e.target.value })}>
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
                    <input type="number" min={1} max={512} value={g.count} onChange={(e) => setGroup(i, { count: Math.max(1, Math.min(512, Number(e.target.value) || 1)) })} />
                  </td>
                  <td>
                    <input value={g.label ?? ''} onChange={(e) => setGroup(i, { label: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" min={0} value={g.start ?? 1} onChange={(e) => setGroup(i, { start: Number(e.target.value) })} />
                  </td>
                  <td>
                    <input value={g.speed ?? ''} placeholder="—" onChange={(e) => setGroup(i, { speed: e.target.value || undefined })} />
                  </td>
                  <td>
                    <input type="number" min={0} max={8} value={g.rows ?? ''} placeholder="auto" onChange={(e) => setGroup(i, { rows: Number(e.target.value) || undefined })} />
                  </td>
                  <td>
                    <button className="x" onClick={() => setC((x) => ({ ...x, ports: x.ports.filter((_, j) => j !== i) }))}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setC((x) => ({ ...x, ports: [...x.ports, { id: '', type: 'rj45', count: 1, face: 'front', label: 'Port' }] }))}>+ Add port group</button>

          <h3>Preview</h3>
          <div className="preview">
            {(['front', 'rear'] as Face[]).map((face) => (
              <svg key={face} width={preview.layout.width + 20} height={preview.layout.height + 10} viewBox={`-10 -5 ${preview.layout.width + 20} ${preview.layout.height + 10}`}>
                <SvgDefs />
                <Drawing project={preview.project} layout={preview.layout} face={face} showCables={false} />
              </svg>
            ))}
          </div>
          {error && <div className="error">{error}</div>}
        </div>
        <footer>
          <button onClick={close}>Cancel</button>
          <button className="primary" onClick={save}>
            Save to library
          </button>
        </footer>
      </div>
    </div>
  )
}

/** A tiny one-rack project used to render the preview. */
function previewProject(c: ComponentDef) {
  const comp: ComponentDef = { ...c, id: '__preview', category: c.category === 'feed' ? 'feed' : c.category, uHeight: c.category === 'feed' ? 0 : c.uHeight, ports: c.ports.map((g, i) => ({ ...g, id: g.id || `g${i}` })) }
  const p: Project = createProject('preview')
  const h = Math.max(comp.uHeight, 1) + 2
  p.racks.push({ id: 'r', name: comp.model || 'Preview', uHeight: comp.uHeight === 0 ? 24 : h, widthMm: 600, depthMm: 1000, style: '4-post-enclosed' })
  p.components[comp.id] = comp
  const mount = comp.category === 'feed' ? ({ kind: 'feed', slot: 0 } as const) : comp.uHeight === 0 ? ({ kind: 'zeroU', side: 'left', slot: 0 } as const) : ({ kind: 'rack', u: 2, face: 'front' } as const)
  p.devices.push({ id: 'd', componentId: comp.id, rackId: 'r', mount, name: comp.model || 'Preview' })
  return { project: p, layout: layoutProject(p) }
}
