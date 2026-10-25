import { createHash, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { MAX_PACK_BYTES, PACK_ID_RE } from '../../src/renderer/src/model/packs'
import { ADMIN_JS, adminPage, landingPage } from './pages'
import { HttpError, RegistryStore } from './store'

export interface ServerConfig {
  port: number
  host: string
  dataDir: string
  /** Enables the admin console and API. Leave unset to disable them. */
  adminToken?: string
  /** Publish submissions immediately instead of waiting for approval. */
  autoApprove: boolean
  /** Turn off uploads entirely (read-only registry). */
  acceptSubmissions: boolean
  name: string
  /** Max submissions per client IP per hour. */
  submitRateLimit: number
  /** Use X-Forwarded-For / X-Forwarded-Proto from a reverse proxy. */
  trustProxy: boolean
  /** Public base URL (e.g. https://racks.example.lan), used on the landing page. */
  publicUrl?: string
  log?: (line: string) => void
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const bool = (v: string | undefined, d: boolean) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v))
  return {
    port: Number(env.PORT ?? 5010),
    host: env.HOST ?? '0.0.0.0',
    dataDir: env.DATA_DIR ?? './data',
    adminToken: env.ADMIN_TOKEN || undefined,
    autoApprove: bool(env.AUTO_APPROVE, false),
    acceptSubmissions: bool(env.ACCEPT_SUBMISSIONS, true),
    name: env.REGISTRY_NAME || 'Rack Designer pack registry',
    submitRateLimit: Number(env.SUBMIT_RATE_LIMIT ?? 20),
    trustProxy: bool(env.TRUST_PROXY, false),
    publicUrl: env.PUBLIC_URL?.replace(/\/+$/, '') || undefined
  }
}

/** Sliding-window counter per key. */
class RateLimiter {
  private hits = new Map<string, number[]>()
  constructor(
    private limit: number,
    private windowMs: number
  ) {}
  take(key: string): boolean {
    const now = Date.now()
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs)
    if (recent.length >= this.limit) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(now)
    this.hits.set(key, recent)
    if (this.hits.size > 10000) this.prune(now)
    return true
  }
  private prune(now: number) {
    for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k)
  }
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY'
}

function send(res: ServerResponse, status: number, body: string, type: string, extra: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), ...SECURITY_HEADERS, ...extra })
  res.end(body)
}

const json = (res: ServerResponse, status: number, data: unknown, extra: Record<string, string> = {}) =>
  send(res, status, JSON.stringify(data, null, 2), 'application/json; charset=utf-8', extra)

