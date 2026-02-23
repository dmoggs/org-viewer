import { useState } from 'react';
import type { Person, Role } from './types/org';
import { useOrgData } from './hooks/useOrgData';
import { useTimelineData } from './hooks/useTimelineData';
import { calculateStats } from './utils/stats';
import { PortfolioView } from './components/PortfolioView';
import { SummaryPanel } from './components/SummaryPanel';
import { Legend } from './components/Legend';
import { PersonForm } from './components/PersonForm';
import { NameForm } from './components/NameForm';
import { PortfolioForm } from './components/PortfolioForm';
import { TimelineView } from './components/timeline/TimelineView';
import { OrgTreeView } from './components/OrgTreeView';

type ModalType =
  | { type: 'portfolio'; mode: 'add' }
  | { type: 'portfolio'; mode: 'edit'; portfolioId: string; name: string }
  | { type: 'division'; mode: 'add'; portfolioId: string }
  | { type: 'division'; mode: 'edit'; portfolioId: string; divisionId: string; name: string }
  | { type: 'group'; mode: 'add'; portfolioId: string; divisionId?: string }
  | { type: 'group'; mode: 'edit'; portfolioId: string; groupId: string; name: string; divisionId?: string }
  | { type: 'team'; mode: 'add'; portfolioId: string; groupId: string; divisionId?: string }
  | { type: 'team'; mode: 'edit'; portfolioId: string; groupId: string; teamId: string; name: string; divisionId?: string }
  | { type: 'hoe'; portfolioId: string; person?: Person }
  | { type: 'principal'; mode: 'add'; portfolioId: string }
  | { type: 'principal'; mode: 'edit'; portfolioId: string; person: Person }
  | { type: 'manager'; portfolioId: string; groupId: string; divisionId?: string; person?: Person }
  | { type: 'staff'; mode: 'add'; portfolioId: string; groupId: string; divisionId?: string }
  | { type: 'staff'; mode: 'edit'; portfolioId: string; groupId: string; divisionId?: string; person: Person }
  | { type: 'member'; mode: 'add'; portfolioId: string; groupId: string; teamId: string; divisionId?: string }
  | { type: 'member'; mode: 'edit'; portfolioId: string; groupId: string; teamId: string; divisionId?: string; person: Person }
  | null;

