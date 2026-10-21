import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Filters, PageHead, Kpi, fmtHours, fmtFte, fmtPct, fmtSigned } from '../components/ui.jsx';
import { selectRows, totals, unmappedUsers } from '../model/select.js';
import { DEFINITIONS, resourceRow, isWorkingDay, round, EPSILON } from '../model/calc.js';
import { buckets, workingDayCount } from '../model/period.js';
import { hrefFor, openSettings } from '../../lib/route.js';
import { formatDateTime } from '../../lib/datetime.js';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps } from '../../components/charts/common.jsx';
import { AlertIcon } from '../../components/Icons.jsx';

const BAND_COLOR = { ok: 'var(--success)', under: 'var(--warning)', over: 'var(--danger)', none: 'var(--border-strong)' };

// Management view: key figures, what needs attention, and where capacity goes
export default function Overview({ data, filters, setFilters, period, access }) {
  const rows = useMemo(() => selectRows(data, period, filters), [data, period, filters]);
  const mapped = rows.filter((r) => r.resource.redmineUserId);
  const sum = totals(rows);
  const actualTotals = totals(mapped);
  const days = workingDayCount(period, data.rules, isWorkingDay);
  const employment = rows.reduce((n, r) => n + (r.resource.employmentFte ?? 0), 0);
  const allocated = rows.reduce((n, r) => n + r.allocatedFte, 0);

  const trend = useMemo(() => buckets(period, 'week', data.rules).map((b) => {
    const t = totals(rows.map((r) => resourceRow(r.resource, data, b, filters)));
    return { label: b.label, planned: t.planned, actual: t.actual };
  }), [rows, period, data, filters]);

  const byTeam = data.teams.map((t) => {
    const teamRows = rows.filter((r) => r.resource.teamId === t.id);
    const tt = totals(teamRows.filter((r) => r.resource.redmineUserId));
    return {
      team: t,
      people: teamRows.length,
      utilization: tt.utilization,
      allocated: round(teamRows.reduce((n, r) => n + r.allocatedFte, 0), 2),
      employment: round(teamRows.reduce((n, r) => n + (r.resource.employmentFte ?? 0), 0), 2),
    };
  }).filter((t) => t.people);
  const band = (pct) => (pct == null ? 'none' : pct > data.rules.thresholds.over ? 'over' : pct < data.rules.thresholds.under ? 'under' : 'ok');

  // Alerts: the exceptions worth acting on, each linking to where it is fixed
  const unmapped = unmappedUsers(data, period);
  const lastRun = data.syncRuns[0];
  const over = rows.filter((r) => r.issues.includes('overallocated'));
  const noFte = rows.filter((r) => r.issues.includes('missing-fte'));
  const aboveplan = mapped.filter((r) => r.planned > 0 && r.actual > r.planned * 1.1);
  const alerts = [
    lastRun && lastRun.status !== 'success' && { tone: 'bad', title: lastRun.status === 'failed' ? 'Last Redmine sync failed' : 'Last Redmine sync was partial', text: lastRun.message, link: ['settings:redmine', 'View sync history'] },
    over.length && { tone: 'bad', title: `${over.length} ${over.length === 1 ? 'person is' : 'people are'} over-allocated`, text: `Project allocations add up to more than their employment FTE: ${over.map((r) => r.resource.name).join(', ')}.`, link: ['allocation', 'Review allocations'] },
    unmapped.length && { tone: 'warn', title: `${unmapped.length} Redmine ${unmapped.length === 1 ? 'user is' : 'users are'} not mapped`, text: `${fmtHours(round(unmapped.reduce((n, u) => n + u.hours, 0)))} logged in this period isn’t counted for anyone.`, link: ['settings:redmine', 'Map users'] },
    noFte.length && { tone: 'warn', title: `${noFte.length} ${noFte.length === 1 ? 'person has' : 'people have'} no FTE`, text: `${noFte.map((r) => `${r.resource.name} logged ${fmtHours(r.actual)}`).join(', ')}, but without capacity utilization can’t be shown.`, link: ['allocation', 'Set FTE'] },
    aboveplan.length && { tone: 'info', title: `Actual above plan for ${aboveplan.length} ${aboveplan.length === 1 ? 'person' : 'people'}`, text: 'More than 10% over their planned hours in this period.', link: ['effort', 'Open Effort Tracker'] },
  ].filter(Boolean);

  const ranked = mapped.filter((r) => r.utilization != null).sort((a, b) => b.utilization - a.utilization);
  const top = ranked.filter((r) => r.band === 'over').slice(0, 4);
  const bottom = ranked.filter((r) => r.band === 'under').slice(-4).reverse();

  return (
    <>
      <PageHead title="Resource overview" sub={`Capacity, planned and actual effort for ${period.label}. ${lastRun ? `Actual hours from Redmine, last synced ${formatDateTime(lastRun.startedAt)}.` : ''}`} />
      <Filters filters={filters} setFilters={setFilters} data={data} period={period} />

      <section className="rm-kpis">
        <Kpi label="Resources" value={rows.length} note={`${rows.filter((r) => r.issues.length).length} need attention`} />
        <Kpi label="Allocated FTE" value={fmtFte(allocated)} note={`of ${fmtFte(employment)} employment FTE`} tip={DEFINITIONS.fte} />
        <Kpi label="Available capacity" value={fmtHours(sum.capacity)} note={`${days} working days`} tip={DEFINITIONS.capacity} />
        <Kpi label="Planned effort" value={fmtHours(sum.planned)} note={sum.capacity > EPSILON ? `${Math.round((sum.planned / sum.capacity) * 100)}% of capacity` : null} tip={DEFINITIONS.planned} />
        <Kpi label="Actual effort" value={fmtHours(actualTotals.actual)} tone={actualTotals.variance < 0 ? 'bad' : undefined} note={`${fmtSigned(actualTotals.variance)} vs planned`} tip={DEFINITIONS.actual} />
        <Kpi label="Utilization" value={fmtPct(actualTotals.utilization)} note={`Target ${data.rules.thresholds.under}–${data.rules.thresholds.over}%`} tip={DEFINITIONS.utilization} />
      </section>

      <section className="rm-split">
        <div className="card rm-chart">
          <div className="rm-chart-head"><h2>Planned vs. actual effort, by week</h2><span className="muted small">{period.label}</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={52} />
              <Tooltip {...tooltipProps} formatter={(v) => fmtHours(v)} />
              <Legend {...legendProps} />
              <Bar dataKey="planned" name="Planned" fill={COLORS.primarySoft} radius={[3, 3, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
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
                  {a.link[0] !== 'settings:redmine' ? <a href={hrefFor('resources', a.link[0])}>{a.link[1]}</a>
                    : access.canAdmin ? <button type="button" className="link-btn" onClick={() => openSettings('redmine')}>{a.link[1]} in Settings</button>
                      : <span className="muted small">Ask an administrator to check Redmine settings</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rm-three">
        <div className="card rm-chart">
          <div className="rm-chart-head"><h2>Utilization by team</h2></div>
          <div className="rm-hbars">
            {byTeam.map((t) => (
              <div key={t.team.id} className="rm-hbar">
                <span>{t.team.name}</span>
                <span className="rm-util-bar rm-wide"><i style={{ width: `${Math.min(100, t.utilization ?? 0)}%`, background: BAND_COLOR[band(t.utilization)] }} /></span>
                <b>{fmtPct(t.utilization)}</b>
              </div>
            ))}
          </div>
          <p className="rm-note">Green {data.rules.thresholds.under}–{data.rules.thresholds.over}% · amber below · red above. Mapped people only.</p>
        </div>
        <div className="card rm-chart">
          <div className="rm-chart-head"><h2>Capacity allocation by team</h2><span className="muted small">FTE</span></div>
          <div className="rm-hbars">
            {byTeam.map((t) => (
              <div key={t.team.id} className="rm-hbar">
                <span>{t.team.name}</span>
                <span className="rm-util-bar rm-wide rm-tall"><i style={{ width: `${t.employment ? Math.min(100, (t.allocated / t.employment) * 100) : 0}%`, background: t.allocated > t.employment + EPSILON ? 'var(--danger)' : 'var(--primary)' }} /></span>
                <b className={t.allocated > t.employment + EPSILON ? 'bad-text' : ''}>{fmtFte(t.allocated)} / {fmtFte(t.employment)}</b>
              </div>
            ))}
          </div>
          <p className="rm-note">Allocated FTE of employment FTE. Free capacity can take more project work.</p>
        </div>
        <div className="card rm-chart">
          <div className="rm-chart-head"><h2>Over- and under-utilized</h2></div>
          <span className="muted small strong">Over {data.rules.thresholds.over}%</span>
          {!top.length && <span className="muted small">No one</span>}
          {top.map((r) => <div key={r.resource.id} className="rm-rank"><span>{r.resource.name}</span><span className="rm-pill bad">{r.utilization}%</span></div>)}
          <span className="muted small strong rm-gap">Under {data.rules.thresholds.under}%</span>
          {!bottom.length && <span className="muted small">No one</span>}
          {bottom.map((r) => <div key={r.resource.id} className="rm-rank"><span>{r.resource.name}</span><span className="rm-pill warn">{r.utilization}%</span></div>)}
          <a className="small strong rm-gap" href={hrefFor('resources', 'effort')}>See everyone in the Effort Tracker</a>
        </div>
      </section>
    </>
  );
}
