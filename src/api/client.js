const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options) {
  const res = await fetch(`${BASE}/api${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getFilters: () => request('/filters'),
  syncFromJira: () => request('/sync', { method: 'POST' }),
  // teamId 'all' = every team in the project combined
  getDashboard: ({ projectId, teamId, sprintId, assigneeId, range, combine }) => {
    const params = new URLSearchParams(teamId === 'all' ? { projectId, combine } : { teamId });
    if (sprintId) params.set('sprintId', sprintId);
    if (assigneeId) params.set('assigneeId', assigneeId);
    if (range) params.set('range', range);
    return request(`/dashboard?${params}`);
  },
};
