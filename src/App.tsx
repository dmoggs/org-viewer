import { useState, useRef, useEffect } from 'react';
import type { Person, Role } from './types/org';
import { useOrgData } from './hooks/useOrgData';
import { useTimelineData } from './hooks/useTimelineData';
import { calculateStats } from './utils/stats';
import { PortfolioView } from './components/PortfolioView';
import { SummaryPanel } from './components/SummaryPanel';
import { Legend } from './components/Legend';
import { PersonForm } from './components/PersonForm';
import { NameForm } from './components/NameForm';
import { GroupForm } from './components/GroupForm';
import { PortfolioForm } from './components/PortfolioForm';
import { TimelineView } from './components/timeline/TimelineView';
import { OrgTreeView } from './components/OrgTreeView';
import { OrgOverviewTreeView } from './components/OrgOverviewTreeView';
import { MarkdownView } from './components/MarkdownView';
import { CsvImportModal } from './components/CsvImportModal';
import { ExportAllPdfButton } from './components/ExportAllPdfButton';
import { SearchBar } from './components/SearchBar';
import type { TeamMemberReplacement } from './utils/csvImport';

type ModalType =
  | { type: 'portfolio'; mode: 'add' }
  | { type: 'portfolio'; mode: 'edit'; portfolioId: string; name: string }
  | { type: 'division'; mode: 'add'; portfolioId: string }
  | { type: 'division'; mode: 'edit'; portfolioId: string; divisionId: string; name: string }
  | { type: 'group'; mode: 'add'; portfolioId: string; divisionId?: string }
  | { type: 'group'; mode: 'edit'; portfolioId: string; groupId: string; name: string; managedBy?: string; divisionId?: string }
  | { type: 'team'; mode: 'add'; portfolioId: string; groupId: string; divisionId?: string }
  | { type: 'team'; mode: 'edit'; portfolioId: string; groupId: string; teamId: string; name: string; divisionId?: string; members: Person[] }
  | { type: 'hoe'; portfolioId: string; person?: Person }
  | { type: 'principal'; mode: 'add'; portfolioId: string }
  | { type: 'principal'; mode: 'edit'; portfolioId: string; person: Person }
  | { type: 'manager'; portfolioId: string; groupId: string; divisionId?: string; person?: Person }
  | { type: 'staff'; mode: 'add'; portfolioId: string; groupId: string; divisionId?: string }
  | { type: 'staff'; mode: 'edit'; portfolioId: string; groupId: string; divisionId?: string; person: Person }
  | { type: 'member'; mode: 'add'; portfolioId: string; groupId: string; teamId: string; divisionId?: string }
  | { type: 'member'; mode: 'edit'; portfolioId: string; groupId: string; teamId: string; divisionId?: string; person: Person }
  | { type: 'orgOwner'; person?: Person }
  | null;

