import { CATEGORY_SINGULAR } from '../library'
import { useAnalysis } from '../lib/analysis'
import { duplicateSelection } from '../lib/commands'
import { deviceDraw, feedSpec, formatW } from '../model/power'
import { CABLE_COLORS, getPorts, portType, suggestCable, type PortDef } from '../model/ports'
import {
  connectionAt,
  describePort,
  disconnect,
  estimateCableLength,
  findDevice,
  findFreeMount,
  getComponent,
  moveDevice,
  otherEnd,
  rackWeightKg,
  removeDevices,
  removeRack,
  resolvePort,
  usedUnits
} from '../model/project'
import { location } from '../model/reports'
import type { Connection, Device, Face, Mount, Project, Rack } from '../model/types'
import { useStore } from '../store'
import { portClick } from './Canvas'
import { Empty, Field, LoadBar, NumberInput, Section, Select, TextInput } from './ui'

export function PropertiesPanel() {
  const project = useStore((s) => s.project)
  const selection = useStore((s) => s.selection)
  let body
  if (!selection) body = <ProjectProps project={project} />
  else if (selection.kind === 'rack') {
    const r = project.racks.find((x) => x.id === selection.id)
    body = r ? <RackProps rack={r} project={project} /> : null
  } else if (selection.kind === 'device') {
    const d = findDevice(project, selection.id)
    body = d ? <DeviceProps device={d} project={project} /> : null
  } else if (selection.kind === 'connection') {
    const c = project.connections.find((x) => x.id === selection.id)
    body = c ? <ConnectionProps conn={c} project={project} /> : null
  } else {
    const d = findDevice(project, selection.deviceId)
    body = d ? <DeviceProps device={d} project={project} focusPort={selection.portId} /> : null
  }
  return <aside className="panel properties">{body ?? <Empty>Nothing selected</Empty>}</aside>
}

function ProjectProps({ project }: { project: Project }) {
  const edit = useStore((s) => s.edit)
  const { power, issues } = useAnalysis()
  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length
  return (
    <>
      <Section title="Design">
        <Field label="Name">
          <TextInput value={project.name} onCommit={(v) => edit((p) => void (p.name = v || 'Untitled design'))} />
        </Field>
        <Field label="Notes">
          <TextInput multiline value={project.notes ?? ''} onCommit={(v) => edit((p) => void (p.notes = v || undefined))} />
        </Field>
      </Section>
      <Section title="Power settings">
        <Field label="Load basis" hint="Use typical draw for capacity planning, or nameplate maximum for worst-case">
          <Select
            value={project.settings.powerBasis}
            onChange={(v) => edit((p) => void (p.settings.powerBasis = v))}
            options={[
              { value: 'typical', label: 'Typical draw' },
              { value: 'max', label: 'Maximum (nameplate)' }
            ]}
          />
        </Field>
        <Field label="Continuous limit" hint="Warn above this fraction of circuit capacity (80% per NEC)">
          <NumberInput value={Math.round(project.settings.derating * 100)} min={50} max={100} onCommit={(v) => edit((p) => void (p.settings.derating = (v ?? 80) / 100))} />
        </Field>
      </Section>
      <Section title="Summary">
        <dl className="stats">
          <dt>Racks</dt>
          <dd>{project.racks.length}</dd>
          <dt>Devices</dt>
          <dd>{project.devices.length}</dd>
          <dt>Cables</dt>
          <dd>
            {project.connections.filter((c) => c.kind === 'data').length} data · {project.connections.filter((c) => c.kind === 'power').length} power
          </dd>
          <dt>Total load</dt>
          <dd>{formatW(power.totalW)}</dd>
          <dt>Issues</dt>
          <dd>
            {errors} errors · {warnings} warnings
          </dd>
        </dl>
      </Section>
      <Empty>Select a rack, device, port or cable to edit it.</Empty>
    </>
  )
}

