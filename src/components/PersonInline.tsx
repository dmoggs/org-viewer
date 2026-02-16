import type { Person } from '../types/org';
import { PersonIcon } from './PersonIcon';

interface PersonInlineProps {
  person: Person;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onRemove?: () => void;
}

export function PersonInline({ person, size = 'sm', onClick, onRemove }: PersonInlineProps) {
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="inline-flex items-center gap-1 group relative">
      <PersonIcon person={person} size={size} showTooltip={false} />
      <span
        className={`${textClass} text-gray-700 ${onClick ? 'cursor-pointer hover:text-gray-900' : ''}`}
        onClick={onClick}
      >
        {person.name || 'Unnamed'}
      </span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center leading-none"
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}
