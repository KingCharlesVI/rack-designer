import { useMemo, useRef, useState } from 'react'
import { CATEGORY_LABELS, CATEGORY_SINGULAR } from '../library'
import { useAnalysis } from '../lib/analysis'
import { exportBom, exportCables, exportPower } from '../lib/commands'
import { formatW } from '../model/power'
import { findDevice, getComponent } from '../model/project'
import { billOfMaterials, cableSchedule, location } from '../model/reports'
import { useStore } from '../store'
import { Empty, LoadBar, NumberInput, TextInput } from './ui'

type Tab = 'issues' | 'cables' | 'power' | 'bom'

export function BottomPanel() {
  const [tab, setTab] = useState<Tab>('issues')
  const [height, setHeight] = useState(240)
  const [collapsed, setCollapsed] = useState(false)
  const { issues } = useAnalysis()
  const project = useStore((s) => s.project)
  const resize = useRef<{ y: number; h: number } | null>(null)
  const errors = issues.filter((i) => i.severity === 'error').length

  const startResize = (e: React.MouseEvent) => {
    resize.current = { y: e.clientY, h: height }
    const move = (ev: MouseEvent) => resize.current && setHeight(Math.max(120, Math.min(window.innerHeight - 250, resize.current.h - (ev.clientY - resize.current.y))))
    const up = () => {
      resize.current = null
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const tabs: { id: Tab; label: string; badge?: number; bad?: boolean }[] = [
    { id: 'issues', label: 'Issues', badge: issues.length, bad: errors > 0 },
    { id: 'cables', label: 'Cables', badge: project.connections.length },
    { id: 'power', label: 'Power' },
    { id: 'bom', label: 'Bill of materials' }
  ]

  return (
    <section className="bottom" style={{ height: collapsed ? 34 : height }}>
      {!collapsed && <div className="resize-handle" onMouseDown={startResize} />}
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id && !collapsed ? 'active' : ''}
            onClick={() => {
              setTab(t.id)
              setCollapsed(false)
            }}
          >
            {t.label}
            {t.badge ? <span className={`badge${t.bad ? ' bad' : ''}`}>{t.badge}</span> : null}
          </button>
        ))}
        <span className="spacer" />
        <button title={collapsed ? 'Expand' : 'Collapse'} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '▴' : '▾'}
        </button>
      </div>
      {!collapsed && (
        <div className="bottom-body">
          {tab === 'issues' && <IssuesTab />}
          {tab === 'cables' && <CablesTab />}
          {tab === 'power' && <PowerTab />}
          {tab === 'bom' && <BomTab />}
        </div>
      )}
    </section>
  )
}

function IssuesTab() {
  const { issues } = useAnalysis()
  const select = useStore((s) => s.select)
  if (!issues.length) return <Empty>No issues found. Power, placement and connections all check out.</Empty>
  return (
    <ul className="issues">
      {issues.map((i, n) => (
        <li key={n} className={i.severity} onClick={() => i.target && select(i.target)}>
          <span className="sev">{i.severity === 'error' ? '●' : i.severity === 'warning' ? '▲' : 'i'}</span>
          {i.message}
        </li>
      ))}
    </ul>
  )
}

