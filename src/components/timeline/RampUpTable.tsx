import type { TimelinePlan } from '../../types/timeline';
import { snapshotTotal, periodDelta } from '../../utils/timelineStats';

interface RampUpTableProps {
  plan: TimelinePlan;
}

export function RampUpTable({ plan }: RampUpTableProps) {
  if (plan.periods.length === 0) return null;

  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">Ramp-Up Details</div>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-2 py-1.5 border-b font-medium text-gray-600">Period</th>
              <th className="px-2 py-1.5 border-b font-medium text-gray-600 text-right">Total</th>
              <th className="px-2 py-1.5 border-b font-medium text-gray-600 text-right">Net Change</th>
              <th className="px-2 py-1.5 border-b font-medium text-gray-600 text-right">Onshore +/-</th>
              <th className="px-2 py-1.5 border-b font-medium text-gray-600 text-right">Nearshore +/-</th>
              <th className="px-2 py-1.5 border-b font-medium text-gray-600 text-right">Offshore +/-</th>
              <th className="px-2 py-1.5 border-b font-medium text-gray-600 text-right">Employee +/-</th>
              <th className="px-2 py-1.5 border-b font-medium text-gray-600 text-right">Contractor +/-</th>
            </tr>
          </thead>
          <tbody>
            {plan.periods.map((period, i) => {
              const total = snapshotTotal(period.planned);
              const delta = i > 0 ? periodDelta(period, plan.periods[i - 1]) : null;
              const netChange = delta ? (delta.onshore + delta.nearshore + delta.offshore) : 0;

              const fmt = (v: number) => {
                if (v === 0) return <span className="text-gray-400">0</span>;
                return <span className={v > 0 ? 'text-green-600' : 'text-red-600'}>{v > 0 ? `+${v}` : v}</span>;
              };

              return (
                <tr key={period.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 border-b text-gray-700 font-medium">{period.label}</td>
                  <td className="px-2 py-1.5 border-b text-right text-gray-900">{total}</td>
                  <td className="px-2 py-1.5 border-b text-right">{i === 0 ? <span className="text-gray-400">-</span> : fmt(netChange)}</td>
                  <td className="px-2 py-1.5 border-b text-right">{i === 0 ? <span className="text-gray-400">-</span> : fmt(delta!.onshore)}</td>
                  <td className="px-2 py-1.5 border-b text-right">{i === 0 ? <span className="text-gray-400">-</span> : fmt(delta!.nearshore)}</td>
                  <td className="px-2 py-1.5 border-b text-right">{i === 0 ? <span className="text-gray-400">-</span> : fmt(delta!.offshore)}</td>
                  <td className="px-2 py-1.5 border-b text-right">{i === 0 ? <span className="text-gray-400">-</span> : fmt(delta!.employees)}</td>
                  <td className="px-2 py-1.5 border-b text-right">{i === 0 ? <span className="text-gray-400">-</span> : fmt(delta!.contractors)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
