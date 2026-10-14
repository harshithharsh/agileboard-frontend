import { useState } from 'react';
import BlockedDialog from './BlockedDialog.jsx';
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

export default function FlowMetrics({ flow, jiraBaseUrl, sprintName }) {
  const [showBlocked, setShowBlocked] = useState(false);
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
        status={blocked.items > 3 ? 'attention' : blocked.items > 0 ? 'warning' : 'on_track'}>
        <li><span>Total Blocked Time</span><b>{blocked.totalDays}d</b></li>
        <li><span>Longest Blocked</span><b>{blocked.longestDays}d</b></li>
        <li><span>External Dependencies</span><b>{blocked.external}</b></li>
        {blocked.byStage?.some((st) => st.open > 0) && (
          <li><span>Still Blocked With</span><b>{blocked.byStage.filter((st) => st.open > 0).map((st) => `${st.stage} ${st.open}`).join(' · ')}</b></li>
        )}
        {blocked.list.length > 0 && (
          <li><button className="metric-link" onClick={() => setShowBlocked(true)}>View blocker details ›</button></li>
        )}
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
      {showBlocked && <BlockedDialog blocked={blocked} sprintName={sprintName} jiraBaseUrl={jiraBaseUrl} onClose={() => setShowBlocked(false)} />}
    </div>
  );
}
