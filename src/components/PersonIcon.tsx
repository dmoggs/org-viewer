import type { Person, Role, Location, EmployeeType } from '../types/org';
import { ROLE_LABELS } from '../types/org';
import { LOCATION_COLORS } from '../styles/chartColors';

interface PersonIconProps {
  person: Person;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  onClick?: () => void;
}

// Shape based on level/role
function getShape(role: Role): 'circle' | 'square' | 'diamond' {
  switch (role) {
    case 'engineer':
      return 'circle';
    case 'senior_engineer':
      return 'square';
    case 'engineering_manager': // Same level as Staff Engineer
    case 'staff_engineer':
    case 'head_of_engineering':
    case 'principal_engineer':
      return 'diamond';
  }
}

// Color based on location
function getColor(location: Location | undefined): string {
  switch (location) {
    case 'onshore':
      return LOCATION_COLORS.onshore;
    case 'nearshore':
      return LOCATION_COLORS.nearshore;
    case 'offshore':
      return LOCATION_COLORS.offshore;
    default:
      return 'rgb(156, 163, 175)'; // gray-400 (for backwards compatibility)
  }
}

// Fill based on employee type
function getFill(type: EmployeeType, color: string): { fill: string; stroke: string; strokeWidth: number } {
  if (type === 'employee') {
    return { fill: color, stroke: color, strokeWidth: 0 };
  } else {
    return { fill: 'transparent', stroke: color, strokeWidth: 2 };
  }
}

const sizeMap = {
  sm: 20,
  md: 28,
  lg: 36,
};

export function PersonIcon({ person, size = 'md', showTooltip = true, onClick }: PersonIconProps) {
  const shape = getShape(person.role);
  const color = getColor(person.location);
  const { fill, stroke, strokeWidth } = getFill(person.type, color);
  const s = sizeMap[size];
  const center = s / 2;

  const tooltipText = [
    person.name || 'Unnamed',
    ROLE_LABELS[person.role],
    person.type === 'contractor' ? `Contractor (${person.vendor || 'Unknown vendor'})` : 'Employee',
    person.location ? person.location.charAt(0).toUpperCase() + person.location.slice(1) : 'No location',
  ].join('\n');

  const renderShape = () => {
    switch (shape) {
      case 'circle':
        return (
          <circle
            cx={center}
            cy={center}
            r={center - 2 - strokeWidth / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'square':
        const padding = 2 + strokeWidth / 2;
        return (
          <rect
            x={padding}
            y={padding}
            width={s - padding * 2}
            height={s - padding * 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'diamond':
        const diamondPadding = 3 + strokeWidth / 2;
        const points = [
          `${center},${diamondPadding}`,
          `${s - diamondPadding},${center}`,
          `${center},${s - diamondPadding}`,
          `${diamondPadding},${center}`,
        ].join(' ');
        return (
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
    }
  };

  return (
    <div
      className={`inline-block ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      title={showTooltip ? tooltipText : undefined}
      onClick={onClick}
    >
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {renderShape()}
      </svg>
    </div>
  );
}
