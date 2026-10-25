import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checksumText, parseRegistry } from '../../src/renderer/src/model/packs'
import { createRegistryServer, type ServerConfig } from './server'

const ADMIN = 'test-admin-token'
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!()
})

async function start(over: Partial<ServerConfig> = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'rack-registry-'))
  const config: ServerConfig = {
    port: 0,
    host: '127.0.0.1',
    dataDir,
    adminToken: ADMIN,
    autoApprove: false,
    acceptSubmissions: true,
    name: 'Test registry',
    submitRateLimit: 100,
    trustProxy: false,
    log: () => {},
    ...over
  }
  const { server, store } = createRegistryServer(config)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  cleanups.push(
    () =>
      new Promise<void>((r) =>
        server.close(() => {
          rmSync(dataDir, { recursive: true, force: true })
          r()
        })
      )
  )
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json', ...headers } : headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
    })
    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
    return { status: res.status, data, text, headers: res.headers }
  }
  const admin = (method: string, path: string) => call(method, path, undefined, { authorization: `Bearer ${ADMIN}` })
  return { base, call, admin, store, dataDir }
}

const pack = (over: Record<string, unknown> = {}) => ({
  format: 'rack-designer-library',
  version: 2,
  id: 'jane.gear',
  name: 'Gear',
  packVersion: '1.0.0',
  author: 'Jane',
  description: 'Stuff',
  license: 'CC0-1.0',
  components: [{ id: 'box', manufacturer: 'Acme', model: 'Box 1U', category: 'server', uHeight: 1, fullDepth: true, ports: [{ id: 'psu', type: 'c14', count: 2, face: 'rear', label: 'PSU' }] }],
  racks: [],
  ...over
})

