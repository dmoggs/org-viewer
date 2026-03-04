import { useState, useRef, useEffect, useMemo } from 'react';
import type { OrgData, Person, Role } from '../types/org';
import { ROLE_LABELS } from '../types/org';
import { PersonIcon } from './PersonIcon';

interface SearchResult {
  person: Person;
  breadcrumb: string[];
  portfolioId: string;
  context: string; // e.g. "Head of Engineering", "Manager", "Staff Engineer", "Team Member"
  /** Which element to highlight: team ID for team members, group ID for managers/staff, 'leadership-<portfolioId>' for portfolio leaders */
  highlightTarget: string;
  highlightType: 'team' | 'group' | 'leadership' | 'none';
}

interface SearchBarProps {
  data: OrgData;
  onSelectResult?: (portfolioId: string, highlightTarget: string, highlightType: string) => void;
}

/** Collect all people from the org data with their breadcrumb paths */
function collectAllPeople(data: OrgData): SearchResult[] {
  const results: SearchResult[] = [];

  // Org Owner
  if (data.orgOwner?.name) {
    results.push({
      person: data.orgOwner,
      breadcrumb: ['Org Owner'],
      portfolioId: '',
      context: 'Org Owner',
      highlightTarget: '',
      highlightType: 'none',
    });
  }

  for (const portfolio of data.portfolios) {
    const pName = portfolio.name;

    // Head of Engineering
    if (portfolio.headOfEngineering?.name) {
      results.push({
        person: portfolio.headOfEngineering,
        breadcrumb: [pName],
        portfolioId: portfolio.id,
        context: 'Head of Engineering',
        highlightTarget: `leadership-${portfolio.id}`,
        highlightType: 'leadership',
      });
    }

    // Principal Engineers
    for (const pe of portfolio.principalEngineers) {
      if (pe.name) {
        results.push({
          person: pe,
          breadcrumb: [pName],
          portfolioId: portfolio.id,
          context: 'Principal Engineer',
          highlightTarget: `leadership-${portfolio.id}`,
          highlightType: 'leadership',
        });
      }
    }

    // Helper to process groups
    const processGroup = (group: typeof portfolio.groups[0], path: string[]) => {
      // Manager
      if (group.manager?.name) {
        results.push({
          person: group.manager,
          breadcrumb: [...path, group.name],
          portfolioId: portfolio.id,
          context: 'Manager',
          highlightTarget: group.id,
          highlightType: 'group',
        });
      }

      // Staff Engineers
      for (const se of group.staffEngineers) {
        if (se.name) {
          results.push({
            person: se,
            breadcrumb: [...path, group.name],
            portfolioId: portfolio.id,
            context: 'Staff Engineer',
            highlightTarget: group.id,
            highlightType: 'group',
          });
        }
      }

      // Teams
      for (const team of group.teams) {
        for (const member of team.members) {
          if (member.name) {
            results.push({
              person: member,
              breadcrumb: [...path, group.name, team.name],
              portfolioId: portfolio.id,
              context: ROLE_LABELS[member.role],
              highlightTarget: team.id,
              highlightType: 'team',
            });
          }
        }
      }
    };

    // Direct groups
    for (const group of portfolio.groups) {
      processGroup(group, [pName]);
    }

    // Division groups
    if (portfolio.divisions) {
      for (const division of portfolio.divisions) {
        for (const group of division.groups) {
          processGroup(group, [pName, division.name]);
        }
      }
    }
  }

  return results;
}

/** Role ordering for sorting: higher seniority first */
const ROLE_WEIGHT: Record<Role, number> = {
  senior_head_of_engineering: 0,
  head_of_engineering: 1,
  principal_engineer: 2,
  engineering_manager: 3,
  staff_engineer: 4,
  senior_engineer: 5,
  engineer: 6,
};

export function SearchBar({ data, onSelectResult }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allPeople = useMemo(() => collectAllPeople(data), [data]);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const lower = query.toLowerCase();
    const matched = allPeople.filter(r =>
      r.person.name?.toLowerCase().includes(lower) ||
      r.context.toLowerCase().includes(lower) ||
      r.breadcrumb.some(b => b.toLowerCase().includes(lower))
    );
    // Sort: exact name starts first, then by role weight
    matched.sort((a, b) => {
      const aName = a.person.name?.toLowerCase() ?? '';
      const bName = b.person.name?.toLowerCase() ?? '';
      const aStarts = aName.startsWith(lower) ? 0 : 1;
      const bStarts = bName.startsWith(lower) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return ROLE_WEIGHT[a.person.role] - ROLE_WEIGHT[b.person.role];
    });
    return matched.slice(0, 15);
  }, [query, allPeople]);

  const totalMatches = useMemo(() => {
    if (query.length < 2) return 0;
    const lower = query.toLowerCase();
    return allPeople.filter(r =>
      r.person.name?.toLowerCase().includes(lower) ||
      r.context.toLowerCase().includes(lower) ||
      r.breadcrumb.some(b => b.toLowerCase().includes(lower))
    ).length;
  }, [query, allPeople]);

  // Reset selection when results change
  useEffect(() => setSelectedIndex(0), [results]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (items[selectedIndex]) {
      (items[selectedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
    if (onSelectResult) {
      onSelectResult(result.portfolioId, result.highlightTarget, result.highlightType);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Highlight matching text in a string
  const highlight = (text: string) => {
    if (query.length < 2) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search people…"
          className="w-48 pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all focus:w-64"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute right-0 mt-1 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No results for "{query}"
            </div>
          ) : (
            <>
              <div ref={listRef} className="max-h-80 overflow-y-auto">
                {results.map((result, i) => (
                  <button
                    key={`${result.person.id}-${i}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full px-3 py-2.5 flex items-start gap-3 text-left transition-colors ${
                      i === selectedIndex ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <PersonIcon person={result.person} size="sm" showTooltip={false} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {highlight(result.person.name || 'Unnamed')}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {result.context}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400 truncate">
                        {result.breadcrumb.map((segment, j) => (
                          <span key={j} className="flex items-center gap-1">
                            {j > 0 && (
                              <svg className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            )}
                            <span className="truncate">{highlight(segment)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        result.person.type === 'employee' ? 'bg-gray-700' : 'border border-gray-400'
                      }`} title={result.person.type === 'employee' ? 'Employee' : 'Contractor'} />
                    </div>
                  </button>
                ))}
              </div>
              {totalMatches > results.length && (
                <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400 text-center">
                  Showing {results.length} of {totalMatches} results
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
