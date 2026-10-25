// Installing, managing, building and sharing library packs.
import { deleteLibrary, fetchText, FILTERS, getSettings, openExternal, openFile, postJson, saveFileAs, saveLibrary, setSettings as persistSettings } from './desktop'
import {
  checksumText,
  compareVersions,
  githubUploadUrl,
  MAX_PACK_BYTES,
  namespacePack,
  packFileName,
  parseRegistry,
  serializePack,
  slugify,
  validatePack,
  LIBRARY_FORMAT,
  LIBRARY_VERSION,
  type LibraryPack,
  type RegistryEntry,
  type RegistryIndex,
  type SubmissionResult
} from '../model/packs'
import type { RackDef } from '../model/types'
import { DEFAULT_REGISTRY_URL, useStore, type Settings } from '../store'
import { CUSTOM_LIBRARY_FILE, reloadLibrary } from './commands'

const S = () => useStore.getState()

export async function loadSettings() {
  const s = await getSettings()
  S().setSettings({
    registryUrl: typeof s.registryUrl === 'string' && s.registryUrl ? s.registryUrl : DEFAULT_REGISTRY_URL,
    author: typeof s.author === 'string' ? s.author : undefined,
    packKeys: s.packKeys && typeof s.packKeys === 'object' ? (s.packKeys as Record<string, string>) : undefined,
    autoCheckUpdates: s.autoCheckUpdates !== false
  })
}

export async function updateSettings(patch: Partial<Settings>) {
  S().setSettings(patch)
  await persistSettings(patch)
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(checksumText(text)))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function fetchRegistry(url: string): Promise<RegistryIndex> {
  return parseRegistry(await fetchText(url))
}

/** Installed pack file for a pack id, if any. */
export function installedPack(id: string): { file: string; pack: LibraryPack } | undefined {
  return S().userPacks.find((p) => p.pack.id === id)
}

export type InstallState = 'not-installed' | 'installed' | 'update'

export function installState(entry: RegistryEntry): InstallState {
  const p = installedPack(entry.id)
  if (!p) return 'not-installed'
  return compareVersions(entry.packVersion, p.pack.packVersion) > 0 ? 'update' : 'installed'
}

/** Validate, namespace and store a pack. Returns the stored pack and any warnings. */
async function storePack(pack: LibraryPack, warnings: string[]): Promise<{ pack: LibraryPack; warnings: string[] }> {
  if (pack.id === undefined) {
    // Legacy packs without an id are kept under a name derived from their title.
    const file = `import-${slugify(pack.name) || 'pack'}.json`
    await saveLibrary(file, serializePack(pack))
  } else {
    const ns = namespacePack(pack)
    // A pack moves to the new file name if it was installed under an older one.
    const old = installedPack(pack.id)
    await saveLibrary(packFileName(pack.id), serializePack(ns))
    if (old && old.file !== packFileName(pack.id)) await deleteLibrary(old.file)
    pack = ns
  }
  await reloadLibrary()
  return { pack, warnings }
}

function checkSize(text: string) {
  if (text.length > MAX_PACK_BYTES) throw new Error('The pack is larger than the 5 MB limit')
}

export async function installFromRegistry(entry: RegistryEntry, indexUrl: string): Promise<LibraryPack> {
  const url = new URL(entry.path, indexUrl).toString()
  const text = await fetchText(url)
  checkSize(text)
  if ((await sha256Hex(text)) !== entry.sha256) throw new Error(`The downloaded pack does not match the registry checksum. The registry may be updating; try again shortly.`)
  const r = validatePack(JSON.parse(text), { strict: true })
  if (!r.pack) throw new Error(r.errors.slice(0, 3).join('; '))
  if (r.pack.id !== entry.id) throw new Error(`Pack id "${r.pack.id}" does not match the registry entry "${entry.id}"`)
  const { pack } = await storePack(r.pack, r.warnings)
  return pack
}

/** Install a pack shared directly as a link (e.g. a GitHub gist raw URL). */
export async function installFromUrl(url: string): Promise<{ pack: LibraryPack; warnings: string[] }> {
  const text = await fetchText(url.trim())
  checkSize(text)
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That link did not return a JSON pack file')
  }
  const r = validatePack(data)
  if (!r.pack) throw new Error(r.errors.slice(0, 3).join('; '))
  return storePack(r.pack, r.warnings)
}

