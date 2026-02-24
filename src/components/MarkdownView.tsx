import { useState, useMemo } from 'react';
import type { Portfolio, Person, Group, Division, Team, Role, EmployeeType, Location } from '../types/org';
import { ROLE_LABELS } from '../types/org';

interface MarkdownViewProps {
  portfolio: Portfolio;
  onClose: () => void;
  onApply: (updated: Partial<Omit<Portfolio, 'id'>>) => void;
}

// ─── Markdown generation ──────────────────────────────────────────────────────

/** Build the bracketed suffix for a person, e.g. "[contractor, offshore, TCS]" */
function personProps(p: Person): string {
  if (p.type === 'employee') return ''; // employee + onshore is the default
  const parts: string[] = ['contractor'];
  if (p.location && p.location !== 'onshore') parts.push(p.location);
  if (p.vendor) parts.push(p.vendor);
  return ` [${parts.join(', ')}]`;
}

/** Format a single named person line: "Name, Role [props]" */
function namedPersonLine(p: Person): string {
  const name = p.name || 'Unnamed';
  return `${name}, ${ROLE_LABELS[p.role]}${personProps(p)}`;
}

/** Format a leadership person where the role is implicit from context: "Name [props]" */
function leaderPersonLine(p: Person): string {
  const name = p.name || 'Unnamed';
  return `${name}${personProps(p)}`;
}

/** Key for grouping identical unnamed roles */
function groupingKey(p: Person): string {
  return `${p.role}|${p.type}|${p.location ?? 'onshore'}|${p.vendor ?? ''}`;
}

/** Format grouped people lines for team members */
function formatTeamMembers(members: Person[]): string[] {
  const named: Person[] = [];
  const unnamed = new Map<string, { person: Person; count: number }>();

  for (const m of members) {
    if (m.name) {
      named.push(m);
    } else {
      const key = groupingKey(m);
      const existing = unnamed.get(key);
      if (existing) {
        existing.count++;
      } else {
        unnamed.set(key, { person: m, count: 1 });
      }
    }
  }

  const lines: string[] = [];

  // Output grouped unnamed members first
  for (const { person, count } of unnamed.values()) {
    const prefix = count > 1 ? `${count}x ` : '';
    lines.push(`- ${prefix}${ROLE_LABELS[person.role]}${personProps(person)}`);
  }

  // Then named members
  for (const p of named) {
    lines.push(`- ${namedPersonLine(p)}`);
  }

  return lines;
}

function generateGroupMarkdown(group: Group, depth: number): string {
  const h = '#'.repeat(depth);
  const lines: string[] = [];
  lines.push(`${h} ${group.name}`);

  if (group.manager) {
    lines.push(`Manager: ${leaderPersonLine(group.manager)}`);
  } else if (group.managedBy) {
    lines.push(`Managed by: ${group.managedBy}`);
  }

  for (const se of group.staffEngineers) {
    lines.push(`Staff: ${leaderPersonLine(se)}`);
  }

  for (const team of group.teams) {
    const teamH = '#'.repeat(depth + 1);
    lines.push('');
    lines.push(`${teamH} ${team.name}`);
    lines.push(...formatTeamMembers(team.members));
  }

  return lines.join('\n');
}

function generateDivisionMarkdown(division: Division): string {
  const lines: string[] = [];
  lines.push(`## Division: ${division.name}`);
  lines.push('');

  for (let i = 0; i < division.groups.length; i++) {
    if (i > 0) lines.push('');
    lines.push(generateGroupMarkdown(division.groups[i], 3));
  }
  return lines.join('\n');
}