function RackProps({ rack, project }: { rack: Rack; project: Project }) {
  const edit = useStore((s) => s.edit)
  const toast = useStore((s) => s.toast)
  const select = useStore((s) => s.select)
  const { power } = useAnalysis()
  const set = (fn: (r: Rack) => void) => edit((p) => fn(p.racks.find((x) => x.id === rack.id)!))
  const weight = rackWeightKg(project, rack.id)
  const idx = project.racks.indexOf(rack)
  const used = usedUnits(project, rack.id)
  const move = (delta: number) =>
    edit((p) => {
      const i = p.racks.findIndex((r) => r.id === rack.id)
      const j = i + delta
      if (j < 0 || j >= p.racks.length) return
      ;[p.racks[i], p.racks[j]] = [p.racks[j], p.racks[i]]
    })
  return (
    <>
      <Section title="Rack">
        <Field label="Name">
          <TextInput value={rack.name} onCommit={(v) => set((r) => void (r.name = v || r.name))} />
        </Field>
        <Field label="Height (U)">
          <NumberInput
            value={rack.uHeight}
            min={1}
            max={60}
            onCommit={(v) => {
              const err = edit((p) => {
                const r = p.racks.find((x) => x.id === rack.id)!
                const tallest = Math.max(0, ...p.devices.filter((d) => d.rackId === r.id && d.mount.kind === 'rack').map((d) => (d.mount.kind === 'rack' ? d.mount.u + getComponent(p, d).uHeight - 1 : 0)))
                if ((v ?? 42) < tallest) return `Devices occupy up to U${tallest}; move them before shrinking the rack`
                r.uHeight = v ?? 42
              })
              if (err) toast(err, 'error')
            }}
          />
        </Field>
        <div className="field-row">
          <Field label="Width (mm)">
            <NumberInput value={rack.widthMm} min={450} max={1200} onCommit={(v) => set((r) => void (r.widthMm = v ?? 600))} />
          </Field>
          <Field label="Depth (mm)">
            <NumberInput value={rack.depthMm} min={300} max={1500} onCommit={(v) => set((r) => void (r.depthMm = v ?? 1000))} />
          </Field>
        </div>
        <Field label="Max load (kg)">
          <NumberInput value={rack.maxLoadKg} min={0} allowEmpty onCommit={(v) => set((r) => void (r.maxLoadKg = v))} />
        </Field>
        <Field label="Style">
          <Select
            value={rack.style}
            onChange={(v) => set((r) => void (r.style = v))}
            options={[
              { value: '4-post-enclosed', label: '4-post enclosed' },
              { value: '4-post-open', label: '4-post open frame' },
              { value: '2-post', label: '2-post relay rack' },
              { value: 'wall-mount', label: 'Wall mount' }
            ]}
          />
        </Field>
        <Field label="Model">
          <TextInput value={[rack.manufacturer, rack.model].filter(Boolean).join(' ')} onCommit={(v) => set((r) => ((r.model = v), (r.manufacturer = undefined)))} />
        </Field>
        <Field label="Notes">
          <TextInput multiline value={rack.notes ?? ''} onCommit={(v) => set((r) => void (r.notes = v || undefined))} />
        </Field>
      </Section>
      <Section title="Usage">
        <dl className="stats">
          <dt>Space</dt>
          <dd>
            {used} / {rack.uHeight} U ({rack.uHeight - used} free)
          </dd>
          <dt>Weight</dt>
          <dd>
            {Math.round(weight.total)} kg{weight.unknown ? ` + ${weight.unknown} unknown` : ''}
            {rack.maxLoadKg ? ` of ${rack.maxLoadKg} kg` : ''}
          </dd>
          <dt>Load</dt>
          <dd>{formatW(power.totalByRack.get(rack.id) ?? 0)}</dd>
          <dt>Devices</dt>
          <dd>{project.devices.filter((d) => d.rackId === rack.id).length}</dd>
        </dl>
        {rack.maxLoadKg ? <LoadBar value={weight.total / rack.maxLoadKg} limit={0.9} /> : null}
      </Section>
      <div className="button-row">
        <button disabled={idx === 0} onClick={() => move(-1)}>
          ◂ Move left
        </button>
        <button disabled={idx === project.racks.length - 1} onClick={() => move(1)}>
          Move right ▸
        </button>
        <button
          className="danger"
          onClick={() => {
            const n = project.devices.filter((d) => d.rackId === rack.id).length
            if (n && !window.confirm(`Delete ${rack.name} and its ${n} device(s)?`)) return
            edit((p) => removeRack(p, rack.id))
            select(null)
          }}
        >
          Delete rack
        </button>
      </div>
    </>
  )
}

