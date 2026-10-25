// Validates community packs and (with --write) regenerates community/index.json.
//   npx tsx scripts/registry.ts          validate only (used by CI on pull requests)
//   npx tsx scripts/registry.ts --write  validate and rebuild the index
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { builtinComponents } from '../src/renderer/src/library'
import { checksumText, MAX_PACK_BYTES, REGISTRY_FORMAT, registryEntry, validatePack, type RegistryIndex } from '../src/renderer/src/model/packs'

const dir = join(import.meta.dirname, '..', 'community')
const packsDir = join(dir, 'packs')
const write = process.argv.includes('--write')
const builtinKeys = new Set(builtinComponents.map((c) => `${c.manufacturer}|${c.model}`.toLowerCase()))

let failed = false
const entries: RegistryIndex['packs'] = []
const ids = new Set<string>()

for (const file of readdirSync(packsDir).filter((f) => f.endsWith('.json')).sort()) {
  const path = `packs/${file}`
  const text = readFileSync(join(packsDir, file), 'utf-8')
  const problems: string[] = []
  if (Buffer.byteLength(text) > MAX_PACK_BYTES) problems.push('file is larger than 5 MB')
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (e) {
    problems.push(`invalid JSON: ${(e as Error).message}`)
  }
  const r = data === undefined ? null : validatePack(data, { strict: true })
  if (r) problems.push(...r.errors)
  const pack = r?.pack
  if (pack) {
    if (file !== `${pack.id}.json`) problems.push(`file must be named ${pack.id}.json`)
    if (ids.has(pack.id!)) problems.push(`pack id ${pack.id} is used by another pack`)
    ids.add(pack.id!)
  }
  for (const w of r?.warnings ?? []) console.warn(`  warning ${path}: ${w}`)
  if (pack) {
    const dupes = pack.components.filter((c) => builtinKeys.has(`${c.manufacturer}|${c.model}`.toLowerCase()))
    for (const d of dupes) console.warn(`  warning ${path}: "${d.manufacturer} ${d.model}" is already in the built-in library`)
  }
  if (problems.length || !pack) {
    failed = true
    console.error(`✗ ${path}`)
    for (const p of problems) console.error(`    ${p}`)
    continue
  }
  console.log(`✓ ${path}  (${pack.components.length} components, ${pack.racks?.length ?? 0} racks)`)
  entries.push(registryEntry(pack, path, createHash('sha256').update(checksumText(text), 'utf-8').digest('hex'), Buffer.byteLength(text)))
}

if (failed) {
  console.error('\nSome packs are invalid. See community/README.md for the format.')
  process.exit(1)
}

if (write) {
  const packs = entries.sort((a, b) => a.name.localeCompare(b.name))
  let previous: RegistryIndex | undefined
  try {
    previous = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf-8'))
  } catch {
    previous = undefined
  }
  // Keep the file byte-identical when nothing changed, so CI doesn't commit timestamp churn.
  if (previous && JSON.stringify(previous.packs) === JSON.stringify(packs)) {
    console.log('\ncommunity/index.json is already up to date.')
    process.exit(0)
  }
  const index: RegistryIndex = { format: REGISTRY_FORMAT, version: 1, name: 'Rack Designer community packs', updated: new Date().toISOString(), packs }
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index, null, 2) + '\n')
  console.log(`\nWrote community/index.json with ${entries.length} pack(s).`)
} else {
  console.log(`\nAll ${entries.length} pack(s) are valid.`)
}