function generateMarkdown(portfolio: Portfolio): string {
  const lines: string[] = [];
  const target = portfolio.onshoreTargetPercentage ?? 50;
  lines.push(`# ${portfolio.name} (${target}% onshore target)`);
  lines.push('');

  // Leadership
  if (portfolio.headOfEngineering) {
    lines.push(`Head of Engineering: ${leaderPersonLine(portfolio.headOfEngineering)}`);
  }
  for (const pe of portfolio.principalEngineers) {
    lines.push(`Principal Engineer: ${leaderPersonLine(pe)}`);
  }

  // Divisions
  if (portfolio.divisions && portfolio.divisions.length > 0) {
    for (const division of portfolio.divisions) {
      lines.push('');
      lines.push(generateDivisionMarkdown(division));
    }
  }

  // Direct groups
  for (const group of portfolio.groups) {
    lines.push('');
    lines.push(generateGroupMarkdown(group, 2));
  }

  return lines.join('\n') + '\n';
}

// ─── Markdown parsing ─────────────────────────────────────────────────────────

const ROLE_FROM_LABEL: Record<string, Role> = {};
for (const [key, label] of Object.entries(ROLE_LABELS)) {
  ROLE_FROM_LABEL[label.toLowerCase()] = key as Role;
}

interface ParseError {
  line: number;
  message: string;
}

interface ParseResult {
  portfolio: Partial<Omit<Portfolio, 'id'>> | null;
  errors: ParseError[];
}

/** Parse person properties from bracket notation: "[contractor, offshore, TCS]" */
function parseProps(bracketStr: string): { type: EmployeeType; location: Location; vendor: string | undefined } {
  const inner = bracketStr.slice(1, -1).trim();
  const parts = inner.split(',').map(s => s.trim()).filter(Boolean);

  let type: EmployeeType = 'employee';
  let location: Location = 'onshore';
  let vendor: string | undefined;

  for (let i = 0; i < parts.length; i++) {
    const lower = parts[i].toLowerCase();
    if (lower === 'contractor') {
      type = 'contractor';
    } else if (lower === 'employee') {
      type = 'employee';
    } else if (lower === 'onshore' || lower === 'nearshore' || lower === 'offshore') {
      location = lower as Location;
    } else {
      // Anything else is the vendor
      vendor = parts[i];
    }
  }

  // Employees are always onshore
  if (type === 'employee') {
    location = 'onshore';
    vendor = undefined;
  }

  return { type, location, vendor };
}

/** Parse a person line like "Name, Role [props]" or "Nx Role [props]" or "Role [props]" */
function parsePersonLine(
  text: string,
): { persons: Omit<Person, 'id'>[]; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { persons: [], error: 'Empty person line' };

  // Extract bracket properties if present
  let mainPart = trimmed;
  let props = { type: 'employee' as EmployeeType, location: 'onshore' as Location, vendor: undefined as string | undefined };
  const bracketMatch = trimmed.match(/\[([^\]]*)\]\s*$/);
  if (bracketMatch) {
    props = parseProps(bracketMatch[0]);
    mainPart = trimmed.slice(0, bracketMatch.index).trim();
  }

  // Check for "Nx Role" pattern (quantity prefix)
  const quantityMatch = mainPart.match(/^(\d+)x\s+(.+)$/i);
  if (quantityMatch) {
    const count = parseInt(quantityMatch[1], 10);
    const roleName = quantityMatch[2].trim();
    const role = ROLE_FROM_LABEL[roleName.toLowerCase()];
    if (!role) {
      return { persons: [], error: `Unknown role "${roleName}"` };
    }
    const persons: Omit<Person, 'id'>[] = [];
    for (let i = 0; i < count; i++) {
      persons.push({ role, type: props.type, location: props.location, vendor: props.vendor });
    }
    return { persons };
  }

  // Check for "Name, Role" pattern
  const commaIdx = mainPart.lastIndexOf(',');
  if (commaIdx !== -1) {
    const name = mainPart.slice(0, commaIdx).trim();
    const roleName = mainPart.slice(commaIdx + 1).trim();
    const role = ROLE_FROM_LABEL[roleName.toLowerCase()];
    if (!role) {
      return { persons: [], error: `Unknown role "${roleName}"` };
    }
    return { persons: [{ name, role, type: props.type, location: props.location, vendor: props.vendor }] };
  }

  // Just a role name (single unnamed person)
  const role = ROLE_FROM_LABEL[mainPart.toLowerCase()];
  if (!role) {
    return { persons: [], error: `Unknown role "${mainPart}"` };
  }
  return { persons: [{ role, type: props.type, location: props.location, vendor: props.vendor }] };
}

