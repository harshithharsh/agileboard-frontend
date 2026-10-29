const BASE = import.meta.env.VITE_API_URL || '';

// 502/503/504 = the server could not be reached (e.g. restarting, or the proxy in front of it timed out)
const UNREACHABLE = [502, 503, 504];
const RETRIES = 4; // waits 0.7 + 1.4 + 2.1 + 2.8 s: long enough for a server restart

async function request(path, options, attempt = 0) {
  const res = await fetch(`${BASE}/api${path}`, { credentials: 'include', ...options });
  // Our own server answers errors as JSON (e.g. 502 when sending a test email fails); a proxy does not
  const fromProxy = !(res.headers.get('content-type') || '').includes('application/json');
  if (UNREACHABLE.includes(res.status) && fromProxy) {
    // Reads are safe to repeat: wait a moment and try again. Changes are not repeated automatically.
    const isRead = !options?.method || options.method === 'GET';
    if (isRead && attempt < RETRIES) {
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      return request(path, options, attempt + 1);
    }
    const err = new Error(isRead
      ? 'Can’t reach the AgileMetrix server right now. Please try again in a moment.'
      : 'Can’t reach the AgileMetrix server right now (it may be restarting), so this was not saved. Please try again in a moment.');
    err.status = res.status;
    throw err;
  }
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
  getDashboard: ({ teamId, sprintId, quarter }) => {
    const params = new URLSearchParams({ teamId });
    if (sprintId) params.set('sprintId', sprintId);
    if (quarter) params.set('quarter', quarter);
    return request(`/dashboard?${params}`);
  },

  // Admin: kind = 'users' | 'roles' | 'projects'
  sprints: {
    // outcome: 'met' | 'partly_met' | 'not_met' | null (clear)
    saveGoalOutcome: (sprintId, outcome, note) => send('PUT', `/sprints/${sprintId}/goal-outcome`, { outcome, note }),
  },
  // Workspace date and time format (everyone reads; admins change it in Settings)
  settings: () => request('/settings'),
  me: {
    preferences: () => request('/me/preferences'),
    savePreferences: (body) => send('PUT', '/me/preferences', body),
  },
  // Resource Management (people, FTE, allocations, Redmine hours)
  resources: () => request('/resources'),
  saveResource: (id, body) => send('PUT', `/resources/${id}`, body),
  saveAllocations: (id, allocations) => send('PUT', `/resources/${id}/allocations`, { allocations }),
  admin: {
    load: () => request('/admin'),
    saveSettings: (body) => send('PUT', '/admin/settings', body),
    automation: () => request('/admin/automation'),
    saveAutomation: (body) => send('PUT', '/admin/automation', body),
    testEmail: () => send('POST', '/admin/automation/test-email'),
    create: (kind, body) => send('POST', `/admin/${kind}`, body),
    update: (kind, id, body) => send('PUT', `/admin/${kind}/${id}`, body),
    remove: (kind, id) => send('DELETE', `/admin/${kind}/${id}`),
    jiraProjects: () => request('/admin/jira/projects'),
    // Everyone assignable in the active Jira projects becomes a user (existing users unchanged)
    importJiraUsers: () => send('POST', '/admin/users/import-jira'),
    integrations: () => request('/admin/integrations'),
    holidays: () => request('/admin/holidays'),
    saveHoliday: (date, name) => send('PUT', `/admin/holidays/${date}`, { name }),
    deleteHoliday: (date) => send('DELETE', `/admin/holidays/${date}`),
    redmine: () => request('/admin/redmine'),
    redmineProjects: () => request('/admin/redmine/projects'),
    linkRedmine: (projectId, body) => send('PUT', `/admin/redmine/links/${projectId}`, body),
    unlinkRedmine: (projectId) => send('DELETE', `/admin/redmine/links/${projectId}`),
    redmineSync: () => send('POST', '/admin/redmine/sync'),
    redmineSyncStatus: () => request('/admin/redmine/sync'),
    redmineUsers: () => request('/admin/redmine/users'),
    matchRedmineUser: (id, body) => send('PUT', `/admin/redmine/users/${id}`, body),
    testIntegration: (name) => send('POST', `/admin/integrations/${name}/test`),
    // Jira account email + API token (checked with Jira before saving); empty token keeps the current one
    saveJiraCredentials: (email, token) => send('PUT', '/admin/integrations/jira', { email, token }),
    clearJiraCredentials: () => send('DELETE', '/admin/integrations/jira'),
    // Redmine URL + API key (checked with Redmine before saving); empty key keeps the current one
    saveRedmineCredentials: (url, key) => send('PUT', '/admin/integrations/redmine', { url, key }),
    clearRedmineCredentials: () => send('DELETE', '/admin/integrations/redmine'),
    teamMembers: (teamId) => request(`/admin/teams/${teamId}/members`),
    addTeamMember: (teamId, userId) => send('POST', `/admin/teams/${teamId}/members`, { userId }),
    removeTeamMember: (teamId, userId) => send('DELETE', `/admin/teams/${teamId}/members/${userId}`),
    jiraBoards: (key) => request(`/admin/jira/projects/${encodeURIComponent(key)}/boards`),
  },
};
