import { StatusPill } from './Section.jsx';

function FlowCard({ title, value, caption, status, children }) {
  return (
    <div className="card flow">
      <div className="flow-head"><h3>{title}</h3><span className={`dot dot-${status}`} /></div>
      <div className="flow-value"><strong>{value}</strong><span>{caption}</span></div>
      <ul className="flow-list">{children}</ul>
    </div>
  );
}

export default function FlowMetrics({ flow }) {
  const { cycleTime, throughput, wip, blocked } = flow;
  const cycleDiff = cycleTime.prevAvg !== null && cycleTime.avg !== null ? cycleTime.avg - cycleTime.prevAvg : null;
  const tpDiff = throughput.previous !== null ? throughput.current - throughput.previous : null;

  return (
    <div className="flow-grid">
      <FlowCard title="Cycle Time" value={cycleTime.avg !== null ? `${cycleTime.avg}d` : '—'} caption="Average cycle time"
        status={cycleDiff !== null && cycleDiff > 0.5 ? 'attention' : 'on_track'}>
        <li><span>Median</span><b>{cycleTime.median ?? '—'}d</b></li>
        <li><span>P85</span><b>{cycleTime.p85 ?? '—'}d</b></li>
        {cycleDiff !== null && (
          <li className={cycleDiff <= 0 ? 'good' : 'bad'}>
            {cycleDiff <= 0 ? '↓' : '↑'} {Math.abs(cycleDiff).toFixed(1)}d vs. {cycleTime.prevSprint}
          </li>
        )}
      </FlowCard>
      <FlowCard title="Throughput" value={throughput.current} caption="Completed items / sprint"
        status={tpDiff !== null && tpDiff < 0 ? 'attention' : 'on_track'}>
        <li><span>Previous</span><b>{throughput.previous ?? '—'}</b></li>
        <li><span>{throughput.average === null ? 'Sprint Average' : `${throughput.sprintsInAverage}-Sprint Average`}</span><b>{throughput.average ?? '—'}</b></li>
        {tpDiff !== null && (tpDiff === 0
          ? <li>No change vs. previous sprint</li>
          : <li className={tpDiff > 0 ? 'good' : 'bad'}>{tpDiff > 0 ? '↑' : '↓'} {Math.abs(tpDiff)} item{Math.abs(tpDiff) === 1 ? '' : 's'} vs. previous sprint</li>)}
      </FlowCard>
      <FlowCard title="Work in Progress" value={`${wip.current} / ${wip.limit}`} caption="Open at sprint end / WIP limit"
        status={wip.current > wip.limit ? 'attention' : 'on_track'}>
        <li>{wip.current > wip.limit ? <StatusPill status="attention" label="Over WIP Limit" /> : <StatusPill status="on_track" label="Within WIP Limit" />}</li>
        <li><span>In Review</span><b>{wip.inReview}</b></li>
        <li><span>In Test</span><b>{wip.inTest}</b></li>
      </FlowCard>
      <FlowCard title="Blocked Work" value={blocked.items} caption="Blocked items"
        status={blocked.items > 3 ? 'attention' : blocked.items > 0 ? 'warning' : 'on_track'}>
        <li><span>Total Blocked Time</span><b>{blocked.totalDays}d</b></li>
        <li><span>Longest Blocked</span><b>{blocked.longestDays}d</b></li>
        <li><span>External Dependencies</span><b>{blocked.external}</b></li>
      </FlowCard>
    </div>
  );
}
