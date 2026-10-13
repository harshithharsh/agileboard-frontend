const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options) {
  const res = await fetch(`${BASE}/api${path}`, { credentials: 'include', ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Session expired or signed out elsewhere: send the user back to the sign-in page
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('auth:required'));
    const err = new Error(body.error || `${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const send = (method, path, body) =>
  request(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });

export const api = {
  auth: {
    me: () => request('/auth/me'),
    login: (username, password) => send('POST', '/auth/login', { username, password }),
    logout: () => send('POST', '/auth/logout'),
  },
  getFilters: () => request('/filters'),
  // Starts a sync in the background (202); syncStatus() tells when it has finished
  syncFromJira: () => request('/sync', { method: 'POST' }),
  syncStatus: () => request('/sync'),
  getDashboard: ({ teamId, sprintId, assigneeId, quarter }) => {
    const params = new URLSearchParams({ teamId });
    if (sprintId) params.set('sprintId', sprintId);
    if (assigneeId) params.set('assigneeId', assigneeId);
    if (quarter) params.set('quarter', quarter);
    return request(`/dashboard?${params}`);
  },

  // Admin: kind = 'users' | 'roles' | 'projects'
  me: {
    preferences: () => request('/me/preferences'),
    savePreferences: (body) => send('PUT', '/me/preferences', body),
  },
  admin: {
    load: () => request('/admin'),
    create: (kind, body) => send('POST', `/admin/${kind}`, body),
    update: (kind, id, body) => send('PUT', `/admin/${kind}/${id}`, body),
    remove: (kind, id) => send('DELETE', `/admin/${kind}/${id}`),
    jiraProjects: () => request('/admin/jira/projects'),
    jiraBoards: (key) => request(`/admin/jira/projects/${encodeURIComponent(key)}/boards`),
  },
};
