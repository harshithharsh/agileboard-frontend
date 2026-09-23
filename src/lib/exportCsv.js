// Builds a CSV of the dashboard's headline numbers and triggers a download.
export function exportDashboardCsv(data) {
  const { context, summary, health, flow, quality, compliance } = data;
  const rows = [
    ['AgileBoard sprint report'],
    ['Project', context.project.name],
    ['Team', context.team.name],
    ['Sprint', context.sprint.name],
    ['Release', context.sprint.release || ''],
    ['Generated', context.generatedAt],
    [],
    ['Metric', 'Current', 'Prior', 'Target', 'Status'],
    ...summary.map((s) => [s.label, s.value, s.prior ?? '', s.target, s.status]),
    [],
    ['Health metric', 'Current', 'Target', 'Status'],
    ...health.map((h) => [h.label, h.value, h.targetLabel, h.status]),
    [],
    ['Flow', 'Value'],
    ['Cycle time avg (days)', flow.cycleTime.avg],
    ['Cycle time median (days)', flow.cycleTime.median],
    ['Cycle time P85 (days)', flow.cycleTime.p85],
    ['Throughput (items)', flow.throughput.current],
    ['WIP / limit', `${flow.wip.current} / ${flow.wip.limit}`],
    ['Blocked items', flow.blocked.items],
    [],
    ['Quality', 'Value'],
    ['Defects created', quality.current.created],
    ['Defects closed', quality.current.closed],
    ['Defects open', quality.current.open],
    [],
    ['Process compliance', '%'],
    ...Object.entries(compliance).map(([k, v]) => [k, v]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `agileboard-${context.team.name}-${context.sprint.name}.csv`.toLowerCase();
  a.click();
  URL.revokeObjectURL(url);
}
