import { Fragment, useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Filters, PageHead, InfoTip, Kpi, Empty, fmtHours, fmtFte, fmtPct, fmtSigned } from '../components/ui.jsx';
import { selectRows, totals, teamName } from '../model/select.js';
import { DEFINITIONS, resourceRow, round } from '../model/calc.js';
import { buckets } from '../model/period.js';
import { downloadCsv } from '../../lib/download.js';
import { formatDateTime } from '../../lib/datetime.js';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps } from '../../components/charts/common.jsx';

// Planned against actual Redmine hours, per person, with a weekly or monthly breakdown on demand
export default function EffortTracker({ data, filters, setFilters, period }) {
  const [granularity, setGranularity] = useState('week');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(new Set());
  const [sort, setSort] = useState('variance');

  const rows = useMemo(() => {
    const list = selectRows(data, period, filters, { search }).filter((r) => r.resource.redmineUserId || r.planned > 0);
    const key = { variance: (r) => r.variance, name: (r) => r.resource.name, utilization: (r) => r.utilization ?? -1 }[sort];
    return [...list].sort((a, b) => (sort === 'name' ? key(a).localeCompare(key(b)) : key(a) - key(b)));
  }, [data, period, filters, search, sort]);
  const sum = totals(rows);
  const periods = useMemo(() => buckets(period, granularity, data.rules), [period, granularity, data.rules]);
  // The chart: everyone in scope, per week or month
  const trend = useMemo(() => periods.map((b) => {
    const t = totals(rows.map((r) => resourceRow(r.resource, data, b, filters)));
    return { label: b.label, planned: t.planned, actual: t.actual };
  }), [periods, rows, data, filters]);
  const lastSync = data.syncRuns.find((s) => s.status !== 'failed');

  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const exportCsv = () => {
    const header = ['Resource', 'Team', 'FTE', 'Planned (h)', 'Actual (h)', 'Variance (h)', 'Utilization %', ...periods.flatMap((b) => [`${b.label} planned`, `${b.label} actual`])];
    downloadCsv([header, ...rows.map((r) => {
      const per = periods.map((b) => resourceRow(r.resource, data, b, filters));
      return [r.resource.name, teamName(data, r.resource.teamId) ?? '', r.allocatedFte, r.planned, r.actual, r.variance, r.utilization ?? '', ...per.flatMap((p) => [p.planned, p.actual])];
    })], `agilemetrix-effort-${period.start}-${period.end}.csv`);
  };

  return (
    <>
      <PageHead title="Effort tracker" sub={`Planned hours against actual Redmine hours. ${lastSync ? `Last synced ${formatDateTime(lastSync.startedAt)}.` : 'Not synced yet.'}`}>
        <button className="btn" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
      </PageHead>

      <Filters filters={filters} setFilters={setFilters} data={data} period={period}>
        <label className="rm-field">
          <span>Breakdown</span>
          <select value={granularity} onChange={(e) => setGranularity(e.target.value)}>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </label>
        <label className="rm-field rm-search"><span>Search</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or Redmine user" /></label>
      </Filters>

      <section className="rm-kpis rm-kpis-4">
        <Kpi label="Planned" value={fmtHours(sum.planned)} tip={DEFINITIONS.planned} />
        <Kpi label="Actual (Redmine)" value={fmtHours(sum.actual)} tip={DEFINITIONS.actual} />
        <Kpi label="Variance" value={fmtSigned(sum.variance)} tone={sum.variance < 0 ? 'bad' : undefined} note={sum.planned ? `${Math.round((sum.variance / sum.planned) * 100)}% vs planned` : null} tip={DEFINITIONS.variance} />
        <Kpi label="Utilization" value={fmtPct(sum.utilization)} note={`Target ${data.rules.thresholds.under}–${data.rules.thresholds.over}%`} tip={DEFINITIONS.utilization} />
      </section>

      {!rows.length ? (
        <Empty title="No effort in this period">Nobody in this selection had planned or logged hours. Try another period, team or project.</Empty>
      ) : (
        <>
          <section className="card rm-chart">
            <div className="rm-chart-head"><h2>Planned vs. actual, {granularity === 'week' ? 'by week' : 'by month'}</h2><span className="muted small">{period.label}</span></div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={48} />
                <Tooltip {...tooltipProps} formatter={(v) => fmtHours(v)} />
                <Legend {...legendProps} />
                <Bar dataKey="planned" name="Planned" fill={COLORS.primarySoft} radius={[3, 3, 0, 0]} />
                <Line dataKey="actual" name="Actual" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          <section className="card rm-table-card">
            <table className="rm-table">
              <thead>
                <tr>
                  <th className="rm-check" aria-label="Expand" />
                  <th><button className="rm-sort" onClick={() => setSort('name')} aria-pressed={sort === 'name'}>Resource</button></th>
                  <th>Team</th>
                  <th className="num">FTE</th>
                  <th className="num">Planned <InfoTip text={DEFINITIONS.planned} /></th>
                  <th className="num">Actual <InfoTip text={DEFINITIONS.actual} /></th>
                  <th className="num"><button className="rm-sort" onClick={() => setSort('variance')} aria-pressed={sort === 'variance'}>Variance</button> <InfoTip text={DEFINITIONS.variance} /></th>
                  <th className="num"><button className="rm-sort" onClick={() => setSort('utilization')} aria-pressed={sort === 'utilization'}>Utilization</button> <InfoTip text={DEFINITIONS.utilization} /></th>
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
                        <td className="num">{fmtFte(r.allocatedFte)}</td>
                        <td className="num">{fmtHours(r.planned)}</td>
                        <td className="num">{r.resource.redmineUserId ? fmtHours(r.actual) : '—'}</td>
                        <td className={`num ${r.variance < 0 ? 'bad-text' : r.variance > 0 ? 'good-text' : ''}`}>{r.resource.redmineUserId ? fmtSigned(r.variance) : '—'}</td>
                        <td className={`num${r.band === 'over' ? ' bad-text' : r.band === 'under' ? ' warn-text' : ''}`}
                          title={r.utilization == null ? 'No capacity (FTE not set or 0), so no percentage' : undefined}>{fmtPct(r.utilization)}</td>
                        <td className="muted small">{r.resource.redmineUserId && lastSync ? formatDateTime(lastSync.startedAt) : '—'}</td>
                      </tr>
                      {isOpen && (
                        <tr className="selected">
                          <td />
                          <td colSpan={8}>
                            <Breakdown row={r} data={data} periods={periods} filters={filters} />
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
                  <td className="num">{fmtFte(rows.reduce((n, r) => n + r.allocatedFte, 0))}</td>
                  <td className="num">{fmtHours(sum.planned)}</td>
                  <td className="num">{fmtHours(sum.actual)}</td>
                  <td className="num">{fmtSigned(sum.variance)}</td>
                  <td className="num">{fmtPct(sum.utilization)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </section>
          <p className="rm-note">— means there is nothing to compare against: no capacity (FTE not set or 0) or no Redmine user mapped. Totals compute utilization from the summed hours.</p>
        </>
      )}
    </>
  );
}

// One person's weeks (or months) as small cards that wrap, instead of a wide table
function Breakdown({ row, data, periods, filters }) {
  const per = periods.map((b) => ({ b, ...resourceRow(row.resource, data, b, filters) }));
  return (
    <div className="rm-breakdown">
      {per.map(({ b, planned, actual, variance }) => {
        const pct = planned > 0 ? Math.min(100, (actual / planned) * 100) : actual > 0 ? 100 : 0;
        const tone = planned === 0 ? (actual > 0 ? 'var(--warning)' : 'var(--border-strong)') : actual > planned * 1.1 ? 'var(--danger)' : actual < planned * 0.85 ? 'var(--warning)' : 'var(--primary)';
        return (
          <div key={b.start} className="rm-bcard">
            <span className="muted small">{b.label}</span>
            <b>{fmtHours(round(actual))} <span className="muted">/ {fmtHours(planned)}</span></b>
            <span className="rm-util-bar rm-wide"><i style={{ width: `${pct}%`, background: tone }} /></span>
            <span className={`small ${variance < 0 ? 'bad-text' : variance > 0 ? 'good-text' : 'muted'}`}>{fmtSigned(variance)}</span>
          </div>
        );
      })}
    </div>
  );
}
