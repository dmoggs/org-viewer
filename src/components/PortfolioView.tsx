import { useState } from 'react';
import type { Portfolio, Person } from '../types/org';
import { PersonInline } from './PersonInline';
import { GroupCard } from './GroupCard';
import { DivisionCard } from './DivisionCard';

interface PortfolioViewProps {
  portfolio: Portfolio;
  onTreeView: () => void;
  onEditPortfolio: () => void;
  onDeletePortfolio: () => void;
  onSetHeadOfEngineering: () => void;
  onRemoveHeadOfEngineering: () => void;
  onAddPrincipalEngineer: () => void;
  onRemovePrincipalEngineer: (personId: string) => void;
  onEditPrincipalEngineer: (person: Person) => void;
  // Division operations
  onAddDivision: () => void;
  onEditDivision: (divisionId: string) => void;
  onDeleteDivision: (divisionId: string) => void;
  // Group operations (divisionId is optional - undefined for direct groups)
  onAddGroup: (divisionId?: string) => void;
  onEditGroup: (groupId: string, divisionId?: string) => void;
  onDeleteGroup: (groupId: string, divisionId?: string) => void;
  onSetGroupManager: (groupId: string, divisionId?: string) => void;
  onRemoveGroupManager: (groupId: string, divisionId?: string) => void;
  onAddGroupStaffEngineer: (groupId: string, divisionId?: string) => void;
  onRemoveGroupStaffEngineer: (groupId: string, personId: string, divisionId?: string) => void;
  onEditGroupStaffEngineer: (groupId: string, person: Person, divisionId?: string) => void;
  onAddTeam: (groupId: string, divisionId?: string) => void;
  onEditTeam: (groupId: string, teamId: string, divisionId?: string) => void;
  onDeleteTeam: (groupId: string, teamId: string, divisionId?: string) => void;
  onAddTeamMember: (groupId: string, teamId: string, divisionId?: string) => void;
  onEditTeamMember: (groupId: string, teamId: string, person: Person, divisionId?: string) => void;
  onDeleteTeamMember: (groupId: string, teamId: string, personId: string, divisionId?: string) => void;
  onMoveGroupToDivision: (groupId: string, fromDivisionId: string, toDivisionId: string) => void;
}

