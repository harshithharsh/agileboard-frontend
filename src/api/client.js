const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options) {
  const res = await fetch(`${BASE}/api${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

const send = (method, path, body) =>
  request(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });

export const api = {
  getFilters: () => request('/filters'),
  syncFromJira: () => request('/sync', { method: 'POST' }),
  getDashboard: ({ teamId, sprintId, assigneeId, quarter }) => {
    const params = new URLSearchParams({ teamId });
    if (sprintId) params.set('sprintId', sprintId);
    if (assigneeId) params.set('assigneeId', assigneeId);
    if (quarter) params.set('quarter', quarter);
    return request(`/dashboard?${params}`);
  },

  // Admin: kind = 'api-keys' | 'users' | 'roles' | 'projects'
  admin: {
    load: () => request('/admin'),
    create: (kind, body) => send('POST', `/admin/${kind}`, body),
    update: (kind, id, body) => send('PUT', `/admin/${kind}/${id}`, body),
    remove: (kind, id) => send('DELETE', `/admin/${kind}/${id}`),
    testApiKey: (id) => send('POST', `/admin/api-keys/${id}/test`),
  },
};
