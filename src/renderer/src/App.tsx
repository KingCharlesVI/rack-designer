import { useEffect } from 'react'
import { BottomPanel } from './components/BottomPanel'
import { Canvas, canvasControls } from './components/Canvas'
import { CommunityDialog } from './components/CommunityDialog'
import { CustomComponentDialog } from './components/CustomComponentDialog'
import { CustomRackDialog } from './components/CustomRackDialog'
import { LibraryPanel } from './components/LibraryPanel'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Toolbar } from './components/Toolbar'
import * as cmd from './lib/commands'
import { loadSettings } from './lib/packCommands'
import { onFileOpened, onMenu, setDirty, setTitle } from './lib/desktop'
import { disconnect, findDevice, moveDevice, removeDevices } from './model/project'
import { isDirty, useStore } from './store'

const S = () => useStore.getState()

const MENU: Record<string, () => void> = {
  new: cmd.newDesign,
  example: cmd.openExample,
  open: () => void cmd.openDesign(),
  save: () => void cmd.saveDesign(),
  saveAs: () => void cmd.saveDesign(true),
  saveAndClose: () => void cmd.saveAndClose(),
  importMerge: () => void cmd.importMerge(),
  importLibrary: () => void cmd.importLibrary(),
  exportSvg: () => void cmd.exportSvg(),
  exportPng: () => void cmd.exportPng(),
  exportBom: () => void cmd.exportBom(),
  exportCables: () => void cmd.exportCables(),
  exportPower: () => void cmd.exportPower(),
  exportLibrary: () => void cmd.exportLibrary(),
  undo: () => (isTyping() ? document.execCommand('undo') : S().undo()),
  redo: () => (isTyping() ? document.execCommand('redo') : S().redo()),
  duplicate: cmd.duplicateSelection,
  customComponent: () => S().openDialog({ kind: 'custom-component' }),
  customRack: () => S().openDialog({ kind: 'custom-rack' }),
  community: () => S().openDialog({ kind: 'community' }),
  viewFront: () => S().setFace('front'),
  viewRear: () => S().setFace('rear'),
  toggleCables: () => S().toggleCables(),
  zoomIn: () => canvasControls.zoomBy(1.2),
  zoomOut: () => canvasControls.zoomBy(1 / 1.2),
  zoomFit: () => canvasControls.fit()
}

function isTyping(): boolean {
  const el = document.activeElement
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable)
}

function deleteSelection() {
  const { selection, edit, select, project } = S()
  if (!selection) return
  if (selection.kind === 'device') edit((p) => removeDevices(p, [selection.id]))
  else if (selection.kind === 'connection') edit((p) => disconnect(p, [selection.id]))
  else if (selection.kind === 'port') {
    const c = project.connections.find((x) => (x.a.deviceId === selection.deviceId && x.a.portId === selection.portId) || (x.b.deviceId === selection.deviceId && x.b.portId === selection.portId))
    if (c) edit((p) => disconnect(p, [c.id]))
    return
  } else return
  select(null)
}

function nudge(delta: number) {
  const { selection, project, edit, toast } = S()
  if (selection?.kind !== 'device') return
  const d = findDevice(project, selection.id)
  if (!d || d.mount.kind !== 'rack') return
  const mount = { ...d.mount, u: d.mount.u + delta }
  const err = edit((p) => moveDevice(p, d.id, d.rackId, mount))
  if (err) toast(err, 'error')
}

export function App() {
  const dialog = useStore((s) => s.dialog)
  const dirty = useStore(isDirty)
  const name = useStore((s) => s.project.name)
  const filePath = useStore((s) => s.filePath)

  useEffect(() => {
    void cmd.reloadLibrary()
    void loadSettings()
    const offMenu = onMenu((c) => MENU[c]?.())
    const offOpen = onFileOpened((f) => {
      if (!isDirty(S()) || window.confirm('Discard unsaved changes to the current design?')) cmd.loadProjectText(f.path, f.content)
    })
    return () => {
      offMenu()
      offOpen()
    }
  }, [])

  useEffect(() => {
    const file = filePath ? filePath.replace(/^.*[\\/]/, '') : 'unsaved'
    setTitle(`${dirty ? '• ' : ''}${name} (${file}) — Rack Designer`)
    setDirty(dirty)
  }, [dirty, name, filePath])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping() || S().dialog) {
        if (e.key === 'Escape' && S().dialog) S().openDialog(null)
        return
      }
      const ctrl = e.ctrlKey || e.metaKey
      // In a plain browser there is no native menu, so handle its shortcuts here too.
      if (ctrl && !window.api) {
        const k = e.key.toLowerCase()
        const map: Record<string, string> = { z: 'undo', y: 'redo', s: e.shiftKey ? 'saveAs' : 'save', o: 'open', n: 'new', d: 'duplicate', '0': 'zoomFit', '=': 'zoomIn', '-': 'zoomOut' }
        if (map[k]) {
          e.preventDefault()
          MENU[map[k]]()
        }
        return
      }
      if (ctrl || e.altKey) return
      switch (e.key) {
        case 'Escape':
          if (S().pending) S().setPending(null)
          else S().select(null)
          break
        case 'Delete':
        case 'Backspace':
          deleteSelection()
          break
        case 'f':
        case 'F':
          S().setFace('front')
          break
        case 'r':
        case 'R':
          S().setFace('rear')
          break
        case 'c':
        case 'C':
          S().toggleCables()
          break
        case 'ArrowUp':
          e.preventDefault()
          nudge(1)
          break
        case 'ArrowDown':
          e.preventDefault()
          nudge(-1)
          break
        default:
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <Toolbar />
      <div className="main">
        <LibraryPanel />
        <div className="center">
          <Canvas />
          <BottomPanel />
        </div>
        <PropertiesPanel />
      </div>
      {dialog?.kind === 'custom-component' && <CustomComponentDialog key={`${dialog.componentId}-${dialog.duplicate}`} />}
      {dialog?.kind === 'custom-rack' && <CustomRackDialog key={`${dialog.rackId}-${dialog.duplicate}`} />}
      {dialog?.kind === 'community' && <CommunityDialog />}
      <Toasts />
    </div>
  )
}

function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
