import type { Team, Person } from '../types/org';
import { PersonIcon } from './PersonIcon';

interface TeamSectionProps {
  team: Team;
  compact?: boolean;
  onAddMember: () => void;
  onEditMember: (person: Person) => void;
  onDeleteMember: (personId: string) => void;
  onEditTeam: () => void;
  onDeleteTeam: () => void;
}

export function TeamSection({
  team,
  compact = false,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onEditTeam,
  onDeleteTeam,
}: TeamSectionProps) {
  const iconSize = 'sm' as const;

  return (
    <div className={`border border-gray-200 rounded-md ${compact ? 'p-1.5' : 'p-3'} bg-gray-50`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-1' : 'mb-2'}`}>
        <h4 className={`font-medium text-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}>{team.name}</h4>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onAddMember}
            className={`${compact ? 'text-[10px] px-1 py-0.5' : 'text-xs px-2 py-1'} text-blue-600 hover:bg-blue-50 rounded`}
            title="Add member"
          >
            +
          </button>
          <button
            onClick={onEditTeam}
            className={`${compact ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-1'} text-gray-500 hover:bg-gray-200 rounded`}
            title="Edit team"
          >
            Edit
          </button>
          <button
            onClick={onDeleteTeam}
            className={`${compact ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-1'} text-red-500 hover:bg-red-50 rounded`}
            title="Delete team"
          >
            Del
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-0.5">
        {team.members.length === 0 ? (
          <span className={`text-gray-400 italic ${compact ? 'text-[10px]' : 'text-xs'}`}>No members</span>
        ) : (
          team.members.map(member => (
            <div key={member.id} className="relative group">
              <PersonIcon
                person={member}
                size={iconSize}
                onClick={() => onEditMember(member)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMember(member.id);
                }}
                className={`absolute -top-0.5 -right-0.5 ${compact ? 'w-3 h-3 text-[8px]' : 'w-4 h-4 text-xs'} bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center leading-none`}
                title="Remove member"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
