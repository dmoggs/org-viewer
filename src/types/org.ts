export type Location = 'onshore' | 'nearshore' | 'offshore';
export type EmployeeType = 'employee' | 'contractor';
export type EngineerLevel = 'engineer' | 'senior_engineer' | 'staff_engineer';
export type LeaderRole = 'engineering_manager' | 'staff_engineer' | 'head_of_engineering' | 'principal_engineer';
export type Role = EngineerLevel | LeaderRole;

export interface Person {
  id: string;
  name?: string;
  role: Role;
  type: EmployeeType;
  vendor?: string;
  location?: Location; // Optional for backwards compatibility, but required in forms
}

export interface Team {
  id: string;
  name: string;
  members: Person[];
}

export interface Group {
  id: string;
  name: string;
  manager?: Person;
  managedBy?: string; // Label for an external discipline managing the group (e.g. "TPM") when no EM is available
  staffEngineers: Person[];
  teams: Team[];
}

export interface Division {
  id: string;
  name: string;
  groups: Group[];
}

export interface Portfolio {
  id: string;
  name: string;
  headOfEngineering?: Person;
  principalEngineers: Person[];
  divisions?: Division[]; // Optional intermediate grouping level
  groups: Group[]; // Direct groups (used when no divisions)
  onshoreTargetPercentage?: number; // Target percentage for onshore engineers (default: 50%)
}

export interface OrgData {
  portfolios: Portfolio[];
}

export const ROLE_LABELS: Record<Role, string> = {
  engineer: 'Engineer',
  senior_engineer: 'Senior Engineer',
  staff_engineer: 'Staff Engineer',
  engineering_manager: 'Engineering Manager',
  head_of_engineering: 'Head of Engineering',
  principal_engineer: 'Principal Engineer',
};

export const LOCATION_LABELS: Record<Location, string> = {
  onshore: 'Onshore',
  nearshore: 'Nearshore',
  offshore: 'Offshore',
};

export const TYPE_LABELS: Record<EmployeeType, string> = {
  employee: 'Employee',
  contractor: 'Contractor',
};
