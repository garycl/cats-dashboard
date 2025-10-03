# Repository Guidelines

## Project Structure & Module Organization
The dashboard is a Create React App written in TypeScript. Interactive UI code lives in `src/`, with `components/Charts`, `components/Maps`, and `components/Layout` providing reusable visual pieces, `pages/` defining routed screens (`Home`, `ExecutiveOverview`, `AirportComparison`), and `context/` plus `services/dataService.ts` handling data loading and typing (`AirportData`). Static assets and runtime JSON live in `public/`—keep the primary dataset at `public/data/FULL_Merged.json` to satisfy `loadCATSData`. Use the top-level `data/` directory for raw sources and notebooks when curating new datasets; only ship processed files through `public/data/`.

## Build, Test, and Development Commands
- `npm install` — install dependencies; rerun after updating `package.json`.
- `npm start` — launch the CRA dev server with hot reloading at http://localhost:3000.
- `npm run build` — create a production bundle in `build/`; verify data paths post-build.
- `npm test` — run Jest/React Testing Library suites in watch mode; append `-- --coverage` for a one-off run.

## Coding Style & Naming Conventions
Favor functional components, hooks, and Material UI for layout consistency. TypeScript files use 2-space indentation, semicolons, and strict typing aligned with `AirportData`. Use PascalCase for components and context providers, camelCase for functions, variables, and JSON keys after normalization; keep raw legacy keys only when bridging external data. Co-locate component styles with the component, and import assets via relative paths.

## Testing Guidelines
Add Jest tests alongside the code they cover using the `*.test.tsx` pattern. Mock fetch and MapLibre/mapbox-gl dependencies to keep tests deterministic. Aim to exercise critical data transforms (`processAirportData`) and UI state transitions, and target meaningful assertions over snapshot-only coverage. For new datasets, include schema validation tests to protect expected field names and numeric coercions.

## Commit & Pull Request Guidelines
The repository has no recorded history yet; follow Conventional Commits (`feat:`, `fix:`, `chore:`) to keep messages actionable. Keep commits scoped to a single concern with passing tests. Pull requests should summarize the change, list affected routes or data files, include before/after screenshots for visual tweaks, and link any ticket or Form 127 requirement. Request review once lint/tests pass and data files are regenerated.
