import type { ReactNode } from 'react';
import type { Portfolio, Person, Group, Division } from '../types/org';
import { ROLE_LABELS } from '../types/org';

interface OrgTreeViewProps {
  portfolio: Portfolio;
  onClose: () => void;
}

// ─── Span helpers ────────────────────────────────────────────────────────────

function groupHeadcount(group: Group): number {
  let n = group.staffEngineers.length;
  for (const team of group.teams) n += team.members.length;
  return n;
}

function divisionHeadcount(division: Division): number {
  return division.groups.reduce((sum, g) => sum + (g.manager ? 1 : 0) + groupHeadcount(g), 0);
}

function portfolioHeadcount(portfolio: Portfolio): number {
  let n = 0;
  for (const div of portfolio.divisions ?? []) n += divisionHeadcount(div);
  for (const g of portfolio.groups) n += (g.manager ? 1 : 0) + groupHeadcount(g);
  n += portfolio.principalEngineers.length;
  return n;
}

/** Count of people who report directly to the Head of Engineering. */
function hoeDirectReports(portfolio: Portfolio): number {
  let n = portfolio.principalEngineers.length;
  for (const div of portfolio.divisions ?? []) {
    for (const g of div.groups) if (g.manager) n++;
  }
  for (const g of portfolio.groups) if (g.manager) n++;
  return n;
}

// ─── Shared card dimensions ───────────────────────────────────────────────────

/** All cards use this fixed width so tree columns stay uniform. */
const CARD_CLS = 'w-40 flex-shrink-0';

// ─── Vendor colour system ─────────────────────────────────────────────────────

/** Distinct colours cycled across known vendors. */
const VENDOR_PALETTE = [
  'bg-orange-500',
  'bg-cyan-600',
  'bg-rose-500',
  'bg-amber-500',
  'bg-lime-600',
  'bg-fuchsia-600',
  'bg-emerald-600',
  'bg-sky-500',
];

/** Colour used when a person has no vendor (employees). */
const NO_VENDOR_COLOUR = 'bg-gray-900';

function collectVendors(portfolio: Portfolio): string[] {
  const vendors = new Set<string>();
  const scan = (p: Person) => { if (p.vendor) vendors.add(p.vendor); };
  portfolio.headOfEngineering && scan(portfolio.headOfEngineering);
  portfolio.principalEngineers.forEach(scan);
  const scanGroup = (g: Group) => {
    g.manager && scan(g.manager);
    g.staffEngineers.forEach(scan);
    g.teams.forEach(t => t.members.forEach(scan));
  };
  portfolio.divisions?.forEach(d => d.groups.forEach(scanGroup));
  portfolio.groups.forEach(scanGroup);
  return Array.from(vendors).sort();
}

