import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Filters, InfoTip, Kpi, Empty, SortTh, sortBy, fmtHours, fmtFte, fmtPct } from '../components/ui.jsx';
import { selectRows, totals, teamName, scopeProject, scopedFte } from '../model/select.js';
import { DEFINITIONS, resourceRow, round, LOW_UTILIZATION, utilTone, eachDay, isWorkingDay, onLeave } from '../model/calc.js';
import { buckets, hoursUntil } from '../model/period.js';
import { parseDay } from '../model/calc.js';
import { downloadXlsx, bold, hours, percent, fte } from '../../lib/excel.js';
import { DownloadIcon, MailIcon, RefreshIcon, ClearIcon } from '../../components/Icons.jsx';
import { useImport, ImportProgress } from '../../components/admin/RedmineImport.jsx';
import { resourceService } from '../data/resourceService.js';
import { api } from '../../api/client.js';
import WeeklyEmailDialog from '../components/WeeklyEmailDialog.jsx';
import { formatDate, formatDateTime } from '../../lib/datetime.js';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps } from '../../components/charts/common.jsx';

const UTIL_TIP = 'Utilization to date = actual hours ÷ planned hours, counted from the start of the period up to the last full day of imported Redmine hours (the day before the last import). Later days are not counted yet.';

// Planned against actual Redmine hours, per person, with a daily, weekly or monthly breakdown on demand
export default function EffortTracker({ data, filters, setFilters, period, access, setActions }) {
  // Sync (administrators): import the latest time entries from Redmine, then reload
  const redmine = useImport(useCallback(() => { resourceService.reload().catch(() => {}); }, []));
  useEffect(() => {
    if (!access?.canAdmin) return;
    api.admin.redmineSyncStatus().then((s) => { if (s.running) redmine.follow(s); }).catch(() => {});
  }, [access?.canAdmin]); // eslint-disable-line react-hooks/exhaustive-deps
  const [granularity, setGranularity] = useState('week');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(new Set());
  const [sort, setSort] = useState({ key: 'name', dir: 1 }); // resources A to Z

  // Numbers are for one project, as in Resource allocation: the selected project, or the selected team's project
  const scope = scopeProject(data, filters);
  const scoped = useMemo(() => ({ ...filters, projectId: scope }), [filters, scope]);
  // The whole period (e.g. the full quarter), not just up to today: planned hours, capacity and
  // utilization are for the whole quarter; actual is what has been logged so far.
  const range = useMemo(() => (period.toDate ? { ...period, end: period.fullEnd } : period), [period]);
  // A one-week period shows days; a longer one goes back to weeks (Daily can still be picked up to a month)
  const days = Math.round((parseDay(range.end) - parseDay(range.start)) / 864e5) + 1;
  useEffect(() => {
    setGranularity((g) => (days <= 7 ? 'day' : g === 'day' ? 'week' : g));
    setFocus(null);
  }, [range.start, range.end]); // eslint-disable-line react-hooks/exhaustive-deps
  const periods = useMemo(() => buckets(range, granularity, data.rules), [range, granularity, data.rules]);
  // A week (or month) picked in the chart: the KPIs and table show just that week until it is cleared
  const [focus, setFocus] = useState(null); // bucket start date
  const [weekly, setWeekly] = useState(false); // weekly Redmine update email
  const picked = periods.find((b) => b.start === focus) ?? null;
  // A person's split: a week picked in the chart opens day by day, a month week by week; otherwise every bucket
  const splitPeriods = useMemo(() => {
    if (!picked || granularity === 'day') return periods;
    return buckets(picked, granularity === 'week' ? 'day' : 'week', data.rules);
  }, [picked, granularity, periods, data.rules]);
  const people = useMemo(
    () => selectRows(data, range, scoped, { search }).filter((r) => r.resource.redmineUserId || r.planned > 0),
    [data, range, scoped, search]
  );
  // Non-billable people (a non-billable allocation on the project in this period) are listed with their
  // own hours and weekly split, labelled, but left out of every total (KPIs, chart, footer)
  const fullData = useMemo(() => ({ ...data, allocations: data.allAllocations, entriesByUser: data.allEntriesByUser }), [data]);
  const isNonBillable = (r) => data.allAllocations.some((a) => a.resourceId === r.resource.id && a.billable === false
    && (!scope || a.projectId === scope) && a.startDate <= range.end && (!a.endDate || a.endDate >= range.start));
  const dataFor = (r) => (isNonBillable(r) ? fullData : data);
  const billableFte = (row) => scopedFte(data, row, scope, picked?.asOf ?? period.asOf);
  const fteShown = (row) => scopedFte(dataFor(row), row, scope, picked?.asOf ?? period.asOf);
  // Utilization is cumulative: actual ÷ planned from the start of the shown period up to today
  const view = picked ?? range;
  const until = hoursUntil(data);
  const soFar = view.start > until ? null : { ...view, end: view.end < until ? view.end : until, asOf: view.end < until ? view.end : until };
  const toLabel = soFar ? `${formatDate(soFar.start, { year: false })} – ${formatDate(soFar.end, { year: false })}` : 'not started';
  const toDate = useMemo(
    () => new Map(soFar ? people.map((r) => [r.resource.id, resourceRow(r.resource, data, soFar, scoped)]) : []),
    [people, soFar?.start, soFar?.end, data, scoped] // eslint-disable-line react-hooks/exhaustive-deps
  );
  // What each row shows: the billable figures, or a non-billable person's own figures
  const shown = useMemo(
    () => new Map(soFar ? people.map((r) => [r.resource.id, isNonBillable(r) ? resourceRow(r.resource, fullData, soFar, scoped) : toDate.get(r.resource.id)]) : []),
    [people, toDate, fullData] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const utilOf = (r) => shown.get(r.resource.id)?.utilization ?? null;
  const rows = sortBy(picked ? people.map((r) => resourceRow(r.resource, data, picked, scoped)) : people, sort, {
    name: (r) => r.resource.name.trim().toLowerCase(),
    team: (r) => teamName(data, r.resource.teamId),
    fte: fteShown,
    planned: (r) => shown.get(r.resource.id)?.planned ?? 0,
    actual: (r) => (r.resource.redmineUserId ? shown.get(r.resource.id)?.actual ?? 0 : null),
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
  const unit = { day: 'day', week: 'week', month: 'month' }[granularity];
  const pickedLabel = picked && (granularity === 'week' ? `Week of ${picked.label}` : picked.label);
  const lastSync = data.syncRuns.find((s) => s.status !== 'failed');

  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // Excel download: the people table (to date and for the period) and one sheet per week or month
  const exportXlsx = async () => {
    const span = picked ?? range;
    const projectLabel = scope ? data.projects.find((p) => p.id === scope)?.name : 'All projects';
    const squadLabel = filters.teamId ? (filters.teamId === 'none' ? 'No squad' : teamName(data, filters.teamId)) : 'All squads';
    const title = [
      [bold('AgileMetrix · Effort tracker')],
      ['Project', projectLabel],
      ['Squad', squadLabel],
      ['Period', `${picked ? pickedLabel : period.label.replace(' · to date', '')} (${formatDate(span.start)} – ${formatDate(span.end)})`],
      ['To date', soFar ? `${formatDate(soFar.start)} – ${formatDate(soFar.end)} (last full day of imported Redmine hours)` : 'Not started yet'],
      ['Generated', formatDateTime(new Date().toISOString())],
      [],
    ];
    const head = ['Resource', 'Squad', 'FTE', 'Planned to date (h)', 'Actual to date (h)', 'Utilization to date', 'Planned in period (h)'].map(bold);
    const people = rows.map((r) => {
      const d = shown.get(r.resource.id);
      return [`${r.resource.name}${isNonBillable(r) ? ' (non-billable, not in totals)' : ''}`, teamName(data, r.resource.teamId) ?? '', fte(fteShown(r)), hours(d?.planned ?? 0),
        r.resource.redmineUserId ? hours(d?.actual ?? 0) : null, percent(utilOf(r)), hours(r.planned)];
    });
    const total = [bold(`${rows.length} people`), null, fte(round(rows.reduce((n, r) => n + billableFte(r), 0), 3)), hours(plannedSoFar),
      hours(cumulative.actual), percent(cumulative.utilization), hours(sum.planned)].map((c) => (c && typeof c === 'object' ? { ...c, fontWeight: 'bold' } : c));
    const sheet = { day: 'By day', week: 'By week', month: 'By month' }[granularity];
    const breakdown = [
      [bold('Resource'), ...periods.flatMap((b) => [bold(`${b.label} planned (h)`), bold(`${b.label} actual (h)`)])],
      ...rows.map((r) => {
        const per = periods.map((b) => resourceRow(r.resource, dataFor(r), b, scoped));
        return [r.resource.name, ...per.flatMap((x, i) => [hours(x.planned), periods[i].start > until ? null : hours(x.actual)])];
      }),
    ];
    await downloadXlsx([
      { name: 'Effort', rows: [...title, head, ...people, total], columns: [{ width: 28 }, { width: 16 }, { width: 8 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }], sticky: title.length + 1 },
      { name: sheet, rows: breakdown, columns: [{ width: 28 }, ...periods.flatMap(() => [{ width: 16 }, { width: 16 }])], sticky: 1 },
    ], `agilemetrix-effort-${span.start}-${span.end}.xlsx`);
  };
  // The download icon sits in the top bar, like Agile Metrics
  const exportRef = useRef(exportXlsx);
  exportRef.current = exportXlsx;
  const canExport = rows.length > 0;
  useEffect(() => {
    setActions?.(
      <>
        {access?.canAdmin && (
          <button className={`icon-btn${redmine.running ? ' is-active' : ''}`} onClick={redmine.start} disabled={redmine.running}
            title={redmine.running ? 'Importing from Redmine…' : 'Sync: import the latest hours from Redmine'} aria-label="Sync from Redmine">
            <span className={redmine.running ? 'spin' : undefined}><RefreshIcon /></span>
          </button>
        )}
        <button className="icon-btn" onClick={() => setWeekly(true)} title="Weekly Redmine update email" aria-label="Weekly Redmine update email">
          <MailIcon />
        </button>
        <button className="icon-btn" onClick={() => exportRef.current()} disabled={!canExport} title="Export to Excel" aria-label="Export to Excel">
          <DownloadIcon />
        </button>
      </>
    );
    return () => setActions?.(null);
  }, [canExport, setActions, access?.canAdmin, redmine.running]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Filters filters={filters} setFilters={setFilters} data={data} period={period}>
        <label className="filter">
          <span>Breakdown</span>
          <select value={granularity} onChange={(e) => { setGranularity(e.target.value); setFocus(null); }}>
            <option value="day" disabled={days > 31}>Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </label>
        <label className="filter filter-search"><span>Search</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or Redmine user" /></label>
      </Filters>
      {redmine.running && <ImportProgress progress={redmine.progress} />}
      {redmine.error && <div className="card warning">Could not import from Redmine: {redmine.error}</div>}
      {!redmine.running && redmine.message && <div className="card rm-sync-done" role="status">Redmine import finished: {redmine.message}</div>}

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
            <div className="rm-chart-head"><h2>Planned vs. actual, by {unit}</h2></div>
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
                      <tr className={`${isOpen ? 'selected' : ''}${isNonBillable(r) ? ' rm-nonbillable' : ''}`}>
                        <td className="rm-check">
                          <button className="rm-expand" onClick={() => toggle(r.resource.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} ${{ day: 'daily', week: 'weekly', month: 'monthly' }[granularity]} effort for ${r.resource.name}`}>{isOpen ? '▾' : '▸'}</button>
                        </td>
                        <td>
                          <b>{r.resource.name}</b>{!r.resource.redmineUserId && <span className="rm-pill warn rm-inline">Not mapped</span>}
                          {r.resource.leftOn && <span className="rm-pill nb rm-inline" title={`Left the organization; last working day ${formatDate(r.resource.leftOn)}`}>Left · {formatDate(r.resource.leftOn, { year: false })}</span>}
                          {isNonBillable(r) && <span className="rm-pill nb rm-inline" title="Non-billable: their hours are shown here but not counted in the totals">Non-billable</span>}
                        </td>
                        <td>{teamName(data, r.resource.teamId) ?? <span className="muted">—</span>}</td>
                        <td className="num">{fmtFte(fteShown(r))}</td>
                        {isNonBillable(r) ? (
                          <>
                            <td className="num muted">—</td><td className="num muted">—</td><td className="num muted">—</td>
                          </>
                        ) : (
                          <>
                            <td className="num">{fmtHours(shown.get(r.resource.id)?.planned ?? 0)}</td>
                            <td className="num">{r.resource.redmineUserId ? fmtHours(shown.get(r.resource.id)?.actual ?? 0) : '—'}</td>
                            <td className={`num${utilTone(utilOf(r)) === 'low' ? ' bad-text' : utilTone(utilOf(r)) ? ' good-text' : ''}`}
                              title={utilOf(r) == null ? 'Nothing planned up to today, so no percentage' : 'Actual ÷ planned up to today'}>{fmtPct(utilOf(r))}</td>
                          </>
                        )}
                        <td className="muted small">{r.resource.redmineUserId && lastSync ? formatDateTime(lastSync.startedAt) : '—'}</td>
                      </tr>
                      {isOpen && (
                        <tr className="rm-split-row">
                          <td />
                          <td colSpan={7}>
                            <Breakdown row={r} data={dataFor(r)} periods={splitPeriods} filters={scoped} until={until} logOnly={isNonBillable(r)} focus={picked ? null : focus} />
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
                  <td className="num">{fmtFte(round(rows.reduce((n, r) => n + billableFte(r), 0), 3))}</td>
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

// One person's days, weeks or months as small cards that wrap, instead of a wide table
// Non-billable people (logOnly): just whether they log in Redmine, i.e. hours and days logged
// The week (or day, month) picked in the chart is highlighted. Clicking a card lists its Redmine
// time entries below the cards.
function Breakdown({ row, data, periods, filters, until, logOnly, focus }) {
  const per = periods.map((b) => ({ b, ...resourceRow(row.resource, data, b, filters) }));
  // The entries the cards count: eligible activities, on the project in scope
  const counted = (data.entriesByUser.get(row.resource.redmineUserId) ?? [])
    .filter((e) => data.rules.eligibleActivities.includes(e.activity) && (!filters.projectId || e.projectId === filters.projectId));
  const logged = new Set(counted.filter((e) => e.hours > 0).map((e) => e.date));
  const [openKey, setOpenKey] = useState(null);
  const opened = periods.find((b) => b.start === openKey && b.start <= until) ?? null;
  const cardProps = (b) => {
    const base = `rm-bcard${b.start === focus ? ' is-focus' : ''}`;
    if (b.start > until) return { className: base };
    const toggle = () => setOpenKey((k) => (k === b.start ? null : b.start));
    return {
      className: `${base} rm-bcard-click${b.start === openKey ? ' is-open' : ''}`, role: 'button', tabIndex: 0, 'aria-expanded': b.start === openKey,
      title: 'Show the time entries', onClick: toggle, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } },
    };
  };
  const days = (b) => eachDay(b.start, b.end < until ? b.end : until)
    .filter((d) => isWorkingDay(d, data.rules) && !onLeave(row.resource.id, d, data.leave));
  return (
    <>
    <div className="rm-breakdown">
      {per.map(({ b, planned, actual, utilization: pctUsed }) => {
        if (logOnly) {
          if (b.start > until) {
            return (
              <div key={b.start} {...cardProps(b)}>
                <span className="muted small">{b.label}</span><b className="muted">—</b>
                <span className="rm-util-bar rm-wide"><i style={{ width: 0 }} /></span>
                <span className="small muted">Not imported yet</span>
              </div>
            );
          }
          const working = days(b);
          const done = working.filter((d) => logged.has(d)).length;
          const tone = !working.length ? 'var(--border-strong)' : done === working.length ? 'var(--success)' : done === 0 ? 'var(--danger)' : 'var(--warning)';
          return (
            <div key={b.start} {...cardProps(b)}>
              <span className="muted small">{b.label}</span>
              <b>{fmtHours(round(actual))} <span className="muted">logged</span></b>
              <span className="rm-util-bar rm-wide"><i style={{ width: `${working.length ? (done / working.length) * 100 : 0}%`, background: tone }} /></span>
              <span className={`small ${!working.length ? 'muted' : done === working.length ? 'good-text' : done === 0 ? 'bad-text' : ''}`}>
                {working.length ? `${done} of ${working.length} days logged` : 'No working days'}
              </span>
            </div>
          );
        }
        if (b.start > until) { // Redmine hours not imported yet
          return (
            <div key={b.start} {...cardProps(b)}>
              <span className="muted small">{b.label}</span>
              <b><span className="muted">— / {fmtHours(planned)}</span></b>
              <span className="rm-util-bar rm-wide"><i style={{ width: 0 }} /></span>
              <span className="small muted">Not imported yet</span>
            </div>
          );
        }
        const pct = planned > 0 ? Math.min(100, (actual / planned) * 100) : actual > 0 ? 100 : 0;
        const tone = planned === 0 ? (actual > 0 ? 'var(--warning)' : 'var(--border-strong)') : actual < planned * (LOW_UTILIZATION / 100) ? 'var(--danger)' : 'var(--success)';
        return (
          <div key={b.start} {...cardProps(b)}>
            <span className="muted small">{b.label}</span>
            <b>{fmtHours(round(actual))} <span className="muted">/ {fmtHours(planned)}</span></b>
            <span className="rm-util-bar rm-wide"><i style={{ width: `${pct}%`, background: tone }} /></span>
            <span className={`small ${pctUsed == null ? 'muted' : pctUsed < LOW_UTILIZATION ? 'bad-text' : 'good-text'}`}>{fmtPct(pctUsed)}</span>
          </div>
        );
      })}
    </div>
    {opened && (
      <DayEntries key={opened.start} bucket={opened} until={until}
        entries={counted.filter((e) => e.date >= opened.start && e.date <= (opened.end < until ? opened.end : until))}
        onClose={() => setOpenKey(null)} />
    )}
    </>
  );
}

// The Redmine time entries behind one card (a day, or a week or month with a Date column)
function DayEntries({ bucket, entries, until, onClose }) {
  const [state, setState] = useState({ loading: true, error: null, details: null });
  const ids = entries.map((e) => e.id);
  useEffect(() => {
    if (!ids.length) { setState({ loading: false, error: null, details: { entries: [] } }); return; }
    api.timeEntryDetails(ids)
      .then((details) => setState({ loading: false, error: null, details }))
      .catch((e) => setState({ loading: false, error: e.message, details: null }));
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const multiDay = bucket.start !== bucket.end;
  const total = round(entries.reduce((n, e) => n + e.hours, 0));
  const span = multiDay ? `${formatDate(bucket.start, { year: false })} – ${formatDate(bucket.end < until ? bucket.end : until, { year: false })}` : bucket.label;
  const d = state.details;
  return (
    <div className="rm-entries">
      <div className="rm-entries-head">
        <b>{span} · {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {fmtHours(total)} logged</b>
        <button className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Close the time entries"><ClearIcon /></button>
      </div>
      {state.loading && <p className="muted small rm-entries-msg">Loading time entries…</p>}
      {state.error && <p className="form-error rm-entries-msg">Could not load the time entries: {state.error}</p>}
      {d && !d.entries.length && <p className="muted small rm-entries-msg">Nothing logged in Redmine {multiDay ? 'in this period' : 'on this day'}.</p>}
      {d && d.entries.length > 0 && (
        <div className="rm-entries-scroll">
          <table className="rm-entries-table">
            <thead>
              <tr>
                {multiDay && <th>Date</th>}<th>Redmine issue</th><th>Jira</th><th>Activity</th><th>Comment</th><th className="num">Hours</th>
              </tr>
            </thead>
            <tbody>
              {d.entries.map((e) => (
                <tr key={e.id}>
                  {multiDay && <td className="nowrap">{formatDate(e.date, { year: false })}</td>}
                  <td>
                    {e.issueId ? (
                      <>
                        {d.redmineUrl ? <a href={`${d.redmineUrl}/issues/${e.issueId}`} target="_blank" rel="noreferrer">#{e.issueId}</a> : `#${e.issueId}`}
                        {e.issue && <span className="rm-entries-issue"> {e.issue}</span>}
                      </>
                    ) : <span className="muted">No issue</span>}
                  </td>
                  <td className="nowrap">{e.jiraKey ? (d.jiraUrl ? <a href={`${d.jiraUrl}/browse/${e.jiraKey}`} target="_blank" rel="noreferrer">{e.jiraKey}</a> : e.jiraKey) : <span className="muted">—</span>}</td>
                  <td className="nowrap">{e.activity ?? '—'}</td>
                  <td>{e.comment ?? <span className="muted">—</span>}</td>
                  <td className="num">{fmtHours(e.hours)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={multiDay ? 5 : 4}>Total</td><td className="num">{fmtHours(total)}</td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
