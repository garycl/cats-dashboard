# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the CATS (Certificate of Airport Transit Safety) Form 127 Analytics Dashboard - a React TypeScript application for analyzing airport financial and operational data. The dashboard provides interactive visualizations, benchmarking tools, and trend analysis for airport industry data.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server on port 3000 (Vite)
- `npm run build` - Production build to `build/` directory
- `npm run build:check` - TypeScript check followed by production build
- `npm run preview` - Preview production build locally

## Architecture Overview

### Core Data Flow
- **Data Source**: `/public/data/FULL_Merged.json` - Primary dataset loaded via `loadCATSData()` in `dataService.ts`
- **Data Processing**: Raw JSON transformed through `processAirportData()` with extensive field mapping and standardization
- **State Management**: React Context (`DataContext`) provides centralized data state, filtering, and derived computations
- **Type Safety**: Comprehensive `AirportData` interface with 100+ typed fields covering financial, operational, and geographic data

### Directory Structure
- `src/pages/` - Main routed views: Home, ExecutiveIntelligence, Benchmarking, TrendTracking
- `src/components/` - Reusable UI components organized by domain:
  - `Charts/` - D3-based visualizations and Recharts components
  - `Maps/` - MapLibre GL JS interactive maps
  - `Layout/` - Navbar, Sidebar, and layout components
- `src/context/` - DataContext for global state management
- `src/services/` - Data loading and processing utilities
- `src/utils/` - Helper functions and utilities

### Key Technical Details
- **Routing**: React Router with lazy-loaded page components for performance
- **UI Framework**: Material UI (MUI) with consistent theming
- **Charts**: Recharts for standard charts, D3 for custom visualizations including Sankey diagrams
- **Maps**: MapLibre GL JS with react-map-gl wrapper for interactive airport mapping
- **Bundle Optimization**: Vite with manual chunk splitting for vendor libraries (React, MUI, charts, maps)
- **Data Loading**: Progressive loading with loading states and progress indicators

### Data Model Key Points
- Airport records span fiscal years 2019-2024
- Hub sizes: 'L' (Large), 'M' (Medium), 'S' (Small), 'N' (Non-hub)
- Financial data includes aeronautical/non-aeronautical revenue, operating expenses, capital expenditures, debt
- Operational metrics include enplanements, aircraft operations, landed weights
- Geographic coordinates for mapping functionality
- Legacy field mapping maintains backward compatibility with original dataset field names

### Development Notes
- TypeScript strict mode enabled
- Data validation filters out records with invalid years or zero enplanements
- Context filtering supports multi-select for years, states, hub sizes, and single airport selection
- Distance calculations available for proximity-based analysis
- Development server opens automatically on port 3000