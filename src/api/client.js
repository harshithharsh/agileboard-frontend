const BASE = import.meta.env.VITE_API_URL || '';

async function request(path) {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getFilters: () => request('/filters'),
  getDashboard: ({ teamId, sprintId, assigneeId, range }) => {
    const params = new URLSearchParams({ teamId });
    if (sprintId) params.set('sprintId', sprintId);
    if (assigneeId) params.set('assigneeId', assigneeId);
    if (range) params.set('range', range);
    return request(`/dashboard?${params}`);
  },
};