export function PortfolioView({
  portfolio,
  onTreeView,
  onEditPortfolio,
  onDeletePortfolio,
  onSetHeadOfEngineering,
  onRemoveHeadOfEngineering,
  onAddPrincipalEngineer,
  onRemovePrincipalEngineer,
  onEditPrincipalEngineer,
  onAddDivision,
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
  onMoveGroupToDivision,
}: PortfolioViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Track which group is being dragged: { groupId, fromDivisionId }
  const [drag, setDrag] = useState<{ groupId: string; fromDivisionId: string } | null>(null);
  const hasDivisions = portfolio.divisions && portfolio.divisions.length > 0;

  return (
    <div className="border-2 border-indigo-300 rounded-xl bg-indigo-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-indigo-100 border-b border-indigo-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-indigo-500 hover:text-indigo-700"
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
          <h2 className="text-lg font-bold text-indigo-900">{portfolio.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTreeView}
            className="text-sm px-3 py-1.5 bg-slate-600 text-white rounded-md hover:bg-slate-700"
          >
            Tree View
          </button>
          <button
            onClick={onAddDivision}
            className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            + Division
          </button>
          <button
            onClick={() => onAddGroup()}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            + Group
          </button>
          <button
            onClick={onEditPortfolio}
            className="text-sm px-2 py-1.5 text-indigo-700 hover:bg-indigo-200 rounded-md"
          >
            Edit
          </button>
          <button
            onClick={onDeletePortfolio}
            className="text-sm px-2 py-1.5 text-red-600 hover:bg-red-100 rounded-md"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Portfolio Leadership */}
          <div className="flex items-start gap-8 p-3 bg-white rounded-lg border border-indigo-200">
            {/* Head of Engineering */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Head of Engineering
              </div>
              {portfolio.headOfEngineering ? (
                <PersonInline
                  person={portfolio.headOfEngineering}
                  onClick={onSetHeadOfEngineering}
                  onRemove={onRemoveHeadOfEngineering}
                />
              ) : (
                <button
                  onClick={onSetHeadOfEngineering}
                  className="text-xs px-2 py-1 border border-dashed border-indigo-300 rounded text-indigo-400 hover:border-indigo-400 hover:text-indigo-500"
                  title="Add Head of Engineering"
                >
                  + Add HoE
                </button>
              )}
            </div>

            {/* Principal Engineers */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Principal Engineers
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {portfolio.principalEngineers.map(pe => (
                  <PersonInline
                    key={pe.id}
                    person={pe}
                    onClick={() => onEditPrincipalEngineer(pe)}
                    onRemove={() => onRemovePrincipalEngineer(pe.id)}
                  />
                ))}
                <button
                  onClick={onAddPrincipalEngineer}
                  className="text-xs px-2 py-1 border border-dashed border-indigo-300 rounded text-indigo-400 hover:border-indigo-400 hover:text-indigo-500"
                  title="Add principal engineer"
                >
                  + Add Principal
                </button>
              </div>
            </div>
          </div>

          {/* Divisions */}
          {hasDivisions && (
            <div className="space-y-3">
              {portfolio.divisions!.map(division => (
              <DivisionCard
                  key={division.id}
                  division={division}
                  onEditDivision={() => onEditDivision(division.id)}
                  onDeleteDivision={() => onDeleteDivision(division.id)}
                  onAddGroup={() => onAddGroup(division.id)}
                  onEditGroup={(groupId) => onEditGroup(groupId, division.id)}
                  onDeleteGroup={(groupId) => onDeleteGroup(groupId, division.id)}
                  onSetGroupManager={(groupId) => onSetGroupManager(groupId, division.id)}
                  onRemoveGroupManager={(groupId) => onRemoveGroupManager(groupId, division.id)}
                  onAddGroupStaffEngineer={(groupId) => onAddGroupStaffEngineer(groupId, division.id)}
                  onRemoveGroupStaffEngineer={(groupId, personId) => onRemoveGroupStaffEngineer(groupId, personId, division.id)}
                  onEditGroupStaffEngineer={(groupId, person) => onEditGroupStaffEngineer(groupId, person, division.id)}
                  onAddTeam={(groupId) => onAddTeam(groupId, division.id)}
                  onEditTeam={(groupId, teamId) => onEditTeam(groupId, teamId, division.id)}
                  onDeleteTeam={(groupId, teamId) => onDeleteTeam(groupId, teamId, division.id)}
                  onAddTeamMember={(groupId, teamId) => onAddTeamMember(groupId, teamId, division.id)}
                  onEditTeamMember={(groupId, teamId, person) => onEditTeamMember(groupId, teamId, person, division.id)}
                  onDeleteTeamMember={(groupId, teamId, personId) => onDeleteTeamMember(groupId, teamId, personId, division.id)}
                  onGroupDragStart={(groupId) => setDrag({ groupId, fromDivisionId: division.id })}
                  onGroupDragEnd={() => setDrag(null)}
                  onDivisionDrop={() => {
                    if (drag) onMoveGroupToDivision(drag.groupId, drag.fromDivisionId, division.id);
                    setDrag(null);
                  }}
                  isDraggingFromHere={drag?.fromDivisionId === division.id}
                  isDragActive={drag !== null}
                />
              ))}
            </div>
          )}

          {/* Direct Groups (not in divisions) */}
          <div className="space-y-3">
            {portfolio.groups.length === 0 && !hasDivisions ? (
              <p className="text-sm text-gray-500 italic text-center py-4">
                No groups or divisions yet. Add one to get started.
              </p>
            ) : (
              portfolio.groups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
