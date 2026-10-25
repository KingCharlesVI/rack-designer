import { useEffect, useState } from 'react'
import iconUrl from '../../../../build/icon.svg'
import { appInfo, openExternal, updates, type UpdateStatus } from '../lib/desktop'
import { updateSettings } from '../lib/packCommands'
import { isDirty, useStore } from '../store'
import { saveDesign } from '../lib/commands'

const REPO_URL = 'https://github.com/KingCharlesVI/rack-designer'

/** Save (or confirm discarding) unsaved work, then restart into the downloaded update. */
async function installNow() {
  const s = useStore.getState()
  if (isDirty(s)) {
    const choice = window.confirm('Save your design before restarting to update?\n\nOK = save and update · Cancel = keep working')
    if (!choice) return
    if (!(await saveDesign())) return
  }
  await updates.install()
}

function Progress({ percent }: { percent?: number }) {
  return (
    <div className="update-progress">
      <div style={{ width: `${Math.max(2, Math.min(100, percent ?? 0))}%` }} />
    </div>
  )
}

/** Slim banner under the toolbar when an update is available, downloading or ready. */
export function UpdateBanner() {
  const update = useStore((s) => s.update)
  const dismissed = useStore((s) => s.dismissedUpdate)
  const dismiss = useStore((s) => s.dismissUpdate)
  const openDialog = useStore((s) => s.openDialog)
  if (!update?.version || dismissed === update.version) return null
  if (update.state !== 'available' && update.state !== 'downloading' && update.state !== 'downloaded') return null
  return (
    <div className="update-banner">
      {update.state === 'available' && (
        <>
          <span>
            <b>Rack Designer {update.version}</b> is available (you have {update.currentVersion}).
          </span>
          <button className="link" onClick={() => openDialog({ kind: 'about' })}>
            What's new
          </button>
          <span className="spacer" />
          <button className="primary" onClick={() => void updates.download()}>
            {update.canInstall ? 'Download update' : 'Open download page'}
          </button>
          <button onClick={() => dismiss(update.version!)}>Later</button>
        </>
      )}
      {update.state === 'downloading' && (
        <>
          <span>Downloading Rack Designer {update.version}…</span>
          <Progress percent={update.percent} />
          <span className="muted">{Math.round(update.percent ?? 0)}%</span>
          <span className="spacer" />
        </>
      )}
      {update.state === 'downloaded' && (
        <>
          <span>
            <b>Rack Designer {update.version}</b> is ready to install.
          </span>
          <span className="spacer" />
          <button className="primary" onClick={() => void installNow()}>
            Restart and update
          </button>
          <button onClick={() => dismiss(update.version!)}>On next quit</button>
        </>
      )}
    </div>
  )
}

export function AboutDialog() {
  const update = useStore((s) => s.update)
  const settings = useStore((s) => s.settings)
  const close = () => useStore.getState().openDialog(null)
  const [info, setInfo] = useState<{ version: string; packaged: boolean; portable: boolean } | null>(null)
  useEffect(() => {
    void appInfo().then(setInfo)
  }, [])
  const s: UpdateStatus | null = update

  const statusLine = () => {
    if (!s) return ''
    switch (s.state) {
      case 'unsupported':
        return 'Updates are available in the installed app (this is a development build).'
      case 'checking':
        return 'Checking for updates…'
      case 'not-available':
        return 'You have the latest version.'
      case 'available':
        return `Version ${s.version} is available.`
      case 'downloading':
        return `Downloading version ${s.version}…`
      case 'downloaded':
        return `Version ${s.version} is downloaded and will install when you restart.`
      case 'error':
        return s.error ?? 'Could not check for updates.'
      default:
        return ''
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal about" role="dialog">
        <header>
          <h2>About Rack Designer</h2>
          <button onClick={close}>×</button>
        </header>
        <div className="modal-body">
          <div className="about-head">
            <img className="about-logo" src={iconUrl} alt="" />
            <div>
              <div className="about-name">Rack Designer</div>
              <div className="muted">
                Version {info?.version ?? s?.currentVersion}
                {info?.portable ? ' (portable)' : ''}
              </div>
            </div>
          </div>
          <p className="muted">Design server racks with a large component library, community packs, and power and data connection modelling.</p>

          <h3>Updates</h3>
          <div className={`notice ${s?.state === 'error' ? 'bad' : s?.state === 'available' || s?.state === 'downloaded' ? 'ok' : ''}`}>
            {statusLine()}
            {s?.state === 'downloading' && <Progress percent={s.percent} />}
            {s?.state === 'available' && s.notes && <pre className="release-notes">{s.notes}</pre>}
            {s?.state === 'available' && !s.canInstall && (
              <div className="muted small">The portable version can't update itself. Download the new version from the release page.</div>
            )}
          </div>
          <div className="row about-actions">
            {(s?.state === 'available' || (s?.state === 'error' && s.version)) && (
              <button className="primary" onClick={() => void updates.download()}>
                {s.canInstall ? 'Download update' : 'Open download page'}
              </button>
            )}
            {s?.state === 'downloaded' && (
              <button className="primary" onClick={() => void installNow()}>
                Restart and update
              </button>
            )}
            {s?.state !== 'unsupported' && s?.state !== 'downloading' && s?.state !== 'downloaded' && (
              <button disabled={s?.state === 'checking'} onClick={() => void updates.check()}>
                Check for updates
              </button>
            )}
            <button onClick={() => void updates.openReleasePage()}>Release notes</button>
            <span className="spacer" />
            <label className="field check">
              <input type="checkbox" checked={settings.autoCheckUpdates !== false} onChange={(e) => void updateSettings({ autoCheckUpdates: e.target.checked })} />
              <span>Check for updates at startup</span>
            </label>
          </div>

          <h3>Links</h3>
          <div className="row">
            <button className="link" onClick={() => void openExternal(REPO_URL)}>
              Source code on GitHub
            </button>
            <button className="link" onClick={() => void openExternal(`${REPO_URL}/issues`)}>
              Report an issue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
