import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import Modal, { Field } from './Modal.jsx';
import Footer from '../Footer.jsx';
import { RedmineSettings } from '../../resources/pages/Integration.jsx';
import { formatDateTime } from '../../lib/format.js';
import { DATE_FORMATS, TIME_FORMATS, formatDate, formatTime, getDisplaySettings } from '../../lib/datetime.js';
import { getThemeChoice, setThemeChoice } from '../../lib/theme.js';
import {
  ClearIcon, UsersIcon, ShieldIcon, BoxIcon, PlusIcon, EditIcon, TrashIcon, SunIcon, MoonIcon, MonitorIcon, ClockIcon, PlugIcon, JiraMark,
} from '../Icons.jsx';

const PERMISSION_LABELS = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', admin: 'Admin' };

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  return <span className={`status ${status === 'active' ? 'status-on_track' : 'status-at_risk'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>;
}

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
const AVATAR_COLORS = ['#1E3A8A', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#0369a1'];
const avatarColor = (name = '') => AVATAR_COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="row-actions">
      <button className="action-btn" onClick={onEdit} title="Edit" aria-label="Edit"><EditIcon /></button>
      <button className="action-btn action-danger" onClick={onDelete} title="Delete" aria-label="Delete"><TrashIcon /></button>
    </div>
  );
}

function AdminCard({ icon, tone, title, subtitle, addLabel, onAdd, children, count, wide = false }) {
  return (
    <section className={`admin-card${wide ? ' admin-card-wide' : ''}`}>
      <div className="admin-card-head">
        <span className={`admin-card-icon tone-${tone}`}>{icon}</span>
        <div className="admin-card-titles">
          <h2>{title}{count !== undefined && <span className="admin-count">{count}</span>}</h2>
          <p>{subtitle}</p>
        </div>
        <button className="btn-primary-solid" onClick={onAdd}><PlusIcon /> {addLabel}</button>
      </div>
      <div className="admin-table-wrap">{children}</div>
    </section>
  );
}

// Light / dark / system theme switch (saved in this browser)
const THEMES = [
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
  { value: 'system', label: 'System', icon: <MonitorIcon /> },
];

// Compact theme switch in the header: icons only, label in the tooltip
function ThemeSwitch() {
  const [choice, setChoice] = useState(getThemeChoice);
  const choose = (value) => {
    setThemeChoice(value);
    setChoice(value);
  };
  return (
    <div className="segmented segmented-sm" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button key={t.value} role="radio" aria-checked={choice === t.value} aria-label={`${t.label} theme`}
          title={t.value === 'system' ? 'System theme (follows your computer)' : `${t.label} theme`}
          className={`segment${choice === t.value ? ' active' : ''}`} onClick={() => choose(t.value)}>
          {t.icon}
        </button>
      ))}
    </div>
  );
}

// Workspace-wide date and time format: a settings list with a live preview
function DateTimeCard({ onSaved }) {
  const current = getDisplaySettings();
  const [f, setF] = useState(current);
  const [state, setState] = useState({ saving: false, error: null, saved: false });
  const changed = f.dateFormat !== current.dateFormat || f.timeFormat !== current.timeFormat;
  const now = new Date();
  const pick = (patch) => { setF((s) => ({ ...s, ...patch })); setState((s) => ({ ...s, saved: false, error: null })); };
  const save = async () => {
    setState({ saving: true, error: null, saved: false });
    try {
      const saved = await api.admin.saveSettings(f);
      onSaved?.(saved);
      setState({ saving: false, error: null, saved: true });
    } catch (e) {
      setState({ saving: false, error: e.message, saved: false });
    }
  };
  return (
    <section className="admin-card settings-card">
      <div className="settings-card-head">
        <h2>Date and time</h2>
        <p>Applies to everyone in the workspace.</p>
      </div>
      <div className="pref-row">
        <div className="pref-row-text">
          <span className="pref-row-label">Date format</span>
          <span className="pref-row-hint">How dates appear in filters, cards, charts and reports.</span>
        </div>
        <select value={f.dateFormat} onChange={(e) => pick({ dateFormat: e.target.value })} aria-label="Date format">
          {DATE_FORMATS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="pref-row">
        <div className="pref-row-text">
          <span className="pref-row-label">Time format</span>
          <span className="pref-row-hint">12-hour clock with AM/PM, or 24-hour clock.</span>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Time format">
          {[['12h', '12-hour'], ['24h', '24-hour']].map(([value, label]) => (
            <button key={value} role="radio" aria-checked={f.timeFormat === value}
              className={`segment${f.timeFormat === value ? ' active' : ''}`} onClick={() => pick({ timeFormat: value })}>{label}</button>
          ))}
        </div>
      </div>
      <div className="pref-row">
        <div className="pref-row-text">
          <span className="pref-row-label">Preview</span>
          <span className="pref-row-hint">Right now, in the format above.</span>
        </div>
        <span className="pref-preview">{formatDate(now, { format: f.dateFormat })}, {formatTime(now, { format: f.timeFormat })}</span>
      </div>
      <div className="settings-card-foot">
        {state.error && <span className="form-error">{state.error}</span>}
        {!state.error && state.saved && <span className="settings-saved">Saved</span>}
        {changed && <button className="btn" onClick={() => pick(current)} disabled={state.saving}>Cancel</button>}
        <button className="btn-primary-solid" onClick={save} disabled={!changed || state.saving}>{state.saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </section>
  );
}

// On/off switch for a settings row
function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      className={`switch${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}>
      <i />
    </button>
  );
}

