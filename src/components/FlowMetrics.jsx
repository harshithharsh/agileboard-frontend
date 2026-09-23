import { StatusPill } from './Section.jsx';
import IssueKey from './IssueKey.jsx';

function FlowCard({ title, value, caption, status, children, popover }) {
  return (
    <div className={`card flow${popover ? ' has-popover' : ''}`} tabIndex={popover ? 0 : undefined}>
      <div className="flow-head"><h3>{title}</h3><span className={`dot dot-${status}`} /></div>
      <div className="flow-value"><strong>{value}</strong><span>{caption}</span></div>
      <ul className="flow-list">{children}</ul>
      {popover && <div className="popover" role="tooltip">{popover}</div>}
    </div>
  );
}

// Hover panel for Blocked Work: each blocked Jira issue, how long, and whether it is still blocked
function BlockedList({ list, jiraBaseUrl }) {
  // One row per issue: an issue blocked several times shows its total blocked time
  const byIssue = new Map();
  for (const b of list) {
    const row = byIssue.get(b.issueKey) ?? { ...b, days: 0, times: 0, reasons: new Set() };
    row.days = Math.round((row.days + b.days) * 10) / 10;
    row.times += 1;
    row.open = row.open || b.open;
    row.external = row.external || b.external;
    if (b.reason) row.reasons.add(b.reason);
    byIssue.set(b.issueKey, row);
  }
  const rows = [...byIssue.values()].sort((a, b) => b.days - a.days);
  return (
    <>
      <div className="popover-title">Blocked issues in this sprint</div>
      <ul className="popover-list">
        {rows.map((b) => (
          <li key={b.issueKey}>
            <div className="popover-row">
              <IssueKey issueKey={b.issueKey} jiraBaseUrl={jiraBaseUrl} />
              <span className={b.open ? 'tag tag-open' : 'tag'}>{b.open ? 'Still blocked' : `${b.days}d`}</span>
            </div>
            <div className="popover-sub">{b.title}</div>
            <div className="popover-sub muted">
              {[...b.reasons].join(', ')}
              {b.external ? ' · External' : ''}
              {b.times > 1 ? ` · Blocked ${b.times} times` : ''}
              {b.open ? ` · ${b.days}d so far` : ''}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function FlowMetrics({ flow, jiraBaseUrl }) {
  const { cycleTime, throughput, wip, blocked } = flow;
  const cycleDiff = cycleTime.prevAvg !== null && cycleTime.avg !== null ? cycleTime.avg - cycleTime.prevAvg : null;
  const tpDiff = throughput.previous !== null ? throughput.current - throughput.previous : null;

  return (
    <div className="flow-grid">
      <FlowCard title="Cycle Time" value={cycleTime.avg !== null ? `${cycleTime.avg}d` : '—'} caption="Average cycle time"
        status={cycleDiff !== null && cycleDiff > 0.5 ? 'attention' : 'on_track'}>
        <li>
          <span className="hint" title="Half of the completed items took this long or less.">Median</span>
          <b>{cycleTime.median ?? '—'}d</b>
        </li>
        <li>
          <span className="hint" title="85% of the completed items took this long or less; the slowest 15% took longer. A realistic delivery promise that isn't skewed by a few very old items.">85th Percentile</span>
          <b>{cycleTime.p85 ?? '—'}d</b>
        </li>
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
        status={blocked.items > 3 ? 'attention' : blocked.items > 0 ? 'warning' : 'on_track'}
        popover={blocked.list.length > 0 && <BlockedList list={blocked.list} jiraBaseUrl={jiraBaseUrl} />}>
        <li><span>Total Blocked Time</span><b>{blocked.totalDays}d</b></li>
        <li><span>Longest Blocked</span><b>{blocked.longestDays}d</b></li>
        <li><span>External Dependencies</span><b>{blocked.external}</b></li>
        {blocked.list.length > 0 && (
          <li className="issue-links">
            <span>Jira Issues</span>
            <span>
              {[...new Set(blocked.list.map((b) => b.issueKey))].map((key, i) => (
                <span key={key}>{i > 0 && ', '}<IssueKey issueKey={key} jiraBaseUrl={jiraBaseUrl} /></span>
              ))}
            </span>
          </li>
        )}
      </FlowCard>
    </div>
  );
}
