import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client.js';
import { exportDashboardCsv } from './lib/exportCsv.js';
import { STATUS_LABEL, formatDateTime } from './lib/format.js';
import Header from './components/Header.jsx';
import FilterBar from './components/FilterBar.jsx';
import { Section, Card, StatusPill } from './components/Section.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import FlowMetrics from './components/FlowMetrics.jsx';
import HealthTable from './components/HealthTable.jsx';
import Compliance from './components/Compliance.jsx';
import DeliveryChart from './components/charts/DeliveryChart.jsx';
import VelocityChart from './components/charts/VelocityChart.jsx';
import ScopeChart from './components/charts/ScopeChart.jsx';
import DefectChart from './components/charts/DefectChart.jsx';
import BurndownChart from './components/charts/BurndownChart.jsx';
import BusinessValueChart from './components/charts/BusinessValueChart.jsx';
import DefectRateChart from './components/charts/DefectRateChart.jsx';
import { resolveFilters, quarterLabel } from './lib/filters.js';

const EMPTY_FILTERS = { projectId: null, teamId: null, quarter: null, releaseId: null, sprintId: null, assigneeId: null };

export default function App() {
  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [error, setError] = useState(null);

  const loadFilters = useCallback(
    () =>
      api.getFilters()
        .then((opts) => {
          setOptions(opts);
          setFilters((f) => resolveFilters(f, opts));
        })
        .catch((e) => setError(e.message)),
    []
  );

  useEffect(() => { loadFilters(); }, [loadFilters]);

  const load = useCallback(() => {
    if (!filters.teamId) return;
    setLoading(true);
    setError(null);
    api.getDashboard(filters)
      .then(setData)
      .catch((e) => {
        setData(null);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(load, [load]);

  // Refresh = pull the latest sprints and issues from Jira, then reload the view
  const refresh = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await api.syncFromJira();
    } catch (e) {
      setSyncError(e.message);
    } finally {
      setSyncing(false);
    }
    await loadFilters();
    load();
  };

  const updateFilters = (patch) => setFilters((f) => resolveFilters({ ...f, ...patch }, options));
  const defaultFilters = options ? resolveFilters(EMPTY_FILTERS, options) : EMPTY_FILTERS;
  const isDefault = Object.keys(EMPTY_FILTERS).every((k) => filters[k] === defaultFilters[k]);
  const clearFilters = () => setFilters(defaultFilters);

  return (
    <div className="app">
      <Header context={data?.context} loading={loading || syncing} syncing={syncing} onRefresh={refresh} onExport={() => data && exportDashboardCsv(data)} />
      <main className={loading ? 'is-loading' : ''}>
        {options && <FilterBar options={options} filters={filters} onChange={updateFilters} onClear={clearFilters} isDefault={isDefault} />}
        {syncError && <div className="card warning">Could not sync from Jira: {syncError}. Showing the last synced data.</div>}
        {error && (
          <div className={`card ${/no sprints/i.test(error) ? 'empty' : 'error'}`}>
            {/no sprints/i.test(error) ? 'No sprints synced for this team yet. Click Refresh to pull them from Jira.' : `Could not load the dashboard: ${error}`}
          </div>
        )}
        {options && !options.sprints.length && !error && (
          <div className="card empty">No sprints yet. Click <b>Refresh</b> (or run <code>npm run sync</code> in the backend) to pull sprints from Jira.</div>
        )}
        {!data && !error && options?.sprints.length > 0 && <div className="card empty">Loading dashboard…</div>}

        {data && (
          <>
            <Section number={1} title="Sprint Executive Summary" aside={`Current view: ${data.context.team.name} · ${data.context.sprint.name}`}>
              <SummaryCards summary={data.summary} velocityBand={data.velocityBand} />
            </Section>

            <Section number={2} title="Sprint Delivery" aside={data.context.quarter
              ? `${quarterLabel(data.context.quarter)} · ${data.delivery.length} sprint${data.delivery.length > 1 ? 's' : ''}`
              : `Last ${data.delivery.length} sprint${data.delivery.length > 1 ? 's' : ''}`}>
              <div className="grid-2">
                <Card title="Committed vs. Completed Story Points" badge="Story Points">
                  <DeliveryChart data={data.delivery} />
                </Card>
                <Card title="Velocity Trend" badge={data.velocityBand ? `Stable Band: ${data.velocityBand.low}–${data.velocityBand.high} SP` : 'No History Yet'}>
                  <VelocityChart data={data.delivery} band={data.velocityBand} />
                </Card>
              </div>
              <Card title="Completion and Business Value (%)" badge="Business Value = Stories Completed ÷ Total Stories">
                <BusinessValueChart data={data.delivery} />
              </Card>
            </Section>

            <Section number={3} title="Flow Metrics" aside="Efficiency of work in motion">
              <FlowMetrics flow={data.flow} jiraBaseUrl={data.context.jiraBaseUrl} />
            </Section>

            <div className="grid-2 stretch">
              <Section number={4} title="Scope Stability" aside="Added, completed, and carried work">
                <Card title="Scope Movement by Sprint" badge={`Added Scope: ${data.scopeAddedPct}%`}>
                  <ScopeChart data={data.scope} />
                </Card>
              </Section>

              <Section number={5} title="Quality" aside="Defects created and closed">
                <div className="quality-stats">
                  <div className="card stat"><span>Created</span><strong>{data.quality.current.created}</strong></div>
                  <div className="card stat"><span>Closed</span><strong>{data.quality.current.closed}</strong></div>
                  <div className="card stat"><span>Open</span><strong>{data.quality.current.open}</strong></div>
                </div>
                <Card title="Defects Created vs. Closed" badge={`UAT ${data.quality.current.uatPct}% · Prod ${data.quality.current.prodPct}%`}>
                  <DefectChart data={data.quality.trend} />
                </Card>
              </Section>
            </div>

            <Card title="Defect Rate and Defect Density" badge="Per Bug Created in the Sprint">
              <DefectRateChart data={data.quality.trend} />
              {data.quality.trend.some((t) => t.defectRate === null) && (
                <p className="muted chart-note">Sprints with no bugs created have no value (division by zero).</p>
              )}
            </Card>

            <Section number={6} title="Sprint Health" aside="Status against agreed thresholds">
              <HealthTable health={data.health} sprintState={data.sprintState} />
            </Section>

            <div className="grid-2">
              <Section number={7} title="Sprint Burndown" aside={`${data.burndown.length}-day sprint`}>
                <Card title="Remaining Work" badge={<StatusPill status={data.sprintState} label={STATUS_LABEL[data.sprintState]} />}>
                  <BurndownChart data={data.burndown} />
                </Card>
              </Section>

              <Section number={8} title="Process Compliance" aside="Definition of Ready and Definition of Done">
                <Card>
                  <Compliance compliance={data.compliance} />
                </Card>
              </Section>
            </div>

            <footer className="footer">
              <span>{data.context.project.name} / {data.context.team.name} · Agile Delivery Analytics</span>
              <span>Source: Jira boards, synced {data.context.sync.lastSuccessAt ? formatDateTime(data.context.sync.lastSuccessAt) : 'never'}</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
