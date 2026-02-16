import type { TimelinePlan, CompositionSnapshot } from '../../types/timeline';
import { snapshotTotal } from '../../utils/timelineStats';

interface PeriodTableProps {
  plan: TimelinePlan;
  readOnly?: boolean;
  onUpdateSnapshot: (periodIndex: number, snapshot: CompositionSnapshot) => void;
  onToggleLock: (periodIndex: number) => void;
}

type RowKey = 'total' | keyof CompositionSnapshot;

interface RowDef {
  key: RowKey;
  label: string;
  group: string;
  editable: boolean;
  getValue: (s: CompositionSnapshot) => number;
}

const ROWS: RowDef[] = [
  { key: 'total', label: 'Total Engineers', group: 'Headcount', editable: true, getValue: s => snapshotTotal(s) },
  { key: 'onshore', label: 'Onshore', group: 'Location', editable: true, getValue: s => s.onshore },
  { key: 'nearshore', label: 'Nearshore', group: 'Location', editable: true, getValue: s => s.nearshore },
  { key: 'offshore', label: 'Offshore', group: 'Location', editable: false, getValue: s => s.offshore },
  { key: 'employees', label: 'Employees', group: 'Type', editable: true, getValue: s => s.employees },
  { key: 'contractors', label: 'Contractors', group: 'Type', editable: false, getValue: s => s.contractors },
  { key: 'seniorPlus', label: 'Senior+', group: 'Seniority', editable: true, getValue: s => s.seniorPlus },
  { key: 'junior', label: 'Junior', group: 'Seniority', editable: false, getValue: s => s.junior },
];

function scaleSnapshot(snapshot: CompositionSnapshot, newTotal: number): CompositionSnapshot {
  const oldTotal = snapshotTotal(snapshot);
  if (oldTotal === 0) {
    return {
      onshore: newTotal, nearshore: 0, offshore: 0,
      employees: newTotal, contractors: 0,
      seniorPlus: 0, junior: newTotal,
    };
  }
  const ratio = newTotal / oldTotal;
  const onshore = Math.round(snapshot.onshore * ratio);
  const nearshore = Math.round(snapshot.nearshore * ratio);
  const offshore = newTotal - onshore - nearshore;
  const employees = Math.round(snapshot.employees * ratio);
  const contractors = newTotal - employees;
  const seniorPlus = Math.round(snapshot.seniorPlus * ratio);
  const junior = newTotal - seniorPlus;
  return { onshore, nearshore, offshore, employees, contractors, seniorPlus, junior };
}

function adjustSnapshot(snapshot: CompositionSnapshot, field: RowKey, value: number): CompositionSnapshot {
  if (field === 'total') {
    return scaleSnapshot(snapshot, Math.max(0, value));
  }

  const total = snapshotTotal(snapshot);
  const clamped = Math.max(0, Math.min(value, total));
  const result = { ...snapshot };

  switch (field) {
    case 'onshore':
      result.onshore = clamped;
      result.offshore = Math.max(0, total - clamped - result.nearshore);
      // If nearshore + new onshore exceeds total, reduce nearshore too
      if (result.offshore < 0) {
        result.nearshore = Math.max(0, total - clamped);
        result.offshore = 0;
      }
      break;
    case 'nearshore':
      result.nearshore = clamped;
      result.offshore = Math.max(0, total - result.onshore - clamped);
      if (result.offshore < 0) {
        result.onshore = Math.max(0, total - clamped);
        result.offshore = 0;
      }
      break;
    case 'employees':
      result.employees = clamped;
      result.contractors = total - clamped;
      break;
    case 'seniorPlus':
      result.seniorPlus = clamped;
      result.junior = total - clamped;
      break;
  }
  return result;
}

export function PeriodTable({ plan, readOnly = false, onUpdateSnapshot, onToggleLock }: PeriodTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-3 py-2 border-b font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[120px]">Metric</th>
            {plan.periods.map((period, i) => (
              <th key={period.id} className="px-3 py-2 border-b font-medium text-gray-600 text-center min-w-[90px]">
                <div>{period.label}</div>
                <button
                  onClick={() => onToggleLock(i)}
                  className={`text-xs mt-0.5 ${period.locked ? 'text-amber-600' : 'text-gray-400'} hover:text-amber-700`}
                  title={period.locked ? 'Locked (click to unlock)' : 'Unlocked (click to lock)'}
                >
                  {period.locked ? '🔒' : '🔓'}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, rowIdx) => {
            const showGroupHeader = rowIdx === 0 || ROWS[rowIdx - 1].group !== row.group;
            const isTotal = row.key === 'total';
            return (
              <>
                {showGroupHeader && (
                  <tr key={`group-${row.group}`}>
                    <td colSpan={plan.periods.length + 1} className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50/50 border-b">
                      {row.group}
                    </td>
                  </tr>
                )}
                <tr key={row.key} className={`hover:bg-gray-50 ${isTotal ? 'font-semibold' : ''}`}>
                  <td className={`px-3 py-1.5 border-b text-gray-700 sticky left-0 z-10 ${isTotal ? 'bg-gray-50' : 'bg-white'}`}>
                    {row.label}
                    {!row.editable && <span className="text-gray-400 text-xs ml-1">(auto)</span>}
                  </td>
                  {plan.periods.map((period, i) => {
                    const val = row.getValue(period.planned);
                    const canEdit = row.editable && !readOnly && !period.locked;
                    return (
                      <td key={period.id} className={`px-1 py-1 border-b text-center ${isTotal ? 'bg-gray-50' : ''}`}>
                        {canEdit ? (
                          <input
                            type="number"
                            min={0}
                            value={val}
                            onChange={e => {
                              const newSnapshot = adjustSnapshot(period.planned, row.key, Number(e.target.value));
                              onUpdateSnapshot(i, newSnapshot);
                            }}
                            className={`w-full text-center border rounded px-1 py-0.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${isTotal ? 'font-semibold' : ''}`}
                          />
                        ) : (
                          <span className={`inline-block w-full text-center px-1 py-0.5 text-sm ${row.editable ? 'text-gray-500' : 'text-gray-400'}`}>
                            {val}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
