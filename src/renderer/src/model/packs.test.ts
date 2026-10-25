import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCatalog, searchComponents } from '../library'
import {
  buildPack,
  checksumText,
  compareVersions,
  githubUploadUrl,
  namespacePack,
  parseLibrary,
  parseRegistry,
  serializePack,
  validatePack,
  type PackDraft
} from './packs'
import { getPorts } from './ports'
import type { ComponentDef, RackDef } from './types'

const comp = (over: Partial<ComponentDef> = {}): ComponentDef => ({
  id: 'box',
  manufacturer: 'Acme',
  model: 'Box 1U',
  category: 'server',
  uHeight: 1,
  fullDepth: true,
  power: { typicalW: 50, maxW: 100 },
  ports: [{ id: 'psu', type: 'c14', count: 2, face: 'rear', label: 'PSU' }],
  ...over
})
const rack: RackDef = { id: 'r12', manufacturer: 'Acme', model: '12U', uHeight: 12, widthMm: 600, depthMm: 600, style: 'wall-mount' }
const meta = { format: 'rack-designer-library', version: 2, id: 'jane.gear', name: 'Gear', packVersion: '1.0.0', author: 'Jane', description: 'Stuff', license: 'CC0-1.0' }

describe('pack validation', () => {
  it('accepts a complete community pack', () => {
    const r = validatePack({ ...meta, components: [comp()], racks: [rack] }, { strict: true })
    expect(r.errors).toEqual([])
    expect(r.pack?.components).toHaveLength(1)
    expect(r.pack?.racks).toHaveLength(1)
  })

  it('requires metadata in strict mode only', () => {
    const bare = { format: 'rack-designer-library', version: 1, name: 'Old', components: [comp()] }
    expect(validatePack(bare).pack).not.toBeNull()
    const strict = validatePack(bare, { strict: true })
    expect(strict.pack).toBeNull()
    expect(strict.errors.join()).toMatch(/Pack id is required/)
  })

  it('rejects bad ids, versions and items', () => {
    expect(validatePack({ ...meta, id: 'Bad Id', components: [comp()] }).errors.join()).toMatch(/author\.pack-name/)
    expect(validatePack({ ...meta, packVersion: 'v1', components: [comp()] }, { strict: true }).errors.join()).toMatch(/1\.0\.0/)
    expect(validatePack({ ...meta, components: [comp({ uHeight: 99 })] }, { strict: true }).errors.join()).toMatch(/uHeight/)
    expect(validatePack({ ...meta, components: [comp(), comp()] }, { strict: true }).errors.join()).toMatch(/duplicate id/)
    expect(validatePack({ ...meta, components: [comp({ ports: [{ id: 'x', type: 'warp-drive', count: 1, face: 'front' }] })] }, { strict: true }).errors.join()).toMatch(/unknown port type/)
    expect(validatePack({ ...meta, components: [] }, { strict: true }).errors.join()).toMatch(/no valid components or racks/)
  })

  it('strips unknown fields and unsafe values', () => {
    const evil = { ...comp(), color: 'url(javascript:alert(1))', onload: 'x', __proto__: { polluted: true } }
    const r = validatePack({ ...meta, extra: 1, components: [evil] })
    const c = r.pack!.components[0] as unknown as Record<string, unknown>
    expect(c.color).toBeUndefined()
    expect(c.onload).toBeUndefined()
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect((r.pack as unknown as Record<string, unknown>).extra).toBeUndefined()
  })

  it('parses legacy v1 library files', () => {
    const pack = parseLibrary(JSON.stringify({ format: 'rack-designer-library', version: 1, name: 'Mine', components: [comp()] }))
    expect(pack.components[0].model).toBe('Box 1U')
    expect(() => parseLibrary('{"format":"x"}')).toThrow()
  })
})

describe('installing packs', () => {
  it('namespaces ids so packs cannot collide', () => {
    const pack = namespacePack(validatePack({ ...meta, components: [comp()], racks: [rack] }).pack!)
    expect(pack.components[0].id).toBe('jane.gear/box')
    expect(pack.racks![0].id).toBe('jane.gear/r12')
    expect(namespacePack(pack).components[0].id).toBe('jane.gear/box')
    const catalog = buildCatalog([{ pack, source: 'pack-jane.gear.json' }])
    expect(catalog.byId.get('jane.gear/box')?.source).toBe('pack-jane.gear.json')
    expect(catalog.rackById.get('jane.gear/r12')?.source).toBe('pack-jane.gear.json')
    expect(searchComponents(catalog, { query: '', source: 'pack-jane.gear.json' })).toHaveLength(1)
    expect(searchComponents(catalog, { query: 'acme', source: 'builtin' })).toHaveLength(0)
    expect(getPorts(catalog.byId.get('jane.gear/box')!).map((p) => p.label)).toEqual(['PSU1', 'PSU2'])
  })

  it('compares versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBeGreaterThan(0)
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0)
    expect(compareVersions('1.0.0', undefined)).toBeGreaterThan(0)
  })
})

