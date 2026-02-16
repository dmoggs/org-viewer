import type { OrgData, Portfolio, Person, Location, EmployeeType, Role } from '../types/org';

export interface OrgStats {
  totalEngineers: number;
  seniorPlusCount: number;
  seniorPlusRatio: number;
  byLocation: Record<Location, number>;
  locationPercentages: Record<Location, number>;
  byType: Record<EmployeeType, number>;
  typePercentages: Record<EmployeeType, number>;
  byRole: Record<Role, number>;
}

function getPeopleFromGroup(group: { manager?: Person; staffEngineers: Person[]; teams: { members: Person[] }[] }): Person[] {
  const people: Person[] = [];
  if (group.manager) {
    people.push(group.manager);
  }
  people.push(...group.staffEngineers);
  for (const team of group.teams) {
    people.push(...team.members);
  }
  return people;
}

function getAllPeople(data: OrgData): Person[] {
  const people: Person[] = [];

  for (const portfolio of data.portfolios) {
    if (portfolio.headOfEngineering) {
      people.push(portfolio.headOfEngineering);
    }
    people.push(...portfolio.principalEngineers);

    // Groups within divisions
    if (portfolio.divisions) {
      for (const division of portfolio.divisions) {
        for (const group of division.groups) {
          people.push(...getPeopleFromGroup(group));
        }
      }
    }

    // Direct groups
    for (const group of portfolio.groups) {
      people.push(...getPeopleFromGroup(group));
    }
  }

  return people;
}

const SENIOR_PLUS_ROLES: Role[] = [
  'senior_engineer',
  'staff_engineer',
  'engineering_manager',
  'head_of_engineering',
  'principal_engineer',
];

export function calculatePortfolioStats(portfolio: Portfolio): OrgStats {
  return calculateStats({ portfolios: [portfolio] });
}

export function calculateStats(data: OrgData): OrgStats {
  const people = getAllPeople(data);
  const total = people.length;

  const byRole: Record<Role, number> = {
    engineer: 0,
    senior_engineer: 0,
    staff_engineer: 0,
    engineering_manager: 0,
    head_of_engineering: 0,
    principal_engineer: 0,
  };

  const byLocation: Record<Location, number> = {
    onshore: 0,
    nearshore: 0,
    offshore: 0,
  };

  const byType: Record<EmployeeType, number> = {
    employee: 0,
    contractor: 0,
  };

  for (const person of people) {
    byRole[person.role]++;
    byType[person.type]++;
    if (person.location) {
      byLocation[person.location]++;
    }
  }

  const seniorPlusCount = SENIOR_PLUS_ROLES.reduce((sum, role) => sum + byRole[role], 0);

  const locationPercentages: Record<Location, number> = {
    onshore: total > 0 ? (byLocation.onshore / total) * 100 : 0,
    nearshore: total > 0 ? (byLocation.nearshore / total) * 100 : 0,
    offshore: total > 0 ? (byLocation.offshore / total) * 100 : 0,
  };

  const typePercentages: Record<EmployeeType, number> = {
    employee: total > 0 ? (byType.employee / total) * 100 : 0,
    contractor: total > 0 ? (byType.contractor / total) * 100 : 0,
  };

  return {
    totalEngineers: total,
    seniorPlusCount,
    seniorPlusRatio: total > 0 ? (seniorPlusCount / total) * 100 : 0,
    byLocation,
    locationPercentages,
    byType,
    typePercentages,
    byRole,
  };
}
