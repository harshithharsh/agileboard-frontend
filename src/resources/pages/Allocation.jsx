import { useMemo, useState } from 'react';
import { Filters, PageHead, InfoTip, Person, Empty, SortTh, sortBy, fmtHours, fmtFte } from '../components/ui.jsx';
import { selectRows, teamName, projectName, redmineLogin, scopeProject, scopedFte } from '../model/select.js';
import { DEFINITIONS, inEffect, weeklyHours, round, EPSILON } from '../model/calc.js';
import { downloadCsv } from '../../lib/download.js';
import AllocationDrawer from '../components/AllocationDrawer.jsx';
import { BulkDialog } from '../components/ResourceDialogs.jsx';
import { SlidersIcon } from '../../components/Icons.jsx';

const STATUS_FILTERS = [
  ['all', 'All'], ['attention', 'Needs attention'], ['overallocated', 'Over-allocated'], ['missing-fte', 'FTE not set'], ['unmapped', 'Not mapped'], ['no-team', 'No squad'],
];

// Resource allocation and FTE: who works on what, how much, and what needs fixing
// `embedded`: shown as a Settings tab
export default function Allocation({ data, filters, setFilters, period, access, embedded = false }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState({ key: 'name', dir: 1 });
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null); // resource id
  const [bulk, setBulk] = useState(false);

  // Numbers are for one project (scopeProject): FTE and weekly capacity use it.
  // Available FTE always uses the person's total.
  const scope = scopeProject(data, filters);
  const all = useMemo(() => selectRows(data, period, { ...filters, projectId: scope }, { search }), [data, period, filters, scope, search]);
  const count = (key) => (key === 'all' ? all.length : key === 'attention' ? all.filter((r) => r.issues.length).length : all.filter((r) => r.issues.includes(key)).length);
  const fteShown = (row) => scopedFte(data, row, scope, period.asOf);
  const rows = sortBy(all.filter((r) => status === 'all' || (status === 'attention' ? r.issues.length : r.issues.includes(status))), sort, {
    name: (r) => r.resource.name,
    team: (r) => teamName(data, r.resource.teamId),
    fte: (r) => (r.resource.employmentFte == null ? null : fteShown(r)),
    available: (r) => availableFte(r.allocatedFte),
    capacity: (r) => (r.resource.employmentFte == null ? null : weeklyHours(r.resource, data.rules) * fteShown(r)),
  });
  const today = data.today;

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.resource.id));
  const exportCsv = () => downloadCsv([
    ['Resource', 'Email', 'Redmine user', 'Squad', 'Project allocation', 'Allocated FTE', 'Employment FTE', 'Weekly capacity (h)', 'Planned (h)', 'Actual (h)', 'Utilization %', 'Available FTE', 'Status'],
    ...rows.map(({ resource: r, ...x }) => [r.name, r.email, redmineLogin(data, r.redmineUserId) ?? '', teamName(data, r.teamId) ?? '',
      currentAllocs(data, r.id, today).map((a) => `${projectName(data, a.projectId)} ${fmtFte(a.fte)}`).join('; '),
      fteShown({ resource: r, ...x }), r.employmentFte ?? '', r.employmentFte == null ? '' : round(weeklyHours(r, data.rules) * fteShown({ resource: r, ...x })), x.planned, x.actual, x.utilization ?? '', availableFte(x.allocatedFte), x.issues.join(' ') || 'ok']),
  ], `agilemetrix-resource-allocation-${period.start}-${period.end}.csv`);

  // In Settings the page is one card headed like the other Settings cards
  const Wrap = embedded ? 'section' : 'div';
  return (
    <Wrap className={embedded ? 'admin-card rm-embedded' : 'rm-page'}>
      {embedded ? (
        <div className="admin-card-head no-subtitle">
          <span className="admin-card-icon tone-blue"><SlidersIcon /></span>
          <div className="admin-card-titles"><h2>Resource allocation<span className="admin-count">{data.resources.length}</span></h2></div>
          <button className="btn" onClick={exportCsv}>Export CSV</button>
        </div>
      ) : (
        <PageHead title="Resource allocation">
          <button className="btn" onClick={exportCsv}>Export CSV</button>
        </PageHead>
      )}

      <Filters filters={filters} setFilters={setFilters} data={data} period={period}>
        <label className="filter filter-search">
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
          <button className="btn" onClick={() => setBulk(true)}>Change squad or FTE…</button>
          <button className="btn rm-push" onClick={() => setSelected(new Set())}>Clear selection</button>
        </div>
      )}

      {!rows.length ? (
        <Empty title="No one matches these filters">Clear the search or pick another squad, project or status.</Empty>
      ) : (
        <section className="card rm-table-card">
          <table className="rm-table">
            <thead>
              <tr>
                {access.canEdit && (
                  <th className="rm-check"><input type="checkbox" aria-label="Select all" checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.resource.id)))} /></th>
                )}
                <SortTh label="Resource" field="name" sort={sort} setSort={setSort} />
                <SortTh label="Squad" field="team" sort={sort} setSort={setSort} />
                <th>Project allocation</th>
                <SortTh label="FTE" field="fte" sort={sort} setSort={setSort} className="num"> <InfoTip text={DEFINITIONS.fte} /></SortTh>
                <SortTh label="Available FTE" field="available" sort={sort} setSort={setSort} className="num"> <InfoTip text="What is left of one full-time person (1.00 FTE) after the FTE planned here. Red when more than 1.00 is planned." /></SortTh>
                <SortTh label="Weekly capacity" field="capacity" sort={sort} setSort={setSort} className="num" />
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const r = row.resource;
                // A team is selected: only the chip of the project the numbers are for; all teams: every project
                const allocs = currentAllocs(data, r.id, today).filter((a) => !filters.teamId || filters.teamId === 'none' || a.projectId === scope);
                const free = availableFte(row.allocatedFte);
                return (
                  <tr key={r.id} className={selected.has(r.id) ? 'selected' : ''}>
                    {access.canEdit && <td className="rm-check"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} /></td>}
                    <td><Person resource={r} /></td>
                    <td>{teamName(data, r.teamId) ?? <span className="muted">—</span>}</td>
                    <td>
                      {allocs.length
                        ? <span className="rm-allocs">{allocs.map((a) => <span key={a.id} title={a.isDefault ? 'The whole FTE on the squad’s project (not split across projects)' : undefined}>{projectName(data, a.projectId)} {fmtFte(a.fte)}</span>)}</span>
                        : <span className="muted small">No allocation</span>}
                    </td>
                    <td className="num">
                      {r.employmentFte == null
                        ? <span className="warn-text">Not set</span>
                        : <b className={row.issues.includes('overallocated') ? 'bad-text' : ''}>{fmtFte(fteShown(row))}</b>}
                    </td>
                    <td className={`num${free < -EPSILON ? ' bad-text' : free > EPSILON ? ' good-text' : ' muted'}`}>{fmtFte(free)}</td>
                    <td className="num">{r.employmentFte == null ? '—' : fmtHours(round(weeklyHours(r, data.rules) * fteShown(row)))}</td>
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
                <td colSpan={3}>{rows.length} of {data.resources.length} people</td>
                <td className="num">{fmtFte(round(rows.reduce((n, r) => n + fteShown(r), 0), 3))}</td>
                <td className="num">{fmtFte(round(rows.reduce((n, r) => n + availableFte(r.allocatedFte), 0), 3))}</td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {editing && <AllocationDrawer resource={data.resources.find((r) => r.id === editing)} data={data} period={period} access={access} onClose={() => setEditing(null)} />}
      {bulk && <BulkDialog data={data} ids={[...selected]} access={access} onClose={() => setBulk(false)} onDone={() => { setBulk(false); setSelected(new Set()); }} />}
    </Wrap>
  );
}

// Allocations in effect today or starting later
export const currentAllocs = (data, resourceId, today) =>
  data.allocations.filter((a) => a.resourceId === resourceId && (inEffect(a, today) || a.startDate > today))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

// Available FTE: what is left of one full-time person (1.00 FTE) after the FTE planned
const availableFte = (allocatedFte) => round(1 - allocatedFte, 3);
