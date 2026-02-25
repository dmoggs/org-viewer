import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Landscape A4 dimensions in mm.
 * jsPDF uses mm by default with 'a4' format.
 */
const PAGE_W = 297; // landscape width
const PAGE_H = 210; // landscape height
const MARGIN = 10;  // mm on each side
const HEADER_H = 12; // mm reserved for title row

const PRINTABLE_W = PAGE_W - 2 * MARGIN;
const PRINTABLE_H = PAGE_H - 2 * MARGIN - HEADER_H;

interface ExportOptions {
  /** The DOM element containing the tree to capture. */
  element: HTMLElement;
  /** Portfolio name used in the header & filename. */
  portfolioName: string;
  /** 'Management' or 'Teams' */
  viewLabel: string;
}

// ─── Shared internals ─────────────────────────────────────────────────────────

/**
 * Temporarily unconstrain an element (and its parent) so html2canvas can
 * capture the full natural size, then capture at 2× resolution.
 */
async function captureElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  const origOverflow = element.style.overflow;
  const origMaxH = element.style.maxHeight;
  const origH = element.style.height;
  element.style.overflow = 'visible';
  element.style.maxHeight = 'none';
  element.style.height = 'auto';

  const parent = element.parentElement;
  const origParentOverflow = parent?.style.overflow ?? '';
  const origParentMaxH = parent?.style.maxHeight ?? '';
  if (parent) {
    parent.style.overflow = 'visible';
    parent.style.maxHeight = 'none';
  }

  try {
    return await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth + 100,
      windowHeight: element.scrollHeight + 100,
    });
  } finally {
    element.style.overflow = origOverflow;
    element.style.maxHeight = origMaxH;
    element.style.height = origH;
    if (parent) {
      parent.style.overflow = origParentOverflow;
      parent.style.maxHeight = origParentMaxH;
    }
  }
}

/**
 * Add one captured canvas to the PDF (potentially spanning multiple pages).
 * If `isFirstPage` is false a new page is always added before rendering.
 */
function addCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  portfolioName: string,
  viewLabel: string,
  isFirstPage: boolean,
): void {
  const imgW = canvas.width;
  const imgH = canvas.height;
  const imgAspect = imgW / imgH;
  const printableAspect = PRINTABLE_W / PRINTABLE_H;

  const scaledToFitWidth = PRINTABLE_W / imgW;
  const heightAtPageWidth = imgH * scaledToFitWidth;
  const needsMultiplePages = heightAtPageWidth > PRINTABLE_H * 1.05;

  if (!needsMultiplePages) {
    // ── Single page ─────────────────────────────────────────────────────
    if (!isFirstPage) pdf.addPage('a4', 'landscape');

    let drawW: number, drawH: number;
    if (imgAspect > printableAspect) {
      drawW = PRINTABLE_W;
      drawH = PRINTABLE_W / imgAspect;
    } else {
      drawH = PRINTABLE_H;
      drawW = PRINTABLE_H * imgAspect;
    }

    const x = MARGIN + (PRINTABLE_W - drawW) / 2;
    const y = MARGIN + HEADER_H + (PRINTABLE_H - drawH) / 2;

    addHeader(pdf, portfolioName, viewLabel);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawW, drawH);
  } else {
    // ── Multiple pages ──────────────────────────────────────────────────
    const scale = PRINTABLE_W / imgW;
    const stripHeightPx = PRINTABLE_H / scale;
    const numPages = Math.ceil(imgH / stripHeightPx);

    for (let p = 0; p < numPages; p++) {
      if (!(p === 0 && isFirstPage)) pdf.addPage('a4', 'landscape');

      addHeader(pdf, portfolioName, viewLabel, p + 1, numPages);

      const srcY = p * stripHeightPx;
      const srcH = Math.min(stripHeightPx, imgH - srcY);

      const strip = document.createElement('canvas');
      strip.width = imgW;
      strip.height = Math.ceil(srcH);
      const ctx = strip.getContext('2d')!;
      ctx.drawImage(canvas, 0, -srcY);

      const drawH = srcH * scale;
      const x = MARGIN;
      const y = MARGIN + HEADER_H;

      pdf.addImage(strip.toDataURL('image/png'), 'PNG', x, y, PRINTABLE_W, drawH);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Export a single tree-view DOM element as a landscape A4 PDF.
 */
export async function exportTreeToPdf({
  element,
  portfolioName,
  viewLabel,
}: ExportOptions): Promise<void> {
  const canvas = await captureElement(element);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addCanvasToPdf(pdf, canvas, portfolioName, viewLabel, true);

  const safeName = portfolioName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeView = viewLabel.toLowerCase().replace(/\s+/g, '-');
  pdf.save(`${safeName}-${safeView}-org-tree.pdf`);
}

export interface PageCapture {
  portfolioName: string;
  viewLabel: string;
  canvas: HTMLCanvasElement;
}

/**
 * Assemble pre-captured canvases into a single multi-page landscape PDF.
 * Each canvas gets its own page (or multiple pages if very tall).
 */
export function buildMultiPagePdf(pages: PageCapture[], filename: string): void {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let isFirst = true;

  for (const page of pages) {
    addCanvasToPdf(pdf, page.canvas, page.portfolioName, page.viewLabel, isFirst);
    isFirst = false;
  }

  pdf.save(filename);
}

/**
 * Capture a DOM element that has already been mounted and laid out.
 * Exported so external code can capture off-screen rendered trees.
 */
export { captureElement };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addHeader(
  pdf: jsPDF,
  portfolioName: string,
  viewLabel: string,
  pageNum?: number,
  totalPages?: number,
) {
  const y = MARGIN + 6; // baseline, roughly centred in header zone

  // Title — left
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 30, 30);
  pdf.text(`${portfolioName}  —  ${viewLabel} View`, MARGIN, y);

  // Date & page — right
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(130, 130, 130);
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const rightText = pageNum && totalPages
    ? `${dateStr}  ·  Page ${pageNum}/${totalPages}`
    : dateStr;
  pdf.text(rightText, PAGE_W - MARGIN, y, { align: 'right' });

  // Thin separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, MARGIN + HEADER_H - 1, PAGE_W - MARGIN, MARGIN + HEADER_H - 1);
}
