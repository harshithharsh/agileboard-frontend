// Dashboard widgets: default order and width. Each user can rearrange, resize and hide them;
// the saved layout is [{ id, size, hidden }] (see /api/me/preferences).
export const WIDGETS = [
  { id: 'summary', title: 'Sprint Executive Summary', size: 'full' },
  { id: 'sprint-goal', title: 'Sprint Goal', size: 'full' },
  { id: 'committed', title: 'Committed vs. Completed Story Points', size: 'half' },
  { id: 'velocity', title: 'Velocity Trend', size: 'half' },
  { id: 'business-value', title: 'Completion and Business Value', size: 'full' },
  { id: 'flow', title: 'Flow Metrics', size: 'full' },
  { id: 'cycle-time', title: 'Cycle Time Trend', size: 'full' },
  { id: 'scope', title: 'Scope Movement by Sprint', size: 'half' },
  { id: 'quality', title: 'Quality', size: 'half' },
  { id: 'issue-types', title: 'Issues by Type', size: 'half' },
  { id: 'defect-rate', title: 'Defect Rate and Defect Density', size: 'half' },
  { id: 'health', title: 'Sprint Health', size: 'full' },
  { id: 'burndown', title: 'Sprint Burndown', size: 'half' },
  { id: 'compliance', title: 'Process Compliance', size: 'half' },
];

export const DEFAULT_LAYOUT = WIDGETS.map(({ id, size }) => ({ id, size, hidden: false }));
export const widgetTitle = (id) => WIDGETS.find((w) => w.id === id)?.title ?? id;

// Saved layout -> current widgets: drop widgets that no longer exist, add new ones at the end
export function normalizeLayout(saved) {
  if (!Array.isArray(saved)) return DEFAULT_LAYOUT;
  const known = new Set(WIDGETS.map((w) => w.id));
  const seen = new Set();
  const layout = [];
  for (const w of saved) {
    if (!known.has(w?.id) || seen.has(w.id)) continue;
    seen.add(w.id);
    layout.push({ id: w.id, size: w.size === 'full' ? 'full' : 'half', hidden: w.hidden === true });
  }
  // New widgets go right after the widget they follow in the default layout
  DEFAULT_LAYOUT.forEach((w, i) => {
    if (seen.has(w.id)) return;
    const before = DEFAULT_LAYOUT.slice(0, i).reverse().find((d) => seen.has(d.id));
    layout.splice(before ? layout.findIndex((l) => l.id === before.id) + 1 : 0, 0, w);
    seen.add(w.id);
  });
  return layout;
}

export const sameLayout = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function moveWidget(layout, fromId, toId) {
  const from = layout.findIndex((w) => w.id === fromId);
  const to = layout.findIndex((w) => w.id === toId);
  if (from < 0 || to < 0 || from === to) return layout;
  const next = [...layout];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Move one step among the visible widgets (hidden ones keep their place)
export function stepWidget(layout, id, dir) {
  const visible = layout.filter((w) => !w.hidden);
  const i = visible.findIndex((w) => w.id === id);
  const target = visible[i + dir];
  return target ? moveWidget(layout, id, target.id) : layout;
}

export const updateWidget = (layout, id, patch) => layout.map((w) => (w.id === id ? { ...w, ...patch } : w));
