import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { indexEntries, withDefaultPlan } from '../model/calc.js';

// Data access for Resource Management. Every screen goes through this interface.
// GET /api/resources returns people (Jira team members and matched Redmine people), their FTE and
// allocations, the Jira teams and projects, and the Redmine time entries imported in
// Settings → Integrations → Redmine. Calculations happen in ../model on this data.

let store = null;
let loading = null;
let seenVersion; // Settings changes counter last seen (see syncVersion)
const listeners = new Set();

async function fetchData() {
  const data = await api.resources();
  data.entriesByUser = indexEntries(data.entries);
  // Screens use `allocations` (with the default plan from FTE); the drawer edits `savedAllocations`
  data.savedAllocations = data.allocations;
  data.allocations = withDefaultPlan(data.resources, data.savedAllocations, data.teams);
  store = data;
  listeners.forEach((fn) => fn(data));
  return data;
}
// Reload after every change, so all screens see the saved state
const reload = () => fetchData();

export const resourceService = {
  load: () => (store ? Promise.resolve(store) : (loading ??= fetchData().finally(() => { loading = null; }))),
  reload,
  // Called with the Settings changes counter: data loaded before a change is fetched again
  syncVersion(version) {
    if (seenVersion !== undefined && version !== seenVersion && store) reload().catch(() => {});
    seenVersion = version;
  },

  // Employment FTE, weekly hours, team and Redmine person of one person
  async saveResource(resource) {
    await api.saveResource(resource.id, {
      employmentFte: resource.employmentFte, weeklyHours: resource.weeklyHours, teamId: resource.teamId, redmineUserId: resource.redmineUserId,
    });
    return reload();
  },

  // Replace one person's allocations (the drawer computes ended and new rows)
  async saveAllocations(resourceId, allocations) {
    await api.saveAllocations(resourceId, allocations);
    return reload();
  },

  async bulkUpdate(ids, patch) {
    for (const id of ids) {
      const r = store.resources.find((x) => x.id === id);
      if (r) await api.saveResource(id, { employmentFte: r.employmentFte, weeklyHours: r.weeklyHours, teamId: r.teamId, ...patch });
    }
    return reload();
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// Loads the data once and re-renders whenever it changes
export function useResourceData() {
  const [state, setState] = useState({ data: store, error: null });
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
