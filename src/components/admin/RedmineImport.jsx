import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { formatDate, formatDateTime } from '../../lib/datetime.js';
import { RefreshIcon } from '../Icons.jsx';

// Settings → Integrations → Redmine: which Redmine project feeds each Jira project, the import
// of their time entries, who each Redmine person is in AgileMetrix, and the import history.

const fmtHours = (h) => `${Number(h ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} h`;
const RUN_LABEL = { success: 'Succeeded', partial: 'Partial', failed: 'Failed', running: 'Running' };
const RUN_TONE = { success: 'status-on_track', partial: 'status-attention', failed: 'status-at_risk', running: 'status-attention' };

// Likely match for a Redmine name among AgileMetrix users: every word of the shorter name
// starts a word of the longer one ("Mohammed Ijas" ~ "Mohammed Ijas S", "Sanidh Idicula Varghese" ~ "Sanidh Varghese")
const words = (s) => s.toLowerCase().replace(/[.]/g, ' ').split(/\s+/).filter(Boolean);
function suggest(name, users) {
  const a = words(name);
  const hits = users.filter((u) => {
    const b = words(u.name);
    const [short, long] = a.length <= b.length ? [a, b] : [b, a];
    return short.length && short[0] === long[0] && short.every((w) => long.some((x) => x.startsWith(w) || w.startsWith(x)));
  });
  return hits.length === 1 ? hits[0] : null;
}

function useImport(onFinished) {
  const [state, setState] = useState({ running: false, progress: null, error: null, message: null });
  const following = useRef(false);
  const follow = useCallback(async (first) => {
    if (following.current) return;
    following.current = true;
    setState({ running: true, progress: first?.progress ?? null, error: null, message: null });
    try {
      for (;;) {
        await new Promise((r) => setTimeout(r, 1500));
        const s = await api.admin.redmineSyncStatus();
        if (!s.running) {
          const l = s.latest;
          setState({ running: false, progress: null, error: l?.status === 'failed' ? l.message : null, message: l?.status !== 'failed' ? l?.message : null });
          break;
        }
        setState((x) => ({ ...x, progress: s.progress }));
      }
    } catch (e) {
      setState({ running: false, progress: null, error: e.message, message: null });
    } finally {
      following.current = false;
      onFinished();
    }
  }, [onFinished]);
  const start = async () => {
    try { follow(await api.admin.redmineSync()); } catch (e) { setState((x) => ({ ...x, error: e.message })); }
  };
  return { ...state, start, follow };
}

