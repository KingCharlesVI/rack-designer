// File-based storage for the registry server. Everything lives under one data directory:
//   packs/<id>.json      published packs, exactly as served
//   meta/<id>.json       publisher key hash and history for each published pack
//   pending/<sid>.json   submissions awaiting approval
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  checksumText,
  compareVersions,
  PACK_ID_RE,
  REGISTRY_FORMAT,
  registryEntry,
  serializePack,
  validatePack,
  type LibraryPack,
  type RegistryEntry,
  type RegistryIndex,
  type SubmissionResult
} from '../../src/renderer/src/model/packs'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string[]
  ) {
    super(message)
  }
}

export interface PackMeta {
  id: string
  keyHash: string
  createdAt: string
  updatedAt: string
  history: { version: string; at: string }[]
}

export interface PendingSubmission {
  submissionId: string
  packId: string
  packVersion: string
  receivedAt: string
  client: string
  /** True when this submission claims a pack id that isn't published yet. */
  isNew: boolean
  keyHash: string
  pack: LibraryPack
}

const SUBMISSION_ID_RE = /^[A-Za-z0-9_-]{8,40}$/
const MAX_PENDING = 500

export const hashKey = (key: string) => createHash('sha256').update(key, 'utf-8').digest('hex')

function keyMatches(key: string | undefined, hash: string): boolean {
  if (!key) return false
  const a = Buffer.from(hashKey(key), 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Write via a temporary file and rename, so readers never see a half-written file. */
function writeAtomic(path: string, text: string) {
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  writeFileSync(tmp, text, 'utf-8')
  renameSync(tmp, path)
}

export class RegistryStore {
  private entries = new Map<string, RegistryEntry>()
  private indexCache: string | null = null
  readonly packsDir: string
  readonly metaDir: string
  readonly pendingDir: string

  constructor(readonly dataDir: string) {
    this.packsDir = join(dataDir, 'packs')
    this.metaDir = join(dataDir, 'meta')
    this.pendingDir = join(dataDir, 'pending')
  }

  init(): void {
    for (const d of [this.dataDir, this.packsDir, this.metaDir, this.pendingDir]) mkdirSync(d, { recursive: true })
    // Clean up temp files left by an interrupted write.
    for (const d of [this.packsDir, this.metaDir, this.pendingDir]) {
      for (const f of readdirSync(d)) if (f.endsWith('.tmp')) rmSync(join(d, f), { force: true })
    }
    this.entries.clear()
    for (const file of readdirSync(this.packsDir).filter((f) => f.endsWith('.json'))) {
      const id = file.slice(0, -5)
      try {
        this.refreshEntry(id)
      } catch (e) {
        console.warn(`Skipping invalid pack file ${file}: ${(e as Error).message}`)
      }
    }
    this.indexCache = null
  }

  get packCount() {
    return this.entries.size
  }

  get pendingCount() {
    return this.pendingFiles().length
  }

  private refreshEntry(id: string) {
    const text = readFileSync(join(this.packsDir, `${id}.json`), 'utf-8')
    const r = validatePack(JSON.parse(text), { strict: true })
    if (!r.pack || r.pack.id !== id) throw new Error(r.errors[0] ?? 'pack id does not match file name')
    const sha = createHash('sha256').update(checksumText(text), 'utf-8').digest('hex')
    this.entries.set(id, registryEntry(r.pack, `packs/${id}.json`, sha, Buffer.byteLength(text)))
    this.indexCache = null
  }

  indexJson(name: string, submit?: RegistryIndex['submit']): string {
    if (!this.indexCache) {
      const packs = [...this.entries.values()].sort((a, b) => a.name.localeCompare(b.name))
      const index: RegistryIndex = { format: REGISTRY_FORMAT, version: 1, name, updated: new Date().toISOString(), packs, ...(submit ? { submit } : {}) }
      this.indexCache = JSON.stringify(index, null, 2)
    }
    return this.indexCache
  }

  listPacks(): RegistryEntry[] {
    return [...this.entries.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  packText(id: string): string | null {
    if (!PACK_ID_RE.test(id) || !this.entries.has(id)) return null
    return readFileSync(join(this.packsDir, `${id}.json`), 'utf-8')
  }

  meta(id: string): PackMeta | null {
    const path = join(this.metaDir, `${id}.json`)
    return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf-8')) as PackMeta) : null
  }

  private publish(pack: LibraryPack, keyHash: string): void {
    const id = pack.id!
    const now = new Date().toISOString()
    const prev = this.meta(id)
    writeAtomic(join(this.packsDir, `${id}.json`), serializePack(pack).replace(/\r\n/g, '\n') + '\n')
    const meta: PackMeta = {
      id,
      keyHash,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
      history: [...(prev?.history ?? []), { version: pack.packVersion ?? '1.0.0', at: now }].slice(-50)
    }
    writeAtomic(join(this.metaDir, `${id}.json`), JSON.stringify(meta, null, 2))
    this.refreshEntry(id)
  }

  private pendingFiles(): string[] {
    return readdirSync(this.pendingDir).filter((f) => f.endsWith('.json'))
  }

  listPending(): PendingSubmission[] {
    return this.pendingFiles()
      .map((f) => {
        try {
          return JSON.parse(readFileSync(join(this.pendingDir, f), 'utf-8')) as PendingSubmission
        } catch {
          return null
        }
      })
      .filter((s): s is PendingSubmission => !!s)
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
  }

  private pendingFor(packId: string): PendingSubmission | undefined {
    return this.listPending().find((s) => s.packId === packId)
  }

  /** Accept a pack from a publisher. `key` is the edit key for packs that already exist. */
  submit(data: unknown, key: string | undefined, client: string, autoApprove: boolean): SubmissionResult {
    const r = validatePack(data, { strict: true })
    if (!r.pack) throw new HttpError(400, 'The pack is not valid', r.errors.slice(0, 20))
    const pack = r.pack
    const id = pack.id!
    const version = pack.packVersion!
    const meta = this.meta(id)
    let keyHash: string
    let editKey: string | undefined
    let replaces: PendingSubmission | undefined

    if (meta) {
      if (!keyMatches(key, meta.keyHash)) {
        throw new HttpError(403, `The pack id "${id}" is already published by someone else. To update your own pack, send its edit key; otherwise choose a different pack id.`)
      }
      const current = this.entries.get(id)?.packVersion
      if (compareVersions(version, current) <= 0) throw new HttpError(409, `Version ${version} must be higher than the published version ${current}.`)
      keyHash = meta.keyHash
      replaces = this.pendingFor(id)
    } else {
      const waiting = this.pendingFor(id)
      if (waiting) {
        if (!keyMatches(key, waiting.keyHash)) throw new HttpError(409, `The pack id "${id}" is already awaiting review. Choose a different pack id.`)
        keyHash = waiting.keyHash
        replaces = waiting
      } else {
        editKey = randomBytes(24).toString('base64url')
        keyHash = hashKey(editKey)
      }
    }

    if (autoApprove) {
      if (replaces) this.removePending(replaces.submissionId)
      this.publish(pack, keyHash)
      return { status: 'published', packId: id, packVersion: version, editKey, message: `Published ${pack.name} ${version}.` }
    }

    if (!replaces && this.pendingCount >= MAX_PENDING) throw new HttpError(503, 'The review queue is full. Please try again later.')
    const submissionId = replaces?.submissionId ?? randomBytes(9).toString('base64url')
    const submission: PendingSubmission = { submissionId, packId: id, packVersion: version, receivedAt: new Date().toISOString(), client, isNew: !meta, keyHash, pack }
    writeAtomic(join(this.pendingDir, `${submissionId}.json`), JSON.stringify(submission, null, 2))
    return { status: 'pending', packId: id, packVersion: version, submissionId, editKey, message: `${pack.name} ${version} is waiting for an administrator to approve it.` }
  }

  private removePending(submissionId: string) {
    rmSync(join(this.pendingDir, `${submissionId}.json`), { force: true })
  }

  private getPending(submissionId: string): PendingSubmission {
    if (!SUBMISSION_ID_RE.test(submissionId)) throw new HttpError(404, 'Submission not found')
    const path = join(this.pendingDir, `${submissionId}.json`)
    if (!existsSync(path)) throw new HttpError(404, 'Submission not found')
    return JSON.parse(readFileSync(path, 'utf-8')) as PendingSubmission
  }

  approve(submissionId: string): RegistryEntry {
    const s = this.getPending(submissionId)
    const meta = this.meta(s.packId)
    // Re-check in case another submission for the same id was approved in the meantime.
    if (meta && meta.keyHash !== s.keyHash) throw new HttpError(409, `Pack "${s.packId}" has since been published by a different publisher.`)
    const current = this.entries.get(s.packId)?.packVersion
    if (current && compareVersions(s.packVersion, current) <= 0) throw new HttpError(409, `Version ${s.packVersion} is not newer than the published ${current}.`)
    const r = validatePack(s.pack, { strict: true })
    if (!r.pack) throw new HttpError(400, 'The stored submission is no longer valid', r.errors)
    this.publish(r.pack, s.keyHash)
    this.removePending(submissionId)
    return this.entries.get(s.packId)!
  }

  reject(submissionId: string): void {
    this.getPending(submissionId)
    this.removePending(submissionId)
  }

  deletePack(id: string): void {
    if (!PACK_ID_RE.test(id) || !this.entries.has(id)) throw new HttpError(404, 'Pack not found')
    rmSync(join(this.packsDir, `${id}.json`), { force: true })
    rmSync(join(this.metaDir, `${id}.json`), { force: true })
    this.entries.delete(id)
    this.indexCache = null
  }

  /** Publish a pack file directly (admin import). Returns the edit key for newly claimed ids. */
  importPack(data: unknown, overwrite: boolean): { id: string; editKey?: string } {
    const r = validatePack(data, { strict: true })
    if (!r.pack) throw new HttpError(400, 'The pack is not valid', r.errors.slice(0, 20))
    const id = r.pack.id!
    const meta = this.meta(id)
    if (meta && !overwrite) throw new HttpError(409, `Pack "${id}" already exists`)
    const editKey = meta ? undefined : randomBytes(24).toString('base64url')
    this.publish(r.pack, meta?.keyHash ?? hashKey(editKey!))
    return { id, editKey }
  }
}
