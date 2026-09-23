// Which teams, sprints and assignees belong to the current filter selection.
// teamId === ALL_TEAMS means every team in the project combined.
export const ALL_TEAMS = 'all';

export const teamsFor = (options, projectId) => options.teams.filter((t) => t.project_id === projectId);

// In the all-teams view a "sprint" is a period: the teams' sprints that started on the same day.
// Both lists arrive newest first.
export function sprintsFor(options, { projectId, teamId, releaseId }) {
  if (teamId === ALL_TEAMS) {
    return options.periods.filter(
      (p) => p.project_id === projectId && (!releaseId || p.release_ids.includes(releaseId))
    );
  }
  return options.sprints.filter((s) => s.team_id === teamId && (!releaseId || s.release_id === releaseId));
}

export function assigneesFor(options, { projectId, teamId }) {
  const teamIds = teamId === ALL_TEAMS ? teamsFor(options, projectId).map((t) => t.id) : [teamId];
  const seen = new Set();
  return options.assignees.filter((a) => teamIds.includes(a.team_id) && !seen.has(a.id) && seen.add(a.id));
}

// Fill in defaults whenever a parent filter is cleared: first project, all teams when the
// project has several (otherwise its only team), and the latest sprint.
export function resolveFilters(filters, options) {
  const next = { ...filters };
  next.projectId ??= options.projects[0]?.id ?? null;
  const teams = teamsFor(options, next.projectId);
  next.teamId ??= teams.length > 1 ? ALL_TEAMS : teams[0]?.id ?? null;
  next.sprintId ??= sprintsFor(options, next)[0]?.id ?? null;
  return next;
}