function CablesTab() {
  const project = useStore((s) => s.project)
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const edit = useStore((s) => s.edit)
  const [filter, setFilter] = useState('')
  const [kind, setKind] = useState<'' | 'data' | 'power'>('')
  const rows = useMemo(() => cableSchedule(project), [project])
  const terms = filter.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = rows.filter((r) => (!kind || r.kind === kind) && terms.every((t) => Object.values(r).join(' ').toLowerCase().includes(t)))
  const set = (id: string, fn: (c: (typeof project.connections)[number]) => void) => edit((p) => fn(p.connections.find((c) => c.id === id)!))
  if (!rows.length) return <Empty>No cables yet. Click a port on the drawing, then click another port to connect them.</Empty>
  return (
    <div className="table-wrap">
      <div className="table-tools">
        <input type="search" placeholder="Filter cables…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="">All</option>
          <option value="data">Data</option>
          <option value="power">Power</option>
        </select>
        <span className="muted">{shown.length} cables</span>
        <span className="spacer" />
        <button onClick={exportCables}>Export CSV</button>
      </div>
      <table>
        <thead>
          <tr>
            <th />
            <th>Label</th>
            <th>From</th>
            <th>To</th>
            <th>Cable</th>
            <th>Length (m)</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id} className={selection?.kind === 'connection' && selection.id === r.id ? 'selected' : ''} onClick={() => select({ kind: 'connection', id: r.id })}>
              <td>
                <i className="swatch" style={{ background: r.color }} />
              </td>
              <td className="edit">
                <TextInput value={r.label} onCommit={(v) => set(r.id, (c) => void (c.label = v || undefined))} />
              </td>
              <td>
                <b>{r.fromDevice}</b> {r.fromPort} <span className="muted">{r.fromLocation}</span>
              </td>
              <td>
                <b>{r.toDevice}</b> {r.toPort} <span className="muted">{r.toLocation}</span>
              </td>
              <td className="edit">
                <TextInput value={r.cableType} list="cable-types" onCommit={(v) => set(r.id, (c) => void (c.cableType = v || undefined))} />
              </td>
              <td className="edit num">
                <NumberInput value={r.lengthM === '' ? undefined : Number(r.lengthM)} min={0} step={0.5} allowEmpty onCommit={(v) => set(r.id, (c) => void (c.lengthM = v))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PowerTab() {
  const project = useStore((s) => s.project)
  const select = useStore((s) => s.select)
  const edit = useStore((s) => s.edit)
  const { power, failover } = useAnalysis()
  const distribution = project.devices.filter((d) => {
    const c = getComponent(project, d)
    return c.category === 'feed' || c.pdu || c.ups
  })
  const order = { feed: 0, ups: 1, pdu: 2 } as Record<string, number>
  distribution.sort((a, b) => (order[getComponent(project, a).category] ?? 3) - (order[getComponent(project, b).category] ?? 3) || a.name.localeCompare(b.name))
  return (
    <div className="power-tab">
      <div className="power-col">
        <div className="table-tools">
          <b>Distribution</b>
          <span className="muted">
            Total load {formatW(power.totalW)} ({project.settings.powerBasis === 'max' ? 'maximum' : 'typical'})
          </span>
          <span className="spacer" />
          <button onClick={() => edit((p) => void (p.settings.powerBasis = p.settings.powerBasis === 'max' ? 'typical' : 'max'))}>
            Use {project.settings.powerBasis === 'max' ? 'typical' : 'maximum'}
          </button>
          <button onClick={exportPower}>Export CSV</button>
        </div>
        {distribution.length === 0 ? (
          <Empty>Add a power feed (Library → Power feeds) and PDUs, then connect them to model power.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Location</th>
                <th>Load</th>
                <th>Capacity</th>
                <th style={{ width: 160 }}>Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((d) => {
                const dp = power.devices.get(d.id)!
                const c = getComponent(project, d)
                return (
                  <tr key={d.id} onClick={() => select({ kind: 'device', id: d.id })}>
                    <td>
                      <b>{d.name}</b> <span className="muted">{c.model}</span>
                    </td>
                    <td>{CATEGORY_SINGULAR[c.category]}</td>
                    <td className="muted">{location(project, d)}</td>
                    <td>
                      {formatW(dp.throughW)}
                      {dp.voltage ? <span className="muted"> {(dp.throughW / dp.voltage).toFixed(1)} A</span> : null}
                    </td>
                    <td>{dp.capacityW ? formatW(dp.capacityW) : '—'}</td>
                    <td>{dp.utilization !== undefined ? <LoadBar value={dp.utilization} limit={project.settings.derating} /> : dp.energized ? '' : <span className="bad">not powered</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="power-col narrow">
        <div className="table-tools">
          <b>Feed failure simulation</b>
        </div>
        {failover.length === 0 ? (
          <Empty>No feeds to simulate.</Empty>
        ) : (
          <ul className="failover">
            {failover.map((s) => {
              const feed = findDevice(project, s.feedId)
              const ok = !s.lostDevices.length && !s.overloaded.length
              return (
                <li key={s.feedId} className={ok ? 'ok' : 'bad'}>
                  <div>
                    If <b>{feed?.name}</b> fails: {ok ? 'everything stays up ✓' : ''}
                  </div>
                  {s.lostDevices.length > 0 && (
                    <div className="muted">
                      Loses power: {s.lostDevices.map((id) => findDevice(project, id)?.name).join(', ')}
                    </div>
                  )}
                  {s.overloaded.map((o) => (
                    <div key={o.deviceId} className="bad">
                      {findDevice(project, o.deviceId)?.name} overloaded ({Math.round(o.utilization * 100)}%)
                    </div>
                  ))}
                  {s.onBattery.length > 0 && <div className="warn">On battery: {s.onBattery.map((id) => findDevice(project, id)?.name).join(', ')}</div>}
                </li>
              )
            })}
          </ul>
        )}
        <div className="table-tools">
          <b>Per rack</b>
        </div>
        <ul className="failover">
          {project.racks.map((r) => (
            <li key={r.id}>
              {r.name}: {formatW(power.totalByRack.get(r.id) ?? 0)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function BomTab() {
  const project = useStore((s) => s.project)
  const lines = useMemo(() => billOfMaterials(project), [project])
  if (!lines.length) return <Empty>Nothing in the design yet.</Empty>
  return (
    <div className="table-wrap">
      <div className="table-tools">
        <span className="muted">{lines.reduce((s, l) => s + l.quantity, 0)} items</span>
        <span className="spacer" />
        <button onClick={exportBom}>Export CSV</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Qty</th>
            <th>Category</th>
            <th>Manufacturer</th>
            <th>Model</th>
            <th>U</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="num">{l.quantity}</td>
              <td>{l.category === 'rack' ? 'Rack' : l.category === 'cable' ? 'Cable' : CATEGORY_LABELS[l.category as keyof typeof CATEGORY_LABELS] ?? l.category}</td>
              <td>{l.manufacturer}</td>
              <td>{l.model}</td>
              <td>{l.uHeight || ''}</td>
              <td>{l.unitWeightKg ? `${Math.round(l.unitWeightKg * l.quantity)} kg` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
