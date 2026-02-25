import { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { Portfolio } from '../types/org';
import { ManagementTree, TeamViewTree, buildVendorColourMap } from './OrgTreeView';
import { captureElement, buildMultiPagePdf, type PageCapture } from '../utils/exportPdf';

/**
 * Render a React element into a hidden off-screen container, wait for
 * layout/paint, capture it with html2canvas, then clean up.
 */
async function renderAndCapture(
  reactElement: React.ReactElement,
): Promise<HTMLCanvasElement> {
  // Create an off-screen host — positioned off-screen but NOT display:none
  // (html2canvas needs the element to be laid out).
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-99999px;top:0;z-index:-1;background:#fff;padding:32px;';
  document.body.appendChild(host);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:inline-block;min-width:max-content;';
  host.appendChild(wrapper);

  const root = createRoot(wrapper);

  try {
    // Render and wait for paint
    await new Promise<void>((resolve) => {
      root.render(reactElement);
      // Two rAF ticks ensures React has committed and the browser has painted
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const canvas = await captureElement(wrapper);
    return canvas;
  } finally {
    root.unmount();
    document.body.removeChild(host);
  }
}

interface ExportAllPdfButtonProps {
  portfolios: Portfolio[];
}

/**
 * Button that exports ALL portfolios (Management + Teams views for each)
 * into a single landscape PDF with consecutive pages.
 */
export function ExportAllPdfButton({ portfolios }: ExportAllPdfButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleExport = useCallback(async () => {
    if (exporting || portfolios.length === 0) return;
    setExporting(true);

    try {
      const vcm = buildVendorColourMap(portfolios);
      const pages: PageCapture[] = [];
      const total = portfolios.length;

      for (let i = 0; i < total; i++) {
        const portfolio = portfolios[i];
        setProgress(`${i + 1}/${total}: ${portfolio.name} (Management)`);

        // Capture Management view
        const mgmtCanvas = await renderAndCapture(
          <ManagementTree portfolio={portfolio} vcm={vcm} />,
        );
        pages.push({
          portfolioName: portfolio.name,
          viewLabel: 'Management',
          canvas: mgmtCanvas,
        });

        setProgress(`${i + 1}/${total}: ${portfolio.name} (Teams)`);

        // Capture Teams view
        const teamsCanvas = await renderAndCapture(
          <TeamViewTree portfolio={portfolio} vcm={vcm} />,
        );
        pages.push({
          portfolioName: portfolio.name,
          viewLabel: 'Teams',
          canvas: teamsCanvas,
        });
      }

      setProgress('Building PDF…');
      buildMultiPagePdf(pages, 'all-portfolios-org-trees.pdf');
    } catch (err) {
      console.error('Export all failed:', err);
      alert('Failed to export PDF. Check the console for details.');
    } finally {
      setExporting(false);
      setProgress('');
    }
  }, [exporting, portfolios]);

  if (portfolios.length === 0) return null;

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      title="Export all portfolios (Management + Teams) as a single landscape PDF"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {exporting ? progress || 'Exporting…' : 'Export All PDF'}
    </button>
  );
}