export async function installFromFile(): Promise<{ pack: LibraryPack; warnings: string[] } | null> {
  const file = await openFile(FILTERS.library, 'Install library pack')
  if (!file) return null
  checkSize(file.content)
  let data: unknown
  try {
    data = JSON.parse(file.content)
  } catch {
    throw new Error('The file is not valid JSON')
  }
  const r = validatePack(data)
  if (!r.pack) throw new Error(r.errors.slice(0, 3).join('; '))
  return storePack(r.pack, r.warnings)
}

export async function uninstallPack(file: string) {
  await deleteLibrary(file)
  await reloadLibrary()
}

export async function exportPackFile(file: string) {
  const src = S().userPacks.find((p) => p.file === file)
  if (!src) return
  const name = src.pack.id ?? (slugify(src.pack.name) || 'pack')
  await saveFileAs(`${name}.json`, FILTERS.library, serializePack(src.pack), 'Export pack')
}

// ---- Custom racks (stored alongside custom components) ----

export function customPack(): LibraryPack {
  return S().userPacks.find((p) => p.file === CUSTOM_LIBRARY_FILE)?.pack ?? { format: LIBRARY_FORMAT, version: LIBRARY_VERSION, name: 'My components', components: [], racks: [] }
}

async function writeCustom(pack: LibraryPack) {
  if (pack.components.length || pack.racks?.length) await saveLibrary(CUSTOM_LIBRARY_FILE, serializePack(pack))
  else await deleteLibrary(CUSTOM_LIBRARY_FILE)
  await reloadLibrary()
}

export async function saveCustomRack(rack: RackDef) {
  const pack = customPack()
  const { source: _s, ...clean } = rack
  await writeCustom({ ...pack, racks: [...(pack.racks ?? []).filter((r) => r.id !== rack.id), clean] })
}

export async function deleteCustomRack(id: string) {
  const pack = customPack()
  await writeCustom({ ...pack, racks: (pack.racks ?? []).filter((r) => r.id !== id) })
}

// ---- Sharing ----

export { buildPack, type PackDraft } from '../model/packs'

export async function savePackFile(pack: LibraryPack): Promise<string | null> {
  return saveFileAs(`${pack.id}.json`, FILTERS.library, serializePack(pack), 'Save pack')
}

export type ShareOutcome =
  | { kind: 'opened' | 'no-github' | 'cancelled' }
  | { kind: 'submitted'; result: SubmissionResult; registry: string; newKey?: string }

/** Edit keys are scoped to a registry, since the same pack id may exist on several servers. */
const keyScope = (indexUrl: string, packId: string) => `${new URL(indexUrl).origin} ${packId}`

export function savedEditKey(indexUrl: string, packId: string): string | undefined {
  try {
    return S().settings.packKeys?.[keyScope(indexUrl, packId)]
  } catch {
    return undefined
  }
}

/** Upload a pack to a registry server that accepts submissions. */
export async function publishToRegistry(pack: LibraryPack, index: RegistryIndex, indexUrl: string): Promise<ShareOutcome> {
  if (!index.submit) throw new Error('This registry does not accept uploads')
  const url = new URL(index.submit.url, indexUrl).toString()
  const key = savedEditKey(indexUrl, pack.id!)
  const { status, data } = await postJson(url, serializePack(pack), key)
  const reply = (data && typeof data === 'object' ? data : {}) as Partial<SubmissionResult> & { error?: string; details?: string[] }
  if (status >= 400 || !reply.status) {
    const details = reply.details?.length ? `: ${reply.details.slice(0, 3).join('; ')}` : ''
    throw new Error(`${reply.error ?? `The registry replied with ${status}`}${details}`)
  }
  const result = reply as SubmissionResult
  if (result.editKey) {
    await updateSettings({ packKeys: { ...S().settings.packKeys, [keyScope(indexUrl, pack.id!)]: result.editKey } })
  }
  return { kind: 'submitted', result, registry: index.name, newKey: result.editKey }
}

/**
 * Share a pack with the configured registry: upload it directly to a self-hosted registry
 * server, or for a GitHub-hosted registry save it and open the upload page (pull request).
 */
export async function shareToCommunity(pack: LibraryPack, index: RegistryIndex | null): Promise<ShareOutcome> {
  const registryUrl = S().settings.registryUrl
  if (index?.submit) return publishToRegistry(pack, index, registryUrl)
  const saved = await savePackFile(pack)
  if (!saved) return { kind: 'cancelled' }
  const upload = githubUploadUrl(registryUrl)
  if (!upload) return { kind: 'no-github' }
  await openExternal(upload)
  return { kind: 'opened' }
}
