import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client.js';
import { exportDashboardCsv } from './lib/exportCsv.js';
import { STATUS_LABEL } from './lib/format.js';
import Header from './components/Header.jsx';
import FilterBar from './components/FilterBar.jsx';
import { Section, Card, StatusPill } from './components/Section.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import FlowMetrics from './components/FlowMetrics.jsx';
import HealthTable from './components/HealthTable.jsx';
import Compliance from './components/Compliance.jsx';
import Insights from './components/Insights.jsx';
import DeliveryChart from './components/charts/DeliveryChart.jsx';
import VelocityChart from './components/charts/VelocityChart.jsx';
import ScopeChart from './components/charts/ScopeChart.jsx';
import DefectChart from './components/charts/DefectChart.jsx';
import BurndownChart from './components/charts/BurndownChart.jsx';

const EMPTY_FILTERS = { projectId: null, teamId: null, releaseId: null, sprintId: null, assigneeId: null, range: '6' };

// Fill in defaults (first project/team, latest sprint) whenever a parent filter is cleared.
function resolveFilters(filters, options) {
  const next = { ...filters };
  next.projectId ??= options.projects[0]?.id ?? null;
  next.teamId ??= options.teams.find((t) => t.project_id === next.projectId)?.id ?? null;
  next.sprintId ??= options.sprints.find(
    (s) => s.team_id === next.teamId && (!next.releaseId || s.release_id === next.releaseId)
  )?.id ?? null; // sprints arrive newest first
  return next;
}

export default function App() {
  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getFilters()
      .then((opts) => {
        setOptions(opts);
        setFilters((f) => resolveFilters(f, opts));
      })
      .catch((e) => setError(e.message));
  }, []);

  const load = useCallback(() => {
    if (!filters.teamId) return;
    setLoading(true);
    setError(null);
    api.getDashboard(filters)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(load, [load]);

  const updateFilters = (patch) => setFilters((f) => resolveFilters({ ...f, ...patch }, options));

  return (
    <div className="app">
      <Header context={data?.context} loading={loading} onRefresh={load} onExport={() => data && exportDashboardCsv(data)} />
      <main className={loading ? 'is-loading' : ''}>
        {options && <FilterBar options={options} filters={filters} onChange={updateFilters} />}
        {error && <div className="card error">Could not load the dashboard: {error}</div>}
        {!data && !error && <div className="card empty">Loading dashboard…</div>}

        {data && (
          <>
            <Section number={1} title="Sprint executive summary" aside={`Current view: ${data.context.team.name} · ${data.context.sprint.name}`}>
              <SummaryCards summary={data.summary} velocityBand={data.velocityBand} />
            </Section>

            <Section number={2} title="Sprint delivery" aside={`Last ${data.delivery.length} sprint${data.delivery.length > 1 ? 's' : ''}`}>
              <div className="grid-2">
                <Card title="Committed vs completed story points" badge="Story points">
                  <DeliveryChart data={data.delivery} />
                </Card>
                <Card title="Velocity & completion trend" badge={`Stable band ${data.velocityBand.low}–${data.velocityBand.high} SP`}>
                  <VelocityChart data={data.delivery} band={data.velocityBand} />
                </Card>
              </div>
            </Section>

            <Section number={3} title="Flow metrics" aside="Efficiency of work in motion">
              <FlowMetrics flow={data.flow} />
            </Section>

            <div className="grid-2">
              <Section number={4} title="Scope stability" aside="Added, completed, and carried work">
                <Card title="Scope movement by sprint" badge={`Added scope ${data.scopeAddedPct}%`}>
                  <ScopeChart data={data.scope} />
                </Card>
              </Section>

              <Section number={5} title="Quality" aside="Defects and escape trend">
                <div className="quality-stats">
                  <div className="card stat"><span>Created</span><strong>{data.quality.current.created}</strong></div>
                  <div className="card stat"><span>Closed</span><strong>{data.quality.current.closed}</strong></div>
                  <div className="card stat"><span>Open</span><strong>{data.quality.current.open}</strong></div>
                </div>
                <Card title="Defects created vs closed" badge={`UAT ${data.quality.current.uatPct}% · Prod ${data.quality.current.prodPct}%`}>
                  <DefectChart data={data.quality.trend} />
                </Card>
              </Section>
            </div>

            <Section number={6} title="Sprint health" aside="Status against agreed thresholds">
              <HealthTable health={data.health} sprintState={data.sprintState} />
            </Section>

            <div className="grid-2">
              <Section number={7} title="Sprint burndown" aside={`${data.burndown.length}-day sprint`}>
                <Card title="Remaining work" badge={<StatusPill status={data.sprintState} label={STATUS_LABEL[data.sprintState]} />}>
                  <BurndownChart data={data.burndown} />
                </Card>
              </Section>

              <Section number={8} title="Process compliance" aside="Definition of ready and done">
                <Card>
                  <Compliance compliance={data.compliance} />
                </Card>
              </Section>
            </div>

            <Section number={9} title="Executive insights" aside="Generated from dashboard data">
              <Insights insights={data.insights} />
            </Section>

            <footer className="footer">
              <span>{data.context.project.name} / {data.context.team.name} · Agile delivery analytics</span>
              <span>Source: sprint board, defect tracker, and quality checks</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