function App() {
  const {
    data,
    loading,
    setOrgOwner,
    removeOrgOwner,
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
    replaceTeamMembers,
  } = useOrgData();

  const [modal, setModal] = useState<ModalType>(null);
  const [viewMode, setViewMode] = useState<'org' | 'timeline'>('org');
  const [treeViewPortfolioId, setTreeViewPortfolioId] = useState<string | null>(null);
  const [markdownViewPortfolioId, setMarkdownViewPortfolioId] = useState<string | null>(null);
  const [csvImportPortfolioId, setCsvImportPortfolioId] = useState<string | null>(null);
  const [showOverviewTree, setShowOverviewTree] = useState(false);
  const [highlightTarget, setHighlightTarget] = useState<{ id: string; type: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const dataMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  // Track expanded portfolios; empty set = all collapsed (default)
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(new Set());

  const togglePortfolio = (id: string) =>
    setExpandedPortfolios(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const expandAll = () => setExpandedPortfolios(new Set(data.portfolios.map(p => p.id)));
  const collapseAll = () => setExpandedPortfolios(new Set());

  // Highlight container (team/group/leadership) from search and scroll into view
  useEffect(() => {
    if (!highlightTarget) return;
    // Wait a tick for portfolio to expand and render
    const timeout = setTimeout(() => {
      let selector: string;
      switch (highlightTarget.type) {
        case 'team':
          selector = `[data-team-id="${highlightTarget.id}"]`;
          break;
        case 'group':
          selector = `[data-group-id="${highlightTarget.id}"]`;
          break;
        case 'leadership':
          selector = `[data-leadership-id="${highlightTarget.id}"]`;
          break;
        default:
          setHighlightTarget(null);
          return;
      }
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('search-highlight');
        const cleanup = () => {
          el.classList.remove('search-highlight');
          setHighlightTarget(null);
        };
        el.addEventListener('animationend', cleanup, { once: true });
        // Fallback in case animationend doesn't fire
        const fallback = setTimeout(cleanup, 5000);
        return () => clearTimeout(fallback);
      } else {
        setHighlightTarget(null);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [highlightTarget]);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    if (!dataMenuOpen && !viewMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dataMenuOpen && dataMenuRef.current && !dataMenuRef.current.contains(e.target as Node)) {
        setDataMenuOpen(false);
      }
      if (viewMenuOpen && viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dataMenuOpen, viewMenuOpen]);

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
            <button
              onClick={() => setModal({ type: 'orgOwner', person: data.orgOwner })}
              className="group flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              title={data.orgOwner ? 'Edit org owner' : 'Set org owner'}
            >
              <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              <span className={data.orgOwner?.name ? 'text-gray-700' : 'text-gray-400 italic'}>
                {data.orgOwner?.name || 'Enter Org Owner'}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <SearchBar
              data={data}
              onSelectResult={(portfolioId, target, type) => {
                setViewMode('org');
                if (portfolioId) {
                  setExpandedPortfolios(prev => {
                    const next = new Set(prev);
                    next.add(portfolioId);
                    return next;
                  });
                }
                if (target) {
                  setHighlightTarget({ id: target, type });
                }
              }}
            />
            {/* View menu */}
            <div ref={viewMenuRef} className="relative">
              <button
                onClick={() => setViewMenuOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  viewMenuOpen
                    ? 'border-gray-400 bg-gray-100 text-gray-800'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M3 5l3 3 3-3H3z" />
                </svg>
              </button>
              {viewMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => { setViewMode('org'); setViewMenuOpen(false); }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left ${
                      viewMode === 'org' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg className={`w-4 h-4 ${viewMode === 'org' ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15" />
                    </svg>
                    Org View
                    {viewMode === 'org' && (
                      <svg className="w-4 h-4 ml-auto text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => { setViewMode('timeline'); setViewMenuOpen(false); }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left ${
                      viewMode === 'timeline' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg className={`w-4 h-4 ${viewMode === 'timeline' ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Timeline
                    {viewMode === 'timeline' && (
                      <svg className="w-4 h-4 ml-auto text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
            {/* Stats toggle */}
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
            {/* Expand / Collapse all */}
            {viewMode === 'org' && data.portfolios.length > 0 && (
              <div className="flex border border-gray-200 rounded-md overflow-hidden">
                <button
                  onClick={expandAll}
                  title="Expand all portfolios"
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Expand all
                </button>
                <button
                  onClick={collapseAll}
                  title="Collapse all portfolios"
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 border-l border-gray-200"
                >
                  Collapse all
                </button>
              </div>
            )}
            {/* Data menu */}
            <div ref={dataMenuRef} className="relative">
              <button
                onClick={() => setDataMenuOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  dataMenuOpen
                    ? 'border-gray-400 bg-gray-100 text-gray-800'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Data
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M3 5l3 3 3-3H3z" />
                </svg>
              </button>
              {dataMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => { handleImport(); setDataMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Import JSON
                  </button>
                  <button
                    onClick={() => { handleExport(); setDataMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export JSON
                  </button>
                  {data.portfolios.length > 0 && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <div className="px-3 py-1" onClick={() => setDataMenuOpen(false)}>
                        <ExportAllPdfButton portfolios={data.portfolios} />
                      </div>
                    </>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      if (data.portfolios.length === 0 || confirm('This will replace all existing data with test data. This action cannot be undone. Continue?')) {
                        loadTestData();
                        setDataMenuOpen(false);
                      }
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 text-left"
                  >
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Load Test Data
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowOverviewTree(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              title="View organisation overview tree"
            >
              Org Tree
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
                isCollapsed={!expandedPortfolios.has(portfolio.id)}
                onToggleCollapsed={() => togglePortfolio(portfolio.id)}
                onTreeView={() => setTreeViewPortfolioId(portfolio.id)}
                onMarkdownView={() => setMarkdownViewPortfolioId(portfolio.id)}
                onCsvImport={() => setCsvImportPortfolioId(portfolio.id)}
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
                    setModal({ type: 'group', mode: 'edit', portfolioId: portfolio.id, groupId, name: group.name, managedBy: group.managedBy, divisionId });
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
                    setModal({ type: 'team', mode: 'edit', portfolioId: portfolio.id, groupId, teamId, name: team.name, divisionId, members: team.members });
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
      {showOverviewTree && (
        <OrgOverviewTreeView data={data} onClose={() => setShowOverviewTree(false)} />
      )}

      {treeViewPortfolioId && (() => {
        const p = data.portfolios.find(p => p.id === treeViewPortfolioId);
        return p ? (
          <OrgTreeView portfolio={p} allPortfolios={data.portfolios} onClose={() => setTreeViewPortfolioId(null)} />
        ) : null;
      })()}

      {markdownViewPortfolioId && (() => {
        const p = data.portfolios.find(p => p.id === markdownViewPortfolioId);
        return p ? (
          <MarkdownView
            portfolio={p}
            onClose={() => setMarkdownViewPortfolioId(null)}
            onApply={(updates) => {
              updatePortfolio(markdownViewPortfolioId, updates);
            }}
          />
        ) : null;
      })()}

      {csvImportPortfolioId && (() => {
        const p = data.portfolios.find(p => p.id === csvImportPortfolioId);
        return p ? (
          <CsvImportModal
            portfolio={p}
            onApply={(replacements: TeamMemberReplacement[]) => {
              replaceTeamMembers(replacements);
            }}
            onClose={() => setCsvImportPortfolioId(null)}
          />
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
        <GroupForm
          title="Add Group"
          onSave={(name, managedBy) => {
            addGroup(modal.portfolioId, name, modal.divisionId, managedBy);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'group' && modal.mode === 'edit' && (
        <GroupForm
          title="Edit Group"
          initialName={modal.name}
          initialManagedBy={modal.managedBy}
          onSave={(name, managedBy) => {
            updateGroup(modal.portfolioId, modal.groupId, { name, managedBy }, modal.divisionId);
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
          members={modal.members}
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

      {modal?.type === 'orgOwner' && (
        <PersonForm
          title={modal.person ? 'Edit Org Owner' : 'Set Org Owner'}
          person={modal.person}
          allowedRoles={['senior_head_of_engineering'] as Role[]}
          onSave={(personData) => {
            const person = modal.person
              ? { ...modal.person, ...personData }
              : createPerson(personData);
            setOrgOwner(person);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
          onDelete={modal.person ? () => {
            removeOrgOwner();
            setModal(null);
          } : undefined}
        />
      )}
    </div>
  );
}

export default App;