function App() {
  const {
    data,
    loading,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    addDivision,
    updateDivision,
    deleteDivision,
    addGroup,
    updateGroup,
    deleteGroup,
    moveGroupToDivision,
    addTeam,
    updateTeam,
    deleteTeam,
    createPerson,
    addPersonToTeam,
    updatePersonInTeam,
    removePersonFromTeam,
    addStaffEngineerToGroup,
    removeStaffEngineerFromGroup,
    addPrincipalEngineerToPortfolio,
    removePrincipalEngineerFromPortfolio,
    exportData,
    importData,
    loadTestData,
  } = useOrgData();

  const [modal, setModal] = useState<ModalType>(null);
  const [viewMode, setViewMode] = useState<'org' | 'timeline'>('org');
  const [treeViewPortfolioId, setTreeViewPortfolioId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const stats = calculateStats(data);

  const { data: timelineData, createPlan, deletePlan, updatePeriodSnapshot, togglePeriodLock } = useTimelineData(stats, data.portfolios);

  // Calculate average onshore target across all portfolios
  const averageonshoreTarget = data.portfolios.length > 0
    ? data.portfolios.reduce((sum, p) => sum + (p.onshoreTargetPercentage ?? 50), 0) / data.portfolios.length
    : 50;

  // Helper to find a group (either direct or within a division)
  const findGroup = (portfolioId: string, groupId: string, divisionId?: string) => {
    const portfolio = data.portfolios.find(p => p.id === portfolioId);
    if (!portfolio) return null;
    if (divisionId) {
      const division = portfolio.divisions?.find(d => d.id === divisionId);
      return division?.groups.find(g => g.id === groupId) ?? null;
    }
    return portfolio.groups.find(g => g.id === groupId) ?? null;
  };

  const handleExport = () => {
    const jsonData = exportData();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'org-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (importData(content)) {
            alert('Data imported successfully');
          } else {
            alert('Failed to import data. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-gray-900">Org Viewer</h1>
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('org')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'org' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Org View
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'timeline' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Timeline
              </button>
            </div>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? 'Hide stats panel' : 'Show stats panel'}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                sidebarOpen
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'border-gray-300 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="12" height="12" rx="1.5" />
                <line x1="5" y1="1" x2="5" y2="13" />
              </svg>
              Stats
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (data.portfolios.length === 0 || confirm('This will replace all existing data. Continue?')) {
                  loadTestData();
                }
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Load Test Data
            </button>
            <button
              onClick={handleImport}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Import
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Export
            </button>
            <button
              onClick={() => setModal({ type: 'portfolio', mode: 'add' })}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              + Portfolio
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 p-4 space-y-4 flex-shrink-0">
            <SummaryPanel stats={stats} onshoreTargetPercentage={averageonshoreTarget} />
            <Legend />
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 space-y-4 min-w-0">
          {viewMode === 'timeline' ? (
            <TimelineView
              data={timelineData}
              portfolios={data.portfolios}
              onshoreTarget={averageonshoreTarget}
              onCreatePlan={createPlan}
              onDeletePlan={deletePlan}
              onUpdateSnapshot={updatePeriodSnapshot}
              onToggleLock={togglePeriodLock}
            />
          ) : data.portfolios.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No portfolios yet</p>
              <button
                onClick={() => setModal({ type: 'portfolio', mode: 'add' })}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create your first portfolio
              </button>
            </div>
          ) : (
            data.portfolios.map(portfolio => (
              <PortfolioView
                key={portfolio.id}
                portfolio={portfolio}
                onTreeView={() => setTreeViewPortfolioId(portfolio.id)}
                onEditPortfolio={() => setModal({ type: 'portfolio', mode: 'edit', portfolioId: portfolio.id, name: portfolio.name })}
                onDeletePortfolio={() => {
                  if (confirm(`Delete portfolio "${portfolio.name}"?`)) {
                    deletePortfolio(portfolio.id);
                  }
                }}
                onSetHeadOfEngineering={() => setModal({ type: 'hoe', portfolioId: portfolio.id, person: portfolio.headOfEngineering })}
                onRemoveHeadOfEngineering={() => {
                  updatePortfolio(portfolio.id, { headOfEngineering: undefined });
                }}
                onAddPrincipalEngineer={() => setModal({ type: 'principal', mode: 'add', portfolioId: portfolio.id })}
                onRemovePrincipalEngineer={(personId) => removePrincipalEngineerFromPortfolio(portfolio.id, personId)}
                onEditPrincipalEngineer={(person) => setModal({ type: 'principal', mode: 'edit', portfolioId: portfolio.id, person })}
                // Division operations
                onAddDivision={() => setModal({ type: 'division', mode: 'add', portfolioId: portfolio.id })}
                onEditDivision={(divisionId) => {
                  const division = portfolio.divisions?.find(d => d.id === divisionId);
                  if (division) {
                    setModal({ type: 'division', mode: 'edit', portfolioId: portfolio.id, divisionId, name: division.name });
                  }
                }}
                onDeleteDivision={(divisionId) => {
                  const division = portfolio.divisions?.find(d => d.id === divisionId);
                  if (division && confirm(`Delete division "${division.name}"?`)) {
                    deleteDivision(portfolio.id, divisionId);
                  }
                }}
                // Group operations (with optional divisionId)
                onAddGroup={(divisionId) => setModal({ type: 'group', mode: 'add', portfolioId: portfolio.id, divisionId })}
                onEditGroup={(groupId, divisionId) => {
                  const group = findGroup(portfolio.id, groupId, divisionId);
                  if (group) {
                    setModal({ type: 'group', mode: 'edit', portfolioId: portfolio.id, groupId, name: group.name, divisionId });
                  }
                }}
                onDeleteGroup={(groupId, divisionId) => {
                  const group = findGroup(portfolio.id, groupId, divisionId);
                  if (group && confirm(`Delete group "${group.name}"?`)) {
                    deleteGroup(portfolio.id, groupId, divisionId);
                  }
                }}
                onSetGroupManager={(groupId, divisionId) => {
                  const group = findGroup(portfolio.id, groupId, divisionId);
                  setModal({ type: 'manager', portfolioId: portfolio.id, groupId, divisionId, person: group?.manager });
                }}
                onRemoveGroupManager={(groupId, divisionId) => {
                  updateGroup(portfolio.id, groupId, { manager: undefined }, divisionId);
                }}
                onAddGroupStaffEngineer={(groupId, divisionId) => setModal({ type: 'staff', mode: 'add', portfolioId: portfolio.id, groupId, divisionId })}
                onRemoveGroupStaffEngineer={(groupId, personId, divisionId) => removeStaffEngineerFromGroup(portfolio.id, groupId, personId, divisionId)}
                onEditGroupStaffEngineer={(groupId, person, divisionId) => setModal({ type: 'staff', mode: 'edit', portfolioId: portfolio.id, groupId, divisionId, person })}
                onAddTeam={(groupId, divisionId) => setModal({ type: 'team', mode: 'add', portfolioId: portfolio.id, groupId, divisionId })}
                onEditTeam={(groupId, teamId, divisionId) => {
                  const group = findGroup(portfolio.id, groupId, divisionId);
                  const team = group?.teams.find(t => t.id === teamId);
                  if (team) {
                    setModal({ type: 'team', mode: 'edit', portfolioId: portfolio.id, groupId, teamId, name: team.name, divisionId });
                  }
                }}
                onDeleteTeam={(groupId, teamId, divisionId) => {
                  const group = findGroup(portfolio.id, groupId, divisionId);
                  const team = group?.teams.find(t => t.id === teamId);
                  if (team && confirm(`Delete team "${team.name}"?`)) {
                    deleteTeam(portfolio.id, groupId, teamId, divisionId);
                  }
                }}
                onAddTeamMember={(groupId, teamId, divisionId) => setModal({ type: 'member', mode: 'add', portfolioId: portfolio.id, groupId, teamId, divisionId })}
                onEditTeamMember={(groupId, teamId, person, divisionId) => setModal({ type: 'member', mode: 'edit', portfolioId: portfolio.id, groupId, teamId, divisionId, person })}
                onMoveGroupToDivision={(groupId, fromDivisionId, toDivisionId) =>
                  moveGroupToDivision(portfolio.id, groupId, fromDivisionId, toDivisionId)
                }
                onDeleteTeamMember={(groupId, teamId, personId, divisionId) => {
                  if (confirm('Remove this member?')) {
                    removePersonFromTeam(portfolio.id, groupId, teamId, personId, divisionId);
                  }
                }}
              />
            ))
          )}
        </main>
      </div>

      {/* Modals */}
      {treeViewPortfolioId && (() => {
        const p = data.portfolios.find(p => p.id === treeViewPortfolioId);
        return p ? (
          <OrgTreeView portfolio={p} onClose={() => setTreeViewPortfolioId(null)} />
        ) : null;
      })()}

      {modal?.type === 'portfolio' && modal.mode === 'add' && (
        <PortfolioForm
          title="Add Portfolio"
          onSave={(name, onshoreTargetPercentage) => {
            const portfolio = addPortfolio(name);
            updatePortfolio(portfolio.id, { onshoreTargetPercentage });
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'portfolio' && modal.mode === 'edit' && (
        <PortfolioForm
          title="Edit Portfolio"
          initialName={modal.name}
          initialTarget={data.portfolios.find(p => p.id === modal.portfolioId)?.onshoreTargetPercentage}
          onSave={(name, onshoreTargetPercentage) => {
            updatePortfolio(modal.portfolioId, { name, onshoreTargetPercentage });
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'division' && modal.mode === 'add' && (
        <NameForm
          title="Add Division"
          label="Division Name"
          onSave={(name) => {
            addDivision(modal.portfolioId, name);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'division' && modal.mode === 'edit' && (
        <NameForm
          title="Edit Division"
          label="Division Name"
          initialValue={modal.name}
          onSave={(name) => {
            updateDivision(modal.portfolioId, modal.divisionId, { name });
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'group' && modal.mode === 'add' && (
        <NameForm
          title="Add Group"
          label="Group Name"
          onSave={(name) => {
            addGroup(modal.portfolioId, name, modal.divisionId);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'group' && modal.mode === 'edit' && (
        <NameForm
          title="Edit Group"
          label="Group Name"
          initialValue={modal.name}
          onSave={(name) => {
            updateGroup(modal.portfolioId, modal.groupId, { name }, modal.divisionId);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'team' && modal.mode === 'add' && (
        <NameForm
          title="Add Team"
          label="Team Name"
          onSave={(name) => {
            addTeam(modal.portfolioId, modal.groupId, name, modal.divisionId);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'team' && modal.mode === 'edit' && (
        <NameForm
          title="Edit Team"
          label="Team Name"
          initialValue={modal.name}
          onSave={(name) => {
            updateTeam(modal.portfolioId, modal.groupId, modal.teamId, { name }, modal.divisionId);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'hoe' && (
        <PersonForm
          title={modal.person ? 'Edit Head of Engineering' : 'Add Head of Engineering'}
          person={modal.person}
          allowedRoles={['head_of_engineering'] as Role[]}
          onSave={(personData) => {
            const person = modal.person
              ? { ...modal.person, ...personData }
              : createPerson(personData);
            updatePortfolio(modal.portfolioId, { headOfEngineering: person });
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'principal' && modal.mode === 'add' && (
        <PersonForm
          title="Add Principal Engineer"
          allowedRoles={['principal_engineer'] as Role[]}
          onSave={(personData) => {
            const person = createPerson(personData);
            addPrincipalEngineerToPortfolio(modal.portfolioId, person);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'principal' && modal.mode === 'edit' && (
        <PersonForm
          title="Edit Principal Engineer"
          person={modal.person}
          allowedRoles={['principal_engineer'] as Role[]}
          onSave={(personData) => {
            // For editing, we need to update in place
            const portfolio = data.portfolios.find(p => p.id === modal.portfolioId);
            if (portfolio) {
              const updatedPrincipals = portfolio.principalEngineers.map(pe =>
                pe.id === modal.person.id ? { ...pe, ...personData } : pe
              );
              updatePortfolio(modal.portfolioId, { principalEngineers: updatedPrincipals });
            }
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'manager' && (
        <PersonForm
          title={modal.person ? 'Edit Engineering Manager' : 'Add Engineering Manager'}
          person={modal.person}
          allowedRoles={['engineering_manager'] as Role[]}
          onSave={(personData) => {
            const person = modal.person
              ? { ...modal.person, ...personData }
              : createPerson(personData);
            updateGroup(modal.portfolioId, modal.groupId, { manager: person }, modal.divisionId);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'staff' && modal.mode === 'add' && (
        <PersonForm
          title="Add Staff Engineer"
          allowedRoles={['staff_engineer'] as Role[]}
          onSave={(personData) => {
            const person = createPerson(personData);
            addStaffEngineerToGroup(modal.portfolioId, modal.groupId, person, modal.divisionId);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'staff' && modal.mode === 'edit' && (
        <PersonForm
          title="Edit Staff Engineer"
          person={modal.person}
          allowedRoles={['staff_engineer'] as Role[]}
          onSave={(personData) => {
            const group = findGroup(modal.portfolioId, modal.groupId, modal.divisionId);
            if (group) {
              const updatedStaff = group.staffEngineers.map(se =>
                se.id === modal.person.id ? { ...se, ...personData } : se
              );
              updateGroup(modal.portfolioId, modal.groupId, { staffEngineers: updatedStaff }, modal.divisionId);
            }
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'member' && modal.mode === 'add' && (
        <PersonForm
          title="Add Team Member"
          allowedRoles={['engineer', 'senior_engineer', 'staff_engineer'] as Role[]}
          allowBulkAdd={true}
          onSave={(personData, quantity = 1) => {
            for (let i = 0; i < quantity; i++) {
              const person = createPerson(personData);
              addPersonToTeam(modal.portfolioId, modal.groupId, modal.teamId, person, modal.divisionId);
            }
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'member' && modal.mode === 'edit' && (
        <PersonForm
          title="Edit Team Member"
          person={modal.person}
          allowedRoles={['engineer', 'senior_engineer', 'staff_engineer'] as Role[]}
          onSave={(personData) => {
            updatePersonInTeam(modal.portfolioId, modal.groupId, modal.teamId, modal.person.id, personData, modal.divisionId);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default App;
