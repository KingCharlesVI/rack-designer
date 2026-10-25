import { useEffect, useMemo, useState } from 'react'
import { builtinComponents, CATEGORY_SINGULAR } from '../library'
import { CUSTOM_LIBRARY_FILE } from '../lib/commands'
import { openExternal } from '../lib/desktop'
import {
  buildPack,
  customPack,
  exportPackFile,
  fetchRegistry,
  installFromFile,
  installFromRegistry,
  installFromUrl,
  installState,
  savedEditKey,
  savePackFile,
  shareToCommunity,
  type ShareOutcome,
  uninstallPack,
  updateSettings,
  type PackDraft
} from '../lib/packCommands'
import { githubRepoUrl, LICENSES, PACK_ID_RE, slugify, type LibraryPack, type RegistryIndex } from '../model/packs'
import type { ComponentDef, RackDef } from '../model/types'
import { DEFAULT_REGISTRY_URL, useStore } from '../store'

type Tab = 'browse' | 'installed' | 'create'

export function CommunityDialog() {
  const initialTab = useStore((s) => (s.dialog?.kind === 'community' ? s.dialog.tab : undefined))
  const [tab, setTab] = useState<Tab>(initialTab ?? 'browse')
  const close = () => useStore.getState().openDialog(null)
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal wide community" role="dialog">
        <header>
          <h2>Community packs</h2>
          <button onClick={close}>×</button>
        </header>
        <div className="tabs">
          <button className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}>
            Browse
          </button>
          <button className={tab === 'installed' ? 'active' : ''} onClick={() => setTab('installed')}>
            Installed
          </button>
          <button className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>
            Create &amp; share
          </button>
        </div>
        <div className="modal-body">
          {tab === 'browse' && <Browse />}
          {tab === 'installed' && <Installed onCreate={() => setTab('create')} />}
          {tab === 'create' && <Create />}
        </div>
      </div>
    </div>
  )
}

