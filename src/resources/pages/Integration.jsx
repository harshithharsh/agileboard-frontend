import { useMemo, useState } from 'react';
import { resourceService } from '../data/resourceService.js';
import { PageHead, fmtHours } from '../components/ui.jsx';
import { unmappedUsers } from '../model/select.js';
import { configIssues } from '../model/calc.js';
import { formatDateTime } from '../../lib/datetime.js';

const STEPS = ['Connect', 'Choose data', 'Map fields', 'Capacity rules', 'Review'];
const WEEKDAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ZONES = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return ['Asia/Kolkata', 'UTC']; } })();

// Connection state shown at the top
function connectionState(data) {
  const last = data.syncRuns[0];
  if (data.demo) return { tone: 'warn', label: 'Demo · not connected', detail: 'Redmine is not connected yet: the numbers come from generated demo data.' };
  if (!last) return { tone: 'neutral', label: 'Disconnected', detail: 'No sync has run yet.' };
  if (last.status === 'failed') return { tone: 'bad', label: 'Sync failed', detail: last.message };
  if (last.status === 'partial') return { tone: 'warn', label: 'Attention required', detail: last.message };
  return { tone: 'ok', label: 'Connected', detail: `Last sync ${formatDateTime(last.startedAt)}` };
}

// Redmine integration: a five-step setup, then mapping, rules and sync history
export default function Integration({ data, period, access }) {
  const [step, setStep] = useState(0);
  const state = connectionState(data);
  const unmapped = unmappedUsers(data, period);
  const lastRun = data.syncRuns[0];

  return (
    <>
      <PageHead title="Redmine integration" sub="Connect your own Redmine, choose what to import, map it to AgileMetrix and set how capacity is calculated." />

      <section className="card rm-conn">
        <span className="rm-conn-logo" aria-hidden="true">R</span>
        <div className="rm-conn-text">
          <div><b>{data.integration.name}</b> <span className={`rm-pill ${state.tone}`}>{state.label}</span></div>
          <span className="muted small">{data.integration.baseUrl} · API key {data.integration.hasSecret ? 'saved on the server (never shown)' : 'not set'} · {state.detail}</span>
        </div>
        <button className="btn" onClick={() => setStep(0)}>Edit connection</button>
        <button className="btn" onClick={() => resourceService.runSync(access.by)} title="Demo: records a sync without fetching anything">Sync now (demo)</button>
      </section>

      <section className="card rm-wizard">
        <ol className="rm-steps" aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''}>
              <button onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}><i>{i < step ? '✓' : i + 1}</i>{s}</button>
            </li>
          ))}
        </ol>
        {step === 0 && <ConnectStep data={data} next={() => setStep(1)} />}
        {step === 1 && <DataStep data={data} access={access} back={() => setStep(0)} next={() => setStep(2)} />}
        {step === 2 && <MapStep data={data} period={period} access={access} back={() => setStep(1)} next={() => setStep(3)} />}
        {step === 3 && <RulesStep data={data} access={access} back={() => setStep(2)} next={() => setStep(4)} />}
        {step === 4 && <ReviewStep data={data} unmapped={unmapped} lastRun={lastRun} back={() => setStep(3)} access={access} />}
      </section>

      <section className="card rm-table-card">
        <div className="rm-card-head"><h2>Sync history</h2><span className="muted small">{data.integration.frequency === 'manual' ? 'Manual only' : `${data.integration.frequency === 'hourly' ? 'Every hour' : `Daily at ${data.integration.syncTime}`} (${data.rules.timeZone})`}</span></div>
        <table className="rm-table">
          <thead><tr><th>Started</th><th>Status</th><th className="num">Time entries</th><th className="num">Users</th><th className="num">Duration</th><th>Details</th></tr></thead>
          <tbody>
            {data.syncRuns.map((s) => (
              <tr key={s.id}>
                <td>{formatDateTime(s.startedAt)}</td>
                <td><span className={`rm-pill ${{ success: 'ok', partial: 'warn', failed: 'bad' }[s.status]}`}>{{ success: 'Succeeded', partial: 'Partial', failed: 'Failed' }[s.status]}</span></td>
                <td className="num">{s.entries.toLocaleString('en-IN')}</td>
                <td className="num">{s.users}</td>
                <td className="num">{s.seconds} s</td>
                <td className={`small ${s.status === 'success' ? 'muted' : 'bad-text'}`}>{s.message ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="rm-note">Demo: the wizard saves its settings in this browser. Connecting to a real Redmine, storing the API key and fetching time entries happen on the server once the backend integration is built.</p>
    </>
  );
}

function StepFoot({ back, next, nextLabel = 'Next', note, onNext }) {
  return (
    <div className="rm-step-foot">
      {back ? <button className="btn" onClick={back}>Back</button> : <span />}
      <div className="rm-step-foot-right">
        {note && <span className="muted small">{note}</span>}
        {(next || onNext) && <button className="btn-primary-solid" onClick={onNext ?? next}>{nextLabel}</button>}
      </div>
    </div>
  );
}

function ConnectStep({ data, next }) {
  const [f, setF] = useState({ name: data.integration.name, baseUrl: data.integration.baseUrl, authMethod: data.integration.authMethod, apiKey: '' });
  const [test, setTest] = useState(null);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setTest(null); };
  const save = async () => {
    // The API key is never kept in the browser; only "a key was given" is recorded
    await resourceService.saveIntegration({ name: f.name.trim() || 'Redmine', baseUrl: f.baseUrl.trim(), authMethod: f.authMethod, hasSecret: data.integration.hasSecret || !!f.apiKey });
    setF((s) => ({ ...s, apiKey: '' }));
    next();
  };
  return (
    <div className="rm-step">
      <h2>Connect Redmine</h2>
      <div className="rm-grid2">
        <label className="field"><span className="field-label">Integration name</span><input value={f.name} onChange={set('name')} /></label>
        <label className="field"><span className="field-label">Redmine address</span><input value={f.baseUrl} onChange={set('baseUrl')} placeholder="https://redmine.yourcompany.com" /></label>
        <label className="field"><span className="field-label">Sign-in method</span>
          <select value={f.authMethod} onChange={set('authMethod')}>
            <option value="api-key">API key (recommended)</option>
          </select>
          <span className="field-hint">Use the API key of a Redmine account that can read the projects you import (My account → API access key).</span>
        </label>
        <label className="field"><span className="field-label">API key</span>
          <input type="password" autoComplete="off" value={f.apiKey} onChange={set('apiKey')} placeholder={data.integration.hasSecret ? '•••••••• saved — type to replace' : 'Paste the API key'} />
          <span className="field-hint">Sent to the server and stored encrypted; never shown again or kept in the browser.</span>
        </label>
      </div>
      <div className="rm-test">
        <button className="btn" onClick={async () => setTest(await resourceService.testConnection(f))}>Test connection</button>
        {test && <span className={test.ok ? 'warn-text small' : 'bad-text small'}>{test.message}</span>}
      </div>
      <StepFoot onNext={save} nextLabel="Save and continue" />
    </div>
  );
}

function DataStep({ data, access, back, next }) {
  const [f, setF] = useState({
    projectIds: data.integration.projectIds, importFrom: data.integration.importFrom, frequency: data.integration.frequency,
    syncTime: data.integration.syncTime, eligible: data.rules.eligibleActivities,
  });
  const toggle = (k, v) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const save = async () => {
    await resourceService.saveIntegration({ projectIds: f.projectIds, importFrom: f.importFrom, frequency: f.frequency, syncTime: f.syncTime });
    await resourceService.saveRules({ ...data.rules, eligibleActivities: f.eligible }, access.by);
    next();
  };
  return (
    <div className="rm-step">
      <h2>Choose what to import</h2>
      <div className="rm-grid2">
        <fieldset className="rm-fieldset"><legend>Redmine projects</legend>
          {data.redmineProjects.map((p) => (
            <label key={p.id} className="rm-checkrow"><input type="checkbox" checked={f.projectIds.includes(p.id)} onChange={() => toggle('projectIds', p.id)} />{p.name} <span className="muted small mono">{p.identifier}</span></label>
          ))}
          <span className="field-hint">Users and time entries are imported for these projects only.</span>
        </fieldset>
        <fieldset className="rm-fieldset"><legend>Activities that count as effort</legend>
          {data.rules.activities.map((a) => (
            <label key={a} className="rm-checkrow"><input type="checkbox" checked={f.eligible.includes(a)} onChange={() => toggle('eligible', a)} />{a}</label>
          ))}
          <span className="field-hint">Untick activities such as Leave so they don’t count as actual effort.</span>
        </fieldset>
        <label className="field"><span className="field-label">Import time entries from</span><input type="date" value={f.importFrom} onChange={(e) => setF((s) => ({ ...s, importFrom: e.target.value }))} /></label>
        <div className="field"><span className="field-label">Sync</span>
          <div className="rm-inline-fields">
            <select value={f.frequency} onChange={(e) => setF((s) => ({ ...s, frequency: e.target.value }))}>
              <option value="daily">Daily</option><option value="hourly">Every hour</option><option value="manual">Only when started by hand</option>
            </select>
            {f.frequency === 'daily' && <input type="time" value={f.syncTime} onChange={(e) => setF((s) => ({ ...s, syncTime: e.target.value }))} aria-label="Sync time" />}
          </div>
        </div>
      </div>
      <StepFoot back={back} onNext={save} nextLabel="Save and continue" />
    </div>
  );
}

// Suggest a resource for a Redmine user: same email, else same name
const suggest = (data, user) => data.resources.find((r) => !r.redmineUserId && user.email && r.email?.toLowerCase() === user.email.toLowerCase())
  ?? data.resources.find((r) => !r.redmineUserId && r.name.toLowerCase() === user.name.toLowerCase());

function MapStep({ data, period, access, back, next }) {
  const [tab, setTab] = useState('users');
  const [show, setShow] = useState('unmapped');
  const usersRows = useMemo(() => data.redmineUsers.map((u) => {
    const resource = data.resources.find((r) => r.redmineUserId === u.id);
    const hours = (data.entriesByUser.get(u.id) ?? []).filter((e) => e.date >= period.start && e.date <= period.end).reduce((n, e) => n + e.hours, 0);
    return { u, resource, hours, ignored: data.integration.ignoredUserIds.includes(u.id), suggestion: resource ? null : suggest(data, u) };
  }), [data, period]);
  const unmapped = usersRows.filter((r) => !r.resource && !r.ignored);
  const visible = show === 'unmapped' ? unmapped : show === 'suggested' ? usersRows.filter((r) => r.suggestion) : usersRows;
  const autoMatch = async () => {
    for (const r of usersRows.filter((x) => x.suggestion)) await resourceService.mapRedmineUser(r.u.id, r.suggestion.id, access.by);
  };
  const free = (current) => data.resources.filter((r) => !r.redmineUserId || r.id === current);

  return (
    <div className="rm-step">
      <div className="rm-step-head">
        <div><h2>Map Redmine records to AgileMetrix</h2><p className="muted small">Hours count only for mapped users and projects. {usersRows.length - unmapped.length} of {usersRows.length} users are mapped or ignored.</p></div>
        {tab === 'users' && <button className="btn" onClick={autoMatch} disabled={!usersRows.some((r) => r.suggestion)}>Auto-match {usersRows.filter((r) => r.suggestion).length} by email or name</button>}
      </div>
      <div className="rm-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>Users {unmapped.length > 0 && <span className="rm-pill warn">{unmapped.length} unmapped</span>}</button>
        <button role="tab" aria-selected={tab === 'projects'} className={tab === 'projects' ? 'on' : ''} onClick={() => setTab('projects')}>Projects</button>
        <button role="tab" aria-selected={tab === 'activities'} className={tab === 'activities' ? 'on' : ''} onClick={() => setTab('activities')}>Activities</button>
      </div>

      {tab === 'users' && (
        <>
          <div className="rm-chips">
            {[['unmapped', `Unmapped (${unmapped.length})`], ['suggested', `Suggested (${usersRows.filter((r) => r.suggestion).length})`], ['all', `All (${usersRows.length})`]].map(([k, l]) => (
              <button key={k} className={`rm-chip${show === k ? ' on' : ''}`} aria-pressed={show === k} onClick={() => setShow(k)}>{l}</button>
            ))}
          </div>
          <div className="rm-table-card rm-bordered">
            <table className="rm-table">
              <thead><tr><th>Redmine user</th><th>Email</th><th className="num">Hours in period</th><th>AgileMetrix resource</th><th>Status</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {visible.map(({ u, resource, hours, ignored, suggestion }) => (
                  <tr key={u.id} className={!resource && !ignored ? 'rm-attn' : ''}>
                    <td><b className="mono">{u.login}</b><span className="muted small rm-block">{u.name}</span></td>
                    <td className="muted">{u.email ?? '—'}</td>
                    <td className="num">{fmtHours(Math.round(hours * 10) / 10)}</td>
                    <td>
                      <select value={resource?.id ?? ''} onChange={(e) => resourceService.mapRedmineUser(u.id, e.target.value || null, access.by)} aria-label={`Resource for ${u.login}`}>
                        <option value="">{suggestion ? `Suggested: ${suggestion.name}` : 'Not mapped'}</option>
                        {free(resource?.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td>{resource ? <span className="rm-pill ok">Mapped</span> : ignored ? <span className="rm-pill neutral">Ignored</span> : suggestion ? <span className="rm-pill info">Suggested</span> : <span className="rm-pill warn">Not mapped</span>}</td>
                    <td className="rm-actions">
                      {suggestion && <button className="btn btn-sm" onClick={() => resourceService.mapRedmineUser(u.id, suggestion.id, access.by)}>Accept</button>}
                      {!resource && <button className="btn-link small" onClick={() => resourceService.ignoreRedmineUser(u.id, !ignored)}>{ignored ? 'Undo ignore' : 'Ignore'}</button>}
                    </td>
                  </tr>
                ))}
                {!visible.length && <tr><td colSpan={6} className="muted">Nothing here. {show === 'unmapped' ? 'Every Redmine user is mapped or ignored.' : ''}</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="rm-note">Ignore accounts that aren’t people (bots) or don’t belong in reports. Their hours are left out. Add a missing person on Resource Allocation → Add resource.</p>
        </>
      )}

      {tab === 'projects' && (
        <div className="rm-table-card rm-bordered">
          <table className="rm-table">
            <thead><tr><th>Redmine project</th><th>AgileMetrix project</th></tr></thead>
            <tbody>
              {data.redmineProjects.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b> <span className="muted small mono">{p.identifier}</span></td>
                  <td>
                    <select value={p.mappedProjectId ?? ''} onChange={(e) => resourceService.mapRedmineProject(p.id, e.target.value || null)} aria-label={`AgileMetrix project for ${p.name}`}>
                      <option value="">Not mapped</option>
                      {data.projects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rm-note rm-pad">Project memberships in Redmine are imported as suggestions for project allocations; FTE is always set in AgileMetrix.</p>
        </div>
      )}

      {tab === 'activities' && (
        <div className="rm-table-card rm-bordered">
          <table className="rm-table">
            <thead><tr><th>Redmine activity</th><th>Counts as effort</th></tr></thead>
            <tbody>
              {data.rules.activities.map((a) => (
                <tr key={a}><td>{a}</td><td>{data.rules.eligibleActivities.includes(a) ? <span className="rm-pill ok">Yes</span> : <span className="rm-pill neutral">No</span>}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="rm-note rm-pad">Change which activities count in step 2.</p>
        </div>
      )}
      <StepFoot back={back} next={next} note={unmapped.length ? `${unmapped.length} users still unmapped: their hours are left out until mapped.` : null} />
    </div>
  );
}

function RulesStep({ data, access, back, next }) {
  const [r, setR] = useState(data.rules);
  const [holiday, setHoliday] = useState({ date: '', name: '' });
  const [error, setError] = useState(null);
  const set = (patch) => { setR((s) => ({ ...s, ...patch })); setError(null); };
  const save = async () => {
    if (!(r.hoursPerDay > 0 && r.hoursPerDay <= 24)) return setError('Hours per day must be between 0 and 24');
    if (!r.workingWeekdays.length) return setError('Pick at least one working day');
    if (!(r.thresholds.under < r.thresholds.over)) return setError('The low utilization threshold must be below the high one');
    await resourceService.saveRules(r, access.by);
    next();
  };
  return (
    <div className="rm-step">
      <h2>Capacity rules</h2>
      {error && <p className="form-error">{error}</p>}
      <div className="rm-grid3">
        <label className="field"><span className="field-label">Working hours per day</span><input type="number" min="1" max="24" step="0.5" value={r.hoursPerDay} onChange={(e) => set({ hoursPerDay: Number(e.target.value) })} /></label>
        <label className="field"><span className="field-label">Default FTE for new people</span><input type="number" min="0" max="1.5" step="0.05" value={r.defaultFte} onChange={(e) => set({ defaultFte: Number(e.target.value) })} /></label>
        <label className="field"><span className="field-label">Weeks start on</span>
          <select value={r.weekStart} onChange={(e) => set({ weekStart: Number(e.target.value) })}>{WEEKDAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <div className="field"><span className="field-label">Working days</span>
          <div className="rm-days">{WEEKDAYS.map(([v, l]) => (
            <label key={v} className={r.workingWeekdays.includes(v) ? 'on' : ''}><input type="checkbox" checked={r.workingWeekdays.includes(v)}
              onChange={() => set({ workingWeekdays: r.workingWeekdays.includes(v) ? r.workingWeekdays.filter((x) => x !== v) : [...r.workingWeekdays, v] })} />{l}</label>
          ))}</div>
        </div>
        <label className="field"><span className="field-label">Utilization: flag below (%)</span><input type="number" min="0" max="200" value={r.thresholds.under} onChange={(e) => set({ thresholds: { ...r.thresholds, under: Number(e.target.value) } })} /></label>
        <label className="field"><span className="field-label">Utilization: flag above (%)</span><input type="number" min="0" max="300" value={r.thresholds.over} onChange={(e) => set({ thresholds: { ...r.thresholds, over: Number(e.target.value) } })} /></label>
        <label className="field"><span className="field-label">Reporting time zone</span>
          <select value={r.timeZone} onChange={(e) => set({ timeZone: e.target.value })}>{(ZONES.includes(r.timeZone) ? ZONES : [r.timeZone, ...ZONES]).map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}</select>
        </label>
        <label className="field"><span className="field-label">Financial year starts in</span>
          <select value={r.fiscalYearStartMonth} onChange={(e) => set({ fiscalYearStartMonth: Number(e.target.value) })}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <span className="field-hint">Quarters follow this (Q1 starts in this month).</span>
        </label>
        <label className="field"><span className="field-label">Leave</span>
          <select value={r.leaveHandling} onChange={(e) => set({ leaveHandling: e.target.value })}>
            <option value="exclude">Leave days reduce capacity and plan</option>
          </select>
          <span className="field-hint">Leave is entered per person; Redmine “Leave” entries don’t count as effort.</span>
        </label>
      </div>
      <fieldset className="rm-fieldset"><legend>Public holidays ({r.holidays.length})</legend>
        <div className="rm-holidays">
          {[...r.holidays].sort((a, b) => a.date.localeCompare(b.date)).map((h) => (
            <span key={h.date} className="rm-holiday">{h.date} · {h.name}<button className="btn-link" aria-label={`Remove ${h.name}`} onClick={() => set({ holidays: r.holidays.filter((x) => x.date !== h.date) })}>✕</button></span>
          ))}
        </div>
        <div className="rm-inline-fields">
          <input type="date" value={holiday.date} onChange={(e) => setHoliday((s) => ({ ...s, date: e.target.value }))} aria-label="Holiday date" />
          <input value={holiday.name} onChange={(e) => setHoliday((s) => ({ ...s, name: e.target.value }))} placeholder="Holiday name" aria-label="Holiday name" />
          <button className="btn" disabled={!holiday.date || !holiday.name.trim() || r.holidays.some((h) => h.date === holiday.date)}
            onClick={() => { set({ holidays: [...r.holidays, { date: holiday.date, name: holiday.name.trim() }] }); setHoliday({ date: '', name: '' }); }}>Add holiday</button>
        </div>
      </fieldset>
      <StepFoot back={back} onNext={save} nextLabel="Save and continue" />
    </div>
  );
}

function ReviewStep({ data, unmapped, lastRun, back, access }) {
  const today = data.today;
  const missingFte = data.resources.filter((r) => configIssues(r, data.allocations, today).includes('missing-fte'));
  const projectsUnmapped = data.redmineProjects.filter((p) => data.integration.projectIds.includes(p.id) && !p.mappedProjectId);
  const [saved, setSaved] = useState(false);
  const checks = [
    { ok: !!data.integration.baseUrl, text: `Redmine address: ${data.integration.baseUrl || 'not set'}` },
    { ok: data.integration.hasSecret, warn: true, text: data.integration.hasSecret ? 'API key saved' : 'No API key yet (needed for a real connection)' },
    { ok: true, text: `${data.integration.projectIds.length} projects, ${data.redmineUsers.length} users, ${data.entries.length.toLocaleString('en-IN')} time entries` },
    { ok: !unmapped.length, warn: true, text: unmapped.length ? `${unmapped.length} Redmine users not mapped (${fmtHours(unmapped.reduce((n, u) => n + u.hours, 0))} left out)` : 'All Redmine users mapped or ignored' },
    { ok: !projectsUnmapped.length, warn: true, text: projectsUnmapped.length ? `${projectsUnmapped.length} projects not mapped` : 'All projects mapped' },
    { ok: !missingFte.length, warn: true, text: missingFte.length ? `${missingFte.length} people without an FTE: ${missingFte.map((r) => r.name).join(', ')}` : 'Everyone has an FTE' },
    { ok: lastRun?.status === 'success', warn: true, text: lastRun ? `Last sync: ${{ success: 'succeeded', partial: 'partly failed', failed: 'failed' }[lastRun.status]} ${formatDateTime(lastRun.startedAt)}` : 'No sync yet' },
  ];
  return (
    <div className="rm-step">
      <h2>Review and activate</h2>
      <ul className="rm-review">
        {checks.map((c) => <li key={c.text} className={c.ok ? 'ok' : c.warn ? 'warn' : 'bad'}><span aria-hidden="true">{c.ok ? '✓' : '!'}</span>{c.text}</li>)}
      </ul>
      {saved && <p className="good-text small">Setup saved in this browser (demo). Activating a real connection needs the backend integration.</p>}
      <StepFoot back={back} onNext={async () => { await resourceService.saveIntegration({ activatedAt: new Date().toISOString(), activatedBy: access.by }); setSaved(true); }} nextLabel="Save setup (demo)"
        note="Warnings don’t block activation; they show on the Overview until fixed." />
    </div>
  );
}
