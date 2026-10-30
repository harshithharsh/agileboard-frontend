import { STATUS_LABEL } from './format.js';
import { slug, downloadCsv } from './download.js';

const COMPLIANCE_LABELS = {
  dor: 'Definition of Ready',
  dod: 'Definition of Done',
  acceptanceCriteria: 'Acceptance Criteria',
  codeReview: 'Code Review',
  testCases: 'Test Case Completion',
  automation: 'Automation Coverage',
};

// Builds a CSV of the dashboard's headline numbers and triggers a download.
export function exportDashboardCsv(data) {
  const { context, summary, health, flow, quality, compliance } = data;
  const rows = [
    ['AgileMetrix Sprint Report'],
    ['Project', context.project.name],
    ['Squad', context.team.name],
    ['Sprint', context.sprint.name],
    ['Release', context.sprint.release || ''],
    ['Generated', context.generatedAt],
    [],
    ['Metric', 'Current', 'Prior', 'Target', 'Status'],
    ...summary.map((s) => [s.label, s.value, s.prior ?? '', s.target, STATUS_LABEL[s.status] ?? s.status]),
    [],
    ['Health Metric', 'Current', 'Target', 'Status'],
    ...health.map((h) => [h.label, h.value, h.targetLabel, STATUS_LABEL[h.status] ?? h.status]),
    [],
    ['Flow', 'Value'],
    ['Cycle Time Average (Days)', flow.cycleTime.avg],
    ['Cycle Time Median (Days)', flow.cycleTime.median],
    ['Cycle Time 85th Percentile (Days)', flow.cycleTime.p85],
    ['Throughput (Items)', flow.throughput.current],
    ['WIP / Limit', `${flow.wip.current} / ${flow.wip.limit}`],
    ['Blocked Items', flow.blocked.items],
    [],
    ['Quality', 'Value'],
    ['Defects Created', quality.current.created],
    ['Defects Closed', quality.current.closed],
    ['Defects Open', quality.current.open],
    [],
    ['Process Compliance', '%'],
    ...Object.entries(compliance).map(([k, v]) => [COMPLIANCE_LABELS[k] ?? k, v ?? 'Not tracked in Jira']),
  ];
  downloadCsv(rows, `agilemetrix-${slug(context.team.name)}-${slug(context.sprint.name)}.csv`);
}
