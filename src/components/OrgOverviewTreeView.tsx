import { useState, useRef, type ReactNode } from 'react';
import type { OrgData, Person, Portfolio } from '../types/org';
import { ROLE_LABELS } from '../types/org';
import { buildVendorColourMap } from './OrgTreeView';
import { exportTreeToPdf } from '../utils/exportPdf';

interface OrgOverviewTreeViewProps {
  data: OrgData;
  onClose: () => void;
}

// ─── Headcount helpers ────────────────────────────────────────────────────────

function portfolioTotalHeadcount(portfolio: Portfolio): number {
  let n = 0;
  if (portfolio.headOfEngineering) n += 1;
  n += portfolio.principalEngineers.length;
  for (const div of portfolio.divisions ?? []) {
    for (const g of div.groups) {
      if (g.manager) n += 1;
      n += g.staffEngineers.length;
      for (const t of g.teams) n += t.members.length;
    }
  }
  for (const g of portfolio.groups) {
    if (g.manager) n += 1;
    n += g.staffEngineers.length;
    for (const t of g.teams) n += t.members.length;
  }
  return n;
}

// ─── Card dimensions ──────────────────────────────────────────────────────────

const CARD_CLS = 'w-48 flex-shrink-0';

const NO_VENDOR_COLOUR = 'bg-gray-900';

// ─── Cards ────────────────────────────────────────────────────────────────────

