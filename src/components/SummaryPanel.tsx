import type { OrgStats } from '../utils/stats';
import { BAR_COLORS } from '../styles/chartColors';

interface SummaryPanelProps {
  stats: OrgStats;
  onshoreTargetPercentage?: number;
}

interface StackedBarProps {
  segments: Array<{
    label: string;
    percentage: number;
    count: number;
    color: string;
  }>;
  targetPercentage?: number;
}

function StackedBar({ segments, targetPercentage }: StackedBarProps) {
  return (
    <div>
      {/* Bar with target marker */}
      <div className="relative h-4 w-full rounded-sm overflow-hidden flex">
        {segments.map((segment, idx) => (
          <div
            key={idx}
            style={{
              width: `${segment.percentage}%`,
              backgroundColor: segment.color,
            }}
            className="relative"
          />
        ))}
        {/* Target marker */}
        {targetPercentage !== undefined && (
          <div
            className="absolute top-0 h-full w-[2px]"
            style={{ left: `${targetPercentage}%`, backgroundColor: BAR_COLORS.target }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        {segments.map((segment, idx) => (
          <div key={idx}>
            {segment.label} ({segment.count})
          </div>
        ))}
      </div>
    </div>
  );
}

export function SummaryPanel({ stats, onshoreTargetPercentage = 50 }: SummaryPanelProps) {
  const SENIORITY_TARGET = 50;
  const EMPLOYEE_TARGET = 30;

  const senioritySegments = [
    {
      label: 'Senior+',
      percentage: stats.seniorPlusRatio,
      count: stats.seniorPlusCount,
      color: BAR_COLORS.primary,
    },
    {
      label: 'Junior',
      percentage: 100 - stats.seniorPlusRatio,
      count: stats.totalEngineers - stats.seniorPlusCount,
      color: BAR_COLORS.secondary,
    },
  ];

  const employmentSegments = [
    {
      label: 'Employee',
      percentage: stats.typePercentages.employee,
      count: stats.byType.employee,
      color: BAR_COLORS.primary,
    },
    {
      label: 'Contractor',
      percentage: stats.typePercentages.contractor,
      count: stats.byType.contractor,
      color: BAR_COLORS.secondary,
    },
  ];

  const locationSegments = [
    {
      label: 'Onshore',
      percentage: stats.locationPercentages.onshore,
      count: stats.byLocation.onshore,
      color: BAR_COLORS.primary,
    },
    ...(stats.byLocation.nearshore > 0 ? [{
      label: 'Nearshore',
      percentage: stats.locationPercentages.nearshore,
      count: stats.byLocation.nearshore,
      color: BAR_COLORS.tertiary,
    }] : []),
    {
      label: 'Offshore',
      percentage: stats.locationPercentages.offshore,
      count: stats.byLocation.offshore,
      color: BAR_COLORS.secondary,
    },
  ].filter(seg => seg.count > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold mb-3 text-gray-900">Summary</h3>

      <div className="space-y-5 text-sm">
        {/* Total */}
        <div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalEngineers}</div>
          <div className="text-gray-500">Total Engineers</div>
        </div>

        {/* Seniority */}
        <div>
          <div className="text-sm text-gray-600 mb-1.5">Seniority</div>
          <StackedBar
            segments={senioritySegments}
            targetPercentage={SENIORITY_TARGET}
          />
        </div>

        {/* Employment Type */}
        <div>
          <div className="text-sm text-gray-600 mb-1.5">Employment</div>
          <StackedBar
            segments={employmentSegments}
            targetPercentage={EMPLOYEE_TARGET}
          />
        </div>

        {/* Location */}
        <div>
          <div className="text-sm text-gray-600 mb-1.5">Location</div>
          <StackedBar
            segments={locationSegments}
            targetPercentage={onshoreTargetPercentage}
          />
        </div>

        {/* Role Breakdown */}
        <div>
          <div className="text-sm text-gray-600 mb-1.5">By Role</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
            {stats.byRole.head_of_engineering > 0 && (
              <div>HoE: {stats.byRole.head_of_engineering}</div>
            )}
            {stats.byRole.principal_engineer > 0 && (
              <div>Principal: {stats.byRole.principal_engineer}</div>
            )}
            {stats.byRole.engineering_manager > 0 && (
              <div>EM: {stats.byRole.engineering_manager}</div>
            )}
            {stats.byRole.staff_engineer > 0 && (
              <div>Staff: {stats.byRole.staff_engineer}</div>
            )}
            {stats.byRole.senior_engineer > 0 && (
              <div>Senior: {stats.byRole.senior_engineer}</div>
            )}
            {stats.byRole.engineer > 0 && (
              <div>Engineer: {stats.byRole.engineer}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
