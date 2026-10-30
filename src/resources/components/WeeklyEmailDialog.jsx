import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/admin/Modal.jsx';
import { api } from '../../api/client.js';
import { ArrowLeftIcon, ArrowRightIcon } from '../../components/Icons.jsx';
import { formatDate, formatDateTime } from '../../lib/datetime.js';
import { shiftDay } from '../model/calc.js';
import { hoursUntil } from '../model/period.js';
import { lastWeekStart, weekInfo, weeklyCompliance, weeklyEmail, DEFAULT_RULES } from '../model/weekly.js';
import { fmtHours } from './ui.jsx';

const cleanName = (n) => n.replace(/\s+/g, ' ').trim();

// Weekly Redmine update email for the people in the Effort Tracker's selection: pick the week, review
// who is mentioned and who is asked to update, then copy the email or send it to yourself to forward.
export default function WeeklyEmailDialog({ data, resources, projectName, onClose }) {
  const [weekStart, setWeekStart] = useState(() => lastWeekStart(data.today));
  const [excluded, setExcluded] = useState(() => new Set()); // person ids left out of the email
  const [me, setMe] = useState(null);
  // Rules, remembered in this browser
  const [rules, setRules] = useState(() => {
    try { return { ...DEFAULT_RULES, ...JSON.parse(localStorage.getItem('agilemetrix-weekly-rules') || '{}') }; } catch { return DEFAULT_RULES; }
  });
  const setRule = (k, v) => setRules((r) => {
    const next = { ...r, [k]: Math.max(0, Math.min(k === 'missing' ? 7 : 200, Number(v) || 0)) };
    try { localStorage.setItem('agilemetrix-weekly-rules', JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });
  const [state, setState] = useState({ busy: false, message: null, error: null });

  useEffect(() => { api.redmineWeeklyRecipient().then(setMe).catch(() => setMe({ email: null, emailConfigured: false })); }, []);

  const week = useMemo(() => weekInfo(weekStart, data.rules), [weekStart, data.rules]);
  const rows = useMemo(() => weeklyCompliance(data, resources, week, rules), [data, resources, week, rules]);
  const mention = rows.filter((r) => r.status === 'mention');
  const action = rows.filter((r) => r.status === 'action');
  const ok = rows.filter((r) => r.status === 'ok');
  const unmatched = resources.filter((r) => !r.redmineUserId);
  const names = (list) => list.filter((r) => !excluded.has(r.resource.id)).map((r) => cleanName(r.resource.name));
  const email = weeklyEmail({ week, project: projectName, mention: names(mention), action: names(action) });

  const until = hoursUntil(data);
  const incomplete = week.end > until;
  const isLatest = weekStart >= lastWeekStart(data.today);
  const toggle = (id) => setExcluded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const run = async (fn) => {
    setState({ busy: true, message: null, error: null });
    try { setState({ busy: false, message: await fn(), error: null }); } catch (e) { setState({ busy: false, message: null, error: e.message }); }
  };
  const copy = () => run(async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([email.html], { type: 'text/html' }),
        'text/plain': new Blob([email.text], { type: 'text/plain' }),
      })]);
    } catch {
      await navigator.clipboard.writeText(email.text);
    }
    return 'Copied. Paste it into a new email in Outlook (the subject is the first line).';
  });
  const send = () => run(async () => {
    const r = await api.sendRedmineWeekly(email);
    return `Sent to ${r.sentTo}. Forward it to the team from your inbox.`;
  });

  const Group = ({ title, hint, list, tone }) => (
    <section className={`wk-group wk-${tone}`}>
      <div className="wk-group-head"><h4>{title} <span>{list.filter((r) => !excluded.has(r.resource.id)).length}</span></h4><span className="muted small">{hint}</span></div>
      {!list.length && <p className="muted small">No one this week.</p>}
      <ul>
        {list.map((r) => (
          <li key={r.resource.id}>
            <label>
              <input type="checkbox" checked={!excluded.has(r.resource.id)} onChange={() => toggle(r.resource.id)} />
              <span className="wk-name">{cleanName(r.resource.name)}</span>
            </label>
            <span className="wk-stat" title="Days with hours logged / working days">{r.daysLogged}/{r.workingDays} days</span>
            <span className="wk-stat" title="Logged / planned hours">{fmtHours(r.logged)} of {fmtHours(r.planned)}</span>
            <span className={`wk-pct ${r.pct >= rules.mention ? 'good-text' : r.pct < rules.action ? 'bad-text' : ''}`}>{r.pct}%</span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <Modal title="Weekly Redmine update email" width={900} onClose={onClose}
      footer={(
        <>
          {state.error && <span className="form-error wk-foot-msg">{state.error}</span>}
          {!state.error && state.message && <span className="settings-saved wk-foot-msg">{state.message}</span>}
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn" onClick={copy} disabled={state.busy}>Copy email</button>
          <button className="btn-primary-solid" onClick={send} disabled={state.busy || !me?.emailConfigured || !me?.email}
            title={!me?.emailConfigured ? 'Email is not set up on the server' : !me?.email ? 'Your account has no email address' : `Send to ${me.email}`}>
            {state.busy ? 'Working…' : me?.email ? `Email to me (${me.email})` : 'Email to me'}
          </button>
        </>
      )}>
      <div className="wk-top">
        <div className="wk-week" role="group" aria-label="Week">
          <button className="icon-btn icon-btn-sm" onClick={() => setWeekStart((w) => shiftDay(w, -7))} aria-label="Previous week"><ArrowLeftIcon /></button>
          <div><b>Week {week.number}</b><span>{week.label}</span></div>
          <button className="icon-btn icon-btn-sm" onClick={() => setWeekStart((w) => shiftDay(w, 7))} disabled={isLatest} aria-label="Next week"><ArrowRightIcon /></button>
        </div>
        <p className="muted small">
          {projectName ?? 'All projects'} · {week.working.length} working days · {rows.length} people planned that week.
          {' '}Redmine hours imported up to {formatDate(until)}{data.syncRuns[0] ? ` (last import ${formatDateTime(data.syncRuns[0].startedAt)})` : ''}.
        </p>
      </div>
      {incomplete && <p className="form-note form-note-warn">This week isn’t fully imported from Redmine yet, so some people may look behind.</p>}

      <div className="wk-grid">
        <div className="wk-lists">
          <div className="wk-rules">
            <label>Mention: every working day and at least <input type="number" min="0" max="200" value={rules.mention} onChange={(e) => setRule('mention', e.target.value)} />% of planned</label>
            <label>Action: under <input type="number" min="0" max="200" value={rules.action} onChange={(e) => setRule('action', e.target.value)} />% or <input type="number" min="1" max="7" value={rules.missing} onChange={(e) => setRule('missing', e.target.value)} />+ days with nothing logged</label>
          </div>
          <Group title="🌟 Special mention" tone="good" list={mention} hint={`Logged every working day and at least ${rules.mention}% of planned hours`} />
          <Group title="⚠️ Action required" tone="bad" list={action} hint={`Under ${rules.action}% of planned hours, or nothing logged on ${rules.missing}+ working days`} />
          {ok.length > 0 && (
            <details className="wk-ok">
              <summary>{ok.length} others are on track (not in the email)</summary>
              <ul>{ok.map((r) => <li key={r.resource.id}><span>{cleanName(r.resource.name)}</span><span className="muted small">{r.daysLogged}/{r.workingDays} days · {r.pct}%</span></li>)}</ul>
            </details>
          )}
          {unmatched.length > 0 && <p className="muted small">Not matched to Redmine, so not checked: {unmatched.map((r) => cleanName(r.name)).join(', ')}.</p>}
        </div>
        <div className="wk-preview">
          <span className="wk-preview-label">Email preview</span>
          <div className="wk-preview-body" dangerouslySetInnerHTML={{ __html: email.html }} />
        </div>
      </div>
    </Modal>
  );
}
