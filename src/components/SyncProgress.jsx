import { useEffect, useState } from 'react';
import { RefreshIcon, CheckCircleIcon, ClearIcon } from './Icons.jsx';

const duration = (seconds) => {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
};

// Progress of a running Jira sync (progress), or a short "completed" note afterwards (done)
export default function SyncProgress({ progress, done, onClose }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (done) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [done]);

  if (done) {
    return (
      <div className="card sync-progress sync-done" role="status">
        <span className="sync-icon"><CheckCircleIcon /></span>
        <div className="sync-text">
          <strong>Jira sync completed</strong>
          <span>{done.sprints ? `${done.sprints} sprints updated` : 'Data updated'} in {duration(done.seconds)}. The dashboard shows the latest data.</span>
        </div>
        <button className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Dismiss"><ClearIcon /></button>
      </div>
    );
  }

  const phase = progress?.phase ?? 'connecting';
  const elapsed = progress?.startedAt ? Math.max(0, Math.round((now - new Date(progress.startedAt)) / 1000)) : null;
  const step = {
    connecting: 'Connecting to Jira…',
    planning: `Finding sprints to update${progress?.current ? ` · ${progress.current}` : ''}…`,
    syncing: `Updating ${progress?.current ?? 'sprints'} · ${progress?.sprintsDone ?? 0} of ${progress?.sprintsTotal ?? 0} sprints`,
  }[phase];
  const percent = progress?.percent ?? 0;

  return (
    <div className="card sync-progress" role="status" aria-live="polite">
      <span className="sync-icon spinning"><RefreshIcon /></span>
      <div className="sync-text">
        <div className="sync-line">
          <strong>Syncing from Jira</strong>
          <span className="sync-meta">{phase === 'syncing' ? `${percent}%` : ''}{elapsed !== null ? `${phase === 'syncing' ? ' · ' : ''}${duration(elapsed)}` : ''}</span>
        </div>
        <div className={`sync-bar${phase === 'syncing' ? '' : ' indeterminate'}`}
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase === 'syncing' ? percent : undefined}>
          <i style={phase === 'syncing' ? { width: `${percent}%` } : undefined} />
        </div>
        <span>{step}</span>
      </div>
    </div>
  );
}