/** Parse a leadership line like "Head of Engineering: Name, Role [props]" */
function parseLeadershipLine(
  text: string,
  prefix: string,
  expectedRole: Role,
): { person: Omit<Person, 'id'> | null; error?: string } {
  const after = text.slice(prefix.length).trim();
  if (!after) return { person: null, error: `Missing person details after "${prefix}"` };

  // Try parsing as a full person line first
  const result = parsePersonLine(after);
  if (result.error) {
    // Try treating entire text after prefix as just a name (with optional props)
    let mainPart = after;
    let props = { type: 'employee' as EmployeeType, location: 'onshore' as Location, vendor: undefined as string | undefined };
    const bracketMatch = after.match(/\[([^\]]*)\]\s*$/);
    if (bracketMatch) {
      props = parseProps(bracketMatch[0]);
      mainPart = after.slice(0, bracketMatch.index).trim();
    }
    // Remove trailing comma if any
    mainPart = mainPart.replace(/,\s*$/, '').trim();
    return {
      person: {
        name: mainPart || undefined,
        role: expectedRole,
        type: props.type,
        location: props.location,
        vendor: props.vendor,
      },
    };
  }
  if (result.persons.length !== 1) {
    return { person: null, error: `Expected exactly one person for "${prefix}"` };
  }
  return { person: result.persons[0] };
}

