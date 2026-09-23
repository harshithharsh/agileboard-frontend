import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps, sprintAxisProps } from './common.jsx';

export default function ScopeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="sprint" {...sprintAxisProps(data)} />
        <YAxis {...axisProps} width={32} />
        <Tooltip {...tooltipProps} />
        <Legend {...legendProps} />
        <Bar dataKey="completed" name="Completed" stackId="s" fill={COLORS.primary} />
        <Bar dataKey="added" name="Added scope" stackId="s" fill={COLORS.warning} />
        <Bar dataKey="spillover" name="Spillover" stackId="s" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
