import { useState } from 'react';
import type { Division, Person } from '../types/org';
import { GroupCard } from './GroupCard';

interface DivisionCardProps {
  division: Division;
  onEditDivision: () => void;
  onDeleteDivision: () => void;
  onAddGroup: () => void;
  onEditGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onSetGroupManager: (groupId: string) => void;
  onRemoveGroupManager: (groupId: string) => void;
  onAddGroupStaffEngineer: (groupId: string) => void;
  onRemoveGroupStaffEngineer: (groupId: string, personId: string) => void;
  onEditGroupStaffEngineer: (groupId: string, person: Person) => void;
  onAddTeam: (groupId: string) => void;
  onEditTeam: (groupId: string, teamId: string) => void;
  onDeleteTeam: (groupId: string, teamId: string) => void;
  onAddTeamMember: (groupId: string, teamId: string) => void;
  onEditTeamMember: (groupId: string, teamId: string, person: Person) => void;
  onDeleteTeamMember: (groupId: string, teamId: string, personId: string) => void;
  // Drag-and-drop between divisions
  onGroupDragStart: (groupId: string) => void;
  onGroupDragEnd: () => void;
  onDivisionDrop: () => void;
  isDraggingFromHere: boolean;
  isDragActive: boolean;
}

export function DivisionCard({
  division,
  onEditDivision,
  onDeleteDivision,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
  onSetGroupManager,
  onRemoveGroupManager,
  onAddGroupStaffEngineer,
  onRemoveGroupStaffEngineer,
  onEditGroupStaffEngineer,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onAddTeamMember,
  onEditTeamMember,
  onDeleteTeamMember,
  onGroupDragStart,
  onGroupDragEnd,
  onDivisionDrop,
  isDraggingFromHere,
  isDragActive,
}: DivisionCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const isDropTarget = isDragActive && !isDraggingFromHere;

  const totalMembers = division.groups.reduce((sum, g) =>
    sum + (g.manager ? 1 : 0) + g.staffEngineers.length + g.teams.reduce((s, t) => s + t.members.length, 0), 0);

  return (
    <div
      className={`border-2 rounded-lg overflow-hidden transition-colors ${
        isOver && isDropTarget
          ? 'border-purple-500 bg-purple-100'
          : isDropTarget
          ? 'border-purple-400 border-dashed bg-purple-50/80'
          : 'border-purple-200 bg-purple-50'
      }`}
      onDragOver={isDropTarget ? (e) => { e.preventDefault(); setIsOver(true); } : undefined}
      onDragLeave={isDropTarget ? () => setIsOver(false) : undefined}
      onDrop={isDropTarget ? (e) => { e.preventDefault(); setIsOver(false); onDivisionDrop(); } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-purple-100 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-purple-500 hover:text-purple-700 text-sm"
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
          <h3 className="font-semibold text-purple-900">{division.name}</h3>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-700 text-xs font-medium">
            <svg viewBox="0 0 14 14" className="w-3 h-3 flex-shrink-0" fill="currentColor">
              <circle cx="7" cy="4.5" r="2.5" />
              <path d="M1.5 12c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5H1.5z" />
            </svg>
            {totalMembers}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddGroup}
            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            + Group
          </button>
          <button
            onClick={onEditDivision}
            className="text-xs px-2 py-1 text-purple-700 hover:bg-purple-200 rounded"
          >
            Edit
          </button>
          <button
            onClick={onDeleteDivision}
            className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Content - Groups displayed side by side */}
      {!isCollapsed && (
        <div className="p-2">
          {division.groups.length === 0 ? (
            <p className={`text-sm italic text-center py-4 ${
              isOver && isDropTarget ? 'text-purple-600 font-medium' : 'text-gray-500'
            }`}>
              {isOver && isDropTarget
                ? 'Drop to move group here'
                : isDropTarget
                ? 'Drag a group here to move it'
                : 'No groups yet. Click "+ Group" to add one.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {division.groups.map(group => (
                <div
                  key={group.id}
                  className={`w-[440px] flex-shrink-0 ${
                    isDraggingFromHere ? 'opacity-60' : ''
                  }`}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onGroupDragStart(group.id); }}
                  onDragEnd={onGroupDragEnd}
                >
                  <GroupCard
                    group={group}
                    compact={true}
                    onAddTeam={() => onAddTeam(group.id)}
                    onEditGroup={() => onEditGroup(group.id)}
                    onDeleteGroup={() => onDeleteGroup(group.id)}
                    onSetManager={() => onSetGroupManager(group.id)}
                    onRemoveManager={() => onRemoveGroupManager(group.id)}
                    onAddStaffEngineer={() => onAddGroupStaffEngineer(group.id)}
                    onRemoveStaffEngineer={(personId) => onRemoveGroupStaffEngineer(group.id, personId)}
                    onEditStaffEngineer={(person) => onEditGroupStaffEngineer(group.id, person)}
                    onAddMemberToTeam={(teamId) => onAddTeamMember(group.id, teamId)}
                    onEditMemberInTeam={(teamId, person) => onEditTeamMember(group.id, teamId, person)}
                    onDeleteMemberFromTeam={(teamId, personId) => onDeleteTeamMember(group.id, teamId, personId)}
                    onEditTeam={(teamId) => onEditTeam(group.id, teamId)}
                    onDeleteTeam={(teamId) => onDeleteTeam(group.id, teamId)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
