# Org Viewer

A hierarchical organizational structure viewer for engineering teams. Built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **Hierarchical visualization** of engineering organizations: Portfolios > Divisions > Groups > Teams > Members
- **Divisions** as an optional grouping level between Portfolio and Group for larger organizations
- **Role-based person icons** — shape indicates seniority (circle/square/diamond), fill indicates employment type, color indicates location
- **Key metrics tracking** — senior+ ratio, employee vs contractor distribution, onshore/nearshore/offshore breakdown with configurable targets per portfolio
- **Full CRUD** for all entities (portfolios, divisions, groups, teams, people)
- **Bulk add** for quickly adding multiple team members at once
- **Collapsible sections** for managing large org structures
- **Import/Export** organizational data as JSON
- **Local persistence** via localStorage

## Org Structure

```
Portfolio
├── Head of Engineering (optional)
├── Principal Engineers (0+)
├── Divisions (optional intermediate grouping)
│   └── Groups
│       ├── Engineering Manager (optional)
│       ├── Staff Engineers (0+)
│       └── Teams → Members
└── Groups (direct, not in a division)
    ├── Engineering Manager (optional)
    ├── Staff Engineers (0+)
    └── Teams → Members
```

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command           | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Start development server                     |
| `npm run build`   | TypeScript check + production build           |
| `npm run preview` | Preview the production build                 |
| `npm run lint`    | Run ESLint                                   |

## Tech Stack

- [React](https://react.dev/) 18
- [TypeScript](https://www.typescriptlang.org/) 5
- [Vite](https://vite.dev/) 6
- [Tailwind CSS](https://tailwindcss.com/) 3
