import type { OrgData, Portfolio, Group, Team, Person, Role, Location, EmployeeType, Division } from '../types/org';

function id(): string {
  return crypto.randomUUID();
}

const NAMES_POOL = [
  'Aiko Tanaka', 'Rahul Mehta', 'Sofia Andersson', 'Chen Wei', 'Amara Osei',
  'Diego Torres', 'Fatimah Ibrahim', 'Lukas Mueller', 'Yuna Kim', 'Arjun Patel',
  'Nadia Kowalski', 'Kwame Asante', 'Maria Santos', 'Hiroshi Yamamoto', 'Leila Nazari',
  'Patrick Okonkwo', 'Elena Petrov', 'Sanjay Kumar', 'Isabel Ferreira', 'Mohammed Al-Rashid',
  'Ingrid Berg', 'Takeshi Nakamura', 'Aisha Diallo', 'Raj Krishnamurthy', 'Valentina Russo',
  'Chidi Obi', 'Mei Lin', 'Fernando Castillo', 'Yuki Suzuki', 'Aditi Sharma',
  'Alexei Volkov', 'Zara Ahmed', 'Kweku Mensah', 'Priya Nair', 'Stefan Johansson',
  'Lena Fischer', 'Omar Hassan', 'Yuki Watanabe', 'Amina Bah', 'Lucas Oliveira',
  'Hana Park', 'Viktor Petrov', 'Fatima Al-Zahra', 'Ravi Gupta', 'Monika Nowak',
  'Temi Adeyemi', 'Ling Zhao', 'Sebastien Laurent', 'Nia Williams', 'Tariq Hassan',
  'Chloe Martin', 'Akira Sato', 'Keisha Johnson', 'Bjarni Sigurdsson', 'Yasmin Khalil',
  'Emre Yilmaz', 'Nkechi Eze', 'Dmitri Sokolov', 'Larissa Costa', 'Jamal Bakr',
];

const OFFSHORE_VENDORS = ['TCS', 'Infosys', 'Wipro', 'HCL', 'Cognizant'];
const NEARSHORE_VENDORS = ['GlobalLogic', 'EPAM', 'Endava', 'Nearshore Partners'];

let nameIndex = 0;

function nextName(): string {
  return NAMES_POOL[nameIndex++ % NAMES_POOL.length];
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makePerson(
  role: Role,
  type: EmployeeType,
  location: Location,
  name?: string,
  vendor?: string,
): Person {
  const person: Person = { id: id(), name, role, type, location };
  if (vendor) person.vendor = vendor;
  return person;
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

    let type: EmployeeType;
    let location: Location;
    let vendor: string | undefined;

    if (rand < 0.12) {
      type = 'employee';
      location = 'onshore';
    } else if (rand < 0.30) {
      type = 'contractor';
      location = 'nearshore';
      vendor = randomFrom(NEARSHORE_VENDORS);
    } else {
      type = 'contractor';
      location = 'offshore';
      vendor = randomFrom(OFFSHORE_VENDORS);
    }

    const roleRand = Math.random();
    let role: Role;
    if (roleRand < 0.60) {
      role = 'engineer';
    } else if (roleRand < 0.90) {
      role = 'senior_engineer';
    } else {
      role = 'staff_engineer';
    }

    members.push(makePerson(role, type, location, nextName(), vendor));
  }
  return members;
}

function makeTeam(name: string, memberCount: number): Team {
  return { id: id(), name, members: makeMembers(memberCount) };
}

function makeGroup(
  name: string,
  managerName: string | null,
  teams: Team[],
  staffCount = 0,
  managedBy?: string,
): Group {
  const staffEngineers: Person[] = [];
  for (let i = 0; i < staffCount; i++) {
    staffEngineers.push(makeLeader('staff_engineer', nextName()));
  }
  const group: Group = { id: id(), name, staffEngineers, teams };
  if (managerName) {
    group.manager = makeLeader('engineering_manager', managerName);
  } else if (managedBy) {
    group.managedBy = managedBy;
  }
  return group;
}

function makeDivision(name: string, groups: Group[]): Division {
  return { id: id(), name, groups };
}

export function generateTestData(): OrgData {
  nameIndex = 0;

  const supplyChain: Portfolio = {
    id: id(),
    name: 'Supply Chain & Logistics',
    onshoreTargetPercentage: 15,
    headOfEngineering: makeLeader('head_of_engineering', 'Sarah Chen'),
    principalEngineers: [
      makeLeader('principal_engineer', 'James Rodriguez'),
      makeLeader('principal_engineer', 'Priya Sharma'),
    ],
    divisions: [
      makeDivision('Warehouse', [
        makeGroup('Warehouse Ops', 'Mike Thompson', [
          makeTeam('Inventory', 8),
          makeTeam('Receiving', 5),
        ]),
        makeGroup('Fulfillment', null, [
          makeTeam('Pick & Pack', 7),
          makeTeam('Dispatch', 6),
        ], 0, 'TPM'),
      ]),
      makeDivision('Transportation', [
        makeGroup('Routing', 'Lisa Park', [
          makeTeam('Route Optimization', 7),
          makeTeam('Last Mile', 5),
        ], 1),
        makeGroup('Carrier Mgmt', null, [
          makeTeam('Carrier Onboarding', 4),
          makeTeam('Carrier Performance', 5),
        ], 0, 'TPM'),
      ]),
    ],
    groups: [
      makeGroup('Logistics Platform', 'David Kim', [
        makeTeam('Platform Core', 10),
        makeTeam('API Gateway', 6),
      ], 1),
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
      makeGroup('Pricing', null, [
        makeTeam('Pricing Engine', 7),
        makeTeam('Promotions', 5),
      ], 0, 'TPM'),
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
        makeTeam('3D Visualization', 4),
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
    orgOwner: makeLeader('senior_head_of_engineering', 'Alexandra Kozlov'),
    portfolios: [supplyChain, commercialPlanning, designBuyMake],
  };
}
