const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  getProjects: () => request('/projects'),
  getBoard: (projectId) => request(`/projects/${projectId}/board`),
  updateIssue: (id, data) => request(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
