import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api/client.js';
import { exportDashboardCsv } from './lib/exportCsv.js';
import { STATUS_LABEL } from './lib/format.js';
import Header, { SprintActions } from './components/Header.jsx';
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
import Footer from './components/Footer.jsx';
import BurndownChart from './components/charts/BurndownChart.jsx';
import BusinessValueChart from './components/charts/BusinessValueChart.jsx';
import DefectRateChart from './components/charts/DefectRateChart.jsx';
import CycleTimeChart from './components/charts/CycleTimeChart.jsx';
import IssueTypesTable from './components/IssueTypesTable.jsx';
import WidgetGrid from './components/WidgetGrid.jsx';
import SyncProgress from './components/SyncProgress.jsx';
import SprintGoal from './components/SprintGoal.jsx';
import { LayoutIcon, PlusIcon, ResetIcon, ChartIcon } from './components/Icons.jsx';
import { DEFAULT_LAYOUT, normalizeLayout, sameLayout, updateWidget, widgetTitle } from './lib/layout.js';
import { resolveFilters, quarterLabel } from './lib/filters.js';
import { slug } from './lib/download.js';

const keys = (list) => (list || []).map((d) => d.key).join(' ');

const EMPTY_FILTERS = { projectId: null, teamId: null, quarter: null, releaseId: null, sprintId: null };