function ImportProgress({ progress }) {
  const pct = progress?.total ? Math.round((progress.entries / progress.total) * 100) : null;
  return (
    <div className="card sync-progress" role="status" aria-live="polite">
      <span className="sync-icon spinning"><RefreshIcon /></span>
      <div className="sync-text">
        <div className="sync-line">
          <strong>Importing from Redmine</strong>
          <span className="sync-meta">Project {Math.min((progress?.projectsDone ?? 0) + 1, progress?.projectsTotal || 1)} of {progress?.projectsTotal || 1}</span>
        </div>
        <div className={`sync-bar${pct === null ? ' indeterminate' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
          <i style={pct === null ? undefined : { width: `${pct}%` }} />
        </div>
        <span>{progress?.current ?? 'Connecting to Redmine…'}{progress?.total ? ` · ${progress.entries.toLocaleString('en-IN')} of ${progress.total.toLocaleString('en-IN')} time entries` : ''}</span>
      </div>
    </div>
  );
}

// One Jira project and the Redmine project that feeds it
function LinkRow({ p, redmineProjects, since, onSaved }) {
  const [f, setF] = useState({ id: p.redmine_project_id ? String(p.redmine_project_id) : '', sub: p.include_subprojects ?? true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const changed = f.id !== (p.redmine_project_id ? String(p.redmine_project_id) : '') || (!!f.id && f.sub !== (p.include_subprojects ?? true));
  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try { await fn(); await onSaved(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const save = () => run(() => api.admin.linkRedmine(p.id, { redmineProjectId: Number(f.id), includeSubprojects: f.sub }));
  const unlink = () => run(() => api.admin.unlinkRedmine(p.id));
  const options = redmineProjects ?? [];
  return (
    <tr className={p.status === 'active' ? '' : 'row-muted'}>
      <td><b>{p.name}</b><span className="cell-sub">Jira · {p.key}{p.status === 'active' ? '' : ' · inactive, not imported'}</span></td>
      <td>
        <select className="link-select" value={f.id} onChange={(e) => setF((s) => ({ ...s, id: e.target.value }))} disabled={busy || !redmineProjects} aria-label={`Redmine project for ${p.name}`}>
          <option value="">{redmineProjects ? 'Not linked' : 'Loading Redmine projects…'}</option>
          {!redmineProjects && p.redmine_project_id && <option value={String(p.redmine_project_id)}>{p.redmine_project_name}</option>}
          {options.map((r) => (
            <option key={r.id} value={String(r.id)} disabled={!!r.linkedTo && r.linkedTo !== p.id}>
              {r.parent ? `${r.parent} › ` : ''}{r.name}{r.linkedTo && r.linkedTo !== p.id ? ' (linked to another project)' : ''}
            </option>
          ))}
        </select>
        {error && <span className="form-error small">{error}</span>}
      </td>
      <td>
        <label className="check-inline"><input type="checkbox" checked={f.sub} disabled={!f.id || busy} onChange={(e) => setF((s) => ({ ...s, sub: e.target.checked }))} /> Include</label>
      </td>
      <td className="num">{p.redmine_project_id ? p.entries.toLocaleString('en-IN') : '—'}</td>
      <td className="num">{p.redmine_project_id ? fmtHours(p.hours) : '—'}</td>
      <td className="num">{p.redmine_project_id ? p.people : '—'}</td>
      <td className="col-actions">
        <div className="row-actions">
          {changed && f.id && <button className="btn btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : p.redmine_project_id ? 'Save' : 'Link'}</button>}
          {!changed && p.redmine_project_id && <button className="btn-link" onClick={unlink} disabled={busy} title={`Unlink and remove its imported hours since ${formatDate(since)}`}>Unlink</button>}
        </div>
      </td>
    </tr>
  );
}

function PeopleCard({ people, users, onChanged }) {
  const [show, setShow] = useState('attention');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const active = useMemo(() => users.filter((u) => u.status === 'active').sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const set = async (p, body) => {
    setBusy(p.id);
    setError(null);
    try { await api.admin.matchRedmineUser(p.id, body); await onChanged(); } catch (e) { setError(e.message); } finally { setBusy(null); }
  };
  const attention = people.filter((p) => !p.user_id && !p.ignored);
  const list = show === 'attention' ? attention : people;
  const status = (p) => (p.ignored ? ['Ignored', 'status-paused'] : !p.user_id ? ['Not matched', 'status-attention']
    : p.match === 'auto' ? ['Matched by name', 'status-on_track'] : ['Matched by you', 'status-on_track']);
  return (
    <section className="admin-card settings-card settings-card-wide">
      <div className="settings-card-head settings-card-head-row">
        <div>
          <h2>People</h2>
          <p>Who each Redmine person is in AgileMetrix. Hours of people who aren’t matched don’t count for anyone.</p>
        </div>
        <div className="segmented segmented-sm" role="radiogroup" aria-label="Show">
          <button role="radio" aria-checked={show === 'attention'} className={`segment${show === 'attention' ? ' active' : ''}`} onClick={() => setShow('attention')}>Not matched ({attention.length})</button>
          <button role="radio" aria-checked={show === 'all'} className={`segment${show === 'all' ? ' active' : ''}`} onClick={() => setShow('all')}>All ({people.length})</button>
        </div>
      </div>
      {error && <p className="form-error card-error">{error}</p>}
      <div className="table-scroll">
        <table className="admin-table people-table">
          <thead><tr><th>Redmine person</th><th className="num">Hours</th><th>Projects</th><th>AgileMetrix user</th><th>Status</th><th className="col-actions">Actions</th></tr></thead>
          <tbody>
            {list.map((p) => {
              const s = !p.user_id && !p.ignored ? suggest(p.name, active) : null;
              const [label, tone] = status(p);
              return (
                <tr key={p.id} className={p.ignored ? 'row-muted' : ''}>
                  <td><b>{p.name.replace(/\s+/g, ' ')}</b><span className="cell-sub">Last entry {formatDate(p.last_entry)}</span></td>
                  <td className="num">{fmtHours(p.hours)}</td>
                  <td className="muted">{(p.projects ?? []).join(', ')}</td>
                  <td>
                    {p.ignored ? <span className="muted">—</span> : (
                      <div className="match-cell">
                        <select value={p.user_id ?? ''} disabled={busy === p.id} onChange={(e) => set(p, { userId: e.target.value || null })} aria-label={`AgileMetrix user for ${p.name}`}>
                          <option value="">Not matched</option>
                          {active.map((u) => <option key={u.id} value={u.id}>{u.name}{u.email ? ` · ${u.email}` : ''}</option>)}
                        </select>
                        {s && <button className="btn btn-sm" disabled={busy === p.id} onClick={() => set(p, { userId: s.id })} title="Use this suggested match">Use {s.name}</button>}
                      </div>
                    )}
                  </td>
                  <td><span className={`status ${tone}`}><i />{label}</span></td>
                  <td className="col-actions">
                    <button className="btn-link" disabled={busy === p.id} onClick={() => set(p, { ignored: !p.ignored, userId: p.user_id })}
                      title={p.ignored ? 'Track this person again' : 'Not a person to track, e.g. a shared or system account'}>{p.ignored ? 'Restore' : 'Ignore'}</button>
                  </td>
                </tr>
              );
            })}
            {!list.length && <tr><td colSpan={6} className="muted empty-cell">{people.length ? 'Everyone is matched.' : 'No one yet: link a project and import.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function RedmineImport({ configured, users, onChanged }) {
  const [data, setData] = useState(null);
  const [people, setPeople] = useState([]);
  const [redmineProjects, setRedmineProjects] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([api.admin.redmine(), api.admin.redmineUsers()]);
      setData(d);
      setPeople(p);
    } catch (e) { setError(e.message); }
  }, []);
  const loadProjects = useCallback(() => api.admin.redmineProjects().then(setRedmineProjects).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (configured) loadProjects(); }, [configured, loadProjects]);

  const finished = useCallback(() => { load(); onChanged?.(); }, [load, onChanged]);
  const imp = useImport(finished);
  useEffect(() => { if (data?.running) imp.follow({ progress: data.progress }); }, [data?.running]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !data) return <div className="card error">Could not load the Redmine import: {error}</div>;
  if (!data) return <div className="card empty">Loading…</div>;

  const linked = data.projects.filter((p) => p.redmine_project_id);
  const last = data.runs[0];
  const neverImported = linked.some((p) => !p.entries) && !imp.running;

  return (
    <>
      <section className="admin-card settings-card settings-card-wide">
        <div className="settings-card-head settings-card-head-row">
          <div>
            <h2>Project links</h2>
            <p>Time logged in the linked Redmine project counts as actual effort for the Jira project. Figures since {formatDate(data.since)}.</p>
          </div>
          <button className="btn-primary-solid" onClick={async () => { await imp.start(); }} disabled={!configured || imp.running || !linked.length}
            title={!linked.length ? 'Link a project first' : 'Import the time entries of all linked projects now'}>
            {imp.running ? 'Importing…' : 'Import now'}
          </button>
        </div>
        {(imp.running || imp.error || imp.message || neverImported) && (
          <div className="integration-sync">
            {imp.running && <ImportProgress progress={imp.progress} />}
            {!imp.running && imp.error && <p className="form-error">Import failed: {imp.error}</p>}
            {!imp.running && imp.message && <p className="form-note" role="status">{imp.message}.</p>}
            {!imp.running && !imp.message && !imp.error && neverImported && <p className="form-note form-note-warn">A linked project has no hours yet: click Import now to load them.</p>}
          </div>
        )}
        {error && <p className="form-error card-error">{error}</p>}
        <div className="table-scroll">
          <table className="admin-table links-table">
            <thead><tr><th>Jira project</th><th>Redmine project</th><th>Sub-projects</th><th className="num">Time entries</th><th className="num">Hours</th><th className="num">People</th><th className="col-actions">Actions</th></tr></thead>
            <tbody>
              {data.projects.map((p) => <LinkRow key={`${p.id}-${p.redmine_project_id ?? 'none'}-${p.include_subprojects}`} p={p} redmineProjects={redmineProjects} since={data.since} onSaved={async () => { await load(); await loadProjects(); }} />)}
            </tbody>
          </table>
        </div>
      </section>

      <PeopleCard people={people} users={users} onChanged={async () => { await load(); onChanged?.(); }} />

      <section className="admin-card settings-card settings-card-wide">
        <div className="settings-card-head"><h2>Import history</h2><p>Runs with the scheduled Jira sync each night, or from Import now. {last ? `Last import ${formatDateTime(last.started_at)}.` : ''}</p></div>
        <div className="table-scroll">
          <table className="admin-table">
            <thead><tr><th>Started</th><th>Status</th><th>By</th><th className="num">Projects</th><th className="num">Time entries</th><th className="num">People</th><th>Details</th></tr></thead>
            <tbody>
              {data.runs.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.started_at)}</td>
                  <td><span className={`status ${RUN_TONE[r.status]}`}><i />{RUN_LABEL[r.status] ?? r.status}</span></td>
                  <td>{r.trigger === 'scheduled' ? 'Schedule' : r.started_by ?? '—'}</td>
                  <td className="num">{r.projects ?? '—'}</td>
                  <td className="num">{r.entries != null ? r.entries.toLocaleString('en-IN') : '—'}</td>
                  <td className="num">{r.users ?? '—'}</td>
                  <td className={`small ${r.status === 'failed' ? 'bad-text' : 'muted'}`}>{r.message ?? '—'}</td>
                </tr>
              ))}
              {!data.runs.length && <tr><td colSpan={7} className="muted empty-cell">No imports yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
