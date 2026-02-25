import { useState, useEffect, useCallback } from 'react';
import type { OrgData, Portfolio, Division, Group, Team, Person } from '../types/org';
import { generateTestData } from '../data/testData';

const STORAGE_KEY = 'org-viewer-data';

const defaultData: OrgData = {
  portfolios: [],
};

function generateId(): string {
  return crypto.randomUUID();
}

// Helper to update a group within a portfolio (handles both direct groups and groups within divisions)
function updateGroupInPortfolio(
  portfolio: Portfolio,
  groupId: string,
  divisionId: string | undefined,
  updater: (group: Group) => Group
): Portfolio {
  if (divisionId) {
    return {
      ...portfolio,
      divisions: portfolio.divisions?.map(d =>
        d.id === divisionId
          ? { ...d, groups: d.groups.map(g => g.id === groupId ? updater(g) : g) }
          : d
      ),
    };
  }
  return {
    ...portfolio,
    groups: portfolio.groups.map(g => g.id === groupId ? updater(g) : g),
  };
}

export function useOrgData() {
  const [data, setData] = useState<OrgData>(defaultData);
  const [loading, setLoading] = useState(true);

  // Migrate old data to add missing locations and targets
  const migrateData = (orgData: OrgData): OrgData => {
    const migratePerson = (person: Person): Person => {
      if (!person.location) {
        console.warn(`Migrating person ${person.name || person.id}: adding default location 'onshore'`);
        return { ...person, location: 'onshore' };
      }
      return person;
    };

    const migrateGroup = (group: Group): Group => ({
      ...group,
      manager: group.manager ? migratePerson(group.manager) : undefined,
      staffEngineers: group.staffEngineers.map(migratePerson),
      teams: group.teams.map(team => ({
        ...team,
        members: team.members.map(migratePerson),
      })),
    });

    return {
      ...orgData,
      portfolios: orgData.portfolios.map(portfolio => ({
        ...portfolio,
        onshoreTargetPercentage: portfolio.onshoreTargetPercentage ?? 50,
        headOfEngineering: portfolio.headOfEngineering ? migratePerson(portfolio.headOfEngineering) : undefined,
        principalEngineers: portfolio.principalEngineers.map(migratePerson),
        divisions: portfolio.divisions?.map(division => ({
          ...division,
          groups: division.groups.map(migrateGroup),
        })),
        groups: portfolio.groups.map(migrateGroup),
      })),
    };
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const migrated = migrateData(parsed);
        setData(migrated);
      } catch {
        console.error('Failed to parse stored org data');
      }
    }
    setLoading(false);
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, loading]);

  // Portfolio operations
  const addPortfolio = useCallback((name: string): Portfolio => {
    const portfolio: Portfolio = {
      id: generateId(),
      name,
      principalEngineers: [],
      groups: [],
      onshoreTargetPercentage: 50, // Default target: 50% onshore
    };
    setData(prev => ({
      ...prev,
      portfolios: [...prev.portfolios, portfolio],
    }));
    return portfolio;
  }, []);

  const updatePortfolio = useCallback((portfolioId: string, updates: Partial<Omit<Portfolio, 'id'>>) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId ? { ...p, ...updates } : p
      ),
    }));
  }, []);

  const deletePortfolio = useCallback((portfolioId: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.filter(p => p.id !== portfolioId),
    }));
  }, []);

  // Division operations
  const addDivision = useCallback((portfolioId: string, name: string): Division | null => {
    const division: Division = {
      id: generateId(),
      name,
      groups: [],
    };
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? { ...p, divisions: [...(p.divisions || []), division] }
          : p
      ),
    }));
    return division;
  }, []);

  const updateDivision = useCallback((portfolioId: string, divisionId: string, updates: Partial<Omit<Division, 'id'>>) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? {
            ...p,
            divisions: p.divisions?.map(d =>
              d.id === divisionId ? { ...d, ...updates } : d
            ),
          }
          : p
      ),
    }));
  }, []);

  const deleteDivision = useCallback((portfolioId: string, divisionId: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? { ...p, divisions: p.divisions?.filter(d => d.id !== divisionId) }
          : p
      ),
    }));
  }, []);

  // Group operations (supports both direct groups and groups within divisions)
  const addGroup = useCallback((portfolioId: string, name: string, divisionId?: string, managedBy?: string): Group | null => {
    const group: Group = {
      id: generateId(),
      name,
      ...(managedBy ? { managedBy } : {}),
      staffEngineers: [],
      teams: [],
    };
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p => {
        if (p.id !== portfolioId) return p;
        if (divisionId) {
          return {
            ...p,
            divisions: p.divisions?.map(d =>
              d.id === divisionId ? { ...d, groups: [...d.groups, group] } : d
            ),
          };
        }
        return { ...p, groups: [...p.groups, group] };
      }),
    }));
    return group;
  }, []);

  const updateGroup = useCallback((portfolioId: string, groupId: string, updates: Partial<Omit<Group, 'id'>>, divisionId?: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p => {
        if (p.id !== portfolioId) return p;
        if (divisionId) {
          return {
            ...p,
            divisions: p.divisions?.map(d =>
              d.id === divisionId
                ? { ...d, groups: d.groups.map(g => g.id === groupId ? { ...g, ...updates } : g) }
                : d
            ),
          };
        }
        return {
          ...p,
          groups: p.groups.map(g => g.id === groupId ? { ...g, ...updates } : g),
        };
      }),
    }));
  }, []);

  const deleteGroup = useCallback((portfolioId: string, groupId: string, divisionId?: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p => {
        if (p.id !== portfolioId) return p;
        if (divisionId) {
          return {
            ...p,
            divisions: p.divisions?.map(d =>
              d.id === divisionId ? { ...d, groups: d.groups.filter(g => g.id !== groupId) } : d
            ),
          };
        }
        return { ...p, groups: p.groups.filter(g => g.id !== groupId) };
      }),
    }));
  }, []);

  /** Move a group from one division to another within the same portfolio. */
  const moveGroupToDivision = useCallback((
    portfolioId: string,
    groupId: string,
    fromDivisionId: string,
    toDivisionId: string,
  ) => {
    if (fromDivisionId === toDivisionId) return;
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p => {
        if (p.id !== portfolioId) return p;
        const fromDiv = p.divisions?.find(d => d.id === fromDivisionId);
        const group = fromDiv?.groups.find(g => g.id === groupId);
        if (!group) return p;
        return {
          ...p,
          divisions: p.divisions?.map(d => {
            if (d.id === fromDivisionId) return { ...d, groups: d.groups.filter(g => g.id !== groupId) };
            if (d.id === toDivisionId)   return { ...d, groups: [...d.groups, group] };
            return d;
          }),
        };
      }),
    }));
  }, []);

  // Team operations
  const addTeam = useCallback((portfolioId: string, groupId: string, name: string, divisionId?: string): Team | null => {
    const team: Team = {
      id: generateId(),
      name,
      members: [],
    };
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? updateGroupInPortfolio(p, groupId, divisionId, g => ({ ...g, teams: [...g.teams, team] }))
          : p
      ),
    }));
    return team;
  }, []);

  const updateTeam = useCallback((portfolioId: string, groupId: string, teamId: string, updates: Partial<Omit<Team, 'id'>>, divisionId?: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? updateGroupInPortfolio(p, groupId, divisionId, g => ({
            ...g,
            teams: g.teams.map(t => t.id === teamId ? { ...t, ...updates } : t),
          }))
          : p
      ),
    }));
  }, []);

  const deleteTeam = useCallback((portfolioId: string, groupId: string, teamId: string, divisionId?: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? updateGroupInPortfolio(p, groupId, divisionId, g => ({
            ...g,
            teams: g.teams.filter(t => t.id !== teamId),
          }))
          : p
      ),
    }));
  }, []);

  // Person operations
  const createPerson = useCallback((personData: Omit<Person, 'id'>): Person => {
    return {
      id: generateId(),
      ...personData,
    };
  }, []);

  const addPersonToTeam = useCallback((portfolioId: string, groupId: string, teamId: string, person: Person, divisionId?: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? updateGroupInPortfolio(p, groupId, divisionId, g => ({
            ...g,
            teams: g.teams.map(t =>
              t.id === teamId ? { ...t, members: [...t.members, person] } : t
            ),
          }))
          : p
      ),
    }));
  }, []);

  const updatePersonInTeam = useCallback((portfolioId: string, groupId: string, teamId: string, personId: string, updates: Partial<Omit<Person, 'id'>>, divisionId?: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? updateGroupInPortfolio(p, groupId, divisionId, g => ({
            ...g,
            teams: g.teams.map(t =>
              t.id === teamId
                ? { ...t, members: t.members.map(m => m.id === personId ? { ...m, ...updates } : m) }
                : t
            ),
          }))
          : p
      ),
    }));
  }, []);

  const removePersonFromTeam = useCallback((portfolioId: string, groupId: string, teamId: string, personId: string, divisionId?: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? updateGroupInPortfolio(p, groupId, divisionId, g => ({
            ...g,
            teams: g.teams.map(t =>
              t.id === teamId ? { ...t, members: t.members.filter(m => m.id !== personId) } : t
            ),
          }))
          : p
      ),
    }));
  }, []);

  // Staff engineer operations for groups
  const addStaffEngineerToGroup = useCallback((portfolioId: string, groupId: string, person: Person, divisionId?: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? updateGroupInPortfolio(p, groupId, divisionId, g => ({
            ...g,
            staffEngineers: [...g.staffEngineers, person],
          }))
          : p
      ),
    }));
  }, []);

  const removeStaffEngineerFromGroup = useCallback((portfolioId: string, groupId: string, personId: string, divisionId?: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? updateGroupInPortfolio(p, groupId, divisionId, g => ({
            ...g,
            staffEngineers: g.staffEngineers.filter(s => s.id !== personId),
          }))
          : p
      ),
    }));
  }, []);

  // Principal engineer operations for portfolios
  const addPrincipalEngineerToPortfolio = useCallback((portfolioId: string, person: Person) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? { ...p, principalEngineers: [...p.principalEngineers, person] }
          : p
      ),
    }));
  }, []);

  const removePrincipalEngineerFromPortfolio = useCallback((portfolioId: string, personId: string) => {
    setData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId
          ? { ...p, principalEngineers: p.principalEngineers.filter(pe => pe.id !== personId) }
          : p
      ),
    }));
  }, []);

  // Export/Import data
  const exportData = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importData = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setData(parsed);
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadTestData = useCallback(() => {
    setData(generateTestData());
  }, []);

  /** Replace team members for multiple teams at once (used by CSV import). */
  const replaceTeamMembers = useCallback((replacements: { portfolioId: string; divisionId?: string; groupId: string; teamId: string; newMembers: import('../types/org').Person[] }[]) => {
    setData(prev => {
      let updated = { ...prev };
      for (const r of replacements) {
        updated = {
          ...updated,
          portfolios: updated.portfolios.map(p =>
            p.id === r.portfolioId
              ? updateGroupInPortfolio(p, r.groupId, r.divisionId, g => ({
                  ...g,
                  teams: g.teams.map(t =>
                    t.id === r.teamId ? { ...t, members: r.newMembers } : t
                  ),
                }))
              : p
          ),
        };
      }
      return updated;
    });
  }, []);

  return {
    data,
    loading,
    // Portfolio
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    // Division
    addDivision,
    updateDivision,
    deleteDivision,
    // Group
    addGroup,
    updateGroup,
    deleteGroup,
    moveGroupToDivision,
    // Team
    addTeam,
    updateTeam,
    deleteTeam,
    // Person
    createPerson,
    addPersonToTeam,
    updatePersonInTeam,
    removePersonFromTeam,
    // Staff engineers
    addStaffEngineerToGroup,
    removeStaffEngineerFromGroup,
    // Principal engineers
    addPrincipalEngineerToPortfolio,
    removePrincipalEngineerFromPortfolio,
    // Export/Import
    exportData,
    importData,
    loadTestData,
    // CSV Import
    replaceTeamMembers,
  };
}
