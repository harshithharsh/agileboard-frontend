import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Filters, InfoTip, Kpi, Empty, SortTh, sortBy, fmtHours, fmtFte, fmtPct } from '../components/ui.jsx';
import { selectRows, totals, teamName, scopeProject, scopedFte } from '../model/select.js';
import { DEFINITIONS, resourceRow, round, LOW_UTILIZATION, utilTone } from '../model/calc.js';
import { buckets, hoursUntil } from '../model/period.js';
import { downloadXlsx, bold, hours, percent, fte } from '../../lib/excel.js';
import { DownloadIcon, MailIcon } from '../../components/Icons.jsx';
import WeeklyEmailDialog from '../components/WeeklyEmailDialog.jsx';
import { formatDate, formatDateTime } from '../../lib/datetime.js';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps } from '../../components/charts/common.jsx';

const UTIL_TIP = 'Utilization to date = actual hours ÷ planned hours, counted from the start of the period up to the last full day of imported Redmine hours (the day before the last import). Later days are not counted yet.';

// Planned against actual Redmine hours, per person, with a weekly or monthly breakdown on demand
export default function EffortTracker({ data, filters, setFilters, period, setActions }) {
  const [granularity, setGranularity] = useState('week');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(new Set());
  const [sort, setSort] = useState({ key: 'utilization', dir: 1 }); // lowest utilization first

  // Numbers are for one project, as in Resource allocation: the selected project, or the selected team's project
  const scope = scopeProject(data, filters);
  const scoped = useMemo(() => ({ ...filters, projectId: scope }), [filters, scope]);
  // The whole period (e.g. the full quarter), not just up to today: planned hours, capacity and
  // utilization are for the whole quarter; actual is what has been logged so far.
  const range = useMemo(() => (period.toDate ? { ...period, end: period.fullEnd } : period), [period]);
  const periods = useMemo(() => buckets(range, granularity, data.rules), [range, granularity, data.rules]);
  // A week (or month) picked in the chart: the KPIs and table show just that week until it is cleared
  const [focus, setFocus] = useState(null); // bucket start date
  const [weekly, setWeekly] = useState(false); // weekly Redmine update email
  const picked = periods.find((b) => b.start === focus) ?? null;
  const people = useMemo(
    () => selectRows(data, range, scoped, { search }).filter((r) => r.resource.redmineUserId || r.planned > 0),
    [data, range, scoped, search]
  );
  const fteShown = (row) => scopedFte(data, row, scope, picked?.asOf ?? period.asOf);
  // Utilization is cumulative: actual ÷ planned from the start of the shown period up to today
  const view = picked ?? range;
  const until = hoursUntil(data);
  const soFar = view.start > until ? null : { ...view, end: view.end < until ? view.end : until, asOf: view.end < until ? view.end : until };
  const toLabel = soFar ? `${formatDate(soFar.start, { year: false })} – ${formatDate(soFar.end, { year: false })}` : 'not started';
  const toDate = useMemo(
    () => new Map(soFar ? people.map((r) => [r.resource.id, resourceRow(r.resource, data, soFar, scoped)]) : []),
    [people, soFar?.start, soFar?.end, data, scoped] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const utilOf = (r) => toDate.get(r.resource.id)?.utilization ?? null;
  const rows = sortBy(picked ? people.map((r) => resourceRow(r.resource, data, picked, scoped)) : people, sort, {
    name: (r) => r.resource.name,
    team: (r) => teamName(data, r.resource.teamId),
    fte: fteShown,
    planned: (r) => toDate.get(r.resource.id)?.planned ?? 0,
    actual: (r) => (r.resource.redmineUserId ? toDate.get(r.resource.id)?.actual ?? 0 : null),
    utilization: utilOf,
  });
  const sum = totals(rows);
  const cumulative = totals(rows.filter((r) => r.resource.redmineUserId).map((r) => toDate.get(r.resource.id)).filter(Boolean));
  const plannedSoFar = totals(rows.map((r) => toDate.get(r.resource.id)).filter(Boolean)).planned;
  // The chart: everyone in scope, per week or month; no actual line for weeks that haven't started
  const trend = useMemo(() => periods.map((b) => {
    const t = totals(people.map((r) => resourceRow(r.resource, data, b, scoped)));
    return { label: b.label, planned: t.planned, actual: b.start > until ? null : t.actual };
  }), [periods, people, data, scoped, until]);
  const pickBucket = (state) => {
    const b = periods[Number(state?.activeTooltipIndex)];
    if (b) setFocus((f) => (f === b.start ? null : b.start));
  };
  const unit = granularity === 'week' ? 'week' : 'month';
  const pickedLabel = picked && (granularity === 'week' ? `Week of ${picked.label}` : picked.label);
  const lastSync = data.syncRuns.find((s) => s.status !== 'failed');

  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // Excel download: the people table (to date and for the period) and one sheet per week or month
  const exportXlsx = async () => {
    const shown = picked ?? range;
    const projectLabel = scope ? data.projects.find((p) => p.id === scope)?.name : 'All projects';
    const squadLabel = filters.teamId ? (filters.teamId === 'none' ? 'No squad' : teamName(data, filters.teamId)) : 'All squads';
    const title = [
      [bold('AgileMetrix · Effort tracker')],
      ['Project', projectLabel],
      ['Squad', squadLabel],
      ['Period', `${picked ? pickedLabel : period.label.replace(' · to date', '')} (${formatDate(shown.start)} – ${formatDate(shown.end)})`],
      ['To date', soFar ? `${formatDate(soFar.start)} – ${formatDate(soFar.end)} (last full day of imported Redmine hours)` : 'Not started yet'],
      ['Generated', formatDateTime(new Date().toISOString())],
      [],
    ];
    const head = ['Resource', 'Squad', 'FTE', 'Planned to date (h)', 'Actual to date (h)', 'Utilization to date', 'Planned in period (h)'].map(bold);
    const people = rows.map((r) => {
      const d = toDate.get(r.resource.id);
      return [r.resource.name, teamName(data, r.resource.teamId) ?? '', fte(fteShown(r)), hours(d?.planned ?? 0),
        r.resource.redmineUserId ? hours(d?.actual ?? 0) : null, percent(utilOf(r)), hours(r.planned)];
    });
    const total = [bold(`${rows.length} people`), null, fte(round(rows.reduce((n, r) => n + fteShown(r), 0), 3)), hours(plannedSoFar),
      hours(cumulative.actual), percent(cumulative.utilization), hours(sum.planned)].map((c) => (c && typeof c === 'object' ? { ...c, fontWeight: 'bold' } : c));
    const unitHead = granularity === 'week' ? 'Week of' : 'Month';
    const breakdown = [
      [bold('Resource'), ...periods.flatMap((b) => [bold(`${b.label} planned (h)`), bold(`${b.label} actual (h)`)])],
      ...rows.map((r) => {
        const per = periods.map((b) => resourceRow(r.resource, data, b, scoped));
        return [r.resource.name, ...per.flatMap((x, i) => [hours(x.planned), periods[i].start > until ? null : hours(x.actual)])];
      }),
    ];
    await downloadXlsx([
      { name: 'Effort', rows: [...title, head, ...people, total], columns: [{ width: 28 }, { width: 16 }, { width: 8 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }], sticky: title.length + 1 },
      { name: `${unitHead === 'Month' ? 'By month' : 'By week'}`, rows: breakdown, columns: [{ width: 28 }, ...periods.flatMap(() => [{ width: 16 }, { width: 16 }])], sticky: 1 },
    ], `agilemetrix-effort-${shown.start}-${shown.end}.xlsx`);
  };
  // The download icon sits in the top bar, like Agile Metrics
  const exportRef = useRef(exportXlsx);
  exportRef.current = exportXlsx;
  const canExport = rows.length > 0;
  useEffect(() => {
    setActions?.(
      <>
        <button className="icon-btn" onClick={() => setWeekly(true)} title="Weekly Redmine update email" aria-label="Weekly Redmine update email">
          <MailIcon />
        </button>
        <button className="icon-btn" onClick={() => exportRef.current()} disabled={!canExport} title="Export to Excel" aria-label="Export to Excel">
          <DownloadIcon />
        </button>
      </>
    );
    return () => setActions?.(null);
  }, [canExport, setActions]);

  return (
    <>
      <Filters filters={filters} setFilters={setFilters} data={data} period={period}>
        <label className="filter">
          <span>Breakdown</span>
          <select value={granularity} onChange={(e) => { setGranularity(e.target.value); setFocus(null); }}>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </label>
        <label className="filter filter-search"><span>Search</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or Redmine user" /></label>
      </Filters>

      {picked && (
        <div className="rm-focus" role="status">
          <span>Showing <b>{pickedLabel}</b> ({formatDate(picked.start, { year: false })} – {formatDate(picked.end)})</span>
          <button className="btn btn-sm" onClick={() => setFocus(null)}>Show whole {period.label.replace(' · to date', '')}</button>
        </div>
      )}
      <section className="rm-kpis rm-kpis-3">
        <Kpi label="Planned to date" value={soFar ? fmtHours(plannedSoFar) : '—'} note={`${toLabel} · ${fmtHours(sum.planned)} for ${picked ? pickedLabel : period.label.replace(' · to date', '')}`} tip={DEFINITIONS.planned} />
        <Kpi label="Actual to date" value={soFar ? fmtHours(cumulative.actual) : '—'} note={`${toLabel} · from Redmine`} tip={DEFINITIONS.actual} />
        <Kpi label="Utilization to date" value={fmtPct(cumulative.utilization)} tone={utilTone(cumulative.utilization)}
          note={soFar ? `Actual ÷ planned · ${toLabel}` : 'Not started yet'} tip={UTIL_TIP} />
      </section>

      {!rows.length ? (
        <Empty title="No effort in this period">Nobody in this selection had planned or logged hours. Try another period, squad or project.</Empty>
      ) : (
        <>
          <section className="card rm-chart">
            <div className="rm-chart-head"><h2>Planned vs. actual, {granularity === 'week' ? 'by week' : 'by month'}</h2></div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} onClick={pickBucket} style={{ cursor: 'pointer' }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={48} />
                <Tooltip {...tooltipProps} formatter={(v) => fmtHours(v)} />
                <Legend {...legendProps} />
                <Bar dataKey="planned" name="Planned" fill={COLORS.primarySoft} radius={[3, 3, 0, 0]}>
                  {periods.map((b) => <Cell key={b.start} fill={b.start === focus ? COLORS.primaryMid : COLORS.primarySoft} />)}
                </Bar>
                <Line dataKey="actual" name="Actual" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          <section className="card rm-table-card">
            <table className="rm-table">
              <thead>
                <tr>
                  <th className="rm-check" aria-label="Expand" />
                  <SortTh label="Resource" field="name" sort={sort} setSort={setSort} />
                  <SortTh label="Squad" field="team" sort={sort} setSort={setSort} />
                  <SortTh label="FTE" field="fte" sort={sort} setSort={setSort} className="num" />
                  <SortTh label="Planned to date" field="planned" sort={sort} setSort={setSort} className="num"> <InfoTip text={DEFINITIONS.planned} /></SortTh>
                  <SortTh label="Actual to date" field="actual" sort={sort} setSort={setSort} className="num"> <InfoTip text={DEFINITIONS.actual} /></SortTh>
                  <SortTh label="Utilization to date" field="utilization" sort={sort} setSort={setSort} className="num"> <InfoTip text={UTIL_TIP} /></SortTh>
                  <th>Last synced</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = open.has(r.resource.id);
                  return (
                    <Fragment key={r.resource.id}>
                      <tr className={isOpen ? 'selected' : ''}>
                        <td className="rm-check">
                          <button className="rm-expand" onClick={() => toggle(r.resource.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} ${granularity === 'week' ? 'weekly' : 'monthly'} effort for ${r.resource.name}`}>{isOpen ? '▾' : '▸'}</button>
                        </td>
                        <td><b>{r.resource.name}</b>{!r.resource.redmineUserId && <span className="rm-pill warn rm-inline">Not mapped</span>}</td>
                        <td>{teamName(data, r.resource.teamId) ?? <span className="muted">—</span>}</td>
                        <td className="num">{fmtFte(fteShown(r))}</td>
                        <td className="num">{fmtHours(toDate.get(r.resource.id)?.planned ?? 0)}</td>
                        <td className="num">{r.resource.redmineUserId ? fmtHours(toDate.get(r.resource.id)?.actual ?? 0) : '—'}</td>
                        <td className={`num${utilTone(utilOf(r)) === 'low' ? ' bad-text' : utilTone(utilOf(r)) ? ' good-text' : ''}`}
                          title={utilOf(r) == null ? 'Nothing planned up to today, so no percentage' : 'Actual ÷ planned up to today'}>{fmtPct(utilOf(r))}</td>
                        <td className="muted small">{r.resource.redmineUserId && lastSync ? formatDateTime(lastSync.startedAt) : '—'}</td>
                      </tr>
                      {isOpen && (
                        <tr className="selected">
                          <td />
                          <td colSpan={7}>
                            <Breakdown row={r} data={data} periods={periods} filters={scoped} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td /><td colSpan={2}>{rows.length} people</td>
                  <td className="num">{fmtFte(round(rows.reduce((n, r) => n + fteShown(r), 0), 3))}</td>
                  <td className="num">{fmtHours(plannedSoFar)}</td>
                  <td className="num">{fmtHours(cumulative.actual)}</td>
                  <td className={`num ${utilTone(cumulative.utilization) === 'low' ? 'bad-text' : utilTone(cumulative.utilization) ? 'good-text' : ''}`}>{fmtPct(cumulative.utilization)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </section>
        </>
      )}
      {weekly && (
        <WeeklyEmailDialog data={data} resources={people.map((r) => r.resource)}
          projectName={scope ? data.projects.find((p) => p.id === scope)?.name : null} onClose={() => setWeekly(false)} />
      )}
    </>
  );
}

// One person's weeks (or months) as small cards that wrap, instead of a wide table
function Breakdown({ row, data, periods, filters }) {
  const per = periods.map((b) => ({ b, ...resourceRow(row.resource, data, b, filters) }));
  return (
    <div className="rm-breakdown">
      {per.map(({ b, planned, actual, utilization: pctUsed }) => {
        const pct = planned > 0 ? Math.min(100, (actual / planned) * 100) : actual > 0 ? 100 : 0;
        const tone = planned === 0 ? (actual > 0 ? 'var(--warning)' : 'var(--border-strong)') : actual < planned * (LOW_UTILIZATION / 100) ? 'var(--danger)' : 'var(--success)';
        return (
          <div key={b.start} className="rm-bcard">
            <span className="muted small">{b.label}</span>
            <b>{fmtHours(round(actual))} <span className="muted">/ {fmtHours(planned)}</span></b>
            <span className="rm-util-bar rm-wide"><i style={{ width: `${pct}%`, background: tone }} /></span>
            <span className={`small ${pctUsed == null ? 'muted' : pctUsed < LOW_UTILIZATION ? 'bad-text' : 'good-text'}`}>{fmtPct(pctUsed)}</span>
          </div>
        );
      })}
    </div>
  );
}
