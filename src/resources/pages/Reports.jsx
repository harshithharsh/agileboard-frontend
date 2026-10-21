import { useMemo, useState } from 'react';
import { Filters, PageHead, Empty, fmtHours, fmtFte, fmtPct, fmtSigned } from '../components/ui.jsx';
import { selectRows, totals, teamName, projectName, unmappedUsers } from '../model/select.js';
import { resourceRow, inEffect, ISSUE_LABEL } from '../model/calc.js';
import { buckets } from '../model/period.js';
import { downloadCsv, slug } from '../../lib/download.js';
import { formatDateTime } from '../../lib/datetime.js';

const DEFS = [
  ['Capacity', 'employment FTE × working hours per day × working days, minus holidays and leave'],
  ['Planned', 'project allocations in effect on each working day × working hours per day'],
  ['Actual', 'eligible Redmine time entries in the period, each counted once'],
  ['Utilization', 'actual ÷ capacity × 100; — when capacity is 0'],
];

// Report builders: each returns { columns: [[key, label, kind]], rows, groupBy? }
const REPORTS = [
  { id: 'utilization', title: 'Quarterly utilization', text: 'Capacity, planned, actual and utilization per person', build: (ctx) => ({
    columns: [['team', 'Team'], ['name', 'Resource'], ['fte', 'FTE', 'fte'], ['capacity', 'Capacity', 'h'], ['planned', 'Planned', 'h'], ['actual', 'Actual', 'h'], ['variance', 'Variance', 's'], ['utilization', 'Utilization', '%']],
    rows: ctx.rows.map((r) => ({ team: teamName(ctx.data, r.resource.teamId) ?? 'No team', name: r.resource.name, fte: r.allocatedFte, capacity: r.capacity, planned: r.planned, actual: r.resource.redmineUserId ? r.actual : null, variance: r.resource.redmineUserId ? r.variance : null, utilization: r.resource.redmineUserId ? r.utilization : null })),
    groupBy: 'team',
  }) },
  { id: 'variance', title: 'Planned vs. actual', text: 'Variance per person, most behind plan first', build: (ctx) => ({
    columns: [['name', 'Resource'], ['team', 'Team'], ['planned', 'Planned', 'h'], ['actual', 'Actual', 'h'], ['variance', 'Variance', 's'], ['pct', 'Actual % of plan', '%']],
    rows: ctx.rows.filter((r) => r.resource.redmineUserId).sort((a, b) => a.variance - b.variance).map((r) => ({ name: r.resource.name, team: teamName(ctx.data, r.resource.teamId) ?? 'No team', planned: r.planned, actual: r.actual, variance: r.variance, pct: r.planned ? Math.round((r.actual / r.planned) * 100) : null })),
  }) },
  { id: 'allocation', title: 'Allocation and capacity', text: 'FTE per project and free capacity, as of the period end', build: (ctx) => ({
    columns: [['name', 'Resource'], ['team', 'Team'], ['projects', 'Project allocation'], ['allocated', 'Allocated FTE', 'fte'], ['employment', 'Employment FTE', 'fte'], ['free', 'Free FTE', 'fte']],
    rows: ctx.rows.map((r) => ({ name: r.resource.name, team: teamName(ctx.data, r.resource.teamId) ?? 'No team',
      projects: ctx.data.allocations.filter((a) => a.resourceId === r.resource.id && inEffect(a, ctx.period.asOf)).map((a) => `${projectName(ctx.data, a.projectId)} ${fmtFte(a.fte)}`).join(', ') || '—',
      allocated: r.allocatedFte, employment: r.resource.employmentFte, free: r.resource.employmentFte == null ? null : Math.round((r.resource.employmentFte - r.allocatedFte) * 100) / 100 })),
  }) },
  { id: 'teams', title: 'Team effort breakdown', text: 'Totals per team and per Redmine activity', build: (ctx) => {
    const acts = ctx.data.rules.eligibleActivities;
    const teams = [...ctx.data.teams.map((t) => ({ id: t.id, name: t.name })), { id: null, name: 'No team' }];
    return {
      columns: [['team', 'Team'], ['people', 'People'], ['planned', 'Planned', 'h'], ['actual', 'Actual', 'h'], ['utilization', 'Utilization', '%'], ...acts.map((a) => [a, a, 'h'])],
      rows: teams.map((t) => {
        const members = ctx.rows.filter((r) => (r.resource.teamId ?? null) === t.id);
        if (!members.length) return null;
        const tot = totals(members.filter((r) => r.resource.redmineUserId));
        const byAct = Object.fromEntries(acts.map((a) => [a, Math.round(members.reduce((n, r) => n + (ctx.data.entriesByUser.get(r.resource.redmineUserId) ?? [])
          .filter((e) => e.activity === a && e.date >= ctx.period.start && e.date <= ctx.period.end && (!ctx.filters.projectId || e.projectId === ctx.filters.projectId)).reduce((m, e) => m + e.hours, 0), 0) * 10) / 10]));
        return { team: t.name, people: members.length, planned: tot.planned, actual: tot.actual, utilization: tot.utilization, ...byAct };
      }).filter(Boolean),
    };
  } },
  { id: 'weekly', title: 'Weekly trends per person', text: 'One row per person, actual hours per week', build: (ctx) => {
    const weeks = buckets(ctx.period, 'week', ctx.data.rules);
    return {
      columns: [['name', 'Resource'], ...weeks.map((w) => [w.start, w.label, 'h']), ['total', 'Total', 'h']],
      rows: ctx.rows.filter((r) => r.resource.redmineUserId).map((r) => {
        const per = weeks.map((w) => resourceRow(r.resource, ctx.data, w, ctx.filters).actual);
        return { name: r.resource.name, ...Object.fromEntries(weeks.map((w, i) => [w.start, per[i]])), total: r.actual };
      }),
      wide: true,
    };
  } },
  { id: 'quality', title: 'Data quality', text: 'Unmapped users, missing FTE, over-allocation, sync errors', build: (ctx) => ({
    columns: [['kind', 'Issue'], ['who', 'Who / what'], ['detail', 'Detail']],
    rows: [
      ...unmappedUsers(ctx.data, ctx.period).map((u) => ({ kind: 'Redmine user not mapped', who: `${u.user.login} (${u.user.name})`, detail: `${fmtHours(u.hours)} in period not counted` })),
      ...ctx.rows.flatMap((r) => r.issues.filter((i) => i !== 'unmapped').map((i) => ({ kind: ISSUE_LABEL[i], who: r.resource.name, detail: i === 'missing-fte' ? `${fmtHours(r.actual)} logged without capacity` : i === 'overallocated' ? `${fmtFte(r.allocatedFte)} allocated of ${fmtFte(r.resource.employmentFte)}` : '' }))),
      ...ctx.rows.filter((r) => r.issues.includes('unmapped')).map((r) => ({ kind: 'Person without Redmine user', who: r.resource.name, detail: 'Actual hours can’t be shown' })),
      ...ctx.data.syncRuns.filter((s) => s.status !== 'success').map((s) => ({ kind: s.status === 'failed' ? 'Sync failed' : 'Sync partial', who: formatDateTime(s.startedAt), detail: s.message })),
    ],
  }) },
];

