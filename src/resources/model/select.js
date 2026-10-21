import { resourceRow, totals } from './calc.js';

// People in scope for the current filters, with their numbers for the period.
// Team: a team id, 'none' (no team) or null (everyone). Project: only people planned on it or logging on it.
export function selectRows(data, period, filters, extra = {}) {
  const rows = data.resources
    .filter((r) => !filters.teamId || (filters.teamId === 'none' ? !r.teamId : r.teamId === filters.teamId))
    .map((r) => resourceRow(r, data, period, filters))
    .filter((row) => !filters.projectId || row.planned > 0 || row.actual > 0
      || data.allocations.some((a) => a.resourceId === row.resource.id && a.projectId === filters.projectId));
  const q = (extra.search ?? '').trim().toLowerCase();
  const user = (id) => data.redmineUsers.find((u) => u.id === id);
  return q
    ? rows.filter(({ resource: r }) => [r.name, r.email, user(r.redmineUserId)?.login, user(r.redmineUserId)?.name].some((v) => v?.toLowerCase().includes(q)))
    : rows;
}

export { totals };

export const teamName = (data, id) => data.teams.find((t) => t.id === id)?.name ?? null;
export const projectName = (data, id) => data.projects.find((p) => p.id === id)?.name ?? id;
// Redmine account shown for a person: login when known, otherwise the Redmine name
export const redmineLogin = (data, id) => { const u = data.redmineUsers.find((x) => x.id === id); return u ? (u.login ?? u.name) : null; };

// Redmine users not linked to any resource (and not ignored), with their hours in the period
// (on one project when projectId is given; people with no hours there are left out)
export function unmappedUsers(data, period, projectId = null) {
  const mapped = new Set(data.resources.map((r) => r.redmineUserId).filter(Boolean));
  return data.redmineUsers
    .filter((u) => !mapped.has(u.id) && !data.integration.ignoredUserIds.includes(u.id))
    .map((u) => ({
      user: u,
      hours: Math.round((data.entriesByUser.get(u.id) ?? [])
        .filter((e) => e.date >= period.start && e.date <= period.end && data.rules.eligibleActivities.includes(e.activity) && (!projectId || e.projectId === projectId))
        .reduce((n, e) => n + e.hours, 0) * 10) / 10,
    }))
    .filter((u) => !projectId || u.hours > 0);
}
