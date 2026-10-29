import { useResourceData } from './data/resourceService.js';
import { useResourceFilters, resourceAccess } from './useResourceFilters.js';
import Allocation from './pages/Allocation.jsx';

// Settings → Resource allocation: each person's team, FTE and project allocations
export default function AllocationSettings({ user }) {
  const { data, error } = useResourceData();
  const { filters, setFilters, period } = useResourceFilters(data);
  return (
    <div className="rm-settings">
      {error && <div className="card error">Could not load resource data: {error}</div>}
      {!data && !error && <div className="card empty">Loading resource data…</div>}
      {data && filters.projectId !== undefined && (
        <Allocation data={data} filters={filters} setFilters={setFilters} period={period} access={resourceAccess(user)} embedded />
      )}
    </div>
  );
}
