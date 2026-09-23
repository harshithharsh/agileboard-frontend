import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps, sprintAxisProps } from './common.jsx';

export default function VelocityChart({ data, band }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="sprint" {...sprintAxisProps(data)} />
        <YAxis yAxisId="sp" {...axisProps} width={32} />
        <YAxis yAxisId="pct" orientation="right" domain={[(min) => Math.min(60, Math.floor(min / 10) * 10), 100]} {...axisProps} width={36} unit="%" />
        <Tooltip {...tooltipProps} />
        <Legend {...legendProps} />
        {band && <ReferenceArea yAxisId="sp" y1={band.low} y2={band.high} fill={COLORS.primary} fillOpacity={0.06} />}
        <Line yAxisId="sp" dataKey="velocity" name="Velocity (SP)" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
        <Line yAxisId="sp" dataKey="rollingAverage" name="Rolling average" stroke={COLORS.warning} strokeWidth={2} strokeDasharray="4 4" dot={false} />
        <Line yAxisId="pct" dataKey="completion" name="Completion %" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
