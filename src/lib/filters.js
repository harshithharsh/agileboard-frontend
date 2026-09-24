// Which teams, sprints and assignees belong to the current filter selection.

export const teamsFor = (options, projectId) => options.teams.filter((t) => t.project_id === projectId);

// Calendar quarter a sprint belongs to, by its start date: '2026-07-29' -> '2026-Q3'
export const quarterOf = (date) => `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;

const QUARTER_MONTHS = { 1: 'Jan – Mar', 2: 'Apr – Jun', 3: 'Jul – Sep', 4: 'Oct – Dec' };
export const quarterLabel = (key) => {
  const [year, q] = key.split('-Q');
  return `Q${q} ${year} · ${QUARTER_MONTHS[q]}`;
};

const teamSprints = (options, { teamId, releaseId }) =>
  options.sprints.filter((s) => s.team_id === teamId && (!releaseId || s.release_id === releaseId));

// Q1–Q4 for every year the team has sprints in, newest first; quarters without sprints are disabled.
export function quartersFor(options, filters) {
  const withSprints = new Set(teamSprints(options, filters).map((s) => quarterOf(s.start_date)));
  const years = [...new Set([...withSprints].map((k) => k.slice(0, 4)))].sort().reverse();
  return years.flatMap((year) =>
    [4, 3, 2, 1].map((q) => {
      const key = `${year}-Q${q}`;
      return { value: key, label: `Q${q} ${year}`, disabled: !withSprints.has(key) };
    })
  );
}

// Sprints of the selected team in the selected quarter (and release), newest first.
export const sprintsFor = (options, filters) =>
  teamSprints(options, filters).filter((s) => !filters.quarter || quarterOf(s.start_date) === filters.quarter);

export const assigneesFor = (options, { teamId }) => options.assignees.filter((a) => a.team_id === teamId);

// Fill in defaults whenever a parent filter is cleared: first project, its first team,
// the quarter of the team's latest sprint, and the latest sprint in that quarter.
export function resolveFilters(filters, options) {
  const next = { ...filters };
  next.projectId ??= options.projects[0]?.id ?? null;
  next.teamId ??= teamsFor(options, next.projectId)[0]?.id ?? null;
  const latest = teamSprints(options, next)[0];
  next.quarter ??= latest ? quarterOf(latest.start_date) : null;
  next.sprintId ??= sprintsFor(options, next)[0]?.id ?? null;
  return next;
}
