import { useState, useEffect, useCallback } from 'react';
import type { TimelineData, TimelinePlan, TimelinePeriod, CompositionSnapshot } from '../types/timeline';
import type { Portfolio } from '../types/org';
import type { OrgStats } from '../utils/stats';
import { snapshotFromStats, snapshotFromPortfolio, getAggregateSnapshot, generatePeriodLabels } from '../utils/timelineStats';

const STORAGE_KEY = 'org-viewer-timeline-data';

const defaultData: TimelineData = { plans: [] };

function migrateTimelineData(data: TimelineData): TimelineData {
  // Migrate old plans that don't have portfolioSnapshots
  // (they only have `planned` as a single aggregate snapshot)
  // Nothing to do here — old plans will work fine since `planned` is still read.
  // When a portfolio filter is selected and portfolioSnapshots is missing,
  // the UI will gracefully show the aggregate as read-only.
  return data;
}

export function useTimelineData(stats: OrgStats, portfolios: Portfolio[]) {
  const [data, setData] = useState<TimelineData>(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setData(migrateTimelineData(JSON.parse(stored)));
      } catch {
        console.error('Failed to parse stored timeline data');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, loading]);

  const createPlan = useCallback((
    name: string,
    granularity: 'monthly' | 'quarterly',
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
  ): TimelinePlan => {
    // Build per-portfolio snapshots from live data
    const portfolioSnapshots: Record<string, CompositionSnapshot> = {};
    for (const p of portfolios) {
      portfolioSnapshots[p.id] = snapshotFromPortfolio(p);
    }

    const baseline = snapshotFromStats(stats);
    const periodLabels = generatePeriodLabels(startYear, startMonth, endYear, endMonth, granularity);

    const periods: TimelinePeriod[] = periodLabels.map((p, i) => ({
      id: crypto.randomUUID(),
      label: p.label,
      date: p.date,
      planned: { ...baseline },
      portfolioSnapshots: Object.fromEntries(
        Object.entries(portfolioSnapshots).map(([k, v]) => [k, { ...v }])
      ),
      locked: i === 0,
    }));

    const plan: TimelinePlan = {
      id: crypto.randomUUID(),
      name,
      granularity,
      periods,
    };

    setData(prev => ({ ...prev, plans: [...prev.plans, plan] }));
    return plan;
  }, [stats, portfolios]);

  const deletePlan = useCallback((planId: string) => {
    setData(prev => ({ ...prev, plans: prev.plans.filter(p => p.id !== planId) }));
  }, []);

  const updatePeriodSnapshot = useCallback((
    planId: string,
    periodIndex: number,
    snapshot: CompositionSnapshot,
    portfolioId?: string,
  ) => {
    setData(prev => ({
      ...prev,
      plans: prev.plans.map(plan => {
        if (plan.id !== planId) return plan;
        const newPeriods = [...plan.periods];

        if (portfolioId && newPeriods[periodIndex].portfolioSnapshots) {
          const applySnapshot = (period: TimelinePeriod): TimelinePeriod => {
            const snapshots = { ...period.portfolioSnapshots! };
            snapshots[portfolioId] = { ...snapshot };
            const aggregate = getAggregateSnapshot({ ...period, portfolioSnapshots: snapshots });
            return { ...period, portfolioSnapshots: snapshots, planned: aggregate };
          };

          newPeriods[periodIndex] = applySnapshot(newPeriods[periodIndex]);

          for (let i = periodIndex + 1; i < newPeriods.length; i++) {
            if (newPeriods[i].locked) continue;
            newPeriods[i] = applySnapshot(newPeriods[i]);
          }
        } else {
          newPeriods[periodIndex] = {
            ...newPeriods[periodIndex],
            planned: { ...snapshot },
          };
          for (let i = periodIndex + 1; i < newPeriods.length; i++) {
            if (newPeriods[i].locked) continue;
            newPeriods[i] = {
              ...newPeriods[i],
              planned: { ...snapshot },
            };
          }
        }
        return { ...plan, periods: newPeriods };
      }),
    }));
  }, []);

  const togglePeriodLock = useCallback((planId: string, periodIndex: number) => {
    setData(prev => ({
      ...prev,
      plans: prev.plans.map(plan => {
        if (plan.id !== planId) return plan;
        const newPeriods = [...plan.periods];
        newPeriods[periodIndex] = {
          ...newPeriods[periodIndex],
          locked: !newPeriods[periodIndex].locked,
        };
        return { ...plan, periods: newPeriods };
      }),
    }));
  }, []);

  return {
    data,
    loading,
    createPlan,
    deletePlan,
    updatePeriodSnapshot,
    togglePeriodLock,
  };
}
