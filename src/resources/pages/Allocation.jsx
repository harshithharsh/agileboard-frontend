import { useMemo, useState } from 'react';
import { Filters, PageHead, InfoTip, UtilBar, IssuePills, Person, Empty, fmtHours, fmtFte } from '../components/ui.jsx';
import { selectRows, totals, teamName, projectName, redmineLogin } from '../model/select.js';
import { DEFINITIONS, inEffect, weeklyHours, round, EPSILON } from '../model/calc.js';
import { downloadCsv } from '../../lib/download.js';
import { openSettings } from '../../lib/route.js';
import AllocationDrawer from '../components/AllocationDrawer.jsx';
import { BulkDialog } from '../components/ResourceDialogs.jsx';

const STATUS_FILTERS = [
  ['all', 'All'], ['attention', 'Needs attention'], ['overallocated', 'Over-allocated'], ['missing-fte', 'FTE not set'], ['unmapped', 'Not mapped'], ['no-team', 'No team'],
];

// Resource allocation and FTE: who works on what, how much, and what needs fixing
export default function Allocation({ data, filters, setFilters, period, access }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null); // resource id
  const [bulk, setBulk] = useState(false);

  const all = useMemo(() => selectRows(data, period, filters, { search }), [data, period, filters, search]);
  const count = (key) => (key === 'all' ? all.length : key === 'attention' ? all.filter((r) => r.issues.length).length : all.filter((r) => r.issues.includes(key)).length);
  const rows = all.filter((r) => status === 'all' || (status === 'attention' ? r.issues.length : r.issues.includes(status)));
  const sum = totals(rows);
  const today = data.today;

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.resource.id));
  const exportCsv = () => downloadCsv([
    ['Resource', 'Email', 'Redmine user', 'Team', 'Project allocation', 'Allocated FTE', 'Employment FTE', 'Weekly capacity (h)', 'Planned (h)', 'Actual (h)', 'Utilization %', 'Status'],
    ...rows.map(({ resource: r, ...x }) => [r.name, r.email, redmineLogin(data, r.redmineUserId) ?? '', teamName(data, r.teamId) ?? '',
      currentAllocs(data, r.id, today).map((a) => `${projectName(data, a.projectId)} ${fmtFte(a.fte)}`).join('; '),
      x.allocatedFte, r.employmentFte ?? '', r.employmentFte == null ? '' : round(weeklyHours(r, data.rules) * r.employmentFte), x.planned, x.actual, x.utilization ?? '', x.issues.join(' ') || 'ok']),
  ], `agilemetrix-resource-allocation-${period.start}-${period.end}.csv`);

  return (
    <>
      <PageHead title="Resource allocation"
        sub="Who works on what, and how much. Employment FTE is each person’s total capacity; project allocations split it. Hours are for the selected period.">
        <button className="btn" onClick={exportCsv}>Export CSV</button>
      </PageHead>

      <Filters filters={filters} setFilters={setFilters} data={data} period={period}>
        <label className="rm-field rm-search">
          <span>Search</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or Redmine user" />
        </label>
      </Filters>

      <div className="rm-chips" role="group" aria-label="Show">
        {STATUS_FILTERS.map(([key, label]) => (
          <button key={key} className={`rm-chip${status === key ? ' on' : ''}`} aria-pressed={status === key} onClick={() => setStatus(key)}>
            {label} <span>{count(key)}</span>
          </button>
        ))}
      </div>

      {access.canEdit && selected.size > 0 && (
        <div className="card rm-bulk" role="region" aria-label="Bulk actions">
          <b>{selected.size} selected</b>
          <button className="btn" onClick={() => setBulk(true)}>Change team or FTE…</button>
          <button className="btn rm-push" onClick={() => setSelected(new Set())}>Clear selection</button>
        </div>
      )}

      {!rows.length ? (
        <Empty title="No one matches these filters">Clear the search or pick another team, project or status.</Empty>
      ) : (
        <section className="card rm-table-card">
          <table className="rm-table">
            <thead>
              <tr>
                {access.canEdit && (
                  <th className="rm-check"><input type="checkbox" aria-label="Select all" checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.resource.id)))} /></th>
                )}
                <th>Resource</th>
                <th>Redmine user</th>
                <th>Team</th>
                <th>Project allocation</th>
                <th className="num">FTE <InfoTip text={DEFINITIONS.fte} /></th>
                <th className="num">Weekly capacity</th>
                <th className="num">Planned / actual <InfoTip text={`${DEFINITIONS.planned} ${DEFINITIONS.actual}`} /></th>
                <th>Utilization <InfoTip text={DEFINITIONS.utilization} /></th>
                <th className="num">Available</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const r = row.resource;
                const allocs = currentAllocs(data, r.id, today);
                const free = r.employmentFte == null ? null : round(r.employmentFte - row.allocatedFte, 3);
                const login = redmineLogin(data, r.redmineUserId);
                return (
                  <tr key={r.id} className={selected.has(r.id) ? 'selected' : ''}>
                    {access.canEdit && <td className="rm-check"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} /></td>}
                    <td><Person resource={r} sub={r.email} /></td>
                    <td>{login ? <span className="mono small">{login}</span> : access.canAdmin ? <button type="button" className="link-btn small strong" onClick={() => openSettings('redmine')}>Map user</button> : <span className="muted small">Not mapped</span>}</td>
                    <td>{teamName(data, r.teamId) ?? <span className="muted">—</span>}</td>
                    <td>
                      {allocs.length
                        ? <span className="rm-allocs">{allocs.map((a) => <span key={a.id}>{projectName(data, a.projectId)} {fmtFte(a.fte)}</span>)}</span>
                        : <span className="muted small">No allocation</span>}
                    </td>
                    <td className="num">
                      {r.employmentFte == null
                        ? <span className="warn-text">Not set</span>
                        : <><b className={row.issues.includes('overallocated') ? 'bad-text' : ''}>{fmtFte(row.allocatedFte)}</b> <span className="muted">/ {fmtFte(r.employmentFte)}</span></>}
                    </td>
                    <td className="num">{r.employmentFte == null ? '—' : fmtHours(round(weeklyHours(r, data.rules) * r.employmentFte))}</td>
                    <td className="num">{fmtHours(row.planned)} / {r.redmineUserId ? fmtHours(row.actual) : <span className="muted">—</span>}</td>
                    <td>{r.redmineUserId ? <UtilBar pct={row.utilization} band={row.band} /> : <span className="muted small">— not mapped</span>}</td>
                    <td className={`num${free < -EPSILON ? ' bad-text' : free > EPSILON ? ' good-text' : ' muted'}`}>{free == null ? '—' : fmtFte(free)}</td>
                    <td><IssuePills issues={row.issues} /></td>
                    <td className="rm-actions">
                      <button className="btn btn-sm" onClick={() => setEditing(r.id)}>{!access.canEdit ? 'View' : r.employmentFte == null ? 'Set FTE' : 'Edit'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                {access.canEdit && <td />}
                <td colSpan={4}>{rows.length} of {data.resources.length} people</td>
                <td className="num">{fmtFte(rows.reduce((n, r) => n + r.allocatedFte, 0))} / {fmtFte(rows.reduce((n, r) => n + (r.resource.employmentFte ?? 0), 0))}</td>
                <td />
                <td className="num">{fmtHours(sum.planned)} / {fmtHours(sum.actual)}</td>
                <td>{sum.utilization == null ? '—' : `${sum.utilization}%`}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </section>
      )}
      <p className="rm-note">{access.canEdit
        ? 'Changes take effect from the date you choose, so earlier periods keep their numbers. Every change is kept in the history.'
        : 'You can view allocations. Changing FTE needs the Edit permission.'}</p>

      {editing && <AllocationDrawer resource={data.resources.find((r) => r.id === editing)} data={data} period={period} access={access} onClose={() => setEditing(null)} />}
      {bulk && <BulkDialog data={data} ids={[...selected]} access={access} onClose={() => setBulk(false)} onDone={() => { setBulk(false); setSelected(new Set()); }} />}
    </>
  );
}

// Allocations in effect today or starting later
export const currentAllocs = (data, resourceId, today) =>
  data.allocations.filter((a) => a.resourceId === resourceId && (inEffect(a, today) || a.startDate > today))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
