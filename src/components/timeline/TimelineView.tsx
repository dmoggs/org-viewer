import { useState, useMemo } from 'react';
import type { TimelinePlan, CompositionSnapshot } from '../../types/timeline';
import type { TimelineData } from '../../types/timeline';
import type { Portfolio } from '../../types/org';
import { getAggregateSnapshot } from '../../utils/timelineStats';
import { PlanForm } from './PlanForm';
import { PeriodTable } from './PeriodTable';
import { StackedBarTimeline } from './StackedBarTimeline';
import { HeadcountChart } from './HeadcountChart';
import { RatioTrackingChart } from './RatioTrackingChart';
import { RampUpTable } from './RampUpTable';

interface TimelineViewProps {
  data: TimelineData;
  portfolios: Portfolio[];
  onshoreTarget: number;
  onCreatePlan: (name: string, granularity: 'monthly' | 'quarterly', startYear: number, startMonth: number, endYear: number, endMonth: number) => TimelinePlan;
  onDeletePlan: (planId: string) => void;
  onUpdateSnapshot: (planId: string, periodIndex: number, snapshot: CompositionSnapshot, portfolioId?: string) => void;
  onToggleLock: (planId: string, periodIndex: number) => void;
}

function resolvedPlan(plan: TimelinePlan, portfolioFilter: string | null): TimelinePlan {
  if (!portfolioFilter) {
    // "All" view: use aggregate of portfolio snapshots (or existing planned for legacy)
    return {
      ...plan,
      periods: plan.periods.map(period => ({
        ...period,
        planned: period.portfolioSnapshots
          ? getAggregateSnapshot(period)
          : period.planned,
      })),
    };
  }
  // Single portfolio view: use that portfolio's snapshot as `planned`
  return {
    ...plan,
    periods: plan.periods.map(period => {
      const snapshot = period.portfolioSnapshots?.[portfolioFilter];
      return {
        ...period,
        planned: snapshot ?? { onshore: 0, nearshore: 0, offshore: 0, employees: 0, contractors: 0, seniorPlus: 0, junior: 0 },
      };
    }),
  };
}

export function TimelineView({ data, portfolios, onshoreTarget, onCreatePlan, onDeletePlan, onUpdateSnapshot, onToggleLock }: TimelineViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(data.plans[0]?.id ?? null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [portfolioFilter, setPortfolioFilter] = useState<string | null>(null);

  const selectedPlan = data.plans.find(p => p.id === selectedPlanId) ?? null;

  const hasPortfolioSnapshots = selectedPlan?.periods.some(p => p.portfolioSnapshots) ?? false;

  // For legacy plans without portfolio snapshots, ignore the portfolio filter
  const effectiveFilter = hasPortfolioSnapshots ? portfolioFilter : null;

  const chartPlan = useMemo(
    () => selectedPlan ? resolvedPlan(selectedPlan, effectiveFilter) : null,
    [selectedPlan, effectiveFilter],
  );

  // "All" view is read-only only when per-portfolio data exists
  const isReadOnly = effectiveFilter === null && hasPortfolioSnapshots;

  return (
    <div className="space-y-4">
      {/* Plan management bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3 flex-wrap">
        {data.plans.length > 0 && (
          <select
            value={selectedPlanId ?? ''}
            onChange={e => setSelectedPlanId(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            {data.plans.map(plan => (
              <option key={plan.id} value={plan.id}>{plan.name} ({plan.granularity})</option>
            ))}
          </select>
        )}
        <button
          onClick={() => setShowPlanForm(true)}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          + New Plan
        </button>
        {selectedPlan && (
          <button
            onClick={() => {
              if (confirm(`Delete plan "${selectedPlan.name}"?`)) {
                onDeletePlan(selectedPlan.id);
                setSelectedPlanId(data.plans.find(p => p.id !== selectedPlan.id)?.id ?? null);
              }
            }}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            Delete Plan
          </button>
        )}

        {/* Portfolio filter */}
        {selectedPlan && portfolios.length > 0 && (
          <>
            <div className="w-px h-6 bg-gray-300" />
            <select
              value={portfolioFilter ?? '__all__'}
              onChange={e => setPortfolioFilter(e.target.value === '__all__' ? null : e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="__all__">All Portfolios</option>
              {portfolios.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {!hasPortfolioSnapshots && portfolioFilter !== null && (
              <span className="text-xs text-amber-600">No per-portfolio data — create a new plan to enable breakdowns</span>
            )}
            {hasPortfolioSnapshots && portfolioFilter === null && (
              <span className="text-xs text-gray-400">Read-only aggregate</span>
            )}
          </>
        )}
      </div>

      {chartPlan ? (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs font-medium text-gray-500 mb-2">Composition Over Time</div>
              <StackedBarTimeline plan={chartPlan} />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <HeadcountChart plan={chartPlan} />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <RatioTrackingChart plan={chartPlan} onshoreTarget={onshoreTarget} />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <RampUpTable plan={chartPlan} />
            </div>
          </div>

          {/* Editable data table */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Period Data</div>
            <PeriodTable
              plan={chartPlan}
              readOnly={isReadOnly}
              onUpdateSnapshot={(periodIndex, snapshot) =>
                onUpdateSnapshot(selectedPlan!.id, periodIndex, snapshot, effectiveFilter ?? undefined)
              }
              onToggleLock={(periodIndex) => onToggleLock(selectedPlan!.id, periodIndex)}
            />
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Create a timeline plan to get started.
        </div>
      )}

      {showPlanForm && (
        <PlanForm
          onSave={(name, granularity, sy, sm, ey, em) => {
            const plan = onCreatePlan(name, granularity, sy, sm, ey, em);
            setSelectedPlanId(plan.id);
            setShowPlanForm(false);
          }}
          onCancel={() => setShowPlanForm(false)}
        />
      )}
    </div>
  );
}
