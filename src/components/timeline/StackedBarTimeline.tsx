import { useState } from 'react';
import type { TimelinePlan } from '../../types/timeline';
import { snapshotTotal } from '../../utils/timelineStats';
import { BAR_COLORS } from '../../styles/chartColors';

type Dimension = 'location' | 'type' | 'seniority';

interface StackedBarTimelineProps {
  plan: TimelinePlan;
}

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'location', label: 'Location' },
  { key: 'type', label: 'Type' },
  { key: 'seniority', label: 'Seniority' },
];

function getSegments(plan: TimelinePlan, dimension: Dimension) {
  return plan.periods.map(p => {
    const s = p.planned;
    switch (dimension) {
      case 'location':
        return [
          { value: s.onshore, label: 'Onshore', color: BAR_COLORS.primary },
          { value: s.nearshore, label: 'Nearshore', color: BAR_COLORS.tertiary },
          { value: s.offshore, label: 'Offshore', color: BAR_COLORS.secondary },
        ];
      case 'type':
        return [
          { value: s.employees, label: 'Employee', color: BAR_COLORS.primary },
          { value: s.contractors, label: 'Contractor', color: BAR_COLORS.secondary },
        ];
      case 'seniority':
        return [
          { value: s.seniorPlus, label: 'Senior+', color: BAR_COLORS.primary },
          { value: s.junior, label: 'Junior', color: BAR_COLORS.secondary },
        ];
    }
  });
}

export function StackedBarTimeline({ plan }: StackedBarTimelineProps) {
  const [dimension, setDimension] = useState<Dimension>('location');

  if (plan.periods.length === 0) return null;

  const segments = getSegments(plan, dimension);
  const maxTotal = Math.max(...plan.periods.map(p => snapshotTotal(p.planned)), 1);

  const chartW = Math.max(plan.periods.length * 70, 400);
  const chartH = 200;
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 40;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const barW = Math.min(40, (innerW / plan.periods.length) * 0.6);
  const gap = innerW / plan.periods.length;

  // Y-axis ticks
  const yTicks = [0, Math.round(maxTotal / 2), maxTotal];

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {DIMENSIONS.map(d => (
          <button
            key={d.key}
            onClick={() => setDimension(d.key)}
            className={`px-2 py-0.5 text-xs rounded ${dimension === d.key ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <svg width={chartW} height={chartH} className="overflow-visible">
        {/* Y-axis */}
        {yTicks.map(tick => {
          const y = padT + innerH - (tick / maxTotal) * innerH;
          return (
            <g key={tick}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="text-[10px] fill-gray-400">{tick}</text>
            </g>
          );
        })}
        {/* Bars */}
        {plan.periods.map((period, i) => {
          const segs = segments[i];
          const x = padL + i * gap + (gap - barW) / 2;
          let yOffset = 0;
          return (
            <g key={period.id}>
              {segs.map((seg, si) => {
                const h = (seg.value / maxTotal) * innerH;
                const y = padT + innerH - yOffset - h;
                yOffset += h;
                return (
                  <rect key={si} x={x} y={y} width={barW} height={h} fill={seg.color} rx={1}>
                    <title>{`${seg.label}: ${seg.value}`}</title>
                  </rect>
                );
              })}
              <text x={x + barW / 2} y={chartH - padB + 14} textAnchor="middle" className="text-[9px] fill-gray-500">
                {period.label}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex gap-4 mt-1 text-xs text-gray-500">
        {segments[0]?.map(seg => (
          <span key={seg.label} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}
