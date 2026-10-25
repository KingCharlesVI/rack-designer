// HTML for the public landing page and the admin console. Pack data is untrusted:
// the landing page escapes everything, and the admin script only uses textContent.
import type { RegistryEntry } from '../../src/renderer/src/model/packs'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const STYLE = `
:root { color-scheme: light dark; --bg:#f6f7f9; --card:#fff; --text:#1f2937; --muted:#6b7280; --border:#e5e7eb; --accent:#2563eb; }
@media (prefers-color-scheme: dark) { :root { --bg:#15171b; --card:#1f2328; --text:#e5e7eb; --muted:#9ca3af; --border:#2d3138; --accent:#4ea1ff; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:14px/1.5 system-ui, 'Segoe UI', sans-serif; }
main { max-width: 900px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-size: 22px; margin: 0 0 4px; }
.muted { color: var(--muted); }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; margin: 10px 0; }
.card h2 { font-size: 15px; margin: 0; display: inline; }
code, .mono { font-family: Consolas, 'Cascadia Mono', monospace; font-size: 12px; }
.url { background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; overflow-wrap: anywhere; }
button { font: inherit; padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border); background: var(--card); color: var(--text); cursor: pointer; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.danger { color: #dc2626; }
input { font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--card); color: var(--text); width: 100%; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.spacer { flex: 1; }
ul.items { margin: 6px 0 0; padding-left: 18px; max-height: 160px; overflow: auto; }
.error { color: #dc2626; }
`

export function landingPage(opts: { name: string; packs: RegistryEntry[]; indexUrl: string; acceptsSubmissions: boolean; moderated: boolean }): string {
  const cards = opts.packs
    .map(
      (p) => `<div class="card">
  <h2>${esc(p.name)}</h2> <span class="muted">v${esc(p.packVersion)} · by ${esc(p.author)}</span>
  <div>${esc(p.description)}</div>
  <div class="muted">${p.components} component(s) · ${p.racks} rack(s) · ${esc(p.license)} · <code>${esc(p.id)}</code></div>
</div>`
    )
    .join('\n')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.name)}</title><style>${STYLE}</style></head>
<body><main>
<h1>${esc(opts.name)}</h1>
<p class="muted">A Rack Designer community pack registry with ${opts.packs.length} pack(s).</p>
<p>To use it, open Rack Designer → <b>File → Community packs… → Browse → Change registry…</b> and enter:</p>
<div class="url mono">${esc(opts.indexUrl)}</div>
<p class="muted">${opts.acceptsSubmissions ? `Packs can be published from the app's <b>Create &amp; share</b> tab${opts.moderated ? ' and appear here after an administrator approves them' : ''}.` : 'This registry does not accept uploads.'}</p>
${cards || '<p class="muted">No packs have been published yet.</p>'}
</main></body></html>`
}

export function adminPage(name: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin · ${esc(name)}</title><style>${STYLE}</style></head>
<body><main>
<h1>${esc(name)}: admin</h1>
<div id="login" class="card">
  <p>Enter the <code>ADMIN_TOKEN</code> configured on the server.</p>
  <div class="row"><input id="token" type="password" autocomplete="current-password" style="max-width:380px"><button class="primary" id="signin">Sign in</button></div>
  <p id="login-error" class="error"></p>
</div>
<div id="console" hidden>
  <div class="row"><h2 style="margin:0">Pending submissions</h2><span class="spacer"></span><button id="refresh">Refresh</button><button id="signout">Sign out</button></div>
  <div id="pending"></div>
  <h2>Published packs</h2>
  <div id="packs"></div>
</div>
<script src="/admin.js"></script>
</main></body></html>`
}

/** Admin console script. Builds the DOM with textContent only, so pack data can't inject markup. */
export const ADMIN_JS = `
'use strict';
const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem('registry-admin-token') || '';

function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'onclick') e.addEventListener('click', v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) if (c != null) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}

async function api(method, path) {
  const res = await fetch(path, { method, headers: { Authorization: 'Bearer ' + token } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || res.statusText), { status: res.status });
  return body;
}

async function act(method, path, confirmText) {
  if (confirmText && !confirm(confirmText)) return;
  try { await api(method, path); } catch (e) { alert(e.message); }
  load();
}

function itemList(pack) {
  const items = [
    ...(pack.components || []).map((c) => c.manufacturer + ' ' + c.model + ' (' + c.category + ', ' + c.uHeight + 'U, ' + (c.ports || []).reduce((n, g) => n + g.count, 0) + ' ports)'),
    ...(pack.racks || []).map((r) => 'Rack: ' + r.manufacturer + ' ' + r.model + ' (' + r.uHeight + 'U)')
  ];
  return el('ul', { class: 'items' }, ...items.map((t) => el('li', {}, t)));
}

async function load() {
  let data;
  try {
    data = await api('GET', '/api/admin/submissions');
  } catch (e) {
    $('console').hidden = true; $('login').hidden = false;
    $('login-error').textContent = e.status === 401 ? 'Wrong token.' : e.message;
    return;
  }
  $('login').hidden = true; $('console').hidden = false;
  const pending = $('pending'); pending.replaceChildren();
  if (!data.submissions.length) pending.append(el('p', { class: 'muted' }, 'Nothing waiting for review.'));
  for (const s of data.submissions) {
    const p = s.pack;
    pending.append(el('div', { class: 'card' },
      el('div', { class: 'row' },
        el('h2', {}, p.name), el('span', { class: 'muted' }, 'v' + p.packVersion + ' · by ' + p.author),
        el('span', { class: 'spacer' }),
        el('button', { class: 'primary', onclick: () => act('POST', '/api/admin/submissions/' + s.submissionId + '/approve') }, 'Approve'),
        el('button', { class: 'danger', onclick: () => act('POST', '/api/admin/submissions/' + s.submissionId + '/reject', 'Reject this submission?') }, 'Reject')),
      el('div', {}, p.description),
      el('div', { class: 'muted' }, (s.isNew ? 'New pack' : 'Update') + ' · ' + s.packId + ' · ' + p.license + ' · received ' + new Date(s.receivedAt).toLocaleString() + ' from ' + s.client),
      itemList(p)));
  }
  const packs = $('packs'); packs.replaceChildren();
  if (!data.packs.length) packs.append(el('p', { class: 'muted' }, 'No packs published yet.'));
  for (const p of data.packs) {
    packs.append(el('div', { class: 'card row' },
      el('div', {}, el('h2', {}, p.name), ' ', el('span', { class: 'muted' }, 'v' + p.packVersion + ' · by ' + p.author + ' · ' + p.id)),
      el('span', { class: 'spacer' }),
      el('a', { href: '/' + p.path, target: '_blank', rel: 'noopener' }, 'JSON'),
      el('button', { class: 'danger', onclick: () => act('DELETE', '/api/admin/packs/' + encodeURIComponent(p.id), 'Delete ' + p.name + ' from the registry? Installed copies keep working.') }, 'Delete')));
  }
}

$('signin').addEventListener('click', () => { token = $('token').value.trim(); sessionStorage.setItem('registry-admin-token', token); load(); });
$('token').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('signin').click(); });
$('signout').addEventListener('click', () => { token = ''; sessionStorage.removeItem('registry-admin-token'); $('console').hidden = true; $('login').hidden = false; });
$('refresh').addEventListener('click', load);
if (token) load();
`