function parseMarkdown(text: string): ParseResult {
  const lines = text.split('\n');
  const errors: ParseError[] = [];

  let portfolioName: string | null = null;
  let onshoreTarget = 50;
  let headOfEngineering: Person | undefined;
  const principalEngineers: Person[] = [];
  const divisions: Division[] = [];
  const directGroups: Group[] = [];

  // Current context
  let currentDivision: Division | null = null;
  let currentGroup: Group | null = null;
  let currentTeam: Team | null = null;
  // Track whether current group is inside a division
  let groupInDivision = false;

  function generateId(): string {
    return crypto.randomUUID();
  }

  function finishTeam() {
    if (currentTeam && currentGroup) {
      currentGroup.teams.push(currentTeam);
      currentTeam = null;
    }
  }

  function finishGroup() {
    finishTeam();
    if (currentGroup) {
      if (groupInDivision && currentDivision) {
        currentDivision.groups.push(currentGroup);
      } else {
        directGroups.push(currentGroup);
      }
      currentGroup = null;
    }
  }

  function finishDivision() {
    finishGroup();
    if (currentDivision) {
      divisions.push(currentDivision);
      currentDivision = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // ── # Portfolio heading ──
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match && !trimmed.startsWith('##')) {
      const headingText = h1Match[1].trim();
      const targetMatch = headingText.match(/\((\d+)%\s*onshore\s*target\)\s*$/i);
      if (targetMatch) {
        onshoreTarget = parseInt(targetMatch[1], 10);
        portfolioName = headingText.slice(0, targetMatch.index).trim();
      } else {
        portfolioName = headingText;
      }
      continue;
    }

    // ── #### Team heading (deepest) ──
    const h4Match = trimmed.match(/^####\s+(.+)$/);
    if (h4Match) {
      if (!currentGroup) {
        errors.push({ line: lineNum, message: 'Team heading (####) found outside of a group' });
        continue;
      }
      finishTeam();
      currentTeam = { id: generateId(), name: h4Match[1].trim(), members: [] };
      continue;
    }

    // ── ### Group or Team heading ──
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      if (currentDivision) {
        // Inside a division, ### is a group
        finishGroup();
        currentGroup = {
          id: generateId(),
          name: h3Match[1].trim(),
          staffEngineers: [],
          teams: [],
        };
        groupInDivision = true;
      } else if (currentGroup) {
        // Inside a direct group, ### is a team
        finishTeam();
        currentTeam = { id: generateId(), name: h3Match[1].trim(), members: [] };
      } else {
        errors.push({ line: lineNum, message: 'Heading ### found outside expected context (no division or group)' });
      }
      continue;
    }

    // ── ## Division or Group heading ──
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      const headingText = h2Match[1].trim();
      const divMatch = headingText.match(/^Division:\s*(.+)$/i);
      if (divMatch) {
        finishDivision();
        currentDivision = { id: generateId(), name: divMatch[1].trim(), groups: [] };
        groupInDivision = false;
      } else {
        // Direct group
        finishDivision();
        currentGroup = {
          id: generateId(),
          name: headingText,
          staffEngineers: [],
          teams: [],
        };
        groupInDivision = false;
      }
      continue;
    }

    // ── Leadership lines (only before any ## heading) ──
    if (!currentDivision && !currentGroup) {
      const hoeMatch = trimmed.match(/^Head of Engineering:\s*(.+)$/i);
      if (hoeMatch) {
        const result = parseLeadershipLine(trimmed, 'Head of Engineering:', 'head_of_engineering');
        if (result.error) {
          errors.push({ line: lineNum, message: result.error });
        } else if (result.person) {
          headOfEngineering = { id: generateId(), ...result.person } as Person;
        }
        continue;
      }

      const peMatch = trimmed.match(/^Principal Engineer:\s*(.+)$/i);
      if (peMatch) {
        const result = parseLeadershipLine(trimmed, 'Principal Engineer:', 'principal_engineer');
        if (result.error) {
          errors.push({ line: lineNum, message: result.error });
        } else if (result.person) {
          principalEngineers.push({ id: generateId(), ...result.person } as Person);
        }
        continue;
      }
    }

    // ── Manager line ──
    const mgrMatch = trimmed.match(/^Manager:\s*(.+)$/i);
    if (mgrMatch) {
      if (!currentGroup) {
        errors.push({ line: lineNum, message: 'Manager line found outside of a group' });
        continue;
      }
      const result = parseLeadershipLine(trimmed, 'Manager:', 'engineering_manager');
      if (result.error) {
        errors.push({ line: lineNum, message: result.error });
      } else if (result.person) {
        currentGroup.manager = { id: generateId(), ...result.person } as Person;
      }
      continue;
    }

    // ── Managed by line (external discipline covering management) ──
    const managedByMatch = trimmed.match(/^Managed by:\s*(.+)$/i);
    if (managedByMatch) {
      if (!currentGroup) {
        errors.push({ line: lineNum, message: 'Managed by line found outside of a group' });
        continue;
      }
      currentGroup.managedBy = managedByMatch[1].trim();
      continue;
    }

    // ── Staff Engineer line ──
    const staffMatch = trimmed.match(/^Staff:\s*(.+)$/i);
    if (staffMatch) {
      if (!currentGroup) {
        errors.push({ line: lineNum, message: 'Staff line found outside of a group' });
        continue;
      }
      const result = parseLeadershipLine(trimmed, 'Staff:', 'staff_engineer');
      if (result.error) {
        errors.push({ line: lineNum, message: result.error });
      } else if (result.person) {
        currentGroup.staffEngineers.push({ id: generateId(), ...result.person } as Person);
      }
      continue;
    }

    // ── List item (team member) ──
    const listMatch = trimmed.match(/^-\s+(.+)$/);
    if (listMatch) {
      if (!currentTeam) {
        errors.push({ line: lineNum, message: 'List item found outside of a team. Place it under a team heading.' });
        continue;
      }
      const result = parsePersonLine(listMatch[1]);
      if (result.error) {
        errors.push({ line: lineNum, message: result.error });
      } else {
        for (const p of result.persons) {
          currentTeam.members.push({ id: generateId(), ...p } as Person);
        }
      }
      continue;
    }

    // ── Unknown line ──
    // Only flag as error if it's not a comment or decorative line
    if (!trimmed.startsWith('>') && !trimmed.startsWith('---') && !trimmed.startsWith('<!--')) {
      errors.push({ line: lineNum, message: `Unrecognized line: "${trimmed}"` });
    }
  }

  // Finalize any open contexts
  finishDivision();
  // If there's a lingering direct group
  finishGroup();

  if (!portfolioName) {
    errors.push({ line: 1, message: 'Missing portfolio heading (# Portfolio Name)' });
    return { portfolio: null, errors };
  }

  if (errors.length > 0) {
    return { portfolio: null, errors };
  }

  return {
    portfolio: {
      name: portfolioName,
      onshoreTargetPercentage: onshoreTarget,
      headOfEngineering: headOfEngineering,
      principalEngineers,
      divisions: divisions.length > 0 ? divisions : undefined,
      groups: directGroups,
    },
    errors: [],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MarkdownView({ portfolio, onClose, onApply }: MarkdownViewProps) {
  const initialMarkdown = useMemo(() => generateMarkdown(portfolio), [portfolio]);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [copied, setCopied] = useState(false);
  const isDirty = markdown !== initialMarkdown;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolio.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
    const result = parseMarkdown(markdown);
    if (result.errors.length > 0) {
      setErrors(result.errors);
      return;
    }
    if (result.portfolio) {
      setErrors([]);
      onApply(result.portfolio);
      onClose();
    }
  };

  const handleReset = () => {
    setMarkdown(initialMarkdown);
    setErrors([]);
  };

  // Line count for the gutter
  const lineCount = markdown.split('\n').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-auto p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{portfolio.name}</h2>
            <p className="text-sm text-gray-500">
              Edit markdown to update portfolio structure
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="text-sm px-3 py-1.5 bg-slate-500 text-white rounded-md hover:bg-slate-600"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="text-sm px-3 py-1.5 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-2"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Help hint */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-600">Format:</span>{' '}
          <code className="bg-gray-200 px-1 rounded">## Division: Name</code>{' '}
          <code className="bg-gray-200 px-1 rounded">## Group Name</code>{' '}
          <code className="bg-gray-200 px-1 rounded">### Team Name</code>{' · '}
          Members: <code className="bg-gray-200 px-1 rounded">- 3x Senior Engineer [contractor, offshore, TCS]</code>{' · '}
          Named: <code className="bg-gray-200 px-1 rounded">- Name, Role [contractor, offshore, Vendor]</code>{' · '}
          Default = employee, onshore
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto min-h-0">
          <div className="relative">
            <div className="flex">
              {/* Line numbers */}
              <div className="flex-shrink-0 bg-gray-50 border-r border-gray-200 text-right pr-3 pl-4 py-4 select-none">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div
                    key={i + 1}
                    className={`text-xs leading-[1.625rem] font-mono ${
                      errors.some(e => e.line === i + 1)
                        ? 'text-red-500 font-bold'
                        : 'text-gray-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Textarea */}
              <textarea
                value={markdown}
                onChange={(e) => {
                  setMarkdown(e.target.value);
                  setErrors([]);
                }}
                spellCheck={false}
                className="flex-1 p-4 text-sm font-mono leading-relaxed text-gray-800 resize-none outline-none min-h-[50vh] bg-transparent"
                style={{ lineHeight: '1.625rem' }}
              />
            </div>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200 max-h-32 overflow-auto">
            <p className="text-sm font-medium text-red-700 mb-1">
              Parsing errors ({errors.length}):
            </p>
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-red-600 font-mono">
                Line {err.line}: {err.message}
              </p>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="text-xs text-gray-500">
            {isDirty ? (
              <span className="text-amber-600 font-medium">Unsaved changes</span>
            ) : (
              <span>No changes</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                onClick={handleReset}
                className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md"
              >
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!isDirty}
              className={`text-sm px-4 py-1.5 rounded-md font-medium ${
                isDirty
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
