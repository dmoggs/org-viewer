import type { TimelinePlan } from '../../types/timeline';
import { snapshotTotal } from '../../utils/timelineStats';
import { TIMELINE_COLORS } from '../../styles/chartColors';

interface RatioTrackingChartProps {
  plan: TimelinePlan;
  onshoreTarget: number;
}

interface Series {
  label: string;
  color: string;
  values: number[];
  target?: number;
}

export function RatioTrackingChart({ plan, onshoreTarget }: RatioTrackingChartProps) {
  if (plan.periods.length === 0) return null;

  const series: Series[] = [
    {
      label: 'Employee %',
      color: TIMELINE_COLORS.employeeLine,
      values: plan.periods.map(p => {
        const total = snapshotTotal(p.planned);
        return total > 0 ? (p.planned.employees / total) * 100 : 0;
      }),
      target: 30,
    },
    {
      label: 'Onshore %',
      color: TIMELINE_COLORS.onshoreLine,
      values: plan.periods.map(p => {
        const total = snapshotTotal(p.planned);
        return total > 0 ? (p.planned.onshore / total) * 100 : 0;
      }),
      target: onshoreTarget,
    },
    {
      label: 'Senior+ %',
      color: TIMELINE_COLORS.seniorLine,
      values: plan.periods.map(p => {
        const total = snapshotTotal(p.planned);
        return total > 0 ? (p.planned.seniorPlus / total) * 100 : 0;
      }),
      target: 50,
    },
  ];

  const chartW = Math.max(plan.periods.length * 70, 400);
  const chartH = 200;
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 40;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const gap = innerW / plan.periods.length;

  const maxY = 100;

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">Ratio Tracking (%)</div>
      <svg width={chartW} height={chartH} className="overflow-visible">
        {/* Grid */}
        {yTicks.map(tick => {
          const y = padT + innerH - (tick / maxY) * innerH;
          return (
            <g key={tick}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="text-[10px] fill-gray-400">{tick}%</text>
            </g>
          );
        })}

        {/* Target lines */}
        {series.map(s => s.target !== undefined && (
          <line
            key={`target-${s.label}`}
            x1={padL}
            x2={padL + innerW}
            y1={padT + innerH - (s.target / maxY) * innerH}
            y2={padT + innerH - (s.target / maxY) * innerH}
            stroke={s.color}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.5}
          />
        ))}

        {/* Lines */}
        {series.map(s => {
          const points = s.values.map((v, i) => ({
            x: padL + i * gap + gap / 2,
            y: padT + innerH - (v / maxY) * innerH,
          }));
          const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
          return (
            <g key={s.label}>
              <polyline points={polyline} fill="none" stroke={s.color} strokeWidth={2} />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color}>
                  <title>{`${s.label}: ${s.values[i].toFixed(1)}%`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* X labels */}
        {plan.periods.map((period, i) => (
          <text key={period.id} x={padL + i * gap + gap / 2} y={chartH - padB + 14} textAnchor="middle" className="text-[9px] fill-gray-500">
            {period.label}
          </text>
        ))}
      </svg>
      {/* Legend */}
      <div className="flex gap-4 mt-1 text-xs text-gray-500">
        {series.map(s => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5" style={{ backgroundColor: s.color }} />
            {s.label}{s.target !== undefined && ` (target: ${s.target}%)`}
          </span>
        ))}
      </div>
    </div>
  );
}
