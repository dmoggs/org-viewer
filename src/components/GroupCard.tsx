import { useState } from 'react';
import type { Group, Person } from '../types/org';
import { PersonInline } from './PersonInline';
import { TeamSection } from './TeamSection';

interface GroupCardProps {
  group: Group;
  compact?: boolean; // When true, uses smaller icons and tighter spacing (for display within divisions)
  onAddTeam: () => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onSetManager: () => void;
  onRemoveManager: () => void;
  onAddStaffEngineer: () => void;
  onRemoveStaffEngineer: (personId: string) => void;
  onEditStaffEngineer: (person: Person) => void;
  onAddMemberToTeam: (teamId: string) => void;
  onEditMemberInTeam: (teamId: string, person: Person) => void;
  onDeleteMemberFromTeam: (teamId: string, personId: string) => void;
  onEditTeam: (teamId: string) => void;
  onDeleteTeam: (teamId: string) => void;
}

export function GroupCard({
  group,
  compact = false,
  onAddTeam,
  onEditGroup,
  onDeleteGroup,
  onSetManager,
  onRemoveManager,
  onAddStaffEngineer,
  onRemoveStaffEngineer,
  onEditStaffEngineer,
  onAddMemberToTeam,
  onEditMemberInTeam,
  onDeleteMemberFromTeam,
  onEditTeam,
  onDeleteTeam,
}: GroupCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const iconSize = 'sm' as const;

  const totalMembers =
    (group.manager ? 1 : 0) +
    group.staffEngineers.length +
    group.teams.reduce((sum, t) => sum + t.members.length, 0);

  return (
    <div className={`border ${compact ? 'border-gray-200' : 'border-2 border-gray-300'} rounded-lg bg-white overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${compact ? 'px-2 py-1.5' : 'p-3'} bg-gray-100 border-b border-gray-200`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
          <h3 className={`font-semibold text-gray-800 ${compact ? 'text-sm' : ''}`}>{group.name}</h3>
          <span className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>({totalMembers})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddTeam}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Team
          </button>
          <button
            onClick={onEditGroup}
            className="text-xs px-1.5 py-1 text-gray-600 hover:bg-gray-200 rounded"
          >
            Edit
          </button>
          <button
            onClick={onDeleteGroup}
            className="text-xs px-1.5 py-1 text-red-500 hover:bg-red-50 rounded"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className={`${compact ? 'p-2 space-y-2' : 'p-4 space-y-4'}`}>
          {/* Leadership row */}
          <div className={`flex items-start ${compact ? 'gap-3 flex-wrap' : 'gap-6'}`}>
            {/* Manager */}
            <div>
              <div className={`font-medium text-gray-500 uppercase tracking-wide mb-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                EM
              </div>
              {group.manager ? (
                <PersonInline
                  person={group.manager}
                  size={iconSize}
                  onClick={onSetManager}
                  onRemove={onRemoveManager}
                />
              ) : (
                <button
                  onClick={onSetManager}
                  className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded text-gray-400 hover:border-gray-400 hover:text-gray-500"
                  title="Add manager"
                >
                  +
                </button>
              )}
            </div>

            {/* Staff Engineers */}
            <div>
              <div className={`font-medium text-gray-500 uppercase tracking-wide mb-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                Staff
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {group.staffEngineers.map(se => (
                  <PersonInline
                    key={se.id}
                    person={se}
                    size={iconSize}
                    onClick={() => onEditStaffEngineer(se)}
                    onRemove={() => onRemoveStaffEngineer(se.id)}
                  />
                ))}
                <button
                  onClick={onAddStaffEngineer}
                  className="text-xs px-1.5 py-0.5 border border-dashed border-gray-300 rounded text-gray-400 hover:border-gray-400 hover:text-gray-500"
                  title="Add staff engineer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Teams */}
          <div>
            <div className={`font-medium text-gray-500 uppercase tracking-wide ${compact ? 'text-[10px] mb-1' : 'text-xs mb-2'}`}>
              Teams
            </div>
            <div className={compact ? 'space-y-1' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2'}>
              {group.teams.length === 0 ? (
                <p className={`text-gray-400 italic ${compact ? 'text-xs' : 'text-sm'}`}>No teams yet</p>
              ) : (
                group.teams.map(team => (
                  <TeamSection
                    key={team.id}
                    team={team}
                    compact={compact}
                    onAddMember={() => onAddMemberToTeam(team.id)}
                    onEditMember={(person) => onEditMemberInTeam(team.id, person)}
                    onDeleteMember={(personId) => onDeleteMemberFromTeam(team.id, personId)}
                    onEditTeam={() => onEditTeam(team.id)}
                    onDeleteTeam={() => onDeleteTeam(team.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