const TIME_ZONES = (() => {
  try { return Intl.supportedValuesOf('timeZone'); } catch { return ['Asia/Kolkata', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Singapore', 'Asia/Dubai']; }
})();

// Scheduled Jira sync and who gets an email about it
function AutomationCard() {
  const [saved, setSaved] = useState(null); // what the server has
  const [f, setF] = useState(null); // what is being edited
  const [state, setState] = useState({ saving: false, error: null, message: null });

  const fromServer = (a) => {
    setSaved(a);
    setF({ ...a.schedule, onSuccess: a.notifications.onSuccess, onFailure: a.notifications.onFailure, recipients: a.notifications.recipients.join(', ') });
  };
  useEffect(() => {
    api.admin.automation().then(fromServer).catch((e) => setState((s) => ({ ...s, error: e.message })));
  }, []);
  if (!f) return <section className="admin-card settings-card"><div className="settings-card-head"><h2>Scheduled Jira sync</h2><p>{state.error ?? 'Loading…'}</p></div></section>;

  const recipients = f.recipients.split(/[,;\s]+/).map((r) => r.trim()).filter(Boolean);
  const body = { schedule: { enabled: f.enabled, time: f.time, timeZone: f.timeZone }, notifications: { onSuccess: f.onSuccess, onFailure: f.onFailure, recipients } };
  const current = { schedule: saved.schedule, notifications: saved.notifications };
  const changed = JSON.stringify(body) !== JSON.stringify(current);
  const set = (patch) => { setF((s) => ({ ...s, ...patch })); setState((s) => ({ ...s, error: null, message: null })); };

  const save = async () => {
    setState({ saving: true, error: null, message: null });
    try {
      fromServer(await api.admin.saveAutomation(body));
      setState({ saving: false, error: null, message: 'Saved' });
    } catch (e) {
      setState({ saving: false, error: e.message, message: null });
    }
  };
  const test = async () => {
    setState({ saving: true, error: null, message: null });
    try {
      const r = await api.admin.testEmail();
      setState({ saving: false, error: null, message: `Test email sent to ${r.sent} recipient${r.sent === 1 ? '' : 's'}` });
    } catch (e) {
      setState({ saving: false, error: e.message, message: null });
    }
  };
  const last = saved.lastRun;

  return (
    <section className="admin-card settings-card">
      <div className="settings-card-head">
        <h2>Scheduled Jira sync</h2>
        <p>Pull the latest data from Jira automatically every day, and email people about it.</p>
      </div>

      <div className="pref-row">
        <div className="pref-row-text">
          <span className="pref-row-label">Run a sync every day</span>
          <span className="pref-row-hint">{saved.schedule.enabled && saved.nextRun ? `Next run: ${formatDateTime(saved.nextRun)}` : 'Off: data updates only when someone clicks Refresh.'}</span>
        </div>
        <Switch checked={f.enabled} onChange={(v) => set({ enabled: v })} label="Run a sync every day" />
      </div>
      <div className={`pref-row${f.enabled ? '' : ' pref-disabled'}`}>
        <div className="pref-row-text">
          <span className="pref-row-label">Time</span>
          <span className="pref-row-hint">When the daily sync starts.</span>
        </div>
        <div className="pref-inline">
          <input type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} disabled={!f.enabled} aria-label="Sync time" />
          <select value={f.timeZone} onChange={(e) => set({ timeZone: e.target.value })} disabled={!f.enabled} aria-label="Time zone">
            {(TIME_ZONES.includes(f.timeZone) ? TIME_ZONES : [f.timeZone, ...TIME_ZONES]).map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>
      {last && (
        <div className="pref-row">
          <div className="pref-row-text">
            <span className="pref-row-label">Last scheduled sync</span>
            <span className="pref-row-hint">{last.lastMessage}{last.lastEmailed ? ' · email sent' : last.lastEmailError ? ` · email failed: ${last.lastEmailError}` : ''}</span>
          </div>
          <span className={`status ${last.lastStatus === 'success' ? 'status-on_track' : 'status-at_risk'}`}>
            <i />{last.lastStatus === 'success' ? 'Succeeded' : 'Failed'} · {formatDateTime(last.lastFinishedAt)}
          </span>
        </div>
      )}

      <div className="settings-subhead">Email</div>
      <div className="pref-row">
        <div className="pref-row-text">
          <span className="pref-row-label">Email when the scheduled sync succeeds</span>
        </div>
        <Switch checked={f.onSuccess} onChange={(v) => set({ onSuccess: v })} label="Email when the scheduled sync succeeds" />
      </div>
      <div className="pref-row">
        <div className="pref-row-text">
          <span className="pref-row-label">Email when it fails</span>
        </div>
        <Switch checked={f.onFailure} onChange={(v) => set({ onFailure: v })} label="Email when the scheduled sync fails" />
      </div>
      <div className="pref-row">
        <div className="pref-row-text">
          <span className="pref-row-label">Recipients</span>
          <span className="pref-row-hint">Separate several addresses with commas.</span>
        </div>
        <input className="pref-wide" type="text" value={f.recipients} onChange={(e) => set({ recipients: e.target.value })}
          placeholder="name@company.com" aria-label="Email recipients" />
      </div>
      <div className="pref-row">
        <div className="pref-row-text">
          <span className="pref-row-label">Email server</span>
          <span className="pref-row-hint">{saved.email.configured ? `Sending through ${saved.email.host} as ${saved.email.from}.` : 'Not set up: add the SMTP settings to the backend .env, then restart it.'}</span>
        </div>
        <span className={`status ${saved.email.configured ? 'status-on_track' : 'status-attention'}`}><i />{saved.email.configured ? 'Ready' : 'Not set up'}</span>
      </div>

      <div className="settings-card-foot">
        {state.error && <span className="form-error">{state.error}</span>}
        {!state.error && state.message && <span className="settings-saved">{state.message}</span>}
        <button className="btn" onClick={test} disabled={state.saving || changed || !saved.email.configured || !saved.notifications.recipients.length}
          title={changed ? 'Save your changes first' : !saved.email.configured ? 'Email is not set up on the server' : 'Send a test email to the recipients'}>Send test email</button>
        {changed && <button className="btn" onClick={() => fromServer(saved)} disabled={state.saving}>Cancel</button>}
        <button className="btn-primary-solid" onClick={save} disabled={!changed || state.saving}>{state.saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Integrations: Jira and Redmine, each with its connection (set in the backend .env) and its settings
// ---------------------------------------------------------------------------

function Row({ label, hint, children }) {
  return (
    <div className="pref-row">
      <div className="pref-row-text">
        <span className="pref-row-label">{label}</span>
        {hint && <span className="pref-row-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const Status = ({ ok, children }) => <span className={`status ${ok ? 'status-on_track' : 'status-attention'}`}><i />{children}</span>;

// Status row + "Test connection" for one integration
function ConnectionCard({ name, title, intro, info, envHint, rows, describe }) {
  const [test, setTest] = useState(null); // { running } | result
  const run = async () => {
    setTest({ running: true });
    try { setTest(await api.admin.testIntegration(name)); } catch (e) { setTest({ ok: false, error: e.message }); }
  };
  return (
    <section className="admin-card settings-card">
      <div className="settings-card-head"><h2>{title}</h2><p>{intro}</p></div>
      <Row label="Connection" hint={info.configured ? 'Set in the backend .env. Secrets stay on the server and are never shown here.' : envHint}>
        <Status ok={info.configured}>{info.configured ? 'Configured' : 'Not set up'}</Status>
      </Row>
      {rows}
      {test && !test.running && (
        <Row label="Test result" hint={test.ok ? describe(test) : test.error}>
          <Status ok={test.ok}>{test.ok ? 'Connected' : 'Failed'}</Status>
        </Row>
      )}
      <div className="settings-card-foot">
        <button className="btn" onClick={run} disabled={!info.configured || test?.running}>{test?.running ? 'Testing…' : 'Test connection'}</button>
      </div>
    </section>
  );
}

function JiraIntegration({ info }) {
  const last = info.lastSync;
  return (
    <>
      <ConnectionCard name="jira" title="Jira connection" info={info}
        intro="Sprints, issues and team members come from Jira Cloud."
        envHint="Set JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN in the backend .env, then restart it."
        describe={(t) => `Signed in as ${t.account}${t.timeZone ? ` (${t.timeZone})` : ''}; the token can see ${t.projects} project${t.projects === 1 ? '' : 's'}.`}
        rows={(
          <>
            <Row label="Site"><span className="pref-value mono">{info.baseUrl ?? '—'}</span></Row>
            <Row label="Account" hint="Jira user the API token belongs to."><span className="pref-value">{info.email ?? '—'}</span></Row>
            <Row label="API token"><Status ok={info.tokenSet}>{info.tokenSet ? 'Set' : 'Not set'}</Status></Row>
            <Row label="What is synced" hint={`Sprints that started since ${formatDate(info.syncSince)}, and at least the last ${info.closedSprints} closed sprints of each team's board.`}>
              <span className="pref-value">{info.projects} projects · {info.teams} teams · {info.sprints} sprints</span>
            </Row>
            <Row label="Last sync" hint={last?.message ?? (info.running ? 'A sync is running now.' : 'No sync has run yet.')}>
              {last && <Status ok={last.status === 'success'}>{{ success: 'Succeeded', failed: 'Failed', running: 'Running' }[last.status] ?? last.status} · {formatDateTime(last.finished_at ?? last.started_at)}</Status>}
            </Row>
          </>
        )} />
      <AutomationCard />
    </>
  );
}

function RedmineIntegration({ info, user }) {
  return (
    <>
      <ConnectionCard name="redmine" title="Redmine connection" info={info}
        intro="Time entries for Resource Management come from Redmine."
        envHint="Set REDMINE_URL and REDMINE_API_KEY in the backend .env, then restart it."
        describe={(t) => `Signed in as ${t.account} (${t.login}); the key can read ${t.projects ?? '?'} project${t.projects === 1 ? '' : 's'}${t.canListUsers ? ' and list all users.' : '. It can’t list all users (needs a Redmine admin account), so people are taken from time entries.'}`}
        rows={(
          <>
            <Row label="Site"><span className="pref-value mono">{info.baseUrl ?? '—'}</span></Row>
            <Row label="API key"><Status ok={info.keySet}>{info.keySet ? 'Set' : 'Not set'}</Status></Row>
          </>
        )} />
      <div className="settings-subhead-plain">Import setup <span className="rm-pill warn">Demo</span></div>
      <RedmineSettings user={user} />
    </>
  );
}

function IntegrationsTab({ user, sub, setSub }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api.admin.integrations().then(setInfo).catch((e) => setError(e.message)); }, []);
  return (
    <>
      <div className="segmented integration-switch" role="tablist" aria-label="Integration">
        {[['jira', 'Jira', <JiraMark key="i" />], ['redmine', 'Redmine', <PlugIcon key="i" />]].map(([id, label, icon]) => (
          <button key={id} role="tab" aria-selected={sub === id} className={`segment${sub === id ? ' active' : ''}`} onClick={() => setSub(id)}>{icon}{label}</button>
        ))}
      </div>
      {error && <div className="card error">Could not load integrations: {error}</div>}
      {!info && !error && <div className="card empty">Loading…</div>}
      {info && sub === 'jira' && <JiraIntegration info={info.jira} />}
      {info && sub === 'redmine' && <RedmineIntegration info={info.redmine} user={user} />}
    </>
  );
}

const Empty = ({ cols, text }) => (
  <tr><td colSpan={cols} className="admin-empty">{text}</td></tr>
);

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

function UserForm({ item, roles, projects, onSave, onCancel, saving, error }) {
  const [f, setF] = useState({
    name: item?.name ?? '', email: item?.email ?? '', roleId: item?.role_id ?? roles.find((r) => r.name === 'Viewer')?.id ?? '',
    projectIds: item?.project_ids ?? [], status: item?.status ?? 'active',
    username: item?.username ?? '', password: '',
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const toggleProject = (id) => setF((s) => ({ ...s, projectIds: s.projectIds.includes(id) ? s.projectIds.filter((p) => p !== id) : [...s.projectIds, id] }));
  return (
    <Modal title={item ? 'Edit User' : 'Add User'} onClose={onCancel}
      footer={<FormButtons onCancel={onCancel} onSave={() => onSave(f)} saving={saving} />}>
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <Field label="Name" hint={item?.from_jira ? 'Synced from Jira; Jira updates the name.' : undefined}>
          <input value={f.name} onChange={set('name')} disabled={item?.from_jira} autoFocus={!item?.from_jira} />
        </Field>
        <Field label="Email"><input type="email" value={f.email ?? ''} onChange={set('email')} placeholder="name@company.com" /></Field>
        <Field label="Role">
          <select value={f.roleId ?? ''} onChange={set('roleId')}>
            <option value="">No role</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={f.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </Field>
      </div>
      <div className="form-section">
        <span className="field-label">Sign-in</span>
        <span className="field-hint">
          {item?.can_sign_in ? 'This person can sign in. Clear the username to remove their sign-in.' : 'Give this person a username and password so they can sign in.'}
        </span>
        <div className="form-grid">
          <Field label="Username"><input value={f.username} onChange={set('username')} autoComplete="off" placeholder="e.g. harshith" /></Field>
          <Field label={item?.can_sign_in ? 'New password' : 'Password'} hint={item?.can_sign_in ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}>
            <input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
        </div>
      </div>
      <Field label="Projects">
        <div className="check-group">
          {projects.map((p) => (
            <label key={p.id} className="check"><input type="checkbox" checked={f.projectIds.includes(p.id)} onChange={() => toggleProject(p.id)} /> {p.name}</label>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

function RoleForm({ item, permissions, onSave, onCancel, saving, error }) {
  const [f, setF] = useState({ name: item?.name ?? '', description: item?.description ?? '', permissions: item?.permissions ?? ['view'] });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const toggle = (p) => setF((s) => ({ ...s, permissions: s.permissions.includes(p) ? s.permissions.filter((x) => x !== p) : [...s.permissions, p] }));
  return (
    <Modal title={item ? 'Edit Role' : 'Add Role'} onClose={onCancel}
      footer={<FormButtons onCancel={onCancel} onSave={() => onSave(f)} saving={saving} />}>
      {error && <p className="form-error">{error}</p>}
      <Field label="Role name"><input value={f.name} onChange={set('name')} autoFocus /></Field>
      <Field label="Description"><input value={f.description ?? ''} onChange={set('description')} /></Field>
      <Field label="Permissions">
        <div className="check-group">
          {permissions.map((p) => (
            <label key={p} className="check"><input type="checkbox" checked={f.permissions.includes(p)} onChange={() => toggle(p)} /> {PERMISSION_LABELS[p] ?? p}</label>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

// Team name suggested from a Jira board name ("Nexo Board" -> "Nexo")
const teamNameFor = (board) => board.name.replace(/\s+(board|sprint|scrum)$/i, '').trim() || board.name;

function ProjectForm({ item, onSave, onCancel, saving, error }) {
  const [f, setF] = useState({
    key: item?.key ?? '', name: item?.name ?? '', description: item?.description ?? '', status: item?.status ?? 'active',
    teams: (item?.teams ?? []).map((t) => ({ ...t, jiraBoardId: t.jiraBoardId != null ? String(t.jiraBoardId) : '' })),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setTeam = (i, k) => (e) => setF((s) => ({ ...s, teams: s.teams.map((t, n) => (n === i ? { ...t, [k]: e.target.value } : t)) }));
  const addTeam = () => setF((s) => ({ ...s, teams: [...s.teams, { name: '', jiraBoardId: '', wipLimit: 5 }] }));
  const removeTeam = (i) => setF((s) => ({ ...s, teams: s.teams.filter((_, n) => n !== i) }));

  // Adding: pick from the active Jira projects
  const [jira, setJira] = useState({ projects: null, error: null });
  useEffect(() => {
    if (item) return;
    api.admin.jiraProjects()
      .then((projects) => setJira({ projects, error: null }))
      .catch((e) => setJira({ projects: null, error: e.message }));
  }, [item]);
  const fromJira = !item && !!jira.projects?.some((p) => p.key === f.key);

  // The project's Scrum boards in Jira, offered for each team
  const boardKey = item ? item.key : fromJira ? f.key : null;
  const [boards, setBoards] = useState({ key: null, list: null, error: null });
  useEffect(() => {
    if (!boardKey) return undefined;
    let live = true;
    setBoards({ key: boardKey, list: null, error: null });
    api.admin.jiraBoards(boardKey)
      .then((list) => live && setBoards({ key: boardKey, list, error: null }))
      .catch((e) => live && setBoards({ key: boardKey, list: null, error: e.message }));
    return () => { live = false; };
  }, [boardKey]);
  const boardList = boards.key === boardKey ? boards.list : null;
  const loadingBoards = !!boardKey && boards.key === boardKey && !boards.list && !boards.error;
  const filledFor = useRef(null);
  // New project from Jira: start with one team per board
  useEffect(() => {
    if (item || !fromJira || !boardList || filledFor.current === f.key) return;
    filledFor.current = f.key;
    setF((s) => ({ ...s, teams: boardList.map((b) => ({ name: teamNameFor(b), jiraBoardId: String(b.id), wipLimit: 5 })) }));
  }, [item, fromJira, boardList, f.key]);

  const pickJira = (e) => {
    const p = jira.projects.find((x) => x.key === e.target.value);
    filledFor.current = null;
    setF((s) => (p
      ? { ...s, key: p.key, name: p.name.trim(), description: p.description, teams: [] }
      : { ...s, key: '', name: '', description: '', teams: [] }));
  };
  const pickBoard = (i) => (e) => {
    const board = boardList?.find((b) => String(b.id) === e.target.value);
    setF((s) => ({
      ...s,
      teams: s.teams.map((t, n) => (n === i ? { ...t, jiraBoardId: e.target.value, name: t.name || (board ? teamNameFor(board) : '') } : t)),
    }));
  };

  const boardField = (t, i) => {
    if (!boardList) {
      return <input value={t.jiraBoardId} onChange={setTeam(i, 'jiraBoardId')} placeholder={loadingBoards ? 'Loading boards…' : 'Jira board id'} inputMode="numeric" aria-label="Jira board id" disabled={loadingBoards} />;
    }
    const used = new Set(f.teams.filter((_, n) => n !== i).map((x) => x.jiraBoardId));
    const known = boardList.some((b) => String(b.id) === t.jiraBoardId);
    return (
      <select value={t.jiraBoardId} onChange={pickBoard(i)} aria-label="Jira board">
        <option value="">Select a board</option>
        {t.jiraBoardId && !known && <option value={t.jiraBoardId}>Board #{t.jiraBoardId} (not in this project)</option>}
        {boardList.map((b) => (
          <option key={b.id} value={String(b.id)} disabled={used.has(String(b.id))}>{b.name} (#{b.id}){used.has(String(b.id)) ? ' · in use' : ''}</option>
        ))}
      </select>
    );
  };

  const teamsHint = loadingBoards ? 'Loading the project’s Scrum boards from Jira…'
    : boards.error && boardKey ? `Could not load boards from Jira (${boards.error}). Enter the board id from the board's URL (…/boards/524).`
    : boardList ? (boardList.length ? 'Each team is synced from one of the project’s Scrum boards in Jira.' : 'This project has no Scrum boards in Jira.')
    : <>Each team is synced from its Jira board. Find the board id in the board's URL (…/boards/<b>524</b>).</>;

  return (
    <Modal title={item ? 'Edit Project' : 'Add Project'} width={600} onClose={onCancel}
      footer={<FormButtons onCancel={onCancel} onSave={() => onSave(f)} saving={saving} />}>
      {error && <p className="form-error">{error}</p>}
      {!item && (
        <Field label="Jira project" hint={jira.error ? `${jira.error}. You can still enter the project by hand.` : 'Active projects in Jira. Projects already in AgileMetrix can’t be picked again.'}>
          <select value={fromJira ? f.key : ''} onChange={pickJira} disabled={!jira.projects} autoFocus>
            <option value="">{jira.projects ? `Select a Jira project (${jira.projects.filter((p) => !p.added).length} available)` : jira.error ? 'Could not load Jira projects' : 'Loading projects from Jira…'}</option>
            {jira.projects?.map((p) => (
              <option key={p.key} value={p.key} disabled={p.added}>{p.name.trim()} ({p.key}){p.added ? ' · already added' : ''}</option>
            ))}
          </select>
        </Field>
      )}
      <div className="form-grid">
        <Field label="Project name"><input value={f.name} onChange={set('name')} autoFocus={!!item} /></Field>
        <Field label="Key" hint={item ? 'The Jira project key can’t be changed.' : fromJira ? 'From Jira' : 'Jira project key, e.g. FIBI'}><input value={f.key} onChange={set('key')} readOnly={fromJira || !!item} /></Field>
      </div>
      <Field label="Description"><input value={f.description ?? ''} onChange={set('description')} /></Field>
      <Field label="Status" hint="Inactive projects are hidden from the dashboard and not synced.">
        <select value={f.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </Field>
      <div className="field">
        <span className="field-label">Teams</span>
        <span className="field-hint">{teamsHint}</span>
        <div className="team-rows">
          {f.teams.length > 0 && (
            <div className="team-row team-row-head" aria-hidden="true"><span>Team name</span><span>Jira board</span><span>WIP</span><span /></div>
          )}
          {f.teams.map((t, i) => (
            <div className="team-row" key={t.id ?? `new-${i}`}>
              <input value={t.name} onChange={setTeam(i, 'name')} placeholder="Team name" aria-label="Team name" />
              {boardField(t, i)}
              <input value={t.wipLimit} onChange={setTeam(i, 'wipLimit')} placeholder="WIP" inputMode="numeric" aria-label="WIP limit" title="WIP limit" />
              <button type="button" className="action-btn action-danger" onClick={() => removeTeam(i)} disabled={t.sprints > 0}
                title={t.sprints > 0 ? 'This team has synced sprints and can’t be removed' : 'Remove team'} aria-label="Remove team"><TrashIcon /></button>
            </div>
          ))}
          <button type="button" className="btn-link" onClick={addTeam}><PlusIcon /> Add team</button>
        </div>
      </div>
    </Modal>
  );
}

function FormButtons({ onCancel, onSave, saving, label = 'Save' }) {
  return (
    <>
      <button className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
      <button className="btn-primary-solid" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : label}</button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Team members: fetched from Jira (assignees on the board), with manual additions and removals
// ---------------------------------------------------------------------------

function TeamMembersDialog({ team, project, users, onClose, onChanged }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(null); // 'fetch' | userId | 'add'
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [adding, setAdding] = useState('');

  useEffect(() => { api.admin.teamMembers(team.id).then(setInfo).catch((e) => setError(e.message)); }, [team.id]);

  const run = async (key, fn, after) => {
    setBusy(key);
    setError(null);
    setNote(null);
    try {
      const r = await fn();
      setInfo((s) => ({ ...s, members: r.members }));
      after?.(r);
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  const fetchFromJira = () => run('fetch', () => api.admin.fetchTeamMembers(team.id), (r) =>
    setNote(r.added ? `Found ${r.found} people on the board; added ${r.added} new.` : `Found ${r.found} people on the board; everyone is already listed.`));

  const members = info?.members.filter((m) => !m.excluded) ?? [];
  const removed = info?.members.filter((m) => m.excluded) ?? [];
  const listed = new Set(members.map((m) => m.id));
  const candidates = users.filter((u) => !listed.has(u.id) && u.status === 'active');

  return (
    <Modal title={`${team.name} · team members`} width={640} onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Done</button>}>
      <div className="members-head">
        <p className="muted small">
          {project.name} · Jira board #{team.jiraBoardId ?? '—'}. Fetching adds everyone assigned to an issue on the board
          updated in the last {info?.windowDays ?? 90} days. The nightly sync adds new assignees too; people you remove stay removed.
        </p>
        <button className="btn-primary-solid" onClick={fetchFromJira} disabled={!!busy || !team.jiraBoardId}>
          {busy === 'fetch' ? 'Fetching from Jira…' : 'Fetch from Jira'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="form-note" role="status">{note}</p>}
      {!info && !error && <p className="muted">Loading…</p>}
      {info && (
        <>
          <table className="admin-table members-table">
            <thead><tr><th>Name</th><th>Source</th><th className="num">Issues</th><th className="col-actions" aria-label="Actions" /></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="person"><span className="avatar" style={{ background: avatarColor(m.name) }}>{initials(m.name)}</span>
                      <span><b>{m.name}</b>{m.email && <span className="cell-sub">{m.email}</span>}</span></span>
                  </td>
                  <td><span className={`tag${m.source === 'jira' ? ' tag-jira' : ''}`}>{m.source === 'jira' ? 'From Jira' : 'Added here'}</span></td>
                  <td className="num">{m.issues}</td>
                  <td><button className="action-btn action-danger" onClick={() => run(m.id, () => api.admin.removeTeamMember(team.id, m.id))} disabled={!!busy}
                    title="Remove from team" aria-label={`Remove ${m.name}`}><TrashIcon /></button></td>
                </tr>
              ))}
              {!members.length && <Empty cols={4} text="No members yet. Fetch them from Jira." />}
            </tbody>
          </table>
          <div className="members-add">
            <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Person to add">
              <option value="">Add a person…</option>
              {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}{u.email ? ` · ${u.email}` : ''}</option>)}
            </select>
            <button className="btn" disabled={!adding || !!busy} onClick={() => run('add', () => api.admin.addTeamMember(team.id, adding), () => setAdding(''))}>Add</button>
          </div>
          {removed.length > 0 && (
            <details className="members-removed">
              <summary>Removed ({removed.length}): not added back by Jira</summary>
              <ul>
                {removed.map((m) => (
                  <li key={m.id}><span>{m.name}</span>
                    <button className="btn-link" onClick={() => run(m.id, () => api.admin.addTeamMember(team.id, m.id))} disabled={!!busy}>Restore</button></li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </Modal>
  );
}

export default function AdminOverlay({ user, initialTab, onClose, onChanged, onDisplayChange }) {
  // Which section is open; remembered in this browser unless a page asked for a tab
  // Links ask for 'redmine' or 'jira': that is the Integrations tab
  const [tab, setTab] = useState(() => {
    if (initialTab) return ['redmine', 'jira'].includes(initialTab) ? 'integrations' : initialTab;
    try {
      const saved = localStorage.getItem('agilemetrix-admin-tab') || 'users';
      return saved === 'redmine' ? 'integrations' : saved;
    } catch { return 'users'; }
  });
  const [integration, setIntegration] = useState(() => {
    if (['redmine', 'jira'].includes(initialTab)) return initialTab;
    try { return localStorage.getItem('agilemetrix-admin-integration') || 'jira'; } catch { return 'jira'; }
  });
  const chooseIntegration = (id) => {
    setIntegration(id);
    try { localStorage.setItem('agilemetrix-admin-integration', id); } catch { /* storage unavailable */ }
  };
  const chooseTab = (id) => {
    setTab(id);
    try { localStorage.setItem('agilemetrix-admin-tab', id); } catch { /* storage unavailable */ }
  };
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // { kind, item }
  const [deleting, setDeleting] = useState(null); // { kind, item, label }
  const [membersOf, setMembersOf] = useState(null); // { team, project }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => api.admin.load().then(setData).catch((e) => setLoadError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  // Lock page scroll while open; Escape closes (unless a dialog is open)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && !editing && !deleting && !membersOf && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, editing, deleting, membersOf]);

  const flash = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const save = async (form) => {
    const { kind, item } = editing;
    setSaving(true);
    setFormError(null);
    try {
      if (item) await api.admin.update(kind, item.id, form);
      else await api.admin.create(kind, form);
      setEditing(null);
      await load();
      onChanged?.();
      flash(item ? 'Changes saved' : 'Added');
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setFormError(null);
    try {
      await api.admin.remove(deleting.kind, deleting.item.id);
      setDeleting(null);
      await load();
      onChanged?.();
      flash('Deleted');
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (kind, item = null) => { setFormError(null); setEditing({ kind, item }); };
  const openDelete = (kind, item, label) => { setFormError(null); setDeleting({ kind, item, label }); };

  const view = data;

  return (
    <div className="admin-overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <header className="admin-header">
        <div className="admin-top">
          <h1>Settings</h1>
          <div className="admin-top-actions">
            <ThemeSwitch />
            <button className="icon-btn" onClick={onClose} title="Back to dashboard (Esc)" aria-label="Close settings"><ClearIcon /></button>
          </div>
        </div>
        <nav className="admin-tabs" role="tablist" aria-label="Settings sections">
          {[
            ['general', 'General', <ClockIcon key="i" />, null],
            ['users', 'Users', <UsersIcon key="i" />, data?.users.length],
            ['roles', 'Roles', <ShieldIcon key="i" />, data?.roles.length],
            ['projects', 'Projects', <BoxIcon key="i" />, data?.projects.length],
            ['integrations', 'Integrations', <PlugIcon key="i" />, null],
          ].map(([id, label, icon, count]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={`admin-tab${tab === id ? ' active' : ''}`} onClick={() => chooseTab(id)}>
              {icon}{label}{count !== undefined && count !== null && <span className="admin-tab-count">{count}</span>}
            </button>
          ))}
        </nav>
      </header>
      <div className="admin-scroll">
      <main className="admin-main">
        {loadError && <div className="card error">Could not load admin data: {loadError}</div>}
        {!view && !loadError && <div className="card empty">Loading…</div>}

        {view && (
          <div className="admin-section">
            {tab === 'general' && <DateTimeCard onSaved={onDisplayChange} />}
            {tab === 'integrations' && <IntegrationsTab user={user} sub={integration} setSub={chooseIntegration} />}

            {tab === 'users' && (
            <AdminCard icon={<UsersIcon />} tone="purple" title="Users" subtitle="People who can sign in, their role and the projects they can see."
              addLabel="Add User" onAdd={() => openEdit('users')} count={view.users.length} wide>
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Sign-in</th><th>Role</th><th>Projects</th><th>Status</th><th className="col-actions">Actions</th></tr></thead>
                <tbody>
                  {view.users.map((u) => (
                    <tr key={u.id}>
                      <td><span className="person"><span className="avatar" style={{ background: avatarColor(u.name) }}>{initials(u.name)}</span><b>{u.name}</b></span></td>
                      <td className="muted email">{u.email || '—'}</td>
                      <td>{u.can_sign_in ? <span className="signin-chip" title={u.last_login_at ? `Last signed in ${formatDateTime(u.last_login_at)}` : 'Has not signed in yet'}>@{u.username}</span> : <span className="muted">—</span>}</td>
                      <td>{u.role || <span className="muted">No role</span>}</td>
                      <td>{u.projects.join(', ') || <span className="muted">—</span>}</td>
                      <td><StatusBadge status={u.status} /></td>
                      <td><RowActions onEdit={() => openEdit('users', u)} onDelete={() => openDelete('users', u, u.name)} /></td>
                    </tr>
                  ))}
                  {!view.users.length && <Empty cols={7} text="No users yet" />}
                </tbody>
              </table>
            </AdminCard>
            )}

            {tab === 'roles' && (
            <AdminCard icon={<ShieldIcon />} tone="green" title="Roles" subtitle="What each role is allowed to do."
              addLabel="Add Role" onAdd={() => openEdit('roles')}>
              <table className="admin-table">
                <thead><tr><th>Role Name</th><th>Description</th><th>Key Permissions</th><th className="num">Users</th><th className="col-actions">Actions</th></tr></thead>
                <tbody>
                  {view.roles.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.name}</b></td>
                      <td className="muted">{r.description || '—'}</td>
                      <td>{r.permissions.length === data.permissions.length ? 'All permissions' : r.permissions.map((p) => PERMISSION_LABELS[p]).join(', ')}</td>
                      <td className="num">{r.users}</td>
                      <td><RowActions onEdit={() => openEdit('roles', r)} onDelete={() => openDelete('roles', r, r.name)} /></td>
                    </tr>
                  ))}
                  {!view.roles.length && <Empty cols={5} text="No roles yet" />}
                </tbody>
              </table>
            </AdminCard>
            )}

            {tab === 'projects' && (
            <AdminCard icon={<BoxIcon />} tone="orange" title="Projects" subtitle="Jira projects tracked in AgileMetrix, and the board behind each team."
              addLabel="Add Project" onAdd={() => openEdit('projects')}>
              <table className="admin-table">
                <thead><tr><th>Project Name</th><th>Key</th><th>Teams · members</th><th className="num">Members</th><th>Status</th><th className="col-actions">Actions</th></tr></thead>
                <tbody>
                  {view.projects.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.name}</b>{p.description && <div className="cell-sub">{p.description}</div>}</td>
                      <td className="mono">{p.key}</td>
                      <td>
                        <div className="team-chips">
                          {p.teams.map((t) => (
                            <button key={t.id} type="button" className="team-chip" onClick={() => setMembersOf({ team: t, project: p })}
                              title={`Board #${t.jiraBoardId ?? '—'}: view and fetch members from Jira`}>
                              {t.name}<span>{t.members}</span>
                            </button>
                          ))}
                          {!p.teams.length && <span className="muted">No teams</span>}
                        </div>
                      </td>
                      <td className="num">{p.members}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td><RowActions onEdit={() => openEdit('projects', p)} onDelete={() => openDelete('projects', p, p.name)} /></td>
                    </tr>
                  ))}
                  {!view.projects.length && <Empty cols={6} text="No projects yet" />}
                </tbody>
              </table>
            </AdminCard>
            )}
          </div>
        )}
      </main>
      <Footer />
      </div>

      {editing?.kind === 'users' && <UserForm item={editing.item} roles={data.roles} projects={data.projects} onSave={save} onCancel={() => setEditing(null)} saving={saving} error={formError} />}
      {editing?.kind === 'roles' && <RoleForm item={editing.item} permissions={data.permissions} onSave={save} onCancel={() => setEditing(null)} saving={saving} error={formError} />}
      {editing?.kind === 'projects' && <ProjectForm item={editing.item} onSave={save} onCancel={() => setEditing(null)} saving={saving} error={formError} />}

      {membersOf && (
        <TeamMembersDialog team={membersOf.team} project={membersOf.project} users={data.users}
          onClose={() => setMembersOf(null)} onChanged={() => { load(); onChanged?.(); }} />
      )}

      {deleting && (
        <Modal title="Confirm delete" width={420} onClose={() => setDeleting(null)}
          footer={(
            <>
              <button className="btn" onClick={() => setDeleting(null)} disabled={saving}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
            </>
          )}>
          {formError ? <p className="form-error">{formError}</p> : <p>Delete <b>{deleting.label}</b>? This can’t be undone.</p>}
        </Modal>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
