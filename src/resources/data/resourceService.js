import { useCallback, useEffect, useState } from 'react';
import { buildDemoData } from './demoData.js';
import { indexEntries } from '../model/calc.js';

// Data access for Resource Management. Every screen goes through this interface, so the demo adapter
// below can be replaced by API calls to the backend (see BACKEND_TODO) without changing the screens.
//
// DEMO ADAPTER: data is generated in the browser and edits are kept in this browser only (localStorage).
// No request is sent to Redmine or to the AgileMetrix server.

export const BACKEND_TODO = [
  'GET/PUT /api/resources, /api/resources/:id/allocations (dated, with history)',
  'GET /api/effort?from&to&team&project&granularity (server-side sums, one row per time entry id)',
  'GET/PUT /api/teams, /api/capacity-rules, /api/holidays, /api/leave',
  'Redmine integration: encrypted API key on the server, users/projects/memberships/time entries sync, mapping tables, sync runs',
];

const STORE_KEY = 'agilemetrix-demo-resources-v1';
const SAVED_KEYS = ['resources', 'allocations', 'teams', 'rules', 'integration', 'redmineProjects', 'history', 'syncRuns', 'leave'];

function load() {
  const base = buildDemoData();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved) for (const k of SAVED_KEYS) if (saved[k]) base[k] = saved[k];
  } catch { /* storage unavailable or corrupt: start from the demo data */ }
  return base;
}

function persist(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(SAVED_KEYS.map((k) => [k, data[k]])))); } catch { /* ignore */ }
}

let store = null;
const listeners = new Set();
const get = () => {
  if (!store) {
    store = load();
    store.entriesByUser = indexEntries(store.entries);
  }
  return store;
};
const commit = (change) => {
  const next = { ...get(), ...change };
  store = next;
  persist(next);
  listeners.forEach((fn) => fn(next));
  return next;
};
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 150)); // feels like a request
const stamp = (by, text) => ({ id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), by, text });

export const resourceService = {
  load: () => delay(get()),

  saveResource(resource, by) {
    const d = get();
    const exists = d.resources.some((r) => r.id === resource.id);
    const resources = exists ? d.resources.map((r) => (r.id === resource.id ? resource : r)) : [...d.resources, resource];
    return delay(commit({ resources, history: [stamp(by, `${exists ? 'Updated' : 'Added'} ${resource.name}`), ...d.history] }));
  },

  // Replace one person's allocations (the drawer computes ended and new rows)
  saveAllocations(resourceId, allocations, by, note) {
    const d = get();
    const name = d.resources.find((r) => r.id === resourceId)?.name;
    return delay(commit({
      allocations: [...d.allocations.filter((a) => a.resourceId !== resourceId), ...allocations],
      history: note ? [stamp(by, `${name}: ${note}`), ...d.history] : d.history,
    }));
  },

  bulkUpdate(ids, patch, by) {
    const d = get();
    return delay(commit({
      resources: d.resources.map((r) => (ids.includes(r.id) ? { ...r, ...patch } : r)),
      history: [stamp(by, `Bulk change for ${ids.length} people`), ...d.history],
    }));
  },

  saveTeam(team, by) {
    const d = get();
    const exists = d.teams.some((t) => t.id === team.id);
    return delay(commit({
      teams: exists ? d.teams.map((t) => (t.id === team.id ? team : t)) : [...d.teams, team],
      history: [stamp(by, `${exists ? 'Updated' : 'Created'} team ${team.name}`), ...d.history],
    }));
  },

  setTeamMembers(teamId, memberIds, by) {
    const d = get();
    return delay(commit({
      resources: d.resources.map((r) => (memberIds.includes(r.id) ? { ...r, teamId } : r.teamId === teamId ? { ...r, teamId: null } : r)),
      history: [stamp(by, `Changed members of ${d.teams.find((t) => t.id === teamId)?.name}`), ...d.history],
    }));
  },

  deleteTeam(teamId, by) {
    const d = get();
    return delay(commit({
      teams: d.teams.filter((t) => t.id !== teamId),
      resources: d.resources.map((r) => (r.teamId === teamId ? { ...r, teamId: null } : r)),
      history: [stamp(by, `Deleted team ${d.teams.find((t) => t.id === teamId)?.name}`), ...d.history],
    }));
  },

  // Map a Redmine user to a resource (null = unmap). One Redmine user per resource.
  mapRedmineUser(redmineUserId, resourceId, by) {
    const d = get();
    const resources = d.resources.map((r) => {
      if (r.id === resourceId) return { ...r, redmineUserId };
      if (r.redmineUserId === redmineUserId) return { ...r, redmineUserId: null };
      return r;
    });
    const ignored = d.integration.ignoredUserIds.filter((id) => id !== redmineUserId);
    return delay(commit({ resources, integration: { ...d.integration, ignoredUserIds: ignored }, history: [stamp(by, 'Changed Redmine user mapping'), ...d.history] }));
  },

  ignoreRedmineUser(redmineUserId, ignore = true) {
    const d = get();
    const ids = new Set(d.integration.ignoredUserIds);
    if (ignore) ids.add(redmineUserId); else ids.delete(redmineUserId);
    return delay(commit({ integration: { ...d.integration, ignoredUserIds: [...ids] } }));
  },

  mapRedmineProject(redmineProjectId, projectId) {
    const d = get();
    return delay(commit({ redmineProjects: d.redmineProjects.map((p) => (p.id === redmineProjectId ? { ...p, mappedProjectId: projectId } : p)) }));
  },

  saveRules(rules, by) {
    const d = get();
    return delay(commit({ rules, history: [stamp(by, 'Changed capacity rules'), ...d.history] }));
  },

  saveIntegration(patch) {
    const d = get();
    return delay(commit({ integration: { ...d.integration, ...patch } }));
  },

  // Demo only: nothing is sent anywhere. A real test needs the backend to call Redmine with the stored key.
  testConnection({ baseUrl }) {
    const ok = /^https:\/\/[^\s/]+\.[^\s/]+/.test(baseUrl || '');
    return delay(ok
      ? { ok: true, demo: true, message: 'Demo mode: the address looks valid, but no request was sent. Testing a real connection needs the backend integration.' }
      : { ok: false, demo: true, message: 'Enter the Redmine address starting with https://' });
  },

  // Demo only: records a sync run without fetching anything
  runSync(by) {
    const d = get();
    const run = { id: `s-${Date.now()}`, startedAt: new Date().toISOString(), status: 'success', entries: d.entries.length, users: d.redmineUsers.length, seconds: 2, message: `Demo sync started by ${by}: no data fetched` };
    return delay(commit({ syncRuns: [run, ...d.syncRuns].slice(0, 20) }));
  },

  reset() {
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    store = null;
    const fresh = get();
    listeners.forEach((fn) => fn(fresh));
    return delay(fresh);
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// Loads the data once and re-renders whenever it changes
export function useResourceData() {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let live = true;
    resourceService.load()
      .then((data) => live && setState({ data, error: null }))
      .catch((e) => live && setState({ data: null, error: e.message }));
    const off = resourceService.subscribe((data) => live && setState({ data, error: null }));
    return () => { live = false; off(); };
  }, []);
  const run = useCallback((fn) => fn(resourceService), []);
  return { ...state, run };
}