const HTML_CSP = { 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" }

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length'] ?? 0)
    if (declared > limit) return reject(new HttpError(413, `The pack is larger than ${Math.round(limit / 1024 / 1024)} MB`))
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > limit) {
        reject(new HttpError(413, `The pack is larger than ${Math.round(limit / 1024 / 1024)} MB`))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function tokenMatches(given: string, expected: string): boolean {
  // Compare hashes so the comparison is constant-time regardless of length.
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export function createRegistryServer(config: ServerConfig): { server: Server; store: RegistryStore } {
  const store = new RegistryStore(config.dataDir)
  store.init()
  const submitLimiter = new RateLimiter(Math.max(1, config.submitRateLimit), 60 * 60 * 1000)
  const authFailLimiter = new RateLimiter(10, 15 * 60 * 1000)
  const log = config.log ?? ((line: string) => console.log(line))
  const submit = config.acceptSubmissions ? { url: 'api/submissions', moderated: !config.autoApprove } : undefined

  const clientIp = (req: IncomingMessage) => {
    const forwarded = config.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : ''
    return forwarded || req.socket.remoteAddress || 'unknown'
  }

  const baseUrl = (req: IncomingMessage) => {
    if (config.publicUrl) return config.publicUrl
    const proto = config.trustProxy && req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
    return `${proto}://${req.headers.host ?? `localhost:${config.port}`}`
  }

  const requireAdmin = (req: IncomingMessage, ip: string) => {
    if (!config.adminToken) throw new HttpError(503, 'The admin API is disabled. Set ADMIN_TOKEN on the server to enable it.')
    const auth = String(req.headers.authorization ?? '')
    const given = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!given || !tokenMatches(given, config.adminToken)) {
      if (!authFailLimiter.take(ip)) throw new HttpError(429, 'Too many failed sign-in attempts. Try again later.')
      throw new HttpError(401, 'Invalid admin token')
    }
  }

  async function handle(req: IncomingMessage, res: ServerResponse, ip: string): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://registry')
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const method = req.method ?? 'GET'
    const isRead = method === 'GET' || method === 'HEAD'

    if (method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' })
      res.end()
      return
    }

    if (isRead && path === '/health') return json(res, 200, { ok: true, packs: store.packCount, pending: store.pendingCount })
    if (isRead && path === '/index.json') {
      return send(res, 200, store.indexJson(config.name, submit), 'application/json; charset=utf-8', { 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' })
    }
    const packMatch = /^\/packs\/([^/]+)\.json$/.exec(path)
    if (isRead && packMatch) {
      const text = PACK_ID_RE.test(packMatch[1]) ? store.packText(packMatch[1]) : null
      if (!text) throw new HttpError(404, 'Pack not found')
      return send(res, 200, text, 'application/json; charset=utf-8', { 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' })
    }
    if (isRead && path === '/') {
      const html = landingPage({ name: config.name, packs: store.listPacks(), indexUrl: `${baseUrl(req)}/index.json`, acceptsSubmissions: !!submit, moderated: !config.autoApprove })
      return send(res, 200, html, 'text/html; charset=utf-8', HTML_CSP)
    }
    if (isRead && path === '/admin') return send(res, 200, adminPage(config.name), 'text/html; charset=utf-8', HTML_CSP)
    if (isRead && path === '/admin.js') return send(res, 200, ADMIN_JS, 'text/javascript; charset=utf-8', { 'Cache-Control': 'no-cache' })

    if (method === 'POST' && path === '/api/submissions') {
      if (!submit) throw new HttpError(403, 'This registry does not accept submissions')
      if (!String(req.headers['content-type'] ?? '').includes('application/json')) throw new HttpError(415, 'Send the pack as application/json')
      if (!submitLimiter.take(ip)) throw new HttpError(429, 'Too many submissions from your address. Please try again later.')
      const text = await readBody(req, MAX_PACK_BYTES + 64 * 1024)
      let data: unknown
      try {
        data = JSON.parse(text)
      } catch {
        throw new HttpError(400, 'The request body is not valid JSON')
      }
      const key = req.headers['x-pack-key']
      const result = store.submit(data, typeof key === 'string' ? key : undefined, ip, config.autoApprove)
      log(`  submission ${result.packId} ${result.packVersion} -> ${result.status}`)
      return json(res, result.status === 'published' ? 201 : 202, result)
    }

    if (path.startsWith('/api/admin/')) {
      requireAdmin(req, ip)
      if (method === 'GET' && path === '/api/admin/submissions') return json(res, 200, { submissions: store.listPending(), packs: store.listPacks() })
      const sub = /^\/api\/admin\/submissions\/([^/]+)\/(approve|reject)$/.exec(path)
      if (method === 'POST' && sub) {
        if (sub[2] === 'approve') {
          const entry = store.approve(sub[1])
          log(`  approved ${entry.id} ${entry.packVersion}`)
          return json(res, 200, { ok: true, pack: entry })
        }
        store.reject(sub[1])
        log(`  rejected submission ${sub[1]}`)
        return json(res, 200, { ok: true })
      }
      const del = /^\/api\/admin\/packs\/([^/]+)$/.exec(path)
      if (method === 'DELETE' && del) {
        const id = decodeURIComponent(del[1])
        store.deletePack(id)
        log(`  deleted ${id}`)
        return json(res, 200, { ok: true })
      }
    }

    throw new HttpError(isRead || method === 'POST' || method === 'DELETE' ? 404 : 405, 'Not found')
  }

  const server = createServer((req, res) => {
    const started = Date.now()
    const ip = clientIp(req)
    res.on('finish', () => log(`${new Date().toISOString()} ${ip} ${req.method} ${req.url} ${res.statusCode} ${Date.now() - started}ms`))
    handle(req, res, ip).catch((e: unknown) => {
      if (res.headersSent) return res.destroy()
      if (e instanceof HttpError) return json(res, e.status, { error: e.message, ...(e.details ? { details: e.details } : {}) })
      log(`ERROR ${(e as Error).stack ?? e}`)
      json(res, 500, { error: 'Internal server error' })
    })
  })
  server.requestTimeout = 60_000
  server.headersTimeout = 30_000
  return { server, store }
}
