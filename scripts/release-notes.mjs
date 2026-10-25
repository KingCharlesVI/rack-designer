// Prints the CHANGELOG.md section for a version, for use as GitHub release notes.
//   node scripts/release-notes.mjs 0.2.0 > release-notes.md
import { readFileSync } from 'node:fs'

const version = process.argv[2]
if (!version) {
  console.error('Usage: node scripts/release-notes.mjs <version>')
  process.exit(2)
}
const text = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf-8').replace(/\r\n/g, '\n')
const heading = `## [${version}]`
const start = text.indexOf(heading)
if (start < 0) {
  console.error(`CHANGELOG.md has no "${heading}" section`)
  process.exit(1)
}
const rest = text.slice(start + heading.length)
const end = rest.search(/\n## \[/)
const body = (end < 0 ? rest : rest.slice(0, end)).trim()
console.log(`${body}\n\n---\nDownload **rack-designer-setup-${version}.exe** to install (updates itself), or **rack-designer-portable-${version}.exe** to run without installing.`)