const cell = (v, kind) => (v == null ? '—' : kind === 'h' ? fmtHours(v) : kind === 's' ? fmtSigned(v) : kind === '%' ? fmtPct(v) : kind === 'fte' ? fmtFte(v) : v);

export default function Reports({ data, filters, setFilters, period }) {
  const [id, setId] = useState('utilization');
  const report = REPORTS.find((r) => r.id === id);
  const rows = useMemo(() => selectRows(data, period, filters), [data, period, filters]);
  const built = useMemo(() => report.build({ data, period, filters, rows }), [report, data, period, filters, rows]);
  const generated = useMemo(() => new Date().toISOString(), [built]); // eslint-disable-line react-hooks/exhaustive-deps
  const filterText = [filters.teamId ? (filters.teamId === 'none' ? 'No team' : teamName(data, filters.teamId)) : 'All teams', filters.projectId ? projectName(data, filters.projectId) : 'All projects'].join(' · ');

  const exportCsv = () => downloadCsv([
    [`AgileMetrix · ${report.title}`],
    [`Period: ${period.start} to ${period.end}${period.toDate ? ' (to date)' : ''}`],
    [`Filters: ${filterText}`],
    [`Generated: ${formatDateTime(generated)}`],
    [data.demo ? 'Demo data: fictional people and hours' : `Redmine data as of ${data.syncRuns[0] ? formatDateTime(data.syncRuns[0].startedAt) : '—'}`],
    [],
    built.columns.map(([, label, kind]) => (kind === 'h' || kind === 's' ? `${label} (h)` : kind === '%' ? `${label} %` : label)),
    ...built.rows.map((r) => built.columns.map(([k]) => r[k] ?? '')),
    [],
    ...DEFS.map(([k, v]) => [`${k}: ${v}`]),
  ], `agilemetrix-${slug(report.title)}-${period.start}-${period.end}.csv`);

  // Subtotals per group (utilization report)
  const groups = built.groupBy ? [...new Set(built.rows.map((r) => r[built.groupBy]))] : [null];

  return (
    <>
      <PageHead title="Reports" sub="Download resource and effort reports for any period, team or project." />
      <Filters filters={filters} setFilters={setFilters} data={data} period={period} />
      <section className="rm-reports">
        <nav className="card rm-report-list" aria-label="Report types">
          {REPORTS.map((r) => (
            <button key={r.id} className={`rm-report${r.id === id ? ' on' : ''}`} onClick={() => setId(r.id)} aria-pressed={r.id === id}>
              <b>{r.title}</b><span>{r.text}</span>
            </button>
          ))}
        </nav>
        <article className="card rm-report-view">
          <div className="rm-report-head">
            <div>
              <h2>{report.title} · {period.label}</h2>
              <dl className="rm-meta">
                <div><dt>Period</dt><dd>{period.start} – {period.end}</dd></div>
                <div><dt>Filters</dt><dd>{filterText}</dd></div>
                <div><dt>Generated</dt><dd>{formatDateTime(generated)}</dd></div>
                <div><dt>Rows</dt><dd>{built.rows.length}</dd></div>
              </dl>
            </div>
            <button className="btn-primary-solid" onClick={exportCsv} disabled={!built.rows.length}>Export CSV</button>
          </div>
          {!built.rows.length ? <Empty title="Nothing to report">No data for this report with the current filters.</Empty> : (
            <div className="rm-table-scroll">
              <table className="rm-table">
                <thead><tr>{built.columns.map(([k, label, kind]) => <th key={k} className={kind ? 'num' : ''}>{label}</th>)}</tr></thead>
                <tbody>
                  {groups.map((g) => {
                    const gr = built.rows.filter((r) => g == null || r[built.groupBy] === g);
                    const sub = built.groupBy ? totals(rows.filter((r) => (teamName(data, r.resource.teamId) ?? 'No team') === g && r.resource.redmineUserId)) : null;
                    return [
                      ...gr.map((r, i) => <tr key={`${g}-${i}`}>{built.columns.map(([k, , kind]) => <td key={k} className={kind ? 'num' : ''}>{cell(r[k], kind)}</td>)}</tr>),
                      sub && (
                        <tr key={`${g}-sub`} className="rm-subtotal">
                          <td>{g}</td><td>Subtotal · {gr.length} people</td><td className="num" /><td className="num">{fmtHours(sub.capacity)}</td><td className="num">{fmtHours(sub.planned)}</td>
                          <td className="num">{fmtHours(sub.actual)}</td><td className="num">{fmtSigned(sub.variance)}</td><td className="num">{fmtPct(sub.utilization)}</td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
          <details className="rm-defs" open>
            <summary>Definitions used in this report</summary>
            <ul>{DEFS.map(([k, v]) => <li key={k}><b>{k}</b> = {v}</li>)}</ul>
            {data.demo && <p className="muted small">Demo data: fictional people and hours. Excel export comes with the backend; CSV opens in Excel.</p>}
          </details>
        </article>
      </section>
    </>
  );
}
