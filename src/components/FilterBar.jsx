import { FilterIcon, ClearIcon } from './Icons.jsx';
import { teamsFor, sprintsFor, quartersFor } from '../lib/filters.js';
import { formatDateRange } from '../lib/datetime.js';


function Select({ label, value, onChange, options, placeholder }) {
  const groups = [];
  for (const o of options) {
    const last = groups.at(-1);
    if (last && last.name === o.group) last.items.push(o);
    else groups.push({ name: o.group, items: [o] });
  }
  const render = (o) => <option key={o.value} value={o.value}>{o.label}</option>;
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        {placeholder && <option value="">{placeholder}</option>}
        {groups.map((g, i) => (g.name ? <optgroup key={g.name + i} label={g.name}>{g.items.map(render)}</optgroup> : g.items.map(render)))}
      </select>
    </label>
  );
}

export default function FilterBar({ options, filters, onChange, onClear, isDefault }) {
  const teams = teamsFor(options, filters.projectId);
  const releases = options.releases.filter((r) => r.project_id === filters.projectId);
  const sprints = sprintsFor(options, filters);
  const toOptions = (list) => list.map((x) => ({ value: x.id, label: x.name }));

  // Jira sprint names already say which team they belong to ("Nexus Sprint 2"); running sprints first
  const sprintOptions = [...sprints]
    .sort((a, b) => (b.status === 'active') - (a.status === 'active'))
    .map((s) => ({
      value: s.id,
      label: `${s.name} · ${formatDateRange(s.start_date, s.end_date)}`,
      group: s.status === 'active' ? 'Current sprint' : 'Completed sprints',
    }));

  return (
    <section className="card filters">
      <div className="filters-intro has-tip" tabIndex={0} aria-describedby="filters-hint">
        <span className="filters-icon"><FilterIcon /></span>
        <h2>Filters</h2>
        <span id="filters-hint" role="tooltip" className="tip">Select criteria to view insights.</span>
      </div>
      <div className="filters-grid">
        <Select label="Project" value={filters.projectId} options={toOptions(options.projects)}
          onChange={(v) => onChange({ projectId: v, teamId: null, quarter: null, releaseId: null, sprintId: null })} />
        <Select label="Team" value={filters.teamId} options={toOptions(teams)}
          onChange={(v) => onChange({ teamId: v, quarter: null, sprintId: null })} />
        <Select label="Quarter" value={filters.quarter} options={quartersFor(options, filters)}
          onChange={(v) => onChange({ quarter: v, sprintId: null })} />
        <Select label="Sprint" value={filters.sprintId} options={sprintOptions}
          onChange={(v) => onChange({ sprintId: v })} />
        <Select label="Release" value={filters.releaseId} options={toOptions(releases)} placeholder="All releases"
          onChange={(v) => onChange({ releaseId: v, quarter: null, sprintId: null })} />
      </div>
      <span className="has-tip clear-wrap">
        <button className="icon-btn btn-clear" onClick={onClear} disabled={isDefault} aria-label="Clear filters" aria-describedby="clear-hint">
          <ClearIcon />
        </button>
        <span id="clear-hint" role="tooltip" className="tip tip-right">{isDefault ? 'Filters are already at their defaults' : 'Clear filters'}</span>
      </span>
    </section>
  );
}
