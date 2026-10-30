import { PERIOD_PRESETS } from '../model/period.js';
import { ISSUE_LABEL } from '../model/calc.js';
import { InfoIcon } from '../../components/Icons.jsx';

// Small building blocks shared by the Resource Management pages

export const fmtHours = (h) => (h == null ? '—' : `${Number(h).toLocaleString('en-IN', { maximumFractionDigits: 2 })} h`);
export const fmtFte = (f) => (f == null ? '—' : Number(f).toFixed(2));
export const fmtPct = (p) => (p == null ? '—' : `${p}%`);
// Sortable tables: sort = { key, dir } with dir 1 (ascending) or -1. Missing values (null) go last either way.
export function sortBy(rows, sort, keys) {
  const key = keys[sort.key];
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const x = key(a), y = key(b);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir;
  });
}

// Column header that sorts by `field`; a second click reverses the order
export function SortTh({ label, field, sort, setSort, className, children }) {
  const on = sort.key === field;
  return (
    <th className={className} aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`sort-btn${on ? ' on' : ''}`} onClick={() => setSort({ key: field, dir: on ? -sort.dir : 1 })}>
        {label} <span aria-hidden="true">{on ? (sort.dir === 1 ? '↑' : '↓') : '↕'}</span>
      </button>
      {children}
    </th>
  );
}

export const fmtSigned = (h) => (h > 0 ? `+${fmtHours(h)}` : h < 0 ? `−${fmtHours(-h)}` : fmtHours(0));

// "i" with the calculation definition, as a tooltip (also readable by screen readers)
export function InfoTip({ text }) {
  return (
    <span className="rm-tip" tabIndex={0} aria-label={text}>
      <InfoIcon />
      <span className="rm-tip-text" role="tooltip">{text}</span>
    </span>
  );
}

export function Kpi({ label, value, note, tone, tip }) {
  return (
    <div className={`card rm-kpi${tone ? ` tone-${tone}` : ''}`}>
      <span>{label}{tip && <InfoTip text={tip} />}</span>
      <strong>{value}</strong>
      {note && <em>{note}</em>}
    </div>
  );
}

const BAND_COLOR = { ok: 'var(--success)', under: 'var(--warning)', low: 'var(--danger)', over: 'var(--danger)', none: 'var(--border-strong)' };
export function UtilBar({ pct, band, reason }) {
  if (pct == null) return <span className="muted small" title={reason ?? 'No capacity, so utilization can’t be calculated'}>— {reason ? '' : 'no capacity'}</span>;
  return (
    <span className="rm-util" title={`${pct}% of available capacity`}>
      <span className="rm-util-bar"><i style={{ width: `${Math.min(100, pct)}%`, background: BAND_COLOR[band] }} /></span>
      <b style={{ color: band === 'low' ? 'var(--danger)' : 'var(--success)' }}>{pct}%</b>
    </span>
  );
}

const ISSUE_TONE = { overallocated: 'bad', 'missing-fte': 'warn', unmapped: 'warn', 'no-team': 'neutral' };
export function IssuePills({ issues }) {
  if (!issues.length) return <span className="rm-pill ok">OK</span>;
  return <span className="rm-pills">{issues.map((i) => <span key={i} className={`rm-pill ${ISSUE_TONE[i]}`}>{ISSUE_LABEL[i]}</span>)}</span>;
}

// Period, team and project filters (shared by every page through ResourceManagement)
export function Filters({ filters, setFilters, data, period, show = ['period', 'team', 'project'], periodLabel = true, children }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  return (
    <section className="card rm-filters" aria-label="Filters">
      {show.includes('period') && (
        <label className="rm-field">
          <span>Period</span>
          <select value={filters.preset} onChange={(e) => set({ preset: e.target.value })}>
            {PERIOD_PRESETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      )}
      {show.includes('period') && filters.preset === 'custom' && (
        <>
          <label className="rm-field"><span>From</span><input type="date" value={filters.customStart ?? period.start} onChange={(e) => set({ customStart: e.target.value })} /></label>
          <label className="rm-field"><span>To</span><input type="date" value={filters.customEnd ?? period.fullEnd} onChange={(e) => set({ customEnd: e.target.value })} /></label>
        </>
      )}
      {show.includes('team') && (
        <label className="rm-field">
          <span>Squad</span>
          <select value={filters.teamId ?? ''} onChange={(e) => set({ teamId: e.target.value || null })}>
            <option value="">All squads</option>
            {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            <option value="none">No squad</option>
          </select>
        </label>
      )}
      {show.includes('project') && (
        <label className="rm-field">
          <span>Project</span>
          <select value={filters.projectId ?? ''} onChange={(e) => set({ projectId: e.target.value || null })}>
            <option value="">All projects</option>
            {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}
      {children}
      {periodLabel && <span className="rm-period-label">{period.label}</span>}
    </section>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="rm-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="rm-head-actions">{children}</div>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="card rm-empty">
      <b>{title}</b>
      {children && <span>{children}</span>}
    </div>
  );
}

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
const COLORS = ['#1E3A8A', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#0369a1'];
export const avatarColor = (name = '') => COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
export function Person({ resource, sub }) {
  return (
    <span className="rm-person">
      <span className="rm-ini" style={{ background: avatarColor(resource.name) }} aria-hidden="true">{initials(resource.name)}</span>
      <span><b>{resource.name}</b>{sub && <span className="muted small rm-block">{sub}</span>}</span>
    </span>
  );
}
