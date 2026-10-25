// Builds Rack Designer and publishes it as a GitHub Release from this machine.
//   npm run release            check, confirm, build, tag and upload
//   npm run release -- --yes   skip the confirmation prompt
//   npm run release -- --dry-run   run the checks and build, but don't tag or upload
//
// Needs: a clean, pushed main branch; a CHANGELOG.md section for the version in
// package.json; and the GitHub CLI logged in (gh auth login).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const REPO = 'KingCharlesVI/rack-designer'
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const root = new URL('..', import.meta.url)
const rootPath = fileURLToPath(root)

const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf-8'))
const version = pkg.version
const tag = `v${version}`
const assets = [`rack-designer-setup-${version}.exe`, `rack-designer-setup-${version}.exe.blockmap`, `rack-designer-portable-${version}.exe`, 'latest.yml'].map((f) => join(rootPath, 'dist', f))

const step = (msg) => console.log(`\n\x1b[1m==> ${msg}\x1b[0m`)
const fail = (msg) => {
  console.error(`\n\x1b[31m✗ ${msg}\x1b[0m`)
  process.exit(1)
}

// npm/npx are .cmd scripts on Windows and need a shell; git and gh must not use one, so
// that arguments containing spaces (like the release title) stay intact.
const needsShell = (cmd) => process.platform === 'win32' && (cmd === 'npm' || cmd === 'npx')

/** Run a command, streaming its output. */
function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: rootPath, stdio: 'inherit', shell: needsShell(cmd) })
  if (r.status !== 0) fail(`${cmd} ${cmdArgs.join(' ')} failed`)
}

/** Run a command and return its trimmed stdout (null on failure). */
function read(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: rootPath, encoding: 'utf-8', shell: needsShell(cmd) })
  return r.status === 0 ? r.stdout.trim() : null
}

// ---- Checks (nothing is changed until these pass) ----
step(`Preparing Rack Designer ${version}`)

if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`package.json version "${version}" must look like 1.2.3`)
if (read('git', ['status', '--porcelain']) !== '') fail('You have uncommitted changes. Commit or stash them first.')
const branch = read('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
if (branch !== 'main') fail(`Releases are made from main (you're on ${branch}).`)

read('git', ['fetch', '--quiet', '--tags', 'origin'])
const head = read('git', ['rev-parse', 'HEAD'])
const remoteHead = read('git', ['rev-parse', 'origin/main'])
if (head !== remoteHead) fail('Your main branch differs from origin/main. Push (or pull) first so the release matches GitHub.')
if (read('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`])) fail(`Tag ${tag} already exists. Bump the version in package.json first.`)
if (read('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`])) fail(`Tag ${tag} already exists on GitHub. Bump the version in package.json first.`)

const changelog = readFileSync(new URL('CHANGELOG.md', root), 'utf-8').replace(/\r\n/g, '\n')
if (!changelog.includes(`## [${version}]`)) fail(`CHANGELOG.md has no "## [${version}]" section. Add the release notes first.`)

if (!dryRun) {
  if (read('gh', ['--version']) === null) fail('The GitHub CLI (gh) is not installed: https://cli.github.com')
  if (read('gh', ['auth', 'status']) === null) fail('The GitHub CLI is not logged in. Run: gh auth login')
  if (read('gh', ['release', 'view', tag, '--repo', REPO]) !== null) fail(`A GitHub release for ${tag} already exists.`)
}

console.log(`  version   ${version}`)
console.log(`  commit    ${head.slice(0, 10)} (main, pushed)`)
console.log(`  publish   ${dryRun ? 'no (dry run)' : `github.com/${REPO}/releases/tag/${tag}`}`)

if (!dryRun && !args.has('--yes')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`\nBuild and publish Rack Designer ${version} publicly on GitHub? [y/N] `)
  rl.close()
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log('Cancelled.')
    process.exit(0)
  }
}

// ---- Build ----
step('Type check and tests')
run('npm', ['run', 'typecheck'])
run('npm', ['test'])

step('Building the app, installer and portable exe')
run('npx', ['electron-vite', 'build'])
run('npx', ['electron-builder', '--win', '--publish', 'never'])

for (const a of assets) if (!existsSync(a)) fail(`Expected build output is missing: ${a}`)
const latest = readFileSync(join(rootPath, 'dist', 'latest.yml'), 'utf-8')
if (!latest.includes(`version: ${version}`)) fail('dist/latest.yml does not match the version being released')

if (dryRun) {
  step('Dry run complete')
  for (const a of assets) console.log(`  ${a}`)
  process.exit(0)
}

// ---- Publish ----
step(`Tagging ${tag}`)
run('git', ['tag', '-a', tag, '-m', `Rack Designer ${version}`])
run('git', ['push', 'origin', tag])

step('Creating the GitHub release and uploading files')
const notesFile = join(mkdtempSync(join(tmpdir(), 'rack-release-')), 'notes.md')
writeFileSync(notesFile, read('node', ['scripts/release-notes.mjs', version]) ?? '')
const upload = spawnSync('gh', ['release', 'create', tag, ...assets, '--repo', REPO, '--title', `Rack Designer ${version}`, '--notes-file', notesFile, '--verify-tag'], {
  cwd: rootPath,
  stdio: 'inherit'
})
if (upload.status !== 0) {
  console.error(`\nThe tag ${tag} was pushed, but the upload failed. Retry the upload with:`)
  console.error(`  gh release create ${tag} ${assets.map((a) => `"${a}"`).join(' ')} --repo ${REPO} --title "Rack Designer ${version}" --notes-file "${notesFile}" --verify-tag`)
  process.exit(1)
}

step('Done')
console.log(`  https://github.com/${REPO}/releases/tag/${tag}`)
console.log('  Installed copies will offer this update the next time they check.')
