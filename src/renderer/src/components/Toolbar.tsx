import { canvasControls } from './Canvas'
import { exportPng, exportSvg, newDesign, openDesign, saveDesign } from '../lib/commands'
import { isDirty, useStore } from '../store'

export function Toolbar() {
  const face = useStore((s) => s.face)
  const setFace = useStore((s) => s.setFace)
  const showCables = useStore((s) => s.showCables)
  const toggleCables = useStore((s) => s.toggleCables)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const dirty = useStore(isDirty)
  const name = useStore((s) => s.project.name)
  return (
    <header className="toolbar">
      <div className="brand">
        <span className="logo">▦</span> Rack Designer
      </div>
      <div className="group">
        <button onClick={newDesign} title="New design (Ctrl+N)">
          New
        </button>
        <button onClick={openDesign} title="Open (Ctrl+O)">
          Open
        </button>
        <button onClick={() => saveDesign()} title="Save (Ctrl+S)">
          Save{dirty ? ' •' : ''}
        </button>
      </div>
      <div className="group">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↶
        </button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
          ↷
        </button>
      </div>
      <div className="group segmented">
        <button className={face === 'front' ? 'active' : ''} onClick={() => setFace('front')} title="Front view (F)">
          Front
        </button>
        <button className={face === 'rear' ? 'active' : ''} onClick={() => setFace('rear')} title="Rear view (R)">
          Rear
        </button>
      </div>
      <div className="group">
        <button className={showCables ? 'active' : ''} onClick={toggleCables} title="Show cables (C)">
          Cables
        </button>
        <button onClick={() => canvasControls.fit()} title="Fit to window (Ctrl+0)">
          Fit
        </button>
      </div>
      <div className="group">
        <button onClick={exportSvg}>Export SVG</button>
        <button onClick={exportPng}>Export PNG</button>
      </div>
      <span className="spacer" />
      <span className="doc-name">{name}</span>
    </header>
  )
}
