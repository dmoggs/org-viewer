# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **organizational structure viewer** built with React, TypeScript, Vite, and Tailwind CSS. It provides a hierarchical visualization and management system for engineering organizations with the following structure:

```
Portfolio
├── Head of Engineering (optional, 1 per portfolio)
├── Principal Engineers (0+ per portfolio)
├── Divisions (optional intermediate grouping level)
│   └── Groups
│       ├── Engineering Manager (optional, 1 per group)
│       ├── Staff Engineers (0+ per group)
│       └── Teams
│           └── Members
└── Groups (direct groups, not in a division)
    ├── Engineering Manager (optional, 1 per group)
    ├── Staff Engineers (0+ per group)
    └── Teams
        └── Members (Engineers, Senior Engineers, or Staff Engineers)
```

**Divisions** are an optional hierarchical level between Portfolio and Group. They allow grouping related teams (e.g., "Warehouse" and "Transportation" within a "Supply Chain & Logistics" portfolio). Groups within divisions display side-by-side on larger screens with compact icons for a denser view.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production (runs TypeScript compiler + Vite build)
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Key Architecture Concepts

### Data Management

- **State Management**: All organizational data is managed through the `useOrgData` custom hook (src/hooks/useOrgData.ts)
- **Persistence**: Data is automatically persisted to `localStorage` with the key `'org-viewer-data'`
- **Data Migration**: The hook includes a `migrateData` function that automatically migrates old data formats (e.g., adding missing `location` fields to people)
- **Export/Import**: Users can export/import organizational data as JSON files

### Type System (src/types/org.ts)

Core types define the organizational hierarchy:
- `Person`: Represents any individual with `id`, `name`, `role`, `type` (employee/contractor), `vendor`, and `location`
- `Team`: Contains a name and array of `members`
- `Group`: Contains teams, an optional manager, and staff engineers
- `Division`: Optional intermediate level containing groups (for larger portfolios)
- `Portfolio`: Top-level structure containing optional divisions, direct groups, optional head of engineering, and principal engineers
- `OrgData`: Root data structure containing all portfolios

### Component Hierarchy

The app follows a nested component structure mirroring the data hierarchy:

1. **App.tsx**: Root component managing all state and modals
2. **PortfolioView**: Displays a single portfolio with its leadership, divisions, and groups
3. **DivisionCard**: Displays a division with its groups in a side-by-side layout
4. **GroupCard**: Displays a group with its manager, staff engineers, and teams (supports `compact` prop for use within divisions)
5. **TeamSection**: Displays a single team with its members (supports `compact` prop)
6. **PersonIcon**: Renders a single person with visual indicators for role, type, and location
7. **PersonInline**: Compact person display used in leadership sections (supports `size` prop)

### Modal Management

The app uses a discriminated union type `ModalType` to manage all modals. Each modal state contains:
- The entity type being edited (portfolio, group, team, person, etc.)
- The mode (add or edit)
- Relevant IDs for navigation through the hierarchy
- Current data when editing

This centralized modal state ensures type-safe modal management throughout the app.

### Statistics Calculation (src/utils/stats.ts)

The `calculateStats` function aggregates data across all portfolios to compute:
- Total engineer count
- Senior+ ratio (percentage of engineers at senior level or above)
- Distribution by location (onshore/nearshore/offshore)
- Distribution by type (employee/contractor)
- Count by role

### Targets and Metrics

The app tracks three key metrics with targets displayed in the SummaryPanel:

1. **Seniority Target**: Fixed at 50% senior+ engineers
2. **Employment Type Target**: Fixed at 30% employees (vs contractors)
3. **Onshore Target**: Configurable per portfolio via `Portfolio.onshoreTargetPercentage` (defaults to 50%)

All three metrics are displayed using horizontal stacked bars with subtle vertical target markers. The bars use muted gray tones for a clean, professional appearance. When viewing aggregate stats across multiple portfolios, the onshore target shown is the average of all portfolio targets.

## Component Patterns

### Collapsible Sections
Both `PortfolioView` and `GroupCard` support collapse/expand functionality using local state.

### Bulk Operations
The `PersonForm` component supports bulk adding of team members through the `allowBulkAdd` prop.

### CRUD Operations
All entities (portfolios, groups, teams, people) support full CRUD operations through the `useOrgData` hook. Operations are deeply nested and immutable (e.g., updating a team member requires the portfolioId, groupId, teamId, and personId).

## Styling

- **Framework**: Tailwind CSS with PostCSS and Autoprefixer
- **Color Scheme**:
  - Portfolio level: Indigo
  - Group level: Blue
  - Team level: Green
  - Action buttons: Context-appropriate colors
- **Centralized Colors** (`src/styles/chartColors.ts`): All colors are defined in one place for easy customization:
  - **Bar Chart Colors** (`BAR_COLORS`):
    - `primary`: Used for Senior+, Employee, Onshore segments
    - `secondary`: Used for Junior, Contractor, Offshore segments
    - `tertiary`: Used for Nearshore segment when present
    - `target`: Color of the target marker line
  - **Location Colors** (`LOCATION_COLORS`):
    - `onshore`: Color for onshore engineers in person icons
    - `nearshore`: Color for nearshore engineers in person icons
    - `offshore`: Color for offshore engineers in person icons
- **Person Icons**: SVG shapes represent different roles:
  - **Circle**: Engineer
  - **Square**: Senior Engineer
  - **Diamond**: Staff Engineer, Engineering Manager (same level), Head of Engineering, Principal Engineer
  - **Fill vs Outline**: Solid fill = Employee, Outline = Contractor
  - **Color**: Determined by `LOCATION_COLORS` in the centralized colors file

## Data Immutability

All update operations in `useOrgData` use immutable patterns with spread operators to create new objects/arrays rather than mutating existing ones. This ensures proper React re-renders and maintains data integrity.

## Special Considerations

### Employee Location Rule
Employees are always onshore. In `PersonForm`, selecting the employee type automatically sets location to `'onshore'` and disables the location dropdown. Only contractors can have nearshore or offshore locations.

### Person Role Flexibility
Staff Engineers can appear in multiple contexts:
- At the group level (attached to a group)
- At the team level (as team members)

### Data Migration
The `migrateData` function in `useOrgData` handles backward compatibility:
- Adds default `'onshore'` location to people missing the `location` field
- Adds default `onshoreTargetPercentage` of 50% to portfolios if missing

### Portfolio Configuration
Each portfolio has a configurable `onshoreTargetPercentage` that can be set when creating or editing the portfolio. This allows different portfolios to have different location distribution goals. The `PortfolioForm` component handles editing both the portfolio name and its onshore target percentage.

### ID Generation
All entities use `crypto.randomUUID()` for ID generation, ensuring globally unique identifiers.
