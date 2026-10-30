import { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Filters, PageHead, Kpi, fmtHours, fmtFte, fmtPct } from '../components/ui.jsx';
import { selectRows, totals, unmappedUsers, scopeProject, scopedFte } from '../model/select.js';
import { DEFINITIONS, resourceRow, plannedAndCapacity, utilization, isWorkingDay, round, EPSILON, utilizationBand, utilTone, LOW_UTILIZATION } from '../model/calc.js';
import { buckets, workingDayCount } from '../model/period.js';
import { hrefFor, openSettings } from '../../lib/route.js';
import { formatDate, formatDateTime } from '../../lib/datetime.js';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps } from '../../components/charts/common.jsx';
import { AlertIcon } from '../../components/Icons.jsx';

const CAPACITY_TIP = 'Available capacity = 1.00 FTE (full time) for each person × working hours per day, for each working day in the period. Weekends, public holidays and leave days are left out.';
const UTIL_TIP = 'Utilization to date = actual hours ÷ planned hours, counted from the start of the period up to today (cumulative). Future weeks are not counted.';

const BAND_COLOR = { ok: 'var(--success)', under: 'var(--warning)', low: 'var(--danger)', over: 'var(--danger)', none: 'var(--border-strong)' };

// Management view: key figures, what needs attention, and where capacity goes
export default function Overview({ data, filters, setFilters, period, access }) {
  // Same rules as the Effort Tracker: numbers for one project (the selected project, or the selected
  // team's project), for the whole period (e.g. the full quarter), or for one week picked in the chart
  const scope = scopeProject(data, filters);
  const scoped = useMemo(() => ({ ...filters, projectId: scope }), [filters, scope]);
  const range = useMemo(() => (period.toDate ? { ...period, end: period.fullEnd } : period), [period]);
  const weeks = useMemo(() => buckets(range, 'week', data.rules), [range, data.rules]);
  const [focus, setFocus] = useState(null); // week start date
  const picked = weeks.find((b) => b.start === focus) ?? null;
  const view = picked ?? range;
  const people = useMemo(() => selectRows(data, range, scoped), [data, range, scoped]);
  const rows = useMemo(() => (picked ? people.map((r) => resourceRow(r.resource, data, picked, scoped)) : people), [people, picked, data, scoped]);
  const mapped = rows.filter((r) => r.resource.redmineUserId);
  const sum = totals(rows);
  const actualTotals = totals(mapped);
  // Available capacity: everyone's full-time working hours (1.00 FTE each), whichever project they are planned on
  const fullCapacity = round(rows.reduce((n, r) => n + plannedAndCapacity({ ...r.resource, employmentFte: 1 }, [], view, data.rules, data.leave).capacity, 0));
  // Utilization is cumulative: actual ÷ planned from the start of the period up to today
  const soFar = view.start > data.today ? null : { ...view, end: view.end < data.today ? view.end : data.today, asOf: view.end < data.today ? view.end : data.today };
  const dateRows = useMemo(() => (soFar ? rows.map((r) => resourceRow(r.resource, data, soFar, scoped)) : []), [rows, soFar?.start, soFar?.end, data, scoped]); // eslint-disable-line react-hooks/exhaustive-deps
  const dateMapped = dateRows.filter((r) => r.resource.redmineUserId);
  const cumulative = totals(dateMapped);
  const days = workingDayCount(view, data.rules, isWorkingDay);
  const fteOf = (r) => scopedFte(data, r, scope, view.asOf);
  const allocated = round(rows.reduce((n, r) => n + fteOf(r), 0), 2);

  const trend = useMemo(() => {
    let plannedSoFar = 0;
    let actualSoFar = 0;
    return weeks.map((b) => {
      const all = people.map((r) => resourceRow(r.resource, data, b, scoped));
      const t = totals(all);
      const future = b.start > data.today;
      if (!future) {
        // The current week counts up to today, like the Utilization to date figure
        const upTo = b.end > data.today ? { ...b, end: data.today, asOf: data.today } : null;
        const m = totals((upTo ? people.map((r) => resourceRow(r.resource, data, upTo, scoped)) : all).filter((r) => r.resource.redmineUserId));
        plannedSoFar += m.planned;
        actualSoFar += m.actual;
      }
      return { label: b.label, planned: t.planned, actual: future ? null : t.actual, cumulative: future ? null : utilization(actualSoFar, plannedSoFar) };
    });
  }, [weeks, people, data, scoped]);
  const pickWeek = (state) => {
    const b = weeks[Number(state?.activeTooltipIndex)];
    if (b) setFocus((f) => (f === b.start ? null : b.start));
  };
  const periodName = period.label.replace(' · to date', '');

  // Capacity allocation: FTE planned against one full-time person (1.00) each
  const byTeam = data.teams.map((t) => {
    const teamRows = rows.filter((r) => r.resource.teamId === t.id);
    const tt = totals(dateMapped.filter((r) => r.resource.teamId === t.id));
    return {
      team: t,
      people: teamRows.length,
      utilization: tt.utilization,
      allocated: round(teamRows.reduce((n, r) => n + fteOf(r), 0), 2),
      employment: teamRows.length,
    };
  }).filter((t) => t.people);
  const band = (pct) => utilizationBand(pct);

  // Alerts: the exceptions worth acting on, each linking to where it is fixed
  const unmapped = unmappedUsers(data, view, scope);
  const lastRun = data.syncRuns[0];
  const over = rows.filter((r) => r.issues.includes('overallocated'));
  const noFte = rows.filter((r) => r.issues.includes('missing-fte'));
  const aboveplan = mapped.filter((r) => r.planned > 0 && r.actual > r.planned * 1.1);
  const alerts = [
    lastRun && lastRun.status !== 'success' && { tone: 'bad', title: lastRun.status === 'failed' ? 'Last Redmine sync failed' : 'Last Redmine sync was partial', text: lastRun.message, link: ['settings:redmine', 'View sync history'] },
    over.length && { tone: 'bad', title: `${over.length} ${over.length === 1 ? 'person is' : 'people are'} over-allocated`, text: `Project allocations add up to more than 1.00 FTE: ${over.map((r) => r.resource.name).join(', ')}.`, link: ['settings:allocation', 'Review allocations'] },
    unmapped.length && { tone: 'warn', title: `${unmapped.length} Redmine ${unmapped.length === 1 ? 'user is' : 'users are'} not mapped`, text: `${fmtHours(round(unmapped.reduce((n, u) => n + u.hours, 0)))} logged in this period isn’t counted for anyone.`, link: ['settings:redmine', 'Map users'] },
    noFte.length && { tone: 'warn', title: `${noFte.length} ${noFte.length === 1 ? 'person has' : 'people have'} no FTE`, text: `${noFte.map((r) => `${r.resource.name} logged ${fmtHours(r.actual)}`).join(', ')}, but without capacity utilization can’t be shown.`, link: ['settings:allocation', 'Set FTE'] },
    aboveplan.length && { tone: 'info', title: `Actual above plan for ${aboveplan.length} ${aboveplan.length === 1 ? 'person' : 'people'}`, text: 'More than 10% over their planned hours in this period.', link: ['effort', 'Open Effort Tracker'] },
  ].filter(Boolean);

  const ranked = dateMapped.filter((r) => r.utilization != null).sort((a, b) => b.utilization - a.utilization);
  const top = ranked.filter((r) => r.band === 'ok').slice(0, 4);
  const bottom = ranked.filter((r) => r.band === 'low').slice(-4).reverse();

  return (
    <>
      <PageHead title="Project overview" sub={`Capacity, planned and actual effort for ${periodName}. ${lastRun ? `Actual hours from Redmine, last synced ${formatDateTime(lastRun.startedAt)}.` : ''}`} />
      <Filters filters={filters} setFilters={setFilters} data={data} period={period} />

      {picked && (
        <div className="rm-focus" role="status">
          <span>Showing <b>Week of {picked.label}</b> ({formatDate(picked.start, { year: false })} – {formatDate(picked.end)})</span>
          <button className="btn btn-sm" onClick={() => setFocus(null)}>Show whole {periodName}</button>
        </div>
      )}
      <section className="rm-kpis">
        <Kpi label="Resources" value={rows.length} note={`${rows.filter((r) => r.issues.length).length} need attention`} />
        <Kpi label="Allocated FTE" value={fmtFte(allocated)} note={`${fmtFte(round(rows.length - allocated, 2))} FTE available`} tip={DEFINITIONS.fte} />
        <Kpi label="Available capacity" value={fmtHours(fullCapacity)} note={`${rows.length} full-time · ${days} working days`} tip={CAPACITY_TIP} />
        <Kpi label="Planned effort" value={fmtHours(sum.planned)} note={fullCapacity > EPSILON ? `${Math.round((sum.planned / fullCapacity) * 100)}% of capacity` : null} tip={DEFINITIONS.planned} />
        <Kpi label="Actual effort" value={fmtHours(actualTotals.actual)} note={soFar && view.end > data.today ? `to ${formatDate(data.today, { year: false })}` : null} tip={DEFINITIONS.actual} />
        <Kpi label="Utilization to date" value={fmtPct(cumulative.utilization)} tone={utilTone(cumulative.utilization)}
          note={soFar ? `${fmtHours(cumulative.actual)} of ${fmtHours(cumulative.planned)} planned` : 'Period not started'} tip={UTIL_TIP} />
      </section>

      <section className="rm-split">
        <div className="card rm-chart">
          <div className="rm-chart-head"><h2>Planned vs. actual effort, by week</h2><span className="muted small">Click a week to see it above · {periodName}</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} onClick={pickWeek} style={{ cursor: 'pointer' }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis yAxisId="h" {...axisProps} width={52} />
              <YAxis yAxisId="pct" orientation="right" {...axisProps} width={44} unit="%" domain={[0, (max) => Math.max(100, Math.ceil(max / 20) * 20)]} />
              <Tooltip {...tooltipProps} formatter={(v, name) => (name === 'Cumulative utilization' ? `${v}%` : fmtHours(v))} />
              <Legend {...legendProps} />
              <Bar yAxisId="h" dataKey="planned" name="Planned" fill={COLORS.primarySoft} radius={[3, 3, 0, 0]}>
                {weeks.map((b) => <Cell key={b.start} fill={b.start === focus ? COLORS.primaryMid : COLORS.primarySoft} />)}
              </Bar>
              <Bar yAxisId="h" dataKey="actual" name="Actual" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
              <Line yAxisId="pct" dataKey="cumulative" name="Cumulative utilization" stroke={COLORS.warning} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card rm-alerts">
          <div className="rm-chart-head"><h2>Needs attention</h2>{alerts.length > 0 && <span className="rm-pill bad">{alerts.length}</span>}</div>
          {!alerts.length && <p className="muted small">Nothing needs attention for this selection.</p>}
          <ul>
            {alerts.map((a) => (
              <li key={a.title} className={`rm-alert tone-${a.tone}`}>
                <span className="rm-alert-icon"><AlertIcon /></span>
                <div>
                  <b>{a.title}</b>
                  {a.text && <p>{a.text}</p>}
                  {!a.link[0].startsWith('settings:') ? <a href={hrefFor('resources', a.link[0])}>{a.link[1]}</a>
                    : access.canAdmin ? <button type="button" className="link-btn" onClick={() => openSettings(a.link[0].slice(9))}>{a.link[1]} in Settings</button>
                      : <span className="muted small">{a.link[0] === 'settings:redmine' ? 'Ask an administrator to check Redmine settings' : 'Ask an administrator to update allocations in Settings'}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rm-three">
        <div className="card rm-chart">
          <div className="rm-chart-head"><h2>Utilization by squad</h2></div>
          <div className="rm-hbars">
            {byTeam.map((t) => (
              <div key={t.team.id} className="rm-hbar">
                <span>{t.team.name}</span>
                <span className="rm-util-bar rm-wide"><i style={{ width: `${Math.min(100, t.utilization ?? 0)}%`, background: BAND_COLOR[band(t.utilization)] }} /></span>
                <b>{fmtPct(t.utilization)}</b>
              </div>
            ))}
          </div>
          <p className="rm-note">Cumulative to date. Green {LOW_UTILIZATION}% and above · red below {LOW_UTILIZATION}%. Mapped people only.</p>
        </div>
        <div className="card rm-chart">
          <div className="rm-chart-head"><h2>Capacity allocation by squad</h2><span className="muted small">FTE</span></div>
          <div className="rm-hbars">
            {byTeam.map((t) => (
              <div key={t.team.id} className="rm-hbar">
                <span>{t.team.name}</span>
                <span className="rm-util-bar rm-wide rm-tall"><i style={{ width: `${t.employment ? Math.min(100, (t.allocated / t.employment) * 100) : 0}%`, background: t.allocated > t.employment + EPSILON ? 'var(--danger)' : 'var(--primary)' }} /></span>
                <b className={t.allocated > t.employment + EPSILON ? 'bad-text' : ''}>{fmtFte(t.allocated)} / {fmtFte(t.employment)}</b>
              </div>
            ))}
          </div>
          <p className="rm-note">Allocated FTE of 1.00 per person. Free capacity can take more project work.</p>
        </div>
        <div className="card rm-chart">
          <div className="rm-chart-head"><h2>Over- and under-utilized</h2></div>
          <span className="muted small strong">Highest ({LOW_UTILIZATION}% and above)</span>
          {!top.length && <span className="muted small">No one</span>}
          {top.map((r) => <div key={r.resource.id} className="rm-rank"><span>{r.resource.name}</span><span className="rm-pill ok">{r.utilization}%</span></div>)}
          <span className="muted small strong rm-gap">Below {LOW_UTILIZATION}%</span>
          {!bottom.length && <span className="muted small">No one</span>}
          {bottom.map((r) => <div key={r.resource.id} className="rm-rank"><span>{r.resource.name}</span><span className="rm-pill bad">{r.utilization}%</span></div>)}
          <a className="small strong rm-gap" href={hrefFor('resources', 'effort')}>See everyone in the Effort Tracker</a>
        </div>
      </section>
    </>
  );
}
