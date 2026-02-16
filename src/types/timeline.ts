export interface CompositionSnapshot {
  onshore: number;
  nearshore: number;
  offshore: number;
  employees: number;
  contractors: number;
  seniorPlus: number;
  junior: number;
}

export interface TimelinePeriod {
  id: string;
  label: string;           // "Q1 2025", "Mar 2025"
  date: string;            // ISO date for sorting
  planned: CompositionSnapshot;                          // Aggregate snapshot (computed from portfolioSnapshots when available)
  portfolioSnapshots?: Record<string, CompositionSnapshot>;  // Per-portfolio snapshots, keyed by portfolio ID
  locked: boolean;
  notes?: string;
}

export interface TimelinePlan {
  id: string;
  name: string;
  granularity: 'monthly' | 'quarterly';
  periods: TimelinePeriod[];
}

export interface TimelineData {
  plans: TimelinePlan[];
}
