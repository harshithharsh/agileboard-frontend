import { FilterIcon, ClearIcon } from './Icons.jsx';
import { teamsFor, sprintsFor, assigneesFor, quartersFor } from '../lib/filters.js';


const shortDate = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('Sept', 'Sep');
// '7 Oct' + '20 Oct' -> '7–20 Oct'; across months -> '29 Sep – 6 Oct'
const formatRange = (start, end) => {
  const [d1, m1] = shortDate(start).split(' ');
  const [d2, m2] = shortDate(end).split(' ');
  return m1 === m2 ? `${d1}–${d2} ${m2}` : `${d1} ${m1} – ${d2} ${m2}`;
};

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}{o.disabled ? ' (no sprints)' : ''}</option>)}
      </select>
    </label>
  );
}

export default function FilterBar({ options, filters, onChange, onClear, isDefault }) {
  const teams = teamsFor(options, filters.projectId);
  const releases = options.releases.filter((r) => r.project_id === filters.projectId);
  const sprints = sprintsFor(options, filters);
  const assignees = assigneesFor(options, filters);
  const toOptions = (list) => list.map((x) => ({ value: x.id, label: x.name }));

  // Jira sprint names already say which team they belong to ("Nexus Sprint 2")
  const sprintOptions = sprints.map((s) => ({
    value: s.id,
    label: `${s.name} · ${formatRange(s.start_date, s.end_date)}${s.status === 'active' ? ' (active)' : ''}`,
  }));

  return (
    <section className="card filters">
      <div className="filters-intro">
        <span className="filters-icon"><FilterIcon /></span>
        <div>
          <h2>Filters</h2>
          <p>Select criteria to view insights.</p>
        </div>
      </div>
      <div className="filters-grid">
        <Select label="Project" value={filters.projectId} options={toOptions(options.projects)}
          onChange={(v) => onChange({ projectId: v, teamId: null, quarter: null, releaseId: null, sprintId: null, assigneeId: null })} />
        <Select label="Team" value={filters.teamId} options={toOptions(teams)}
          onChange={(v) => onChange({ teamId: v, quarter: null, sprintId: null, assigneeId: null })} />
        <Select label="Quarter" value={filters.quarter} options={quartersFor(options, filters)}
          onChange={(v) => onChange({ quarter: v, sprintId: null })} />
        <Select label="Sprint" value={filters.sprintId} options={sprintOptions}
          onChange={(v) => onChange({ sprintId: v })} />
        <Select label="Release" value={filters.releaseId} options={toOptions(releases)} placeholder="All"
          onChange={(v) => onChange({ releaseId: v, quarter: null, sprintId: null })} />
        <Select label="Assignee" value={filters.assigneeId} options={toOptions(assignees)} placeholder="All"
          onChange={(v) => onChange({ assigneeId: v })} />
      </div>
      <button className="btn btn-clear" onClick={onClear} disabled={isDefault} title="Reset all filters to their defaults">
        <ClearIcon /> <span>Clear</span>
      </button>
    </section>
  );
}
