import { StatusPill } from './Section.jsx';
import { STATUS_LABEL, formatValue } from '../lib/format.js';

export default function HealthTable({ health, sprintState }) {
  return (
    <div className="card table-card">
      <table className="health">
        <thead>
          <tr><th>Metric</th><th>Current</th><th>Target</th><th>Status</th></tr>
        </thead>
        <tbody>
          {health.map((h) => (
            <tr key={h.key}>
              <td>{h.label}</td>
              <td><b>{formatValue(h.value, h.unit)}</b></td>
              <td className="muted">{h.targetLabel}</td>
              <td><StatusPill status={h.status} label={STATUS_LABEL[h.status]} /></td>
            </tr>
          ))}
          <tr className="state-row">
            <td>Sprint state</td>
            <td colSpan={2}><b>{STATUS_LABEL[sprintState]}</b></td>
            <td><StatusPill status={sprintState} label={STATUS_LABEL[sprintState]} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
