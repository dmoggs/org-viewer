import type { TimelinePlan } from '../../types/timeline';
import { snapshotTotal } from '../../utils/timelineStats';
import { TIMELINE_COLORS } from '../../styles/chartColors';

interface HeadcountChartProps {
  plan: TimelinePlan;
}

export function HeadcountChart({ plan }: HeadcountChartProps) {
  if (plan.periods.length === 0) return null;

  const totals = plan.periods.map(p => snapshotTotal(p.planned));
  const deltas = totals.map((t, i) => i === 0 ? 0 : t - totals[i - 1]);
  const maxTotal = Math.max(...totals, 1);
  const maxDelta = Math.max(...deltas.map(Math.abs), 1);

  const chartW = Math.max(plan.periods.length * 70, 400);
  const chartH = 200;
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 40;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const gap = innerW / plan.periods.length;

  // Scale: use most of the height for line, bottom section for delta bars
  const lineH = innerH * 0.65;
  const deltaH = innerH * 0.3;
  const deltaTop = padT + lineH + innerH * 0.05;

  const points = totals.map((t, i) => ({
    x: padL + i * gap + gap / 2,
    y: padT + lineH - (t / maxTotal) * lineH,
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const barW = Math.min(30, gap * 0.5);

  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">Headcount + Net Change</div>
      <svg width={chartW} height={chartH} className="overflow-visible">
        {/* Grid */}
        {[0, Math.round(maxTotal / 2), maxTotal].map(tick => {
          const y = padT + lineH - (tick / maxTotal) * lineH;
          return (
            <g key={tick}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="text-[10px] fill-gray-400">{tick}</text>
            </g>
          );
        })}

        {/* Line */}
        <polyline points={polyline} fill="none" stroke="rgb(99, 102, 241)" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="rgb(99, 102, 241)">
            <title>{`${plan.periods[i].label}: ${totals[i]}`}</title>
          </circle>
        ))}

        {/* Delta bars */}
        {deltas.map((d, i) => {
          if (i === 0) return null;
          const x = padL + i * gap + (gap - barW) / 2;
          const h = (Math.abs(d) / maxDelta) * deltaH;
          const y = d >= 0 ? deltaTop + deltaH / 2 - h : deltaTop + deltaH / 2;
          const color = d >= 0 ? TIMELINE_COLORS.positive : TIMELINE_COLORS.negative;
          return (
            <rect key={i} x={x} y={y} width={barW} height={h} fill={color} rx={1} opacity={0.7}>
              <title>{`${plan.periods[i].label}: ${d >= 0 ? '+' : ''}${d}`}</title>
            </rect>
          );
        })}

        {/* Zero line for deltas */}
        <line x1={padL} x2={padL + innerW} y1={deltaTop + deltaH / 2} y2={deltaTop + deltaH / 2} stroke="#d1d5db" strokeWidth={1} strokeDasharray="3,3" />

        {/* X labels */}
        {plan.periods.map((period, i) => (
          <text key={period.id} x={padL + i * gap + gap / 2} y={chartH - padB + 14} textAnchor="middle" className="text-[9px] fill-gray-500">
            {period.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
