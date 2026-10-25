// Rack Designer pack registry server.
//   registry-server.mjs [serve]                     start the server (default)
//   registry-server.mjs import <pack.json…> [--overwrite]   publish pack files directly
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { configFromEnv, createRegistryServer } from './server'
import { HttpError, RegistryStore } from './store'

const HELP = `Rack Designer pack registry server

Usage:
  node registry-server.mjs [serve]
  node registry-server.mjs import <pack.json>... [--overwrite]

Environment:
  PORT                 Port to listen on (default 5010)
  HOST                 Address to bind (default 0.0.0.0)
  DATA_DIR             Where packs are stored (default ./data)
  ADMIN_TOKEN          Enables the admin console at /admin (unset = disabled)
  AUTO_APPROVE         true = publish uploads immediately (default false: wait for approval)
  ACCEPT_SUBMISSIONS   false = read-only registry (default true)
  REGISTRY_NAME        Name shown in the app and on the landing page
  SUBMIT_RATE_LIMIT    Max uploads per client IP per hour (default 20)
  TRUST_PROXY          true when running behind a reverse proxy (uses X-Forwarded-*)
  PUBLIC_URL           Public base URL shown on the landing page, e.g. https://racks.home.lan
`

function serve() {
  const config = configFromEnv()
  const { server, store } = createRegistryServer(config)
  server.listen(config.port, config.host, () => {
    console.log(`${config.name} listening on http://${config.host}:${config.port}`)
    console.log(`  data: ${resolve(config.dataDir)} (${store.packCount} packs, ${store.pendingCount} pending)`)
    console.log(`  uploads: ${config.acceptSubmissions ? (config.autoApprove ? 'published immediately' : 'held for approval') : 'disabled'}`)
    console.log(`  admin console: ${config.adminToken ? `/admin` : 'disabled (set ADMIN_TOKEN)'}`)
    if (config.acceptSubmissions && !config.autoApprove && !config.adminToken) console.warn('  warning: uploads wait for approval but ADMIN_TOKEN is not set, so nothing can be approved')
  })
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

function importPacks(files: string[], overwrite: boolean) {
  if (!files.length) {
    console.error('Give one or more pack .json files to import.')
    process.exit(2)
  }
  const store = new RegistryStore(configFromEnv().dataDir)
  store.init()
  let failed = 0
  for (const file of files) {
    try {
      const { id, editKey } = store.importPack(JSON.parse(readFileSync(file, 'utf-8')), overwrite)
      console.log(`✓ ${file} → ${id}${editKey ? `  (edit key: ${editKey})` : ''}`)
    } catch (e) {
      failed++
      console.error(`✗ ${file}: ${(e as Error).message}`)
      if (e instanceof HttpError) for (const d of e.details ?? []) console.error(`    ${d}`)
    }
  }
  if (failed) process.exit(1)
}

const [cmd = 'serve', ...rest] = process.argv.slice(2)
if (cmd === '--help' || cmd === '-h' || cmd === 'help') console.log(HELP)
else if (cmd === 'serve') serve()
else if (cmd === 'import') importPacks(rest.filter((a) => !a.startsWith('--')), rest.includes('--overwrite'))
else {
  console.error(`Unknown command "${cmd}".\n\n${HELP}`)
  process.exit(2)
}