function DeviceProps({ device, project, focusPort }: { device: Device; project: Project; focusPort?: string }) {
  const edit = useStore((s) => s.edit)
  const toast = useStore((s) => s.toast)
  const select = useStore((s) => s.select)
  const openDialog = useStore((s) => s.openDialog)
  const { power } = useAnalysis()
  const comp = getComponent(project, device)
  const dp = power.devices.get(device.id)
  const set = (fn: (d: Device) => void) => edit((p) => fn(p.devices.find((x) => x.id === device.id)!))
  const remount = (rackId: string, mount: Mount) => {
    const err = edit((p) => moveDevice(p, device.id, rackId, mount))
    if (err) toast(err, 'error')
  }
  const isFeed = comp.category === 'feed'
  const fs = isFeed ? feedSpec(device, comp) : undefined
  const ports = getPorts(comp)

  return (
    <>
      <Section title={CATEGORY_SINGULAR[comp.category]}>
        <div className="device-title">
          <b>
            {comp.manufacturer} {comp.model}
          </b>
          {comp.description && <span>{comp.description}</span>}
          <span className="muted">
            {comp.uHeight ? `${comp.uHeight}U` : isFeed ? 'Facility circuit' : 'Zero-U'}
            {comp.depthMm ? ` · ${comp.depthMm} mm deep` : ''}
            {comp.uHeight ? (comp.fullDepth ? ' · full depth' : ' · half depth') : ''}
            {comp.weightKg ? ` · ${comp.weightKg} kg` : ''}
          </span>
        </div>
        <Field label="Name">
          <TextInput value={device.name} onCommit={(v) => set((d) => void (d.name = v || d.name))} />
        </Field>
        <Field label="Asset tag">
          <TextInput value={device.assetTag ?? ''} onCommit={(v) => set((d) => void (d.assetTag = v || undefined))} />
        </Field>
      </Section>

      <Section title="Position">
        <Field label="Rack">
          <Select
            value={device.rackId}
            onChange={(rackId) => {
              const m = findFreeMount(project, comp, rackId, device.mount)
              if (!m) toast('No free space in that rack', 'error')
              else remount(rackId, m)
            }}
            options={project.racks.map((r) => ({ value: r.id, label: r.name }))}
          />
        </Field>
        {device.mount.kind === 'rack' && (
          <div className="field-row">
            <Field label="Bottom U">
              <NumberInput value={device.mount.u} min={1} onCommit={(u) => remount(device.rackId, { ...(device.mount as Extract<Mount, { kind: 'rack' }>), u: u ?? 1 })} />
            </Field>
            <Field label="Facing">
              <Select<Face> value={device.mount.face} onChange={(face) => remount(device.rackId, { ...(device.mount as Extract<Mount, { kind: 'rack' }>), face })} options={[{ value: 'front', label: 'Front' }, { value: 'rear', label: 'Rear' }]} />
            </Field>
          </div>
        )}
        {device.mount.kind === 'zeroU' && (
          <div className="field-row">
            <Field label="Side">
              <Select value={device.mount.side} onChange={(side) => remount(device.rackId, { kind: 'zeroU', side, slot: (device.mount as Extract<Mount, { kind: 'zeroU' }>).slot })} options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
            </Field>
            <Field label="Position">
              <Select
                value={String(device.mount.slot) as '0' | '1'}
                onChange={(v) => remount(device.rackId, { kind: 'zeroU', side: (device.mount as Extract<Mount, { kind: 'zeroU' }>).side, slot: Number(v) as 0 | 1 })}
                options={[{ value: '0', label: 'Inner' }, { value: '1', label: 'Outer' }]}
              />
            </Field>
          </div>
        )}
        <div className="muted small">{location(project, device)}</div>
      </Section>

      <Section title="Power">
        {isFeed && fs ? (
          <>
            <div className="field-row">
              <Field label="Voltage">
                <NumberInput value={fs.voltage} min={12} max={600} onCommit={(v) => set((d) => void (d.overrides = { ...d.overrides, voltage: v }))} />
              </Field>
              <Field label="Breaker (A)">
                <NumberInput value={fs.amps} min={1} max={400} onCommit={(v) => set((d) => void (d.overrides = { ...d.overrides, amps: v }))} />
              </Field>
            </div>
            <Field label="Phases">
              <Select value={String(fs.phases) as '1' | '3'} onChange={(v) => set((d) => void (d.overrides = { ...d.overrides, phases: Number(v) as 1 | 3 }))} options={[{ value: '1', label: 'Single phase' }, { value: '3', label: 'Three phase' }]} />
            </Field>
          </>
        ) : (
          <div className="field-row">
            <Field label="Typical (W)">
              <NumberInput value={device.overrides?.typicalW ?? comp.power?.typicalW ?? 0} min={0} onCommit={(v) => set((d) => void (d.overrides = { ...d.overrides, typicalW: v }))} />
            </Field>
            <Field label="Max (W)">
              <NumberInput value={device.overrides?.maxW ?? comp.power?.maxW ?? 0} min={0} onCommit={(v) => set((d) => void (d.overrides = { ...d.overrides, maxW: v }))} />
            </Field>
          </div>
        )}
        {(device.overrides?.typicalW !== undefined || device.overrides?.maxW !== undefined) && (
          <button className="link" onClick={() => set((d) => void (d.overrides = { ...d.overrides, typicalW: undefined, maxW: undefined }))}>
            Reset to library values
          </button>
        )}
        {dp && (
          <dl className="stats">
            <dt>Status</dt>
            <dd className={dp.energized ? (dp.onBattery ? 'warn' : 'ok') : deviceDraw(project, device) > 0 ? 'bad' : ''}>{dp.energized ? (dp.onBattery ? 'On battery' : 'Energized') : 'Not powered'}</dd>
            {dp.inletCount > 0 && (
              <>
                <dt>Inlets</dt>
                <dd>
                  {dp.connectedInlets} of {dp.inletCount} connected
                </dd>
              </>
            )}
            {dp.ownW > 0 && (
              <>
                <dt>Own draw</dt>
                <dd>{formatW(dp.ownW)}</dd>
              </>
            )}
            {dp.capacityW !== undefined && (
              <>
                <dt>Load</dt>
                <dd>
                  {formatW(dp.throughW)} of {formatW(dp.capacityW)}
                  {dp.voltage ? ` @ ${dp.voltage}V (${(dp.throughW / dp.voltage).toFixed(1)} A)` : ''}
                </dd>
              </>
            )}
            {dp.feeds.length > 0 && !isFeed && (
              <>
                <dt>Fed by</dt>
                <dd>{dp.feeds.map((f) => findDevice(project, f)?.name).join(' + ')}</dd>
              </>
            )}
          </dl>
        )}
        {dp?.utilization !== undefined && <LoadBar value={dp.utilization} limit={project.settings.derating} />}
      </Section>

      <Section title={`Ports (${ports.length})`}>
        {ports.length === 0 ? (
          <Empty>No ports</Empty>
        ) : (
          <PortTable project={project} device={device} ports={ports} focusPort={focusPort} />
        )}
      </Section>

      <Section title="Notes">
        <TextInput multiline value={device.notes ?? ''} onCommit={(v) => set((d) => void (d.notes = v || undefined))} />
      </Section>

      <div className="button-row">
        <button onClick={duplicateSelection}>Duplicate</button>
        <button onClick={() => openDialog({ kind: 'custom-component', componentId: comp.id, duplicate: !comp.source })}>{comp.source ? 'Edit component' : 'Customise…'}</button>
        <button
          className="danger"
          onClick={() => {
            edit((p) => removeDevices(p, [device.id]))
            select(null)
          }}
        >
          Delete
        </button>
      </div>
    </>
  )
}