export default function App({ user, onSignOut, onMenu, onOpenAdmin, adminVersion }) {
  const perms = user?.permissions ?? [];
  const canAdmin = perms.includes('admin');
  const canSync = canAdmin || perms.includes('edit');
  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [error, setError] = useState(null);

  // Dashboard layout: saved per user; `draft` is the layout being edited while customizing
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [draft, setDraft] = useState(null);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [layoutError, setLayoutError] = useState(null);
  const editing = draft !== null;
  useEffect(() => {
    api.me.preferences()
      .then((p) => setLayout(normalizeLayout(p.dashboardLayout)))
      .catch(() => {}); // fall back to the default layout
  }, []);
  const startCustomize = () => {
    setLayoutError(null);
    setDraft(layout);
  };
  const cancelCustomize = () => setDraft(null);
  const saveLayout = async () => {
    setLayoutSaving(true);
    setLayoutError(null);
    try {
      const isDefault = sameLayout(draft, DEFAULT_LAYOUT);
      await api.me.savePreferences({ dashboardLayout: isDefault ? null : draft });
      setLayout(draft);
      setDraft(null);
    } catch (e) {
      setLayoutError(`Could not save your layout: ${e.message}`);
    } finally {
      setLayoutSaving(false);
    }
  };

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

  // Settings changed projects or teams: refresh the filter options and the dashboard
  const firstAdminVersion = useRef(adminVersion);
  useEffect(() => {
    if (adminVersion === firstAdminVersion.current) return;
    loadFilters();
    load();
  }, [adminVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Jira sync. Only one runs at a time on the server: Refresh starts it (or joins one already running,
  // e.g. started by a colleague), then we follow its progress every 2 s until it ends.
  const [syncProgress, setSyncProgress] = useState(null); // { phase, sprintsDone, sprintsTotal, current, percent, startedAt }
  const [syncDone, setSyncDone] = useState(null); // { sprints, seconds } briefly after a successful sync
  const following = useRef(false);

  const follow = useCallback(async (first) => {
    if (following.current) return;
    following.current = true;
    setSyncing(true);
    setSyncError(null);
    setSyncDone(null);
    if (first?.progress) setSyncProgress(first.progress);
    const deadline = Date.now() + 30 * 60 * 1000;
    let last = first?.progress ?? null;
    try {
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const status = await api.syncStatus();
        if (!status.running) {
          if (status.latest?.status === 'failed') {
            setSyncError(status.latest.message || 'The sync failed');
          } else if (status.latest?.status === 'success') {
            const started = new Date(status.latest.started_at), finished = new Date(status.latest.finished_at);
            setSyncDone({ sprints: last?.sprintsTotal ?? null, seconds: Math.round((finished - started) / 1000) });
          }
          break;
        }
        last = status.progress ?? last;
        setSyncProgress(status.progress);
        if (Date.now() > deadline) {
          setSyncError('The sync is taking unusually long. It continues on the server; refresh the page later');
          break;
        }
      }
    } catch (e) {
      setSyncError(e.message);
    } finally {
      following.current = false;
      setSyncing(false);
      setSyncProgress(null);
    }
    await loadFilters();
    load();
  }, [loadFilters, load]);

  // Opening the dashboard while a sync is already running: show its progress too
  useEffect(() => {
    api.syncStatus().then((status) => { if (status.running) follow(status); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hide the "completed" message after a few seconds
  useEffect(() => {
    if (!syncDone) return undefined;
    const t = setTimeout(() => setSyncDone(null), 8000);
    return () => clearTimeout(t);
  }, [syncDone]);

  const refresh = async () => {
    if (following.current) return; // already following a sync: never send a second request
    try {
      const started = await api.syncFromJira();
      follow(started);
    } catch (e) {
      setSyncError(e.message);
    }
  };

  const updateFilters = (patch) => setFilters((f) => resolveFilters({ ...f, ...patch }, options));
  const defaultFilters = options ? resolveFilters(EMPTY_FILTERS, options) : EMPTY_FILTERS;
  const isDefault = Object.keys(EMPTY_FILTERS).every((k) => filters[k] === defaultFilters[k]);
  const clearFilters = () => setFilters(defaultFilters);

  return (
    <div className="app">
      <Header title="Sprint Analytics" icon={<ChartIcon />} onMenu={onMenu} onOpenAdmin={onOpenAdmin} user={user} onSignOut={onSignOut}
        actions={<SprintActions context={data?.context} loading={loading || syncing} syncing={syncing} onRefresh={refresh} onExport={() => data && exportDashboardCsv(data)} onCustomize={data && !editing ? startCustomize : null} customizing={editing} canSync={canSync} />} />
      <main className={loading ? 'is-loading' : ''}>
        {options && <FilterBar options={options} filters={filters} onChange={updateFilters} onClear={clearFilters} isDefault={isDefault} />}
        {(syncProgress || (syncing && !syncError)) && <SyncProgress progress={syncProgress} />}
        {syncDone && !syncing && <SyncProgress done={syncDone} onClose={() => setSyncDone(null)} />}
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

        {editing && (
          <CustomizeBar draft={draft} saving={layoutSaving} error={layoutError} changed={!sameLayout(draft, layout)}
            onChange={setDraft} onReset={() => setDraft(DEFAULT_LAYOUT)} onCancel={cancelCustomize} onSave={saveLayout} />
        )}

        {data && <WidgetGrid layout={editing ? draft : layout} widgets={buildWidgets(data, { canSync, reload: load })} editing={editing} onChange={setDraft} />}
      </main>
      <Footer />
    </div>
  );
}

// The content of each dashboard widget (ids and default order in lib/layout.js)
function buildWidgets(data, { canSync, reload }) {
  // File name for chart downloads: agilemetrix-<team>-<chart>-<sprint>
  const file = (chart) => `agilemetrix-${slug(data.context.team.name)}-${chart}-${slug(data.context.sprint.name)}`;
  const n = data.delivery.length;
  const sprints = `${n} sprint${n > 1 ? 's' : ''}`;
  const trendRange = data.context.quarter ? `${quarterLabel(data.context.quarter)} · ${sprints}` : `last ${sprints}`;
  return {
    summary: (
      <Section title="Sprint Executive Summary" aside={`Current view: ${data.context.team.name} · ${data.context.sprint.name} · Trends: ${trendRange}`}>
        <SummaryCards summary={data.summary} velocityBand={data.velocityBand} jiraBaseUrl={data.context.jiraBaseUrl} sprintName={data.context.sprint.name} />
      </Section>
    ),
    'sprint-goal': <SprintGoal sprint={data.context.sprint} goal={data.sprintGoal} jiraBaseUrl={data.context.jiraBaseUrl} canEdit={canSync} onChanged={reload} />,
    committed: (
      <Card title="Committed vs. Completed Story Points" badge="Story Points"
        exportAs={{ file: file('committed-vs-completed'), rows: data.delivery, columns: [['sprint', 'Sprint'], ['committed', 'Committed SP'], ['completed', 'Completed SP']] }}>
        <DeliveryChart data={data.delivery} />
      </Card>
    ),
    velocity: (
      <Card title="Velocity Trend" badge={data.velocityBand ? `Stable Band: ${data.velocityBand.low}–${data.velocityBand.high} SP` : 'No History Yet'}
        exportAs={{ file: file('velocity-trend'), rows: data.delivery, columns: [['sprint', 'Sprint'], ['committed', 'Committed Velocity (SP)'], ['velocity', 'Completed Velocity (SP)'], ['rollingAverage', 'Rolling Average (SP)']] }}>
        <VelocityChart data={data.delivery} band={data.velocityBand} />
      </Card>
    ),
    'business-value': (
      <Card title="Completion and Business Value (%)" badge="Business Value = Stories Completed ÷ Total Stories"
        exportAs={{ file: file('completion-business-value'), rows: data.delivery, columns: [['sprint', 'Sprint'], ['completion', 'Completion %'], ['businessValue', 'Business Value %'], ['storiesCompleted', 'Stories Completed'], ['storiesTotal', 'Total Stories']] }}>
        <BusinessValueChart data={data.delivery} />
      </Card>
    ),
    flow: (
      <Section title="Flow Metrics" aside="Efficiency of work in motion">
        <FlowMetrics flow={data.flow} jiraBaseUrl={data.context.jiraBaseUrl} sprintName={data.context.sprint.name} />
      </Section>
    ),
    'cycle-time': (
      <Card title="Cycle Time Trend" badge="Days from In Progress to Done"
        exportAs={{ file: file('cycle-time-trend'), rows: data.flow.cycleTimeTrend, columns: [['sprint', 'Sprint'], ['avg', 'Average (Days)'], ['median', 'Median (Days)'], ['p85', '85th Percentile (Days)'], ['items', 'Completed Items']] }}>
        <CycleTimeChart data={data.flow.cycleTimeTrend} />
      </Card>
    ),
    scope: (
      <Card title="Scope Movement by Sprint" badge={`Added Scope: ${data.scopeAddedPct}%`}
        exportAs={{ file: file('scope-movement'), rows: data.scope, columns: [['sprint', 'Sprint'], ['completed', 'Completed SP'], ['added', 'Added Scope SP'], ['spillover', 'Spillover SP']] }}>
        <ScopeChart data={data.scope} />
      </Card>
    ),
    quality: (
      <Section title="Quality" aside="Defects created and closed">
        <div className="quality-stats">
          <div className="card stat"><span>Created</span><strong>{data.quality.current.created}</strong></div>
          <div className="card stat"><span>Closed</span><strong>{data.quality.current.closed}</strong></div>
          <div className="card stat"><span>Open</span><strong>{data.quality.current.open}</strong></div>
        </div>
        <Card title="Defects Created vs. Closed"
          exportAs={{ file: file('defects-created-closed'), rows: data.quality.trend, columns: [['sprint', 'Sprint'], ['created', 'Created'], ['closed', 'Closed'], [(r) => keys(r.createdList), 'Created (Jira)'], [(r) => keys(r.closedList), 'Closed (Jira)']] }}>
          <DefectChart data={data.quality.trend} />
        </Card>
      </Section>
    ),
    'issue-types': (
      <Card title="Issues by Type" badge={data.context.sprint.name}
        exportAs={{
          file: file('issues-by-type'),
          rows: [...data.issueTypes.rows, data.issueTypes.total],
          columns: [['label', 'Issue Type'], ['planned', 'Planned'], ['added', 'Added'], ['completed', 'Completed']],
        }}>
        <IssueTypesTable issueTypes={data.issueTypes} />
      </Card>
    ),
    'defect-rate': (
      <Card title="Defect Rate and Defect Density" badge="Per Bug Created in the Sprint"
        exportAs={{ file: file('defect-rate-density'), rows: data.quality.trend, columns: [['sprint', 'Sprint'], ['stories', 'Stories'], ['achievedVelocity', 'Achieved Velocity (SP)'], ['createdInSprint', 'Bugs Created in Sprint'], ['defectRate', 'Defect Rate'], ['defectDensity', 'Defect Density']] }}>
        <DefectRateChart data={data.quality.trend} />
        {data.quality.trend.some((t) => t.defectRate === null) && (
          <p className="muted chart-note">Sprints with no bugs created have no value (division by zero).</p>
        )}
      </Card>
    ),
    health: (
      <Section title="Sprint Health" aside="Status against agreed thresholds">
        <HealthTable health={data.health} sprintState={data.sprintState} />
      </Section>
    ),
    burndown: (
      <Section title="Sprint Burndown" aside={`${data.burndown.length}-day sprint`}>
        <Card title="Remaining Work" badge={<StatusPill status={data.sprintState} label={STATUS_LABEL[data.sprintState]} />}
          exportAs={{ file: file('burndown'), rows: data.burndown, columns: [['day', 'Day'], ['date', 'Date'], ['ideal', 'Ideal Remaining (SP)'], ['actual', 'Actual Remaining (SP)']] }}>
          <BurndownChart data={data.burndown} />
        </Card>
      </Section>
    ),
    compliance: (
      <Section title="Process Compliance" aside="Definition of Ready and Definition of Done">
        <Card>
          <Compliance compliance={data.compliance} />
        </Card>
      </Section>
    ),
  };
}

// Shown while customizing: hidden widgets to add back, reset, cancel, save
function CustomizeBar({ draft, saving, error, changed, onChange, onReset, onCancel, onSave }) {
  const hidden = draft.filter((w) => w.hidden);
  return (
    <div className="card customize-bar" role="region" aria-label="Customize dashboard">
      <div className="customize-main">
        <div className="customize-intro">
          <strong><LayoutIcon /> Customize your dashboard</strong>
          <span>Drag widgets to rearrange them, change their width or hide the ones you don’t need. Your layout is saved to your account.</span>
        </div>
        <div className="customize-actions">
          <button className="btn" onClick={onReset} disabled={saving || sameLayout(draft, DEFAULT_LAYOUT)} title="Back to the standard layout"><ResetIcon /> Reset</button>
          <button className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="btn-primary-solid" onClick={onSave} disabled={saving || !changed}>{saving ? 'Saving…' : 'Save layout'}</button>
        </div>
      </div>
      {hidden.length > 0 && (
        <div className="customize-hidden">
          <span className="muted">Hidden:</span>
          {hidden.map((w) => (
            <button key={w.id} className="hidden-chip" onClick={() => onChange(updateWidget(draft, w.id, { hidden: false }))} title="Show this widget again">
              <PlusIcon /> {widgetTitle(w.id)}
            </button>
          ))}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
