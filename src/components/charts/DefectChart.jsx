import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, legendProps, sprintAxisProps } from './common.jsx';

const MAX_KEYS = 12;

function KeyList({ label, color, issues }) {
  const shown = issues.slice(0, MAX_KEYS);
  return (
    <div className="tip-group">
      <div className="tip-title"><i style={{ background: color }} />{label}: <b>{issues.length}</b></div>
      {issues.length > 0 && (
        <div className="tip-keys">
          {shown.map((d) => d.key).join(', ')}
          {issues.length > MAX_KEYS && ` +${issues.length - MAX_KEYS} more`}
        </div>
      )}
    </div>
  );
}

// Tooltip listing the Jira numbers of the bugs created and closed in the sprint
function DefectTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tip">
      <div className="tip-sprint">{label}</div>
      <KeyList label="Created" color={COLORS.danger} issues={row.createdList || []} />
      <KeyList label="Closed" color={COLORS.success} issues={row.closedList || []} />
    </div>
  );
}

export default function DefectChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="sprint" {...sprintAxisProps(data)} padding={{ left: 36, right: 36 }} />
        <YAxis {...axisProps} width={28} allowDecimals={false} />
        <Tooltip content={<DefectTooltip />} wrapperStyle={{ zIndex: 30 }} />
        <Legend {...legendProps} />
        <Line type="monotone" dataKey="created" name="Created" stroke={COLORS.danger} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="closed" name="Closed" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
