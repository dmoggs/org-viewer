import type { Portfolio, Person, Team, Group, Role, Location, EmployeeType } from '../types/org';

// ─── Parsed CSV row ───────────────────────────────────────────────────────────

export interface CsvRow {
  portfolio: string;
  csvGroup: string;
  teamName: string;
  role: string;
  location: string;
  vendor: string;
  name: string;
  lineNumber: number;
}

// ─── Report types ─────────────────────────────────────────────────────────────

export interface MatchedTeam {
  csvGroup: string;
  csvTeam: string;
  appDivision?: string;
  appGroup: string;
  appTeam: string;
  matchReason: string;
  managerConfirmed: boolean;
}

export interface PersonChange {
  name: string;
  role: string;
  location: string;
  vendor: string;
  type: EmployeeType;
}

export interface TeamChange {
  match: MatchedTeam;
  added: PersonChange[];
  removed: PersonChange[];
}

export interface SkippedRow {
  row: CsvRow;
  reason: string;
}

export interface UnmatchedTeam {
  csvGroup: string;
  csvTeam: string;
  rowCount: number;
  reason: string;
}

export interface ImportReport {
  teamChanges: TeamChange[];
  skippedRows: SkippedRow[];
  unmatchedTeams: UnmatchedTeam[];
  summary: {
    teamsMatched: number;
    teamsUnmatched: number;
    membersAdded: number;
    membersRemoved: number;
    rowsSkipped: number;
  };
}

// ─── Result type used to apply changes ────────────────────────────────────────

export interface TeamMemberReplacement {
  portfolioId: string;
  divisionId?: string;
  groupId: string;
  teamId: string;
  newMembers: Person[];
}

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

/**
 * Parse CSV text into structured rows.
 * 
 * Format: Portfolio, CsvGroup, TeamName, Role, Location, Vendor, Name
 * 
 * Team names may contain commas (e.g. "Inbound, Tax & Control"), so we parse
 * by fixing the first 2 fields and last 4 fields, with everything in between
 * being the team name.
 */
export function parseCsv(csvText: string): CsvRow[] {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  const rows: CsvRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    // Minimum 7 parts: portfolio, group, team, role, location, vendor, name
    if (parts.length < 7) continue;

    const portfolio = parts[0].trim();
    const csvGroup = parts[1].trim();
    // Last 4 fields from the right
    const name = parts[parts.length - 1].trim();
    const vendor = parts[parts.length - 2].trim();
    const location = parts[parts.length - 3].trim();
    const role = parts[parts.length - 4].trim();
    // Everything between field 2 and (length - 4) is the team name
    const teamName = parts.slice(2, parts.length - 4).join(',').trim();

    rows.push({
      portfolio,
      csvGroup,
      teamName,
      role,
      location,
      vendor,
      name,
      lineNumber: i + 1,
    });
  }

  return rows;
}

// ─── Fuzzy name matching ──────────────────────────────────────────────────────