function PersonCard({
  person,
  subtitle,
  headcount,
  vendorColour,
}: {
  person: Person;
  subtitle?: string;
  headcount?: number;
  vendorColour: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${CARD_CLS} text-center select-none`}>
      <div className={`${vendorColour} h-1.5 w-full`} />
      <div className="px-3 py-2 space-y-0.5">
        <div className="font-semibold text-gray-800 text-xs leading-tight truncate" title={person.name}>
          {person.name ?? <span className="italic text-gray-400">Unnamed</span>}
        </div>
        <div className="text-[10px] text-gray-500 leading-tight">{ROLE_LABELS[person.role]}</div>
        {subtitle && (
          <div className="text-[10px] text-gray-400 leading-tight">{subtitle}</div>
        )}
        {headcount !== undefined && (
          <div className="text-[10px] text-gray-400 pt-0.5">
            Headcount&nbsp;<span className="font-semibold text-gray-600">{headcount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AreaCard({
  portfolio,
  vendorColourMap,
}: {
  portfolio: Portfolio;
  vendorColourMap: Map<string | undefined, string>;
}) {
  const headcount = portfolioTotalHeadcount(portfolio);
  const hoe = portfolio.headOfEngineering;
  const vc = hoe ? (vendorColourMap.get(hoe.vendor) ?? NO_VENDOR_COLOUR) : NO_VENDOR_COLOUR;

  // Count groups (direct + within divisions)
  const groupCount = portfolio.groups.length + (portfolio.divisions ?? []).reduce((s, d) => s + d.groups.length, 0);
  const divisionCount = portfolio.divisions?.length ?? 0;

  const structureLabel = divisionCount > 0
    ? `${divisionCount} division${divisionCount !== 1 ? 's' : ''} · ${groupCount} group${groupCount !== 1 ? 's' : ''}`
    : `${groupCount} group${groupCount !== 1 ? 's' : ''}`;

  return (
    <div className={`bg-white border-2 border-indigo-200 rounded-xl shadow-md overflow-hidden ${CARD_CLS} text-center select-none`}>
      {/* Area / portfolio label */}
      <div className="bg-indigo-50 border-b border-indigo-200 px-3 py-2 min-h-[3rem] flex flex-col justify-center">
        <div className="text-xs font-bold text-indigo-800 leading-tight line-clamp-2" title={portfolio.name}>
          {portfolio.name}
        </div>
        <div className="text-[9px] text-indigo-500 mt-0.5">{structureLabel}</div>
      </div>

      {/* HoE section */}
      {hoe ? (
        <div className="px-3 py-2 space-y-0.5">
          <div className={`${vc} h-1 w-12 mx-auto rounded-full mb-1`} />
          <div className="font-semibold text-gray-800 text-[11px] leading-tight truncate" title={hoe.name}>
            {hoe.name ?? <span className="italic text-gray-400">Unnamed</span>}
          </div>
          <div className="text-[10px] text-gray-500 leading-tight">{ROLE_LABELS[hoe.role]}</div>
          <div className="text-[10px] text-gray-400 pt-0.5">
            Headcount&nbsp;<span className="font-semibold text-gray-600">{headcount}</span>
          </div>
        </div>
      ) : (
        <div className="px-3 py-2.5">
          <div className="text-[10px] italic text-gray-400">No Head of Engineering</div>
          <div className="text-[10px] text-gray-400 mt-1">
            Headcount&nbsp;<span className="font-semibold text-gray-600">{headcount}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Connector primitives ─────────────────────────────────────────────────────

function VStub() {
  return <div className="w-px h-6 bg-gray-300 flex-shrink-0" />;
}

function TreeChildren({ nodes }: { nodes: ReactNode[] }) {
  if (nodes.length === 0) return null;
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
      <VStub />
      <div className="flex items-start">
        {nodes.map((node, i) => {
          const isFirst = i === 0;
          const isLast = i === nodes.length - 1;
          return (
            <div key={i} className="relative flex flex-col items-center px-4">
              {!isFirst && (
                <div className="absolute top-0 left-0 right-1/2 h-px bg-gray-300" />
              )}
              {!isLast && (
                <div className="absolute top-0 left-1/2 right-0 h-px bg-gray-300" />
              )}
              <VStub />
              {node}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OrgOverviewTreeView({ data, onClose }: OrgOverviewTreeViewProps) {
  const [exporting, setExporting] = useState(false);
  const treeRef = useRef<HTMLDivElement>(null);
  const vcm = buildVendorColourMap(data.portfolios);

  const totalHeadcount = data.portfolios.reduce((sum, p) => sum + portfolioTotalHeadcount(p), 0);

  // Root card = org owner
  const rootCard = data.orgOwner ? (
    <PersonCard
      person={data.orgOwner}
      headcount={totalHeadcount}
      vendorColour={vcm.get(data.orgOwner.vendor) ?? NO_VENDOR_COLOUR}
    />
  ) : (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${CARD_CLS} text-center select-none`}>
      <div className="bg-gray-100 h-1.5 w-full" />
      <div className="px-3 py-2 space-y-0.5">
        <div className="font-semibold text-gray-400 text-xs italic">Org Owner not set</div>
        <div className="text-[10px] text-gray-400 pt-0.5">
          Headcount&nbsp;<span className="font-semibold text-gray-600">{totalHeadcount}</span>
        </div>
      </div>
    </div>
  );

  // Child nodes = one area card per portfolio
  const areaNodes: ReactNode[] = data.portfolios.map((portfolio) => (
    <AreaCard key={portfolio.id} portfolio={portfolio} vendorColourMap={vcm} />
  ));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-auto p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-auto max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Organisation Overview</h2>
            <p className="text-sm text-gray-500">Senior leadership &amp; areas of responsibility</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!treeRef.current || exporting) return;
                setExporting(true);
                try {
                  await exportTreeToPdf({
                    element: treeRef.current,
                    portfolioName: 'Org Overview',
                    viewLabel: 'Overview',
                  });
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export as landscape PDF"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'Exporting…' : 'PDF'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Legend — vendor colour key (only vendors visible in this tree) */}
        {(() => {
          const visibleVendors = new Set<string | undefined>();
          if (data.orgOwner) visibleVendors.add(data.orgOwner.vendor);
          for (const p of data.portfolios) {
            if (p.headOfEngineering) visibleVendors.add(p.headOfEngineering.vendor);
          }
          return (
            <div className="flex items-center gap-4 px-6 py-2 border-b border-gray-100 flex-wrap">
              <span className="text-[10px] font-medium text-gray-500 mr-1">Vendor:</span>
              {Array.from(vcm.entries())
                .filter(([vendor]) => visibleVendors.has(vendor))
                .sort(([a], [b]) => {
                  if (a === undefined) return 1;
                  if (b === undefined) return -1;
                  return a.localeCompare(b);
                })
                .map(([vendor, colour]) => (
                  <span key={vendor ?? '__employee'} className="flex items-center gap-1 text-[10px] text-gray-600">
                    <span className={`inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 ${colour}`} />
                    {vendor ?? 'Employee'}
                  </span>
                ))}
            </div>
          );
        })()}

        {/* Tree */}
        <div className="p-8 overflow-auto flex-1 min-h-0">
          <div ref={treeRef} className="min-w-max flex flex-col items-center">
            {rootCard}
            {areaNodes.length > 0 && <TreeChildren nodes={areaNodes} />}
            {areaNodes.length === 0 && (
              <div className="mt-6 text-sm text-gray-400 italic">No portfolios yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
