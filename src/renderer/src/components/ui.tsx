import { useEffect, useState, type ReactNode } from 'react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label" title={hint}>
        {label}
      </span>
      {children}
    </label>
  )
}

/** Text input that commits on blur or Enter, so typing doesn't flood the undo history. */
export function TextInput({ value, onCommit, placeholder, list, multiline }: { value: string; onCommit: (v: string) => void; placeholder?: string; list?: string; multiline?: boolean }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => {
    if (draft !== value) onCommit(draft)
  }
  if (multiline) {
    return <textarea value={draft} placeholder={placeholder} rows={3} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
  }
  return (
    <input
      type="text"
      value={draft}
      placeholder={placeholder}
      list={list}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(value)
      }}
    />
  )
}

export function NumberInput({
  value,
  onCommit,
  min,
  max,
  step,
  placeholder,
  allowEmpty
}: {
  value: number | undefined
  onCommit: (v: number | undefined) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  allowEmpty?: boolean
}) {
  const [draft, setDraft] = useState(value?.toString() ?? '')
  useEffect(() => setDraft(value?.toString() ?? ''), [value])
  const commit = () => {
    if (draft.trim() === '') {
      if (allowEmpty && value !== undefined) onCommit(undefined)
      else setDraft(value?.toString() ?? '')
      return
    }
    let n = Number(draft)
    if (!Number.isFinite(n)) {
      setDraft(value?.toString() ?? '')
      return
    }
    if (min !== undefined) n = Math.max(min, n)
    if (max !== undefined) n = Math.min(max, n)
    if (n !== value) onCommit(n)
    else setDraft(value?.toString() ?? '')
  }
  return (
    <input
      type="number"
      value={draft}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
      }}
    />
  )
}

export function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="section">
      <header>
        <h3>{title}</h3>
        {actions}
      </header>
      {children}
    </section>
  )
}

export function LoadBar({ value, limit = 0.8 }: { value: number; limit?: number }) {
  const pct = Math.min(1, value)
  const cls = value > 1 ? 'over' : value > limit ? 'warn' : 'ok'
  return (
    <div className={`loadbar ${cls}`} title={`${Math.round(value * 100)}%`}>
      <div style={{ width: `${pct * 100}%` }} />
      <span>{Math.round(value * 100)}%</span>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