describe('registry server', () => {
  it('serves an empty index that advertises submissions', async () => {
    const { call } = await start()
    const r = await call('GET', '/index.json')
    expect(r.status).toBe(200)
    const idx = parseRegistry(r.text)
    expect(idx.packs).toEqual([])
    expect(idx.submit).toEqual({ url: 'api/submissions', moderated: true })
    expect((await call('GET', '/health')).data).toMatchObject({ ok: true, packs: 0 })
  })

  it('holds submissions for approval, then publishes them with a matching checksum', async () => {
    const { call, admin } = await start()
    const sub = await call('POST', '/api/submissions', pack())
    expect(sub.status).toBe(202)
    expect(sub.data).toMatchObject({ status: 'pending', packId: 'jane.gear', packVersion: '1.0.0' })
    expect(sub.data.editKey).toMatch(/^[\w-]{20,}$/)
    expect(parseRegistry((await call('GET', '/index.json')).text).packs).toHaveLength(0)

    expect((await call('GET', '/api/admin/submissions')).status).toBe(401)
    const list = await admin('GET', '/api/admin/submissions')
    expect(list.data.submissions).toHaveLength(1)
    expect(list.data.submissions[0].keyHash).toBeDefined()
    expect((await admin('POST', `/api/admin/submissions/${sub.data.submissionId}/approve`)).status).toBe(200)

    const idx = parseRegistry((await call('GET', '/index.json')).text)
    expect(idx.packs.map((p) => p.id)).toEqual(['jane.gear'])
    const file = await call('GET', `/${idx.packs[0].path}`)
    expect(file.status).toBe(200)
    expect(createHash('sha256').update(checksumText(file.text)).digest('hex')).toBe(idx.packs[0].sha256)
  })

  it('protects pack ids with the edit key and requires newer versions', async () => {
    const { call } = await start({ autoApprove: true })
    const first = await call('POST', '/api/submissions', pack())
    expect(first.status).toBe(201)
    const key = first.data.editKey as string
    expect((await call('POST', '/api/submissions', pack({ packVersion: '1.1.0' }))).status).toBe(403)
    expect((await call('POST', '/api/submissions', pack({ packVersion: '1.1.0' }), { 'x-pack-key': 'wrong' })).status).toBe(403)
    expect((await call('POST', '/api/submissions', pack({ packVersion: '1.0.0' }), { 'x-pack-key': key })).status).toBe(409)
    const update = await call('POST', '/api/submissions', pack({ packVersion: '1.1.0' }), { 'x-pack-key': key })
    expect(update.status).toBe(201)
    expect(update.data.editKey).toBeUndefined()
    expect(parseRegistry((await call('GET', '/index.json')).text).packs[0].packVersion).toBe('1.1.0')
  })

  it('stops a second publisher claiming an id that is awaiting review', async () => {
    const { call } = await start()
    const first = await call('POST', '/api/submissions', pack())
    expect((await call('POST', '/api/submissions', pack({ packVersion: '1.0.1' }))).status).toBe(409)
    const replace = await call('POST', '/api/submissions', pack({ packVersion: '1.0.1' }), { 'x-pack-key': first.data.editKey })
    expect(replace.status).toBe(202)
    expect(replace.data.submissionId).toBe(first.data.submissionId)
  })

  it('rejects invalid, oversized and non-JSON uploads', async () => {
    const { call } = await start()
    const bad = await call('POST', '/api/submissions', pack({ id: 'NOPE' }))
    expect(bad.status).toBe(400)
    expect(bad.data.details.join()).toMatch(/author\.pack-name/)
    expect((await call('POST', '/api/submissions', '{not json')).status).toBe(400)
    expect((await call('POST', '/api/submissions', 'x'.repeat(6 * 1024 * 1024))).status).toBe(413)
    const form = await fetch(`${(await start()).base}/api/submissions`, { method: 'POST', body: 'a=b', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    expect(form.status).toBe(415)
  })

  it('rate-limits uploads and failed admin sign-ins', async () => {
    const { call } = await start({ submitRateLimit: 2 })
    await call('POST', '/api/submissions', pack({ id: 'a1.one' }))
    await call('POST', '/api/submissions', pack({ id: 'a1.two' }))
    expect((await call('POST', '/api/submissions', pack({ id: 'a1.three' }))).status).toBe(429)
    let last = 0
    for (let i = 0; i < 12; i++) last = (await call('GET', '/api/admin/submissions', undefined, { authorization: 'Bearer nope' })).status
    expect(last).toBe(429)
  })

  it('supports read-only mode and a disabled admin API', async () => {
    const { call } = await start({ acceptSubmissions: false, adminToken: undefined })
    expect(parseRegistry((await call('GET', '/index.json')).text).submit).toBeUndefined()
    expect((await call('POST', '/api/submissions', pack())).status).toBe(403)
    expect((await call('GET', '/api/admin/submissions', undefined, { authorization: 'Bearer x' })).status).toBe(503)
  })

  it('escapes pack data on the landing page and sends security headers', async () => {
    const { call } = await start({ autoApprove: true })
    await call('POST', '/api/submissions', pack({ name: '<script>alert(1)</script>' }))
    const page = await call('GET', '/')
    expect(page.text).not.toContain('<script>alert')
    expect(page.text).toContain('&lt;script&gt;')
    expect(page.headers.get('content-security-policy')).toContain("script-src 'self'")
    expect((await call('GET', '/admin')).text).toContain('/admin.js')
  })

  it('lets the admin delete packs, and keeps data across restarts', async () => {
    const s = await start({ autoApprove: true })
    await s.call('POST', '/api/submissions', pack())
    await s.call('POST', '/api/submissions', pack({ id: 'jane.other' }))
    expect((await s.admin('DELETE', '/api/admin/packs/jane.other')).status).toBe(200)
    expect((await s.call('GET', '/packs/jane.other.json')).status).toBe(404)
    expect((await s.call('GET', '/packs/..%2F..%2Fetc%2Fpasswd.json')).status).toBe(404)
    s.store.init()
    expect(s.store.listPacks().map((p) => p.id)).toEqual(['jane.gear'])
  })
})
