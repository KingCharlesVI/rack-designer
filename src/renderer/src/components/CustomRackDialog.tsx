import { useMemo, useState } from 'react'
import { Drawing, SvgDefs } from '../drawing/Drawing'
import { layoutProject } from '../drawing/geometry'
import { newCustomId } from '../lib/commands'
import { saveCustomRack } from '../lib/packCommands'
import { createProject, rackFromDef } from '../model/project'
import type { RackDef } from '../model/types'
import { useStore } from '../store'

const STYLES: { value: RackDef['style']; label: string }[] = [
  { value: '4-post-enclosed', label: '4-post enclosed cabinet' },
  { value: '4-post-open', label: '4-post open frame' },
  { value: '2-post', label: '2-post relay rack' },
  { value: 'wall-mount', label: 'Wall mount' }
]

export function CustomRackDialog() {
  const dialog = useStore((s) => (s.dialog?.kind === 'custom-rack' ? s.dialog : null))
  const catalog = useStore((s) => s.catalog)
  const close = () => useStore.getState().openDialog(null)
  const initial = useMemo<RackDef>(() => {
    const src = dialog?.rackId ? catalog.rackById.get(dialog.rackId) : undefined
    if (!src) return { id: '', manufacturer: '', model: '', uHeight: 42, widthMm: 600, depthMm: 1000, maxLoadKg: 1000, style: '4-post-enclosed' }
    const { source: _s, generic: _g, ...copy } = src
    return dialog?.duplicate ? { ...copy, id: '', model: `${copy.model} (custom)` } : copy
  }, [dialog, catalog])
  const [r, setR] = useState<RackDef>(initial)
  const [error, setError] = useState('')
  const update = (patch: Partial<RackDef>) => setR((x) => ({ ...x, ...patch }))
  const num = (v: string) => (v === '' ? undefined : Number(v))

  const preview = useMemo(() => {
    const p = createProject('preview')
    p.racks.push(rackFromDef({ ...r, uHeight: Math.max(1, Math.min(60, r.uHeight || 1)), widthMm: r.widthMm || 600 }, r.model || 'Preview'))
    return { project: p, layout: layoutProject(p) }
  }, [r])

  const save = async () => {
    if (!r.model.trim()) return setError('Model name is required')
    if (!Number.isInteger(r.uHeight) || r.uHeight < 1 || r.uHeight > 60) return setError('Height must be a whole number from 1 to 60')
    if (r.widthMm < 300 || r.widthMm > 1500) return setError('Width must be 300–1500 mm')
    if (r.depthMm < 150 || r.depthMm > 2000) return setError('Depth must be 150–2000 mm')
    const final: RackDef = { ...r, id: r.id || newCustomId(r.model, 'rack'), manufacturer: r.manufacturer.trim() || 'Custom', model: r.model.trim() }
    try {
      await saveCustomRack(final)
      useStore.getState().toast(`Saved ${final.model} to your library`, 'success')
      close()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const scale = Math.min(1, 300 / preview.layout.height)
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="dialog">
        <header>
          <h2>{initial.id ? `Edit ${initial.model}` : 'New custom rack'}</h2>
          <button onClick={close}>×</button>
        </header>
        <div className="modal-body rack-editor">
          <div className="rack-editor-fields">
            <label className="field">
              <span className="field-label">Manufacturer</span>
              <input value={r.manufacturer} onChange={(e) => update({ manufacturer: e.target.value })} placeholder="e.g. Acme" />
            </label>
            <label className="field">
              <span className="field-label">Model</span>
              <input value={r.model} autoFocus onChange={(e) => update({ model: e.target.value })} placeholder="e.g. 42U server cabinet" />
            </label>
            <div className="field-row">
              <label className="field">
                <span className="field-label">Height (U)</span>
                <input type="number" min={1} max={60} value={r.uHeight} onChange={(e) => update({ uHeight: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span className="field-label">Max load (kg)</span>
                <input type="number" min={0} value={r.maxLoadKg ?? ''} onChange={(e) => update({ maxLoadKg: num(e.target.value) })} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span className="field-label">Width (mm)</span>
                <input type="number" min={300} max={1500} value={r.widthMm} onChange={(e) => update({ widthMm: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span className="field-label">Depth (mm)</span>
                <input type="number" min={150} max={2000} value={r.depthMm} onChange={(e) => update({ depthMm: Number(e.target.value) })} />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Style</span>
              <select value={r.style} onChange={(e) => update({ style: e.target.value as RackDef['style'] })}>
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            {error && <div className="error">{error}</div>}
          </div>
          <div className="preview">
            <svg width={(preview.layout.width + 20) * scale} height={(preview.layout.height + 10) * scale} viewBox={`-10 -5 ${preview.layout.width + 20} ${preview.layout.height + 10}`}>
              <SvgDefs />
              <Drawing project={preview.project} layout={preview.layout} face="front" showCables={false} />
            </svg>
          </div>
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