function Browse() {
  const registryUrl = useStore((s) => s.settings.registryUrl)
  useStore((s) => s.userPacks) // re-render install state after changes
  const toast = useStore((s) => s.toast)
  const [index, setIndex] = useState<RegistryIndex | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState(registryUrl)

  const load = async (url = registryUrl) => {
    setLoading(true)
    setError('')
    try {
      setIndex(await fetchRegistry(url))
    } catch (e) {
      setIndex(null)
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryUrl])

  const packs = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    return (index?.packs ?? []).filter((p) => {
      const t = [p.name, p.id, p.author, p.description, ...p.tags, ...p.manufacturers].join(' ').toLowerCase()
      return terms.every((x) => t.includes(x))
    })
  }, [index, query])

  const install = async (id: string) => {
    const entry = index?.packs.find((p) => p.id === id)
    if (!entry) return
    setBusy(id)
    try {
      const pack = await installFromRegistry(entry, registryUrl)
      toast(`Installed ${pack.name} ${pack.packVersion ?? ''}: ${pack.components.length} component(s), ${pack.racks?.length ?? 0} rack(s)`, 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const repo = githubRepoUrl(registryUrl)
  return (
    <div className="community-browse">
      <div className="registry-bar">
        {editingUrl ? (
          <>
            <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="https://…/index.json or http://192.168.1.10:5010/index.json" />
            <button
              className="primary"
              onClick={() => {
                setEditingUrl(false)
                void updateSettings({ registryUrl: urlDraft.trim() || DEFAULT_REGISTRY_URL })
              }}
            >
              Use
            </button>
            <button onClick={() => (setUrlDraft(DEFAULT_REGISTRY_URL), setEditingUrl(false), void updateSettings({ registryUrl: DEFAULT_REGISTRY_URL }))}>Default</button>
          </>
        ) : (
          <>
            <span className="muted small">
              Registry: {index?.name ?? registryUrl}
              {index?.submit ? ` · accepts uploads${index.submit.moderated ? ' (reviewed)' : ''}` : ''}
            </span>
            {repo && (
              <button className="link small" onClick={() => void openExternal(repo)}>
                view on GitHub
              </button>
            )}
            <span className="spacer" />
            <button onClick={() => (setUrlDraft(registryUrl), setEditingUrl(true))}>Change registry…</button>
            <button onClick={() => void load()} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </>
        )}
      </div>
      <input type="search" placeholder="Search packs by name, author, tag or manufacturer…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {error && (
        <div className="notice bad">
          Could not load the pack registry: {error}
          <div className="muted small">Check your internet connection or the registry address. You can still install packs from a file or link on the Installed tab.</div>
        </div>
      )}
      {index && !packs.length && <div className="empty">{index.packs.length ? 'No packs match your search.' : 'This registry has no packs yet. Be the first to share one!'}</div>}
      <div className="pack-list">
        {packs.map((p) => {
          const state = installState(p)
          return (
            <div key={p.id} className="pack-card">
              <div className="pack-head">
                <b>{p.name}</b>
                <span className="muted">
                  v{p.packVersion} · by {p.author || 'unknown'}
                </span>
                <span className="spacer" />
                {state === 'installed' ? (
                  <span className="ok small">Installed ✓</span>
                ) : (
                  <button className="primary" disabled={busy === p.id} onClick={() => void install(p.id)}>
                    {busy === p.id ? 'Installing…' : state === 'update' ? 'Update' : 'Install'}
                  </button>
                )}
              </div>
              <div>{p.description}</div>
              <div className="muted small">
                {p.components} component{p.components === 1 ? '' : 's'} · {p.racks} rack{p.racks === 1 ? '' : 's'}
                {p.manufacturers.length ? ` · ${p.manufacturers.slice(0, 6).join(', ')}${p.manufacturers.length > 6 ? '…' : ''}` : ''} · {p.license} · <code>{p.id}</code>
              </div>
              {(p.tags.length > 0 || p.homepage) && (
                <div className="tags">
                  {p.tags.map((t) => (
                    <span key={t} className="tag" onClick={() => setQuery(t)}>
                      {t}
                    </span>
                  ))}
                  {p.homepage && (
                    <button className="link small" onClick={() => void openExternal(p.homepage!)}>
                      homepage
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="muted small">Community packs are made by other users. They contain data only (no code), are checked before install, and their specs are not verified by Rack Designer.</p>
    </div>
  )
}

function Installed({ onCreate }: { onCreate: () => void }) {
  const userPacks = useStore((s) => s.userPacks)
  const toast = useStore((s) => s.toast)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const sorted = [...userPacks].sort((a, b) => (a.file === CUSTOM_LIBRARY_FILE ? -1 : b.file === CUSTOM_LIBRARY_FILE ? 1 : a.pack.name.localeCompare(b.pack.name)))

  const report = (r: { pack: LibraryPack; warnings: string[] } | null) => {
    if (!r) return
    toast(`Installed "${r.pack.name}": ${r.pack.components.length} component(s), ${r.pack.racks?.length ?? 0} rack(s)`, 'success')
    if (r.warnings.length) toast(`${r.warnings.length} warning(s): ${r.warnings[0]}`, 'info')
  }
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="community-installed">
      <div className="registry-bar">
        <button disabled={busy} onClick={() => void run(async () => report(await installFromFile()))}>
          Install from file…
        </button>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste a link to a pack (.json)" />
        <button disabled={busy || !url.trim()} onClick={() => void run(async () => (report(await installFromUrl(url)), setUrl('')))}>
          Install from link
        </button>
      </div>
      {!sorted.length && <div className="empty">No packs installed. Browse the community registry, or create your own custom components and racks.</div>}
      <div className="pack-list">
        {sorted.map(({ file, pack }) => {
          const mine = file === CUSTOM_LIBRARY_FILE
          return (
            <div key={file} className="pack-card">
              <div className="pack-head">
                <b>{mine ? 'My components & racks' : pack.name}</b>
                <span className="muted">
                  {pack.packVersion ? `v${pack.packVersion}` : ''}
                  {pack.author ? ` · by ${pack.author}` : ''}
                </span>
                <span className="spacer" />
                {mine && <button onClick={onCreate}>Share as a pack…</button>}
                <button onClick={() => void run(() => exportPackFile(file))}>Export…</button>
                {!mine && (
                  <button
                    className="danger"
                    onClick={() => {
                      if (window.confirm(`Uninstall "${pack.name}"? Designs that already use its components keep their own copies.`)) void run(() => uninstallPack(file))
                    }}
                  >
                    Uninstall
                  </button>
                )}
              </div>
              {pack.description && !mine && <div>{pack.description}</div>}
              <div className="muted small">
                {pack.components.length} component(s) · {pack.racks?.length ?? 0} rack(s){pack.id ? <> · <code>{pack.id}</code></> : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type Candidate = { key: string; kind: 'component' | 'rack'; label: string; detail: string; group: string; item: ComponentDef | RackDef }

const builtinIds = new Set(builtinComponents.map((c) => c.id))

function Create() {
  const settings = useStore((s) => s.settings)
  const userPacks = useStore((s) => s.userPacks)
  const project = useStore((s) => s.project)
  const toast = useStore((s) => s.toast)
  const custom = useMemo(() => customPack(), [userPacks]) // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<PackDraft>({
    id: '',
    name: '',
    packVersion: '1.0.0',
    author: settings.author ?? '',
    description: '',
    license: 'CC-BY-4.0',
    homepage: '',
    tags: ''
  })
  const [idTouched, setIdTouched] = useState(false)
  const [result, setResult] = useState<ShareOutcome | { kind: 'saved' } | null>(null)
  const [sharing, setSharing] = useState(false)
  // Know up front whether the registry takes direct uploads, to label the Share button.
  const [registry, setRegistry] = useState<RegistryIndex | null>(null)
  useEffect(() => {
    let live = true
    fetchRegistry(settings.registryUrl)
      .then((idx) => live && setRegistry(idx))
      .catch(() => live && setRegistry(null))
    return () => {
      live = false
    }
  }, [settings.registryUrl])

  const candidates = useMemo<Candidate[]>(() => {
    const out: Candidate[] = []
    for (const c of custom.components) out.push({ key: `c:${c.id}`, kind: 'component', label: `${c.manufacturer} ${c.model}`, detail: `${CATEGORY_SINGULAR[c.category]} · ${c.uHeight}U`, group: 'My components', item: c })
    for (const r of custom.racks ?? []) out.push({ key: `r:${r.id}`, kind: 'rack', label: `${r.manufacturer} ${r.model}`, detail: `Rack · ${r.uHeight}U · ${r.widthMm}×${r.depthMm} mm`, group: 'My racks', item: r })
    const mine = new Set(custom.components.map((c) => c.id))
    for (const c of Object.values(project.components)) {
      if (builtinIds.has(c.id) || mine.has(c.id)) continue
      out.push({ key: `c:${c.id}`, kind: 'component', label: `${c.manufacturer} ${c.model}`, detail: `${CATEGORY_SINGULAR[c.category]} · ${c.uHeight}U`, group: 'Used in the current design', item: c })
    }
    return out
  }, [custom, project.components])
  const [picked, setPicked] = useState<Set<string>>(() => new Set(candidates.map((c) => c.key)))

  const autoId = `${slugify(draft.author, 30) || 'author'}.${slugify(draft.name) || 'pack'}`
  const effective = { ...draft, id: idTouched ? draft.id : autoId }
  const chosen = candidates.filter((c) => picked.has(c.key))
  const validation = useMemo(
    () =>
      buildPack(
        effective,
        chosen.filter((c) => c.kind === 'component').map((c) => c.item as ComponentDef),
        chosen.filter((c) => c.kind === 'rack').map((c) => c.item as RackDef)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(effective), chosen.map((c) => c.key).join()]
  )
  const set = (patch: Partial<PackDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setResult(null)
  }
  const toggle = (key: string) =>
    setPicked((s) => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })

  const remember = () => void updateSettings({ author: effective.author.trim() || undefined })
  const save = async () => {
    if (!validation.pack) return
    remember()
    if (await savePackFile(validation.pack)) setResult({ kind: 'saved' })
  }
  const share = async () => {
    if (!validation.pack) return
    remember()
    setSharing(true)
    try {
      const r = await shareToCommunity(validation.pack, registry)
      if (r.kind !== 'cancelled') setResult(r)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSharing(false)
    }
  }
  const hasKey = !!validation.pack?.id && !!savedEditKey(settings.registryUrl, validation.pack.id)
  const groups = [...new Set(candidates.map((c) => c.group))]

  return (
    <div className="community-create">
      <div className="grid2">
        <label className="field span2">
          <span className="field-label">Pack name</span>
          <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Homelab mini PCs" autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Author</span>
          <input value={draft.author} onChange={(e) => set({ author: e.target.value })} placeholder="Your name or GitHub username" />
        </label>
        <label className="field">
          <span className="field-label">Version</span>
          <input value={draft.packVersion} onChange={(e) => set({ packVersion: e.target.value })} placeholder="1.0.0" />
        </label>
        <label className="field span2">
          <span className="field-label">Pack id (must be unique; change it only if needed)</span>
          <input
            value={effective.id}
            onChange={(e) => {
              setIdTouched(true)
              set({ id: e.target.value.toLowerCase() })
            }}
            className={PACK_ID_RE.test(effective.id) ? '' : 'invalid'}
          />
        </label>
        <label className="field">
          <span className="field-label">License</span>
          <select value={draft.license} onChange={(e) => set({ license: e.target.value })}>
            {LICENSES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Tags (comma separated)</span>
          <input value={draft.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="homelab, mini-pc" />
        </label>
        <label className="field span4">
          <span className="field-label">Description</span>
          <input value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="What's in the pack, and where the specs came from" />
        </label>
        <label className="field span4">
          <span className="field-label">Homepage (optional)</span>
          <input value={draft.homepage} onChange={(e) => set({ homepage: e.target.value })} placeholder="https://…" />
        </label>
      </div>

      <h3>
        Contents ({chosen.length} of {candidates.length} selected)
      </h3>
      {!candidates.length ? (
        <div className="empty">
          Nothing to share yet. Create components with <b>+ Custom component</b> or racks with <b>+ Custom rack</b> in the library first.
        </div>
      ) : (
        <div className="pick-list">
          {groups.map((g) => (
            <div key={g}>
              <div className="port-face">{g}</div>
              {candidates
                .filter((c) => c.group === g)
                .map((c) => (
                  <label key={c.key} className="pick">
                    <input type="checkbox" checked={picked.has(c.key)} onChange={() => toggle(c.key)} />
                    <span>{c.label}</span>
                    <span className="muted small">{c.detail}</span>
                  </label>
                ))}
            </div>
          ))}
        </div>
      )}

      {validation.errors.length > 0 && (
        <ul className="notice bad">
          {validation.errors.slice(0, 8).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
          {validation.errors.length > 8 && <li>…and {validation.errors.length - 8} more</li>}
        </ul>
      )}
      {validation.warnings.length > 0 && (
        <ul className="notice warn">
          {validation.warnings.slice(0, 5).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {result?.kind === 'opened' && (
        <div className="notice ok">
          <b>Almost done!</b> Your browser has opened the community repository on GitHub. Sign in, drag in the <code>{effective.id}.json</code> file you just saved, then click <b>Propose changes</b> → <b>Create pull request</b>. Once it's reviewed and merged, everyone can install your pack from the Browse tab.
        </div>
      )}
      {result?.kind === 'no-github' && <div className="notice ok">Pack saved. Your registry doesn't accept uploads, so send the file to the registry's maintainer, or share the file or a link to it directly.</div>}
      {result?.kind === 'saved' && <div className="notice ok">Pack saved. Others can install it from the Installed tab (Install from file / Install from link).</div>}
      {result?.kind === 'submitted' && (
        <div className="notice ok">
          {result.result.status === 'published' ? (
            <>
              <b>Published!</b> {validation.pack?.name} {result.result.packVersion} is now available on {result.registry}.
            </>
          ) : (
            <>
              <b>Submitted.</b> {validation.pack?.name} {result.result.packVersion} is waiting for the {result.registry} administrator to approve it.
            </>
          )}
          {result.newKey && (
            <div className="small" style={{ marginTop: 6 }}>
              Your edit key for <code>{result.result.packId}</code> is saved on this computer and is needed to publish updates. Keep a copy somewhere safe:
              <div className="row" style={{ marginTop: 4 }}>
                <code className="key">{result.newKey}</code>
                <button onClick={() => void navigator.clipboard.writeText(result.newKey!).then(() => toast('Edit key copied', 'success'))}>Copy</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="button-row end">
        <span className="muted small share-target">
          {registry?.submit
            ? `${hasKey ? 'Updates' : 'Uploads'} go to ${registry.name}${registry.submit.moderated ? ' (reviewed before publishing)' : ''}. Bump the version to publish an update.`
            : registry
              ? `Sharing to ${registry.name} via GitHub pull request.`
              : ''}
        </span>
        <button disabled={!validation.pack} onClick={() => void save()}>
          Save pack file…
        </button>
        <button className="primary" disabled={!validation.pack || sharing} onClick={() => void share()}>
          {sharing ? 'Uploading…' : registry?.submit ? `Publish to ${registry.name}` : 'Share with community…'}
        </button>
      </div>
    </div>
  )
}