function buildVendorColourMap(portfolio: Portfolio): Map<string | undefined, string> {
  const map = new Map<string | undefined, string>();
  collectVendors(portfolio).forEach((v, i) => {
    map.set(v, VENDOR_PALETTE[i % VENDOR_PALETTE.length]);
  });
  map.set(undefined, NO_VENDOR_COLOUR);
  return map;
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function PersonCard({
  person,
  reportCount,
  spanCount,
  vendorColour,
}: {
  person: Person;
  reportCount: number;
  spanCount?: number;   // only supplied for Head of Engineering
  vendorColour: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${CARD_CLS} text-center select-none`}>
      <div className={`${vendorColour} h-1 w-full`} />
      <div className="px-2 py-1.5 space-y-0.5">
        <div className="font-semibold text-gray-800 text-[11px] leading-tight truncate" title={person.name}>
          {person.name ?? <span className="italic text-gray-400">Unnamed</span>}
        </div>
        <div className="text-[10px] text-gray-500 leading-tight">{ROLE_LABELS[person.role]}</div>
        <div className="text-[10px] text-gray-400 pt-0.5">
          {spanCount !== undefined ? (
            <>
              Reports&nbsp;<span className="font-semibold text-gray-600">{reportCount}</span>
              <span className="mx-1 text-gray-300">·</span>
              Span&nbsp;<span className="font-semibold text-gray-600">{spanCount}</span>
            </>
          ) : (
            <>Reports&nbsp;<span className="font-semibold text-gray-600">{reportCount}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

function LabelCard({
  label,
  subtitle,
  colour = 'border-gray-300 bg-gray-50 text-gray-700',
}: {
  label: string;
  subtitle?: string;
  colour?: string;
}) {
  return (
    <div className={`border rounded-lg px-2 py-1.5 text-center ${colour} ${CARD_CLS}`}>
      <div className="text-[11px] font-semibold leading-tight truncate" title={label}>{label}</div>
      {subtitle && <div className="text-[10px] text-gray-500 mt-0.5">{subtitle}</div>}
    </div>
  );
}

// ─── Connector primitives ─────────────────────────────────────────────────────

/** A short vertical line linking a card to the branch bar or next card. */
function VStub() {
  return <div className="w-px h-5 bg-gray-300 flex-shrink-0" />;
}

// ─── Tree layout ──────────────────────────────────────────────────────────────

/**
 * Wraps a card and its optional sub-tree in a centred flex column.
 */
function TreeNode({ card, children }: { card: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      {card}
      {children}
    </div>
  );
}

/**
 * Renders a row of child sub-trees with reliable connector lines built from
 * explicit <div> elements rather than CSS pseudo-elements.
 *
 * For each child column:
 *   - A left-half horizontal bar  (omitted for the first child)
 *   - A right-half horizontal bar (omitted for the last child)
 *   - A vertical stub (h-5) down to the child card
 *
 * Adjacent columns share a boundary, so left-half of column i+1 and right-half
 * of column i meet exactly — the horizontal bar is always continuous.
 */
function TreeChildren({ nodes }: { nodes: ReactNode[] }) {
  if (nodes.length === 0) return null;

  // Single child → straight vertical line only.
  if (nodes.length === 1) {
    return (
      <>
        <VStub />
        {nodes[0]}
      </>
    );
  }

  return (
    <>
      {/* Vertical stub from parent card down to the horizontal branch bar */}
      <VStub />
      <div className="flex items-start">
        {nodes.map((node, i) => {
          const isFirst = i === 0;
          const isLast  = i === nodes.length - 1;
          return (
            <div key={i} className="relative flex flex-col items-center px-3">
              {/* Left half of horizontal branch bar (skip for first child) */}
              {!isFirst && (
                <div className="absolute top-0 left-0 right-1/2 h-px bg-gray-300" />
              )}
              {/* Right half of horizontal branch bar (skip for last child) */}
              {!isLast && (
                <div className="absolute top-0 left-1/2 right-0 h-px bg-gray-300" />
              )}
              {/* Vertical stub from the branch bar down to the child */}
              <VStub />
              {node}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Principal Engineers strip ───────────────────────────────────────────────

/**
 * Renders PEs as an inline leadership panel on the connector line rather than
 * a branching group node, making clear they are part of portfolio leadership.
 */
function PrincipalEngineersStrip({
  people,
  vcm,
}: {
  people: Person[];
  vcm: Map<string | undefined, string>;
}) {
  const vc = (p: Person) => vcm.get(p.vendor) ?? NO_VENDOR_COLOUR;
  return (
    <div className="border border-dashed border-indigo-300 rounded-lg bg-indigo-50/60 px-3 pt-1.5 pb-2">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-indigo-400 text-center mb-2">
        Principal Engineers
      </div>
      <div className="flex items-start gap-2 flex-wrap justify-center">
        {people.map((pe) => (
          <PersonCard key={pe.id} person={pe} reportCount={0} vendorColour={vc(pe)} />
        ))}
      </div>
    </div>
  );
}

// ─── Group sub-tree ───────────────────────────────────────────────────────────

function GroupSubTree({ group, vcm }: { group: Group; vcm: Map<string | undefined, string> }) {
  const vc = (p: Person) => vcm.get(p.vendor) ?? NO_VENDOR_COLOUR;
  const leafNodes: ReactNode[] = [];

  if (group.manager) {
    leafNodes.push(<PersonCard person={group.manager} reportCount={groupHeadcount(group)} vendorColour={vc(group.manager)} />);
  }
  for (const se of group.staffEngineers) {
    leafNodes.push(<PersonCard person={se} reportCount={0} vendorColour={vc(se)} />);
  }

  const total = (group.manager ? 1 : 0) + groupHeadcount(group);
  const groupCard = (
    <LabelCard
      label={group.name}
      colour="border-blue-300 bg-blue-50 text-blue-800"
      subtitle={`${total} people`}
    />
  );

  return (
    <TreeNode
      card={groupCard}
      children={leafNodes.length > 0 ? <TreeChildren nodes={leafNodes} /> : undefined}
    />
  );
}

// ─── Division sub-tree ────────────────────────────────────────────────────────

function DivisionSubTree({ division, vcm }: { division: Division; vcm: Map<string | undefined, string> }) {
  const headcount = divisionHeadcount(division);
  const divCard = (
    <LabelCard
      label={division.name}
      colour="border-purple-300 bg-purple-50 text-purple-800"
      subtitle={`${headcount} people`}
    />
  );
  const groupNodes = division.groups.map((g, i) => <GroupSubTree key={i} group={g} vcm={vcm} />);
  return <TreeNode card={divCard} children={<TreeChildren nodes={groupNodes} />} />;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function OrgTreeView({ portfolio, onClose }: OrgTreeViewProps) {
  const totalHeadcount = portfolioHeadcount(portfolio);
  const vcm = buildVendorColourMap(portfolio);
  const vc = (p: Person) => vcm.get(p.vendor) ?? NO_VENDOR_COLOUR;

  const rootCard = portfolio.headOfEngineering ? (
    <PersonCard
      person={portfolio.headOfEngineering}
      reportCount={hoeDirectReports(portfolio)}
      spanCount={totalHeadcount}
      vendorColour={vc(portfolio.headOfEngineering)}
    />
  ) : (
    <LabelCard
      label={portfolio.name}
      colour="border-indigo-400 bg-indigo-50 text-indigo-800"
      subtitle={`${totalHeadcount} people`}
    />
  );

  const level2Nodes: ReactNode[] = [];

  // Divisions
  for (let i = 0; i < (portfolio.divisions?.length ?? 0); i++) {
    level2Nodes.push(<DivisionSubTree key={`div-${i}`} division={portfolio.divisions![i]} vcm={vcm} />);
  }
  // Direct groups
  for (let i = 0; i < portfolio.groups.length; i++) {
    level2Nodes.push(<GroupSubTree key={`grp-${i}`} group={portfolio.groups[i]} vcm={vcm} />);
  }

  // Compose the sub-tree: PEs render as an inline strip on the connector line,
  // NOT as a branching child, so they're clearly leadership not a reporting unit.
  const hasPEs   = portfolio.principalEngineers.length > 0;
  const hasMain  = level2Nodes.length > 0;

  let treeChildren: ReactNode;
  if (hasPEs && hasMain) {
    treeChildren = (
      <>
        <VStub />
        <PrincipalEngineersStrip people={portfolio.principalEngineers} vcm={vcm} />
        {/* TreeChildren starts with its own VStub, continuing the line */}
        <TreeChildren nodes={level2Nodes} />
      </>
    );
  } else if (hasPEs) {
    treeChildren = (
      <>
        <VStub />
        <PrincipalEngineersStrip people={portfolio.principalEngineers} vcm={vcm} />
      </>
    );
  } else if (hasMain) {
    treeChildren = <TreeChildren nodes={level2Nodes} />;
  } else {
    treeChildren = undefined;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-auto p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-auto max-w-[95vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{portfolio.name}</h2>
            <p className="text-sm text-gray-500">Organisation Tree · Management View</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Legend — vendor colour key */}
        <div className="flex items-center gap-4 px-6 py-2 border-b border-gray-100 flex-wrap">
          <span className="text-[10px] font-medium text-gray-500 mr-1">Vendor:</span>
          {Array.from(vcm.entries())
            .sort(([a], [b]) => {
              if (a === undefined) return 1;   // "Employee" always last
              if (b === undefined) return -1;
              return a.localeCompare(b);
            })
            .map(([vendor, colour]) => (
              <span key={vendor ?? '__employee'} className="flex items-center gap-1 text-[10px] text-gray-600">
                <span className={`inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 ${colour}`} />
                {vendor ?? 'Employee'}
              </span>
            ))}
          <span className="ml-auto text-[10px] italic text-gray-400">Span = total headcount in area</span>
        </div>

        {/* Tree */}
        <div className="p-8 overflow-auto">
          <TreeNode
            card={rootCard}
            children={treeChildren}
          />
        </div>
      </div>
    </div>
  );
}
