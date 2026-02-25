import { useState, useCallback } from 'react';
import type { Portfolio } from '../types/org';
import { analyseImport } from '../utils/csvImport';
import type { ImportReport, TeamMemberReplacement } from '../utils/csvImport';

interface CsvImportModalProps {
  portfolio: Portfolio;
  onApply: (replacements: TeamMemberReplacement[]) => void;
  onClose: () => void;
}

type Step = 'input' | 'preview';

export function CsvImportModal({ portfolio, onApply, onClose }: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [replacements, setReplacements] = useState<TeamMemberReplacement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = useCallback(() => {
    setError(null);
    const trimmed = csvText.trim();
    if (!trimmed) {
      setError('Please paste CSV data first.');
      return;
    }

    try {
      const result = analyseImport(trimmed, portfolio);
      setReport(result.report);
      setReplacements(result.replacements);
      setStep('preview');
    } catch (e) {
      setError(`Failed to analyse CSV: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [csvText, portfolio]);

  const handleApply = useCallback(() => {
    onApply(replacements);
    onClose();
  }, [replacements, onApply, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import CSV Data</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Portfolio: <span className="font-medium text-gray-700">{portfolio.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <InputStep
              csvText={csvText}
              setCsvText={setCsvText}
              error={error}
            />
          )}
          {step === 'preview' && report && (
            <PreviewStep report={report} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-500">
            {step === 'preview' && report && (
              <span>
                {report.summary.teamsMatched} teams matched &middot; {report.summary.membersAdded} members to add &middot; {report.summary.membersRemoved} to remove
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {step === 'preview' && (
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            {step === 'input' && (
              <button
                onClick={handlePreview}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Preview Changes
              </button>
            )}
            {step === 'preview' && report && report.summary.teamsMatched > 0 && (
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Apply Import
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Input substep ────────────────────────────────────────────────────────────

function InputStep({
  csvText,
  setCsvText,
  error,
}: {
  csvText: string;
  setCsvText: (v: string) => void;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paste CSV data
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Format: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">Portfolio, Group, Team, Role, Location, Vendor, Name</code>
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="w-full h-64 px-3 py-2 text-sm font-mono border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          placeholder={`FH&B and Intl Supply Chain,FH&B & Int Warehousing,WH Continuity - Auto,Engineer,Offshore,TCS,Mr. Example Name`}
        />
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-800 mb-1">How it works</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>CSV teams are matched to existing teams using fuzzy name matching and manager confirmation.</li>
          <li>Only <strong>Engineer</strong> and <strong>Senior Engineer</strong> roles are imported — they replace the current team members at those levels.</li>
          <li>Engineering Managers, Staff Engineers, and the team structure are left untouched.</li>
          <li>You&apos;ll see a full preview before anything is applied.</li>
        </ul>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Preview substep ──────────────────────────────────────────────────────────

function PreviewStep({ report }: { report: ImportReport }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['matched', 'unmatched']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Teams Matched" value={report.summary.teamsMatched} color="green" />
        <SummaryCard label="Members Added" value={report.summary.membersAdded} color="blue" />
        <SummaryCard label="Members Removed" value={report.summary.membersRemoved} color="red" />
      </div>

      {/* Matched teams */}
      {report.teamChanges.length > 0 && (
        <ReportSection
          title={`Matched Teams (${report.teamChanges.length})`}
          id="matched"
          expanded={expandedSections.has('matched')}
          onToggle={() => toggleSection('matched')}
          badgeColor="green"
        >
          <div className="space-y-3">
            {report.teamChanges.map((tc, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {tc.match.csvGroup} &rarr; {tc.match.csvTeam}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Matched to: {tc.match.appDivision && <span className="text-purple-600">{tc.match.appDivision}</span>}
                      {tc.match.appDivision && ' / '}
                      <span className="text-blue-600">{tc.match.appGroup}</span>
                      {' / '}
                      <span className="text-green-600">{tc.match.appTeam}</span>
                    </div>
                  </div>
                  {tc.match.managerConfirmed && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Manager confirmed
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mb-2">{tc.match.matchReason}</div>

                {tc.removed.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-red-600 mb-1">Removing ({tc.removed.length}):</div>
                    <div className="space-y-0.5">
                      {tc.removed.map((p, j) => (
                        <div key={j} className="text-xs text-red-500 pl-3">
                          &minus; {p.name}, {p.role} [{p.type}, {p.location}{p.vendor ? `, ${p.vendor}` : ''}]
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tc.added.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-green-600 mb-1">Adding ({tc.added.length}):</div>
                    <div className="space-y-0.5">
                      {tc.added.map((p, j) => (
                        <div key={j} className="text-xs text-green-600 pl-3">
                          + {p.name}, {p.role} [{p.type}, {p.location}{p.vendor ? `, ${p.vendor}` : ''}]
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Unmatched teams */}
      {report.unmatchedTeams.length > 0 && (
        <ReportSection
          title={`Unmatched Teams (${report.unmatchedTeams.length})`}
          id="unmatched"
          expanded={expandedSections.has('unmatched')}
          onToggle={() => toggleSection('unmatched')}
          badgeColor="red"
        >
          <div className="space-y-2">
            {report.unmatchedTeams.map((ut, i) => (
              <div key={i} className="border border-red-100 bg-red-50 rounded-lg p-3">
                <div className="text-sm font-medium text-red-800">
                  {ut.csvGroup} &rarr; {ut.csvTeam} ({ut.rowCount} rows)
                </div>
                <div className="text-xs text-red-600 mt-1">{ut.reason}</div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Skipped rows */}
      {report.skippedRows.length > 0 && (
        <ReportSection
          title={`Skipped Rows (${report.skippedRows.length})`}
          id="skipped"
          expanded={expandedSections.has('skipped')}
          onToggle={() => toggleSection('skipped')}
          badgeColor="gray"
        >
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="text-left py-1 px-2 text-gray-500 font-medium">Line</th>
                  <th className="text-left py-1 px-2 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-1 px-2 text-gray-500 font-medium">Role</th>
                  <th className="text-left py-1 px-2 text-gray-500 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {report.skippedRows.map((sr, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1 px-2 text-gray-400">{sr.row.lineNumber}</td>
                    <td className="py-1 px-2 text-gray-700">{sr.row.name}</td>
                    <td className="py-1 px-2 text-gray-500">{sr.row.role}</td>
                    <td className="py-1 px-2 text-gray-500">{sr.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}
    </div>
  );
}

// ─── Shared subcomponents ─────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: number; color: 'green' | 'blue' | 'red' }) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };
  const numColors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
  };
  return (
    <div className={`border rounded-lg p-3 ${colors[color]}`}>
      <div className={`text-2xl font-bold ${numColors[color]}`}>{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
    </div>
  );
}

function ReportSection({
  title,
  id: _id,
  expanded,
  onToggle,
  badgeColor,
  children,
}: {
  title: string;
  id: string;
  expanded: boolean;
  onToggle: () => void;
  badgeColor: 'green' | 'red' | 'gray';
  children: React.ReactNode;
}) {
  const badgeColors = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${badgeColors[badgeColor]}`}>
          {title}
        </span>
        <span className="text-gray-400 text-sm">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}