/** Normalise a name for fuzzy comparison: lowercase, collapse whitespace, strip common prefixes. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s&-]/g, '') // keep letters, numbers, &, -, spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalise a person name: strip prefixes like Mr., Ms., MR., etc., collapse whitespace. */
function normaliseName(name: string): string {
  return name
    .replace(/^(mr\.?|ms\.?|mrs\.?|miss\.?|dr\.?)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score the similarity between two normalised strings.
 * Returns a value between 0 (no match) and 1 (exact match).
 * Uses a combination of containment and token overlap.
 */
function similarityScore(a: string, b: string): number {
  const na = normalise(a);
  const nb = normalise(b);

  // Exact match
  if (na === nb) return 1.0;

  // One contains the other
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = na.length < nb.length ? na : nb;
    const longer = na.length < nb.length ? nb : na;
    return 0.7 + 0.3 * (shorter.length / longer.length);
  }

  // Token-based overlap (Jaccard-like)
  const tokensA = new Set(na.split(/[\s&-]+/).filter(Boolean));
  const tokensB = new Set(nb.split(/[\s&-]+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
}

/**
 * Check if two person names refer to the same person.
 * Handles prefix variations (Mr., MR., Ms.) and extra whitespace.
 */
function namesMatch(csvName: string, appName: string | undefined): boolean {
  if (!appName) return false;
  const a = normaliseName(csvName).toLowerCase();
  const b = normaliseName(appName).toLowerCase();
  if (a === b) return true;

  // Check if one contains the other (handles middle name variations)
  if (a.includes(b) || b.includes(a)) return true;

  // Check last name match (most reliable identifier)
  const aLast = a.split(' ').pop() || '';
  const bLast = b.split(' ').pop() || '';
  if (aLast.length > 2 && aLast === bLast) {
    // Also check first name starts similarly
    const aFirst = a.split(' ')[0] || '';
    const bFirst = b.split(' ')[0] || '';
    if (aFirst[0] === bFirst[0]) return true;
  }

  return false;
}

// ─── Role and type mapping ────────────────────────────────────────────────────

function mapRole(csvRole: string): Role | null {
  const r = csvRole.toLowerCase().trim();
  if (r === 'engineer') return 'engineer';
  if (r === 'senior engineer') return 'senior_engineer';
  if (r === 'staff engineer') return 'staff_engineer';
  if (r === 'engineering manager') return 'engineering_manager';
  if (r === 'head of engineering') return 'head_of_engineering';
  if (r === 'principal engineer') return 'principal_engineer';
  return null;
}

function mapLocation(csvLocation: string): Location {
  const l = csvLocation.toLowerCase().trim();
  if (l === 'offshore') return 'offshore';
  if (l === 'nearshore') return 'nearshore';
  return 'onshore';
}

function mapTypeAndVendor(vendor: string): { type: EmployeeType; vendor?: string } {
  if (vendor.toUpperCase() === 'M&S') {
    return { type: 'employee', vendor: undefined };
  }
  return { type: 'contractor', vendor };
}

// ─── Matching engine ──────────────────────────────────────────────────────────

interface AppTeamLocation {
  divisionId?: string;
  divisionName?: string;
  groupId: string;
  groupName: string;
  teamId: string;
  teamName: string;
  managerName?: string;
}

/** Enumerate all teams in a portfolio with their location context. */
function enumerateTeams(portfolio: Portfolio): AppTeamLocation[] {
  const result: AppTeamLocation[] = [];

  const processGroup = (group: Group, divisionId?: string, divisionName?: string) => {
    for (const team of group.teams) {
      result.push({
        divisionId,
        divisionName,
        groupId: group.id,
        groupName: group.name,
        teamId: team.id,
        teamName: team.name,
        managerName: group.manager?.name,
      });
    }
  };

  // Teams in divisions
  for (const division of portfolio.divisions ?? []) {
    for (const group of division.groups) {
      processGroup(group, division.id, division.name);
    }
  }

  // Direct groups
  for (const group of portfolio.groups) {
    processGroup(group);
  }

  return result;
}

interface CsvTeamGroup {
  csvGroup: string;
  csvTeam: string;
  rows: CsvRow[];
  managers: CsvRow[];
  engineers: CsvRow[];
}

/** Group CSV rows by (csvGroup, csvTeam) */
function groupCsvRows(rows: CsvRow[]): CsvTeamGroup[] {
  const map = new Map<string, CsvTeamGroup>();

  for (const row of rows) {
    const key = `${row.csvGroup}|||${row.teamName}`;
    if (!map.has(key)) {
      map.set(key, {
        csvGroup: row.csvGroup,
        csvTeam: row.teamName,
        rows: [],
        managers: [],
        engineers: [],
      });
    }
    const group = map.get(key)!;
    group.rows.push(row);
    const role = mapRole(row.role);
    if (role === 'engineering_manager') {
      group.managers.push(row);
    } else if (role === 'engineer' || role === 'senior_engineer') {
      group.engineers.push(row);
    }
  }

  return Array.from(map.values());
}

/**
 * Score how well a CSV team group matches an app team location.
 * Returns { score, reason, managerConfirmed }.
 */
function scoreMatch(
  csvTeamGroup: CsvTeamGroup,
  appTeam: AppTeamLocation
): { score: number; reason: string; managerConfirmed: boolean } {
  // 1. Team name similarity (highest weight)
  const teamScore = similarityScore(csvTeamGroup.csvTeam, appTeam.teamName);

  // 2. Division/Group name similarity to CSV group
  let contextScore = 0;
  let contextReason = '';
  if (appTeam.divisionName) {
    const divScore = similarityScore(csvTeamGroup.csvGroup, appTeam.divisionName);
    const grpScore = similarityScore(csvTeamGroup.csvGroup, appTeam.groupName);
    contextScore = Math.max(divScore, grpScore);
    contextReason = divScore >= grpScore
      ? `division "${appTeam.divisionName}"`
      : `group "${appTeam.groupName}"`;
  } else {
    contextScore = similarityScore(csvTeamGroup.csvGroup, appTeam.groupName);
    contextReason = `group "${appTeam.groupName}"`;
  }

  // 3. Manager name match (bonus confirmation)
  let managerConfirmed = false;
  let managerBonus = 0;
  for (const mgr of csvTeamGroup.managers) {
    if (namesMatch(mgr.name, appTeam.managerName)) {
      managerConfirmed = true;
      managerBonus = 0.15;
      break;
    }
  }

  const totalScore = teamScore * 0.55 + contextScore * 0.30 + managerBonus;

  const reasons: string[] = [];
  reasons.push(`team name "${csvTeamGroup.csvTeam}" → "${appTeam.teamName}" (${(teamScore * 100).toFixed(0)}%)`);
  reasons.push(`context match to ${contextReason} (${(contextScore * 100).toFixed(0)}%)`);
  if (managerConfirmed) {
    reasons.push(`manager confirmed`);
  }

  return {
    score: totalScore,
    reason: reasons.join('; '),
    managerConfirmed,
  };
}

// ─── Main import function ─────────────────────────────────────────────────────

const MATCH_THRESHOLD = 0.45;

/**
 * Analyse CSV data against a portfolio and produce a report + replacement plan.
 * Does NOT mutate any data — returns the plan and report for review.
 */
export function analyseImport(
  csvText: string,
  portfolio: Portfolio
): { report: ImportReport; replacements: TeamMemberReplacement[] } {
  const rows = parseCsv(csvText);
  const csvGroups = groupCsvRows(rows);
  const appTeams = enumerateTeams(portfolio);

  const teamChanges: TeamChange[] = [];
  const skippedRows: SkippedRow[] = [];
  const unmatchedTeams: UnmatchedTeam[] = [];
  const replacements: TeamMemberReplacement[] = [];

  // Track which app teams have been claimed to avoid double-matching
  const claimedTeams = new Set<string>();

  for (const csvGroup of csvGroups) {
    // Score every app team
    let bestMatch: AppTeamLocation | null = null;
    let bestResult: { score: number; reason: string; managerConfirmed: boolean } | null = null;

    for (const appTeam of appTeams) {
      if (claimedTeams.has(appTeam.teamId)) continue;
      const result = scoreMatch(csvGroup, appTeam);
      if (!bestResult || result.score > bestResult.score) {
        bestResult = result;
        bestMatch = appTeam;
      }
    }

    if (!bestMatch || !bestResult || bestResult.score < MATCH_THRESHOLD) {
      unmatchedTeams.push({
        csvGroup: csvGroup.csvGroup,
        csvTeam: csvGroup.csvTeam,
        rowCount: csvGroup.rows.length,
        reason: bestResult
          ? `Best candidate: "${bestMatch!.teamName}" in ${bestMatch!.divisionName ? `division "${bestMatch!.divisionName}", ` : ''}group "${bestMatch!.groupName}" — score ${(bestResult.score * 100).toFixed(0)}% (below ${(MATCH_THRESHOLD * 100).toFixed(0)}% threshold)`
          : 'No candidate teams found in portfolio',
      });

      // All rows in this group are skipped
      for (const row of csvGroup.rows) {
        skippedRows.push({ row, reason: `No matching team found for "${csvGroup.csvTeam}" in group "${csvGroup.csvGroup}"` });
      }
      continue;
    }

    claimedTeams.add(bestMatch.teamId);

    // Skip non-engineer rows and collect engineer replacements
    const match: MatchedTeam = {
      csvGroup: csvGroup.csvGroup,
      csvTeam: csvGroup.csvTeam,
      appDivision: bestMatch.divisionName,
      appGroup: bestMatch.groupName,
      appTeam: bestMatch.teamName,
      matchReason: bestResult.reason,
      managerConfirmed: bestResult.managerConfirmed,
    };

    // Determine what engineers to add from CSV
    const newPersons: Person[] = [];
    const addedChanges: PersonChange[] = [];

    for (const row of csvGroup.rows) {
      const role = mapRole(row.role);
      if (!role) {
        skippedRows.push({ row, reason: `Unknown role: "${row.role}"` });
        continue;
      }

      if (role === 'engineering_manager') {
        skippedRows.push({ row, reason: `Engineering Manager — used for matching only, not imported` });
        continue;
      }
      if (role === 'staff_engineer') {
        skippedRows.push({ row, reason: `Staff Engineer — management layer, not imported` });
        continue;
      }
      if (role === 'principal_engineer' || role === 'head_of_engineering') {
        skippedRows.push({ row, reason: `${row.role} — leadership layer, not imported` });
        continue;
      }

      // Engineer or Senior Engineer — import these
      const { type, vendor } = mapTypeAndVendor(row.vendor);
      const location: Location = type === 'employee' ? 'onshore' : mapLocation(row.location);
      const cleanName = normaliseName(row.name);

      const person: Person = {
        id: crypto.randomUUID(),
        name: cleanName,
        role,
        type,
        location,
        ...(vendor ? { vendor } : {}),
      };

      newPersons.push(person);
      addedChanges.push({
        name: cleanName,
        role: row.role,
        location: row.location,
        vendor: row.vendor,
        type,
      });
    }

    // Determine what existing members will be removed (only Engineer and Senior Engineer)
    const existingTeam = findTeamInPortfolio(portfolio, bestMatch.teamId);
    const removedChanges: PersonChange[] = [];
    const keptMembers: Person[] = [];

    if (existingTeam) {
      for (const member of existingTeam.members) {
        if (member.role === 'engineer' || member.role === 'senior_engineer') {
          removedChanges.push({
            name: member.name || 'Unnamed',
            role: member.role === 'engineer' ? 'Engineer' : 'Senior Engineer',
            location: member.location || 'onshore',
            vendor: member.vendor || '',
            type: member.type,
          });
        } else {
          // Keep Staff Engineers and other non-engineer roles
          keptMembers.push(member);
        }
      }
    }

    teamChanges.push({
      match,
      added: addedChanges,
      removed: removedChanges,
    });

    replacements.push({
      portfolioId: portfolio.id,
      divisionId: bestMatch.divisionId,
      groupId: bestMatch.groupId,
      teamId: bestMatch.teamId,
      // Combine kept members (staff engineers etc.) with new imports
      newMembers: [...keptMembers, ...newPersons],
    });
  }

  const report: ImportReport = {
    teamChanges,
    skippedRows,
    unmatchedTeams,
    summary: {
      teamsMatched: teamChanges.length,
      teamsUnmatched: unmatchedTeams.length,
      membersAdded: teamChanges.reduce((sum, tc) => sum + tc.added.length, 0),
      membersRemoved: teamChanges.reduce((sum, tc) => sum + tc.removed.length, 0),
      rowsSkipped: skippedRows.length,
    },
  };

  return { report, replacements };
}

/** Find a team by ID within a portfolio. */
function findTeamInPortfolio(portfolio: Portfolio, teamId: string): Team | null {
  for (const division of portfolio.divisions ?? []) {
    for (const group of division.groups) {
      for (const team of group.teams) {
        if (team.id === teamId) return team;
      }
    }
  }
  for (const group of portfolio.groups) {
    for (const team of group.teams) {
      if (team.id === teamId) return team;
    }
  }
  return null;
}
