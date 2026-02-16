/**
 * Centralized color definitions for bar charts and person icons
 * Change these values to update colors across the application
 */

export const BAR_COLORS = {
  // Primary segment color (used for Senior+, Employee, Onshore)
  primary: 'rgb(126, 232, 188)', // slate-300

  // Secondary segment color (used for Junior, Contractor, Offshore)
  secondary: 'rgb(226, 232, 240)', // slate-200

  // Tertiary segment color (used for Nearshore when present)
  tertiary: 'rgb(215, 220, 230)', // intermediate gray

  // Target line color
  target: 'rgb(35, 136, 0)', // gray-400
} as const;

export const TIMELINE_COLORS = {
  // Line colors for ratio tracking
  employeeLine: 'rgb(59, 130, 246)',    // blue-500
  onshoreLine: 'rgb(16, 185, 129)',     // emerald-500
  seniorLine: 'rgb(139, 92, 246)',      // violet-500

  // Delta bar colors
  positive: 'rgb(34, 197, 94)',         // green-500
  negative: 'rgb(239, 68, 68)',         // red-500

  // Target dashed line
  targetDash: 'rgb(156, 163, 175)',     // gray-400
} as const;

export const LOCATION_COLORS = {
  // Onshore location color (used in person icons)
  onshore: 'rgb(59, 130, 246)', // blue-500

  // Nearshore location color (used in person icons)
  nearshore: 'rgb(245, 158, 11)', // amber-500

  // Offshore location color (used in person icons)
  offshore: 'rgb(239, 68, 68)', // red-500
} as const;
