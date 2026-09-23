import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps, sprintAxisProps } from './common.jsx';

// Defect rate = stories ÷ bugs created in the sprint (bars, left axis)
// Defect density = achieved velocity ÷ bugs created in the sprint (line, right axis)
function formatValue(value, name, { payload }) {
  if (value === null || value === undefined) return ['No bugs created in this sprint', name];
  const bugs = `${payload.createdInSprint} bug${payload.createdInSprint === 1 ? '' : 's'} created`;
  return name === 'Defect rate'
    ? [`${value} (${payload.stories} stories ÷ ${bugs})`, name]
    : [`${value} (${payload.achievedVelocity} SP ÷ ${bugs})`, name];
}

export default function DefectRateChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="sprint" {...sprintAxisProps(data)} />
        <YAxis yAxisId="rate" {...axisProps} width={32} allowDecimals={false} />
        <YAxis yAxisId="density" orientation="right" {...axisProps} width={36} allowDecimals={false} />
        <Tooltip {...tooltipProps} formatter={formatValue} itemSorter={(item) => (item.dataKey === 'defectRate' ? 0 : 1)} />
        <Legend {...legendProps} itemSorter={(item) => (item.dataKey === 'defectRate' ? 0 : 1)} />
        <Bar yAxisId="rate" dataKey="defectRate" name="Defect rate" fill={COLORS.teal} radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Line yAxisId="density" dataKey="defectDensity" name="Defect density" stroke={COLORS.gold} strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
