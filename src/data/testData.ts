import type { OrgData, Portfolio, Group, Team, Person, Role, Location, EmployeeType } from '../types/org';

function id(): string {
  return crypto.randomUUID();
}

function makePerson(
  role: Role,
  type: EmployeeType,
  location: Location,
  name?: string,
): Person {
  return { id: id(), name, role, type, location };
}

function makeLeader(role: Role, name: string): Person {
  return makePerson(role, 'employee', 'onshore', name);
}

/**
 * Generate team members with approximate distribution:
 * ~12% onshore employees, ~18% nearshore contractors, ~70% offshore contractors
 * Roles: ~60% engineer, ~30% senior_engineer, ~10% staff_engineer
 */
function makeMembers(count: number): Person[] {
  const members: Person[] = [];
  for (let i = 0; i < count; i++) {
    const rand = Math.random();

    // Determine location/type
    let type: EmployeeType;
    let location: Location;
    if (rand < 0.12) {
      type = 'employee';
      location = 'onshore';
    } else if (rand < 0.30) {
      type = 'contractor';
      location = 'nearshore';
    } else {
      type = 'contractor';
      location = 'offshore';
    }

    // Determine role
    const roleRand = Math.random();
    let role: Role;
    if (roleRand < 0.60) {
      role = 'engineer';
    } else if (roleRand < 0.90) {
      role = 'senior_engineer';
    } else {
      role = 'staff_engineer';
    }

    members.push(makePerson(role, type, location));
  }
  return members;
}

function makeTeam(name: string, memberCount: number): Team {
  return { id: id(), name, members: makeMembers(memberCount) };
}

function makeGroup(
  name: string,
  managerName: string,
  teams: Team[],
  staffCount = 0,
): Group {
  const staffEngineers: Person[] = [];
  for (let i = 0; i < staffCount; i++) {
    staffEngineers.push(makeLeader('staff_engineer', `${name} Staff ${i + 1}`));
  }
  return {
    id: id(),
    name,
    manager: makeLeader('engineering_manager', managerName),
    staffEngineers,
    teams,
  };
}

export function generateTestData(): OrgData {
  const supplyChain: Portfolio = {
    id: id(),
    name: 'Supply Chain & Logistics',
    onshoreTargetPercentage: 15,
    headOfEngineering: makeLeader('head_of_engineering', 'Sarah Chen'),
    principalEngineers: [
      makeLeader('principal_engineer', 'James Rodriguez'),
      makeLeader('principal_engineer', 'Priya Sharma'),
    ],
    groups: [
      makeGroup('Warehouse Ops', 'Mike Thompson', [
        makeTeam('Inventory', 8),
        makeTeam('Fulfillment', 6),
      ]),
      makeGroup('Transportation', 'Lisa Park', [
        makeTeam('Routing', 7),
        makeTeam('Carrier Mgmt', 5),
      ], 1),
      makeGroup('Logistics Platform', 'David Kim', [
        makeTeam('Platform Core', 10),
      ]),
    ],
  };

  const commercialPlanning: Portfolio = {
    id: id(),
    name: 'Commercial Planning',
    onshoreTargetPercentage: 20,
    headOfEngineering: makeLeader('head_of_engineering', 'Rachel Foster'),
    principalEngineers: [
      makeLeader('principal_engineer', 'Tom Nguyen'),
    ],
    groups: [
      makeGroup('Demand Planning', 'Emma Wilson', [
        makeTeam('Forecasting', 6),
        makeTeam('Analytics', 5),
      ], 1),
      makeGroup('Supply Planning', 'Carlos Mendez', [
        makeTeam('Allocation', 8),
        makeTeam('Replenishment', 4),
      ]),
    ],
  };

  const designBuyMake: Portfolio = {
    id: id(),
    name: 'Design, Buy, Make',
    onshoreTargetPercentage: 15,
    headOfEngineering: makeLeader('head_of_engineering', 'Alex Morgan'),
    principalEngineers: [
      makeLeader('principal_engineer', 'Wei Zhang'),
      makeLeader('principal_engineer', 'Fatima Al-Hassan'),
    ],
    groups: [
      makeGroup('Product Design', 'Jordan Lee', [
        makeTeam('CAD Platform', 7),
      ], 1),
      makeGroup('Procurement', 'Sophia Garcia', [
        makeTeam('Sourcing', 6),
        makeTeam('Vendor Portal', 5),
      ]),
      makeGroup('Manufacturing', 'Ryan Patel', [
        makeTeam('MES', 9),
        makeTeam('Quality', 4),
      ], 1),
    ],
  };

  return {
    portfolios: [supplyChain, commercialPlanning, designBuyMake],
  };
}