describe('building packs', () => {
  const draft: PackDraft = { id: 'jane.gear', name: 'Gear', packVersion: '1.2.0', author: 'Jane', description: 'Stuff', license: 'MIT', homepage: '', tags: 'Homelab, mini-pc' }

  it('produces a valid, re-namespaceable pack', () => {
    const r = buildPack(draft, [{ ...comp({ id: 'custom-box-ab12', source: 'custom-components.json' }) }, comp({ id: 'other.pack/box' })], [rack])
    expect(r.errors).toEqual([])
    expect(r.pack!.components.map((c) => c.id)).toEqual(['custom-box-ab12', 'box'])
    expect(r.pack!.tags).toEqual(['homelab', 'mini-pc'])
    expect(serializePack(r.pack!)).not.toContain('"source"')
  })

  it('reports problems with the draft', () => {
    expect(buildPack({ ...draft, author: '' }, [comp()], []).errors.join()).toMatch(/Author/)
    expect(buildPack(draft, [], []).errors.join()).toMatch(/no valid components/)
  })
})

describe('registry', () => {
  it('parses an index and drops malformed entries', () => {
    const idx = parseRegistry(
      JSON.stringify({
        format: 'rack-designer-registry',
        version: 1,
        packs: [
          { id: 'ab.cd', name: 'AB', packVersion: '1.0.0', path: 'packs/ab.cd.json', sha256: 'a'.repeat(64) },
          { id: 'bad', path: 'x', sha256: 'nope' },
          { id: 'cd.ef', path: 'file:///etc/passwd', sha256: 'b'.repeat(64) }
        ]
      })
    )
    expect(idx.packs.map((p) => p.id)).toEqual(['ab.cd'])
    expect(() => parseRegistry('{"format":"other"}')).toThrow(/not a Rack Designer pack registry/)
  })

  it('derives the GitHub upload page from a raw index URL', () => {
    expect(githubUploadUrl('https://raw.githubusercontent.com/KingCharlesVI/rack-designer/main/community/index.json')).toBe('https://github.com/KingCharlesVI/rack-designer/upload/main/community/packs')
    expect(githubUploadUrl('https://example.com/index.json')).toBeNull()
  })

  it('ships a valid community folder whose index matches the pack files', () => {
    const dir = join(__dirname, '../../../../community')
    const index = parseRegistry(readFileSync(join(dir, 'index.json'), 'utf-8'))
    const files = readdirSync(join(dir, 'packs')).filter((f) => f.endsWith('.json'))
    expect(index.packs.map((p) => p.path).sort()).toEqual(files.map((f) => `packs/${f}`).sort())
    for (const entry of index.packs) {
      const text = readFileSync(join(dir, entry.path), 'utf-8')
      expect(createHash('sha256').update(checksumText(text)).digest('hex'), `${entry.path} checksum (run npm run registry:build)`).toBe(entry.sha256)
      const r = validatePack(JSON.parse(text), { strict: true })
      expect(r.errors).toEqual([])
      expect(r.pack!.id).toBe(entry.id)
    }
  })
})

describe('registry URLs', () => {
  it('allows https anywhere and http only on private networks', async () => {
    const { isAllowedRegistryUrl } = await import('./packs')
    for (const ok of ['https://example.com/index.json', 'http://localhost:5010/index.json', 'http://192.168.1.20:5010/index.json', 'http://10.0.0.5:5010/', 'http://172.20.1.1/', 'http://100.101.5.6:5010/', 'http://homelab:5010/', 'http://racks.lan:5010/', 'http://nas.local/', 'http://[::1]:5010/']) {
      expect(isAllowedRegistryUrl(ok), ok).toBe(true)
    }
    for (const bad of ['http://example.com/index.json', 'http://8.8.8.8/', 'http://172.32.0.1/', 'ftp://192.168.1.2/', 'file:///etc/passwd', 'not a url']) {
      expect(isAllowedRegistryUrl(bad), bad).toBe(false)
    }
  })

  it('keeps a relative submit endpoint and drops absolute ones', () => {
    const base = { format: 'rack-designer-registry', version: 1, packs: [] }
    expect(parseRegistry(JSON.stringify({ ...base, submit: { url: 'api/submissions', moderated: false } })).submit).toEqual({ url: 'api/submissions', moderated: false })
    expect(parseRegistry(JSON.stringify({ ...base, submit: { url: 'https://evil.example/upload' } })).submit).toBeUndefined()
  })
})
