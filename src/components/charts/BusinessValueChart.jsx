import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps, sprintAxisProps } from './common.jsx';

// Tooltip shows the story counts behind Business Value %
const formatter = (average) => (value, name, { payload }) => {
  if (name === 'Business Value %') {
    if (value === null || value === undefined) return ['No stories', name];
    const per = average ? ' (avg. per team)' : '';
    return [`${value}% (${payload.storiesCompleted} of ${payload.storiesTotal} stories${per})`, name];
  }
  return [`${value}%`, name];
};

export default function BusinessValueChart({ data, average = false }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={2} barCategoryGap="28%">
        <CartesianGrid {...gridProps} strokeDasharray="4 4" vertical />
        <XAxis dataKey="sprint" {...sprintAxisProps(data)} />
        <YAxis {...axisProps} width={44} domain={[0, 120]} ticks={[0, 20, 40, 60, 80, 100, 120]} tickFormatter={(v) => `${v}%`} />
        <Tooltip {...tooltipProps} formatter={formatter(average)} itemSorter={(item) => (item.dataKey === 'completion' ? 0 : 1)} />
        <Legend {...legendProps} iconType="square" verticalAlign="top" height={32} itemSorter={(item) => (item.dataKey === 'completion' ? 0 : 1)} />
        <Bar dataKey="completion" name="Completion %" fill={COLORS.teal} />
        <Bar dataKey="businessValue" name="Business Value %" fill={COLORS.gold} />
      </BarChart>
    </ResponsiveContainer>
  );
}