function PortTable({ project, device, ports, focusPort }: { project: Project; device: Device; ports: PortDef[]; focusPort?: string }) {
  const edit = useStore((s) => s.edit)
  const select = useStore((s) => s.select)
  const pending = useStore((s) => s.pending)
  const { power } = useAnalysis()
  const faces: Face[] = ['front', 'rear']
  return (
    <div className="port-table">
      {faces.map((face) => {
        const list = ports.filter((p) => p.face === face)
        if (!list.length) return null
        return (
          <div key={face}>
            <div className="port-face">{face === 'front' ? 'Front' : 'Rear'}</div>
            {list.map((port) => {
              const ref = { deviceId: device.id, portId: port.id }
              const conn = connectionAt(project, ref)
              const load = power.ports.get(`${device.id}:${port.id}`)
              const isPending = pending?.deviceId === device.id && pending.portId === port.id
              return (
                <div key={port.id} className={`port-row${focusPort === port.id ? ' focus' : ''}${isPending ? ' pending' : ''}`}>
                  <button className="port-label" title="Click to start or select a connection" onClick={() => portClick(ref)}>
                    <i style={{ background: conn?.color ?? 'transparent' }} />
                    {port.label}
                  </button>
                  <span className="port-type">
                    {portType(port.type).name}
                    {port.speed ? ` ${port.speed}` : ''}
                  </span>
                  <span className="port-conn">
                    {conn ? (
                      <>
                        <button className="link" onClick={() => select({ kind: 'connection', id: conn.id })}>
                          → {describePort(project, otherEnd(conn, ref))}
                        </button>
                        {load && load.watts > 0 && <span className="muted"> {formatW(load.watts)}</span>}
                        <button className="x" title="Disconnect" onClick={() => edit((p) => disconnect(p, [conn.id]))}>
                          ×
                        </button>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

const CABLE_TYPES = [
  'Cat5e patch cable',
  'Cat6 patch cable',
  'Cat6A patch cable',
  'Cat8 patch cable',
  '10G DAC',
  '25G DAC',
  '40G DAC',
  '100G DAC',
  '400G DAC',
  '10G AOC',
  '25G AOC',
  '100G AOC',
  'OM3 LC duplex patch',
  'OM4 LC duplex patch',
  'OS2 LC duplex patch',
  'OS2 SC duplex patch',
  'MPO-12 OM4 trunk',
  'MPO-16 OM4 trunk',
  'Console cable',
  'USB cable',
  'Power cord C14–C13',
  'Power cord C20–C19',
  'Power cord C20–C13',
  'Power cord C14–C19',
  'Power cord 5-15P–C13'
]

function ConnectionProps({ conn, project }: { conn: Connection; project: Project }) {
  const edit = useStore((s) => s.edit)
  const select = useStore((s) => s.select)
  const { power } = useAnalysis()
  const a = resolvePort(project, conn.a)
  const b = resolvePort(project, conn.b)
  const set = (fn: (c: Connection) => void) => edit((p) => fn(p.connections.find((x) => x.id === conn.id)!))
  const load = power.ports.get(`${conn.b.deviceId}:${conn.b.portId}`)
  const end = (ref: Connection['a'], r: typeof a) => (
    <button className="link endpoint" onClick={() => select({ kind: 'port', deviceId: ref.deviceId, portId: ref.portId })}>
      <b>{r?.device.name ?? '?'}</b> {r?.port.label} <span className="muted">({r ? portType(r.port.type).name : 'missing'})</span>
      {r && <span className="muted small"> {location(project, r.device)}</span>}
    </button>
  )
  return (
    <>
      <Section title={conn.kind === 'power' ? 'Power cable' : 'Data cable'}>
        <div className="endpoints">
          <span className="muted small">{conn.kind === 'power' ? 'Source' : 'From'}</span>
          {end(conn.a, a)}
          <span className="muted small">{conn.kind === 'power' ? 'Load' : 'To'}</span>
          {end(conn.b, b)}
        </div>
        <Field label="Label">
          <TextInput value={conn.label ?? ''} placeholder="e.g. C001" onCommit={(v) => set((c) => void (c.label = v || undefined))} />
        </Field>
        <Field label="Cable type">
          <TextInput value={conn.cableType ?? ''} list="cable-types" onCommit={(v) => set((c) => void (c.cableType = v || undefined))} />
          <datalist id="cable-types">
            {CABLE_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <div className="field-row">
          <Field label="Length (m)">
            <NumberInput value={conn.lengthM} min={0} step={0.5} allowEmpty onCommit={(v) => set((c) => void (c.lengthM = v))} />
          </Field>
          <button
            className="inline"
            title="Estimate from positions"
            onClick={() =>
              set((c) => {
                c.lengthM = estimateCableLength(project, c.a, c.b)
                if (a && b) c.cableType = suggestCable(a.port.type, b.port.type, c.lengthM)
              })
            }
          >
            Estimate
          </button>
        </div>
        <Field label="Colour">
          <div className="swatches">
            {[...CABLE_COLORS, '#e11d48'].map((col) => (
              <button key={col} className={conn.color === col ? 'active' : ''} style={{ background: col }} onClick={() => set((c) => void (c.color = col))} />
            ))}
            <input type="color" value={conn.color ?? '#3b82f6'} onChange={(e) => set((c) => void (c.color = e.target.value))} />
          </div>
        </Field>
        <Field label="Notes">
          <TextInput multiline value={conn.notes ?? ''} onCommit={(v) => set((c) => void (c.notes = v || undefined))} />
        </Field>
        {load && conn.kind === 'power' && (
          <dl className="stats">
            <dt>Load</dt>
            <dd>
              {formatW(load.watts)} · {load.amps.toFixed(2)} A{load.ratingA ? ` of ${load.ratingA} A` : ''}
            </dd>
          </dl>
        )}
      </Section>
      <div className="button-row">
        <button
          className="danger"
          onClick={() => {
            edit((p) => disconnect(p, [conn.id]))
            select(null)
          }}
        >
          Delete cable
        </button>
      </div>
    </>
  )
}
