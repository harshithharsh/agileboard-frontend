import { useEffect, useRef, useState } from 'react';
import { RefreshIcon, DownloadIcon, ChartIcon, SettingsIcon, JiraMark } from './Icons.jsx';
import { formatDateTime } from '../lib/format.js';

// Jira connection state, from the last sync runs
function jiraStatus(sync, syncing) {
  if (syncing) return { key: 'syncing', label: 'Syncing…' };
  if (sync?.latest?.status === 'failed') return { key: 'failed', label: 'Jira Sync Failed' };
  if (sync?.lastSuccessAt) return { key: 'connected', label: 'Jira Connected' };
  return { key: 'disconnected', label: 'Not Connected' };
}

function SettingsPanel({ context, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && onClose();
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const sync = context?.sync;
  const latest = sync?.latest;
  return (
    <div className="settings-panel" ref={ref} role="dialog" aria-label="Settings">
      <div className="settings-title">Jira Connection</div>
      <dl>
        <dt>Jira site</dt>
        <dd>{context?.jiraBaseUrl ? <a href={context.jiraBaseUrl} target="_blank" rel="noreferrer">{context.jiraBaseUrl.replace(/^https?:\/\//, '')}</a> : '—'}</dd>
        <dt>Last successful sync</dt>
        <dd>{sync?.lastSuccessAt ? formatDateTime(sync.lastSuccessAt) : 'Never'}</dd>
        <dt>Last attempt</dt>
        <dd>
          {latest ? `${latest.status === 'success' ? 'Succeeded' : latest.status === 'failed' ? 'Failed' : 'Running'} · ${formatDateTime(latest.started_at)}` : '—'}
          {latest?.status === 'failed' && latest.message && <div className="settings-error">{latest.message}</div>}
        </dd>
      </dl>
      <p className="settings-note">Use Refresh to pull the latest sprints and issues from Jira.</p>
    </div>
  );
}

export default function Header({ context, onRefresh, onExport, loading, syncing }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const status = jiraStatus(context?.sync, syncing);
  const lastSync = context?.sync?.lastSuccessAt;

  return (
    <header className="header">
      <div className="header-brand">
        <a className="brand" href="/" aria-label="AgileMetrix home">
          <img className="brand-icon" src="/logo-icon.svg" alt="" />
          <span className="brand-wordmark"><span className="brand-agile">Agile</span><span className="brand-metrix">Metrix</span></span>
        </a>
        <span className="brand-divider" aria-hidden="true" />
        <h1 className="page-title"><ChartIcon /> Sprint Analytics</h1>
      </div>

      <div className="header-actions">
        <span
          className={`jira-status jira-${status.key}`}
          title={lastSync ? `Last synced from Jira: ${formatDateTime(lastSync)}` : 'Not synced from Jira yet'}
        >
          <JiraMark />
          <span className="jira-label">{status.label}</span>
          <i className="jira-dot" />
        </span>
        <span className="actions-divider" aria-hidden="true" />
        <button className="icon-btn" onClick={onRefresh} disabled={loading} title="Refresh: pull the latest data from Jira" aria-label="Refresh">
          <span className={syncing ? 'spin' : ''}><RefreshIcon /></span>
        </button>
        <button className="icon-btn" onClick={onExport} disabled={!context} title="Export the dashboard as CSV" aria-label="Export">
          <DownloadIcon />
        </button>
        <div className="settings-wrap">
          <button className="icon-btn" onClick={() => setSettingsOpen((o) => !o)} title="Settings" aria-label="Settings" aria-expanded={settingsOpen}>
            <SettingsIcon />
          </button>
          {settingsOpen && <SettingsPanel context={context} onClose={() => setSettingsOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
