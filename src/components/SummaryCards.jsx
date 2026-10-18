import { TrendUp, TrendDown } from './Icons.jsx';
import { formatValue } from '../lib/format.js';
import { formatDateRange } from '../lib/datetime.js';
import { useState } from 'react';
import IssueKey from './IssueKey.jsx';
import AddedIssuesDialog from './AddedIssuesDialog.jsx';

function Delta({ card }) {
  if (card.caption) return <span className="delta neutral">{card.caption}</span>;
  if (card.status === 'in_progress') return <span className="delta neutral">Sprint in progress</span>;
  if (card.delta === null) return <span className="delta neutral">First sprint</span>;
  if (card.delta === 0) return <span className="delta neutral">No change</span>;
  const up = card.delta > 0;
  const good = up === card.higherIsBetter;
  const unit = card.unit === '%' ? ' pts' : card.unit === 'SP' ? ' SP' : '';
  return (
    <span className={`delta ${good ? 'good' : 'bad'}`}>
      {up ? <TrendUp /> : <TrendDown />}
      {up ? '' : '-'}{Math.abs(card.delta)}{unit}
    </span>
  );
}

export default function SummaryCards({ summary, velocityBand, jiraBaseUrl, sprintName }) {
  const [scopeCard, setScopeCard] = useState(null);
  return (
    <>
    <div className="summary-grid">
      {summary.map((card) => {
        const max = card.unit === '%' ? 100 : Math.max((velocityBand?.high ?? card.value) * 1.25, card.value);
        const width = Math.min(100, card.barPct ?? (card.value / max) * 100);
        const barClass = card.key === 'velocity' || card.key === 'time_elapsed' || card.status === 'in_progress'
          ? 'bar-primary'
          : card.status === 'on_track' ? 'bar-success' : 'bar-warning';
        return (
          <div className="card metric" key={card.key}>
            <div className="metric-head">
              <span>{card.label}</span>
              <span className={`dot dot-${card.status}`} title={{ on_track: 'On track', in_progress: 'Sprint in progress' }[card.status] ?? 'Needs attention'} />
            </div>
            <div className="metric-value">
              <strong>{formatValue(card.value, card.unit)}</strong>
              <Delta card={card} />
            </div>
            <div className="bar"><div className={barClass} style={{ width: `${width}%` }} /></div>
            <div className="metric-foot">
              <span>{card.range ? formatDateRange(card.range.start, card.range.end) : card.footLeft ?? (card.key !== 'velocity' ? `Target ${card.target}` : velocityBand ? `Target ${velocityBand.low}–${velocityBand.high} SP` : 'No history yet')}</span>
              <span>{card.footRight ?? `Prior ${formatValue(card.prior, card.unit)}`}</span>
            </div>
            {card.addedIssues?.length > 0 && (
              <button className="metric-link" onClick={() => setScopeCard(card)} title="See the issues added to the sprint after it started">
                View {card.addedIssues.length} added issue{card.addedIssues.length === 1 ? '' : 's'} ›
              </button>
            )}
            {card.issues?.length > 0 && (
              <div className="metric-issues">
                {card.issues.map((i, n) => (
                  <span key={i.key} title={i.title}>{n > 0 && ', '}<IssueKey issueKey={i.key} jiraBaseUrl={jiraBaseUrl} /></span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
    {scopeCard && <AddedIssuesDialog card={scopeCard} sprintName={sprintName} jiraBaseUrl={jiraBaseUrl} onClose={() => setScopeCard(null)} />}
    </>
  );
}
