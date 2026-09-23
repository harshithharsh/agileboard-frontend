import { TrendUp, TrendDown } from './Icons.jsx';
import { formatValue } from '../lib/format.js';

function Delta({ card }) {
  if (card.delta === null || card.delta === 0) return <span className="delta neutral">no change</span>;
  const up = card.delta > 0;
  const good = up === card.higherIsBetter;
  const unit = card.unit === '%' ? 'pt' : card.unit === 'SP' ? ' SP' : '';
  return (
    <span className={`delta ${good ? 'good' : 'bad'}`}>
      {up ? <TrendUp /> : <TrendDown />}
      {up ? '' : '-'}{Math.abs(card.delta)}{unit}
    </span>
  );
}

export default function SummaryCards({ summary, velocityBand }) {
  return (
    <div className="summary-grid">
      {summary.map((card) => {
        const max = card.unit === '%' ? 100 : Math.max(velocityBand.high * 1.25, card.value);
        const width = Math.min(100, (card.value / max) * 100);
        const barClass = card.key === 'velocity' ? 'bar-primary' : card.status === 'on_track' ? 'bar-success' : 'bar-warning';
        return (
          <div className="card metric" key={card.key}>
            <div className="metric-head">
              <span>{card.label}</span>
              <span className={`dot dot-${card.status}`} title={card.status === 'on_track' ? 'On track' : 'Needs attention'} />
            </div>
            <div className="metric-value">
              <strong>{formatValue(card.value, card.unit)}</strong>
              <Delta card={card} />
            </div>
            <div className="bar"><div className={barClass} style={{ width: `${width}%` }} /></div>
            <div className="metric-foot">
              <span>Target {card.key === 'velocity' ? `${velocityBand.low}–${velocityBand.high} SP` : card.target}</span>
              <span>Prior {formatValue(card.prior, card.unit)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
