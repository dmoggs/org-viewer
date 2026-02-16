import type { OrgStats } from './stats';
import type { Portfolio } from '../types/org';
import type { CompositionSnapshot, TimelinePeriod } from '../types/timeline';
import { calculatePortfolioStats } from './stats';

export function snapshotFromStats(stats: OrgStats): CompositionSnapshot {
  return {
    onshore: stats.byLocation.onshore,
    nearshore: stats.byLocation.nearshore,
    offshore: stats.byLocation.offshore,
    employees: stats.byType.employee,
    contractors: stats.byType.contractor,
    seniorPlus: stats.seniorPlusCount,
    junior: stats.totalEngineers - stats.seniorPlusCount,
  };
}

export function snapshotTotal(s: CompositionSnapshot): number {
  return s.onshore + s.nearshore + s.offshore;
}

export function snapshotFromPortfolio(portfolio: Portfolio): CompositionSnapshot {
  return snapshotFromStats(calculatePortfolioStats(portfolio));
}

export function sumSnapshots(snapshots: CompositionSnapshot[]): CompositionSnapshot {
  const result: CompositionSnapshot = {
    onshore: 0, nearshore: 0, offshore: 0,
    employees: 0, contractors: 0,
    seniorPlus: 0, junior: 0,
  };
  for (const s of snapshots) {
    result.onshore += s.onshore;
    result.nearshore += s.nearshore;
    result.offshore += s.offshore;
    result.employees += s.employees;
    result.contractors += s.contractors;
    result.seniorPlus += s.seniorPlus;
    result.junior += s.junior;
  }
  return result;
}

export function getAggregateSnapshot(period: TimelinePeriod): CompositionSnapshot {
  if (!period.portfolioSnapshots) return period.planned;
  return sumSnapshots(Object.values(period.portfolioSnapshots));
}

export function periodDelta(current: TimelinePeriod, previous: TimelinePeriod): CompositionSnapshot {
  const c = current.planned;
  const p = previous.planned;
  return {
    onshore: c.onshore - p.onshore,
    nearshore: c.nearshore - p.nearshore,
    offshore: c.offshore - p.offshore,
    employees: c.employees - p.employees,
    contractors: c.contractors - p.contractors,
    seniorPlus: c.seniorPlus - p.seniorPlus,
    junior: c.junior - p.junior,
  };
}

export function generatePeriodLabels(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  granularity: 'monthly' | 'quarterly',
): { label: string; date: string }[] {
  const periods: { label: string; date: string }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let year = startYear;
  let month = startMonth;

  // For quarterly, snap to quarter start
  if (granularity === 'quarterly') {
    month = Math.floor((month - 1) / 3) * 3 + 1;
  }

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const date = `${year}-${String(month).padStart(2, '0')}-01`;
    if (granularity === 'monthly') {
      periods.push({ label: `${monthNames[month - 1]} ${year}`, date });
      month++;
    } else {
      const quarter = Math.floor((month - 1) / 3) + 1;
      periods.push({ label: `Q${quarter} ${year}`, date });
      month += 3;
    }
    if (month > 12) {
      month -= 12;
      year++;
    }
  }

  return periods;
}
