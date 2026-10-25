import { getAnalysis } from './analysis'
import { closeAfterSave, deleteLibrary, FILTERS, listLibrary, openFile, saveFileAs, saveLibrary, writeFile } from './desktop'
import { elevationSvg, svgToPng } from './exportDrawing'
import { addDevice, findDevice, findFreeMount, getComponent, mergeProject, uid } from '../model/project'
import { billOfMaterials, cableSchedule, powerReport, toCsv } from '../model/reports'
import { FileFormatError, parseProject, serializePack, serializeProject } from '../model/serialize'
import { customPack, exportPackFile, installFromFile } from './packCommands'
import { buildExample } from '../model/example'
import type { ComponentDef } from '../model/types'
import { isDirty, starterProject, useStore } from '../store'

const S = () => useStore.getState()

export const CUSTOM_LIBRARY_FILE = 'custom-components.json'

function baseName(path: string | null): string {
  if (!path) return S().project.name.replace(/[\\/:*?"<>|]+/g, '_') || 'design'
  return path.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '')
}

function confirmDiscard(): boolean {
  return !isDirty(S()) || window.confirm('Discard unsaved changes to the current design?')
}

function reportError(e: unknown) {
  S().toast(e instanceof FileFormatError || e instanceof Error ? e.message : String(e), 'error')
}

export function newDesign() {
  if (!confirmDiscard()) return
  S().load(starterProject(), null)
}

export function openExample() {
  if (!confirmDiscard()) return
  S().load(buildExample(S().catalog), null)
}

export function loadProjectText(path: string, content: string) {
  try {
    const { project, warnings } = parseProject(content, (id) => S().catalog.byId.get(id))
    S().load(project, path.toLowerCase().endsWith('.rack') ? path : null)
    S().toast(`Opened ${baseName(path)}`, 'success')
    warnings.slice(0, 3).forEach((w) => S().toast(w, 'error'))
  } catch (e) {
    reportError(e)
  }
}

export async function openDesign() {
  if (!confirmDiscard()) return
  const file = await openFile(FILTERS.project, 'Open design')
  if (file) loadProjectText(file.path, file.content)
}

export async function saveDesign(saveAs = false): Promise<boolean> {
  const { project, filePath } = S()
  const text = serializeProject(project)
  try {
    if (filePath && !saveAs) {
      await writeFile(filePath, text)
      S().markSaved(filePath)
      S().toast('Saved', 'success')
      return true
    }
    const path = await saveFileAs(`${baseName(filePath)}.rack`, FILTERS.project, text, 'Save design')
    if (!path) return false
    S().markSaved(path)
    S().toast(`Saved ${baseName(path)}`, 'success')
    return true
  } catch (e) {
    reportError(e)
    return false
  }
}

export async function saveAndClose() {
  if (await saveDesign()) closeAfterSave()
}

export async function importMerge() {
  const file = await openFile(FILTERS.project, 'Merge racks from design')
  if (!file) return
  try {
    const { project } = parseProject(file.content, (id) => S().catalog.byId.get(id))
    let counts = { racks: 0, devices: 0 }
    S().edit((d) => {
      counts = mergeProject(d, project)
    })
    S().toast(`Imported ${counts.racks} rack(s) and ${counts.devices} device(s)`, 'success')
  } catch (e) {
    reportError(e)
  }
}

export async function reloadLibrary() {
  S().setUserPacks(await listLibrary())
}

export async function importLibrary() {
  try {
    const r = await installFromFile()
    if (!r) return
    S().toast(`Installed "${r.pack.name}": ${r.pack.components.length} component(s), ${r.pack.racks?.length ?? 0} rack(s)`, 'success')
    if (r.warnings.length) S().toast(`${r.warnings.length} warning(s): ${r.warnings[0]}`, 'info')
  } catch (e) {
    reportError(e)
  }
}

export async function exportLibrary() {
  if (!S().userPacks.some((p) => p.file === CUSTOM_LIBRARY_FILE)) {
    S().toast('You have no custom components or racks to export yet', 'info')
    return
  }
  await exportPackFile(CUSTOM_LIBRARY_FILE)
}

export async function saveCustomComponent(comp: ComponentDef) {
  const pack = customPack()
  const components = [...pack.components.filter((c) => c.id !== comp.id), comp]
  await saveLibrary(CUSTOM_LIBRARY_FILE, serializePack({ ...pack, components }))
  await reloadLibrary()
  // Keep designs that already use this component in sync with the new definition.
  if (S().project.components[comp.id]) {
    S().edit((d) => {
      d.components[comp.id] = structuredClone({ ...comp, source: undefined })
    })
  }
}

export async function deleteCustomComponent(id: string) {
  const pack = customPack()
  const components = pack.components.filter((c) => c.id !== id)
  if (components.length || pack.racks?.length) await saveLibrary(CUSTOM_LIBRARY_FILE, serializePack({ ...pack, components }))
  else await deleteLibrary(CUSTOM_LIBRARY_FILE)
  await reloadLibrary()
}

export function newCustomId(model: string, prefix = 'custom'): string {
  return `${prefix}-${model.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${uid().slice(0, 4)}`
}

async function exportCsv(suffix: string, rows: Record<string, unknown>[], headers?: Record<string, string>) {
  if (!rows.length) {
    S().toast('Nothing to export', 'info')
    return
  }
  const path = await saveFileAs(`${baseName(S().filePath)}-${suffix}.csv`, FILTERS.csv, toCsv(rows, headers))
  if (path) S().toast(`Exported ${suffix}`, 'success')
}

export async function exportSvg() {
  const { svg } = elevationSvg(S().project, { showCables: S().showCables })
  const path = await saveFileAs(`${baseName(S().filePath)}-elevations.svg`, FILTERS.svg, svg)
  if (path) S().toast('Exported SVG', 'success')
}

export async function exportPng() {
  try {
    const { svg, width, height } = elevationSvg(S().project, { showCables: S().showCables })
    const scale = Math.min(2, 16000 / Math.max(width, height))
    const png = await svgToPng(svg, width, height, scale)
    const path = await saveFileAs(`${baseName(S().filePath)}-elevations.png`, FILTERS.png, png)
    if (path) S().toast('Exported PNG', 'success')
  } catch (e) {
    reportError(e)
  }
}

export const exportBom = () =>
  exportCsv(
    'bom',
    billOfMaterials(S().project) as unknown as Record<string, unknown>[],
    { category: 'Category', manufacturer: 'Manufacturer', model: 'Model', quantity: 'Quantity', uHeight: 'U', unitWeightKg: 'Unit weight (kg)' }
  )

export const exportCables = () =>
  exportCsv('cables', cableSchedule(S().project) as unknown as Record<string, unknown>[], {
    label: 'Label',
    kind: 'Type',
    fromDevice: 'From device',
    fromPort: 'From port',
    fromLocation: 'From location',
    toDevice: 'To device',
    toPort: 'To port',
    toLocation: 'To location',
    cableType: 'Cable',
    lengthM: 'Length (m)',
    color: 'Colour'
  })

export const exportPower = () =>
  exportCsv('power', powerReport(S().project, getAnalysis(S().project).power) as unknown as Record<string, unknown>[], {
    device: 'Device',
    model: 'Model',
    category: 'Category',
    location: 'Location',
    energized: 'Energized',
    drawW: 'Own draw (W)',
    throughW: 'Total load (W)',
    capacityW: 'Capacity (W)',
    utilization: 'Utilisation',
    inlets: 'Inlets connected',
    feeds: 'Feeds'
  })

/** Place a library component in the selected (or first) rack at the first free position. */
export function quickAdd(comp: ComponentDef) {
  const { project, selection, face } = S()
  let rackId = project.racks[0]?.id
  if (selection?.kind === 'rack') rackId = selection.id
  else if (selection?.kind === 'device') rackId = findDevice(project, selection.id)?.rackId ?? rackId
  if (!rackId) {
    S().toast('Add a rack first', 'error')
    return
  }
  const rack = project.racks.find((r) => r.id === rackId)!
  const mount = findFreeMount(project, comp, rackId, comp.uHeight > 0 ? { kind: 'rack', u: rack.uHeight - comp.uHeight + 1, face } : undefined)
  if (!mount) {
    S().toast(`No free space for ${comp.model} in ${rack.name}`, 'error')
    return
  }
  let newId = ''
  const err = S().edit((d) => {
    const dev = addDevice(d, comp, rackId, mount)
    if (typeof dev === 'string') return dev
    newId = dev.id
  })
  if (err) S().toast(err, 'error')
  else S().select({ kind: 'device', id: newId })
}

export function duplicateSelection() {
  const { project, selection } = S()
  if (selection?.kind !== 'device') return
  const d = findDevice(project, selection.id)
  if (!d) return
  const comp = getComponent(project, d)
  const mount = findFreeMount(project, comp, d.rackId, d.mount)
  if (!mount) {
    S().toast('No free space to duplicate into', 'error')
    return
  }
  let newId = ''
  const err = S().edit((p) => {
    const dev = addDevice(p, comp, d.rackId, mount)
    if (typeof dev === 'string') return dev
    dev.overrides = d.overrides && { ...d.overrides }
    newId = dev.id
  })
  if (err) S().toast(err, 'error')
  else S().select({ kind: 'device', id: newId })
}
