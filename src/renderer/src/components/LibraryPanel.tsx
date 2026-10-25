import { useDeferredValue, useMemo, useState } from 'react'
import { CATEGORY_LABELS, searchComponents } from '../library'
import { deleteCustomComponent, importLibrary, quickAdd } from '../lib/commands'
import { getPorts, portType } from '../model/ports'
import { nextRackName, rackFromDef } from '../model/project'
import type { Category, ComponentDef, RackDef } from '../model/types'
import { useStore } from '../store'
import { libraryDrag } from './Canvas'

const PAGE = 300
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as Category[]

export function LibraryPanel() {
  const [tab, setTab] = useState<'components' | 'racks'>('components')
  return (
    <aside className="panel library">
      <div className="tabs">
        <button className={tab === 'components' ? 'active' : ''} onClick={() => setTab('components')}>
          Components
        </button>
        <button className={tab === 'racks' ? 'active' : ''} onClick={() => setTab('racks')}>
          Racks
        </button>
      </div>
      {tab === 'components' ? <ComponentList /> : <RackList />}
    </aside>
  )
}

function ComponentList() {
  const catalog = useStore((s) => s.catalog)
  const openDialog = useStore((s) => s.openDialog)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [manufacturer, setManufacturer] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const deferred = useDeferredValue(query)
  const results = useMemo(() => searchComponents(catalog, { query: deferred, category, manufacturer }), [catalog, deferred, category, manufacturer])
  const grouped = useMemo(() => {
    const m = new Map<Category, ComponentDef[]>()
    for (const c of results.slice(0, limit)) {
      const list = m.get(c.category)
      if (list) list.push(c)
      else m.set(c.category, [c])
    }
    return [...m.entries()].sort((a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]))
  }, [results, limit])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  return (
    <>
      <div className="library-filters">
        <input type="search" placeholder={`Search ${catalog.components.length.toLocaleString()} components…`} value={query} onChange={(e) => (setQuery(e.target.value), setLimit(PAGE))} autoFocus />
        <div className="row">
          <select value={category} onChange={(e) => (setCategory(e.target.value as Category | ''), setLimit(PAGE))}>
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select value={manufacturer} onChange={(e) => (setManufacturer(e.target.value), setLimit(PAGE))}>
            <option value="">All makers</option>
            {catalog.manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <button onClick={() => openDialog({ kind: 'custom-component' })}>+ Custom component</button>
          <button onClick={importLibrary} title="Import a library pack (.json)">
            Import pack…
          </button>
        </div>
      </div>
      <div className="library-list">
        {grouped.map(([cat, items]) => (
          <div key={cat} className="library-group">
            <div
              className="library-group-title"
              onClick={() => setCollapsed((s) => {
                const n = new Set(s)
                if (n.has(cat)) n.delete(cat)
                else n.add(cat)
                return n
              })}
            >
              <span>{collapsed.has(cat) ? '▸' : '▾'}</span> {CATEGORY_LABELS[cat]} <em>{items.length}</em>
            </div>
            {!collapsed.has(cat) && items.map((c) => <ComponentItem key={c.id} comp={c} />)}
          </div>
        ))}
        {results.length > limit && (
          <button className="more" onClick={() => setLimit(limit + PAGE)}>
            Show more ({results.length - limit} remaining)
          </button>
        )}
        {!results.length && <div className="empty">No components match.</div>}
      </div>
      <div className="library-footer">Drag onto a rack, or double-click to add to the selected rack.</div>
    </>
  )
}

function portSummary(c: ComponentDef): string {
  const counts = new Map<string, number>()
  for (const p of getPorts(c)) {
    const name = portType(p.type).name
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()].map(([n, k]) => `${k}× ${n}`).join(', ')
}

function ComponentItem({ comp }: { comp: ComponentDef }) {
  const openDialog = useStore((s) => s.openDialog)
  const isCustom = !!comp.source
  const height = comp.uHeight === 0 ? (comp.category === 'feed' ? 'feed' : '0U') : `${comp.uHeight}U`
  const power = comp.power?.typicalW ? `${comp.power.typicalW} W` : comp.pdu ? `${comp.pdu.voltage}V ${comp.pdu.maxAmps}A` : comp.ups ? `${comp.ups.capacityW} W` : ''
  const tip = [`${comp.manufacturer} ${comp.model}`, comp.description, portSummary(comp)].filter(Boolean).join('\n')
  return (
    <div
      className="library-item"
      draggable
      title={tip}
      onDragStart={(e) => {
        libraryDrag.componentId = comp.id
        e.dataTransfer.setData('application/x-rack-component', comp.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      onDragEnd={() => (libraryDrag.componentId = null)}
      onDoubleClick={() => quickAdd(comp)}
    >
      <span className={`u-badge cat-${comp.category}`}>{height}</span>
      <span className="library-item-text">
        <span className="model">{comp.model}</span>
        <span className="maker">
          {comp.manufacturer}
          {power && ` · ${power}`}
        </span>
      </span>
      {isCustom ? (
        <span className="item-actions">
          <button title="Edit" onClick={() => openDialog({ kind: 'custom-component', componentId: comp.id })}>
            ✎
          </button>
          <button
            title="Delete from library"
            onClick={() => {
              if (window.confirm(`Delete ${comp.model} from your library? Designs that use it keep their own copy.`)) void deleteCustomComponent(comp.id)
            }}
          >
            ×
          </button>
        </span>
      ) : (
        <span className="item-actions">
          <button title="Copy into a custom component" onClick={() => openDialog({ kind: 'custom-component', componentId: comp.id, duplicate: true })}>
            ⧉
          </button>
        </span>
      )}
    </div>
  )
}

function RackList() {
  const catalog = useStore((s) => s.catalog)
  const edit = useStore((s) => s.edit)
  const select = useStore((s) => s.select)
  const [query, setQuery] = useState('')
  const racks = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    return catalog.racks.filter((r) => {
      const t = `${r.manufacturer} ${r.model} ${r.uHeight}u ${r.style}`.toLowerCase()
      return terms.every((x) => t.includes(x))
    })
  }, [catalog, query])

  const add = (def: RackDef) => {
    let id = ''
    edit((p) => {
      const r = rackFromDef(def, nextRackName(p))
      p.racks.push(r)
      id = r.id
    })
    select({ kind: 'rack', id })
  }

  return (
    <>
      <div className="library-filters">
        <input type="search" placeholder={`Search ${catalog.racks.length} rack models…`} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="library-list">
        {racks.map((r) => (
          <div key={r.id} className="library-item" onDoubleClick={() => add(r)} title="Double-click to add">
            <span className="u-badge cat-rack">{r.uHeight}U</span>
            <span className="library-item-text">
              <span className="model">{r.model}</span>
              <span className="maker">
                {r.manufacturer} · {r.widthMm}×{r.depthMm} mm · {r.style.replace(/-/g, ' ')}
              </span>
            </span>
            <span className="item-actions visible">
              <button onClick={() => add(r)}>Add</button>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
