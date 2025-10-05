import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

// Layout Components (keep eager loaded as they're always visible)
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';

// Lazy load heavy page components
const Home = React.lazy(() => import('./pages/Home'));
const ExecutiveOverview = React.lazy(() => import('./pages/ExecutiveOverview'));
const AirportComparison = React.lazy(() => import('./pages/AirportComparison'));
const PerformanceTrends = React.lazy(() => import('./pages/PerformanceTrends'));

// Hooks and Context
import { DataProvider } from './context/DataContext';

// Loading component
const PageLoader: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      gap: 2
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      Loading page...
    </Typography>
  </Box>
);

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <DataProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'white' }}>
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onToggle={handleSidebarToggle} />

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            marginLeft: '8px',
            backgroundColor: 'white',
          }}
        >
          {/* Top Navigation */}
          <Navbar onMenuClick={handleSidebarToggle} />

          {/* Page Content */}
          <Box sx={{ flexGrow: 1, padding: 0 }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/executive-overview" element={<ExecutiveOverview />} />
                <Route path="/airport-comparison" element={<AirportComparison />} />
                <Route path="/performance-trends" element={<PerformanceTrends />} />
              </Routes>
            </Suspense>
          </Box>
        </Box>
      </Box>
    </DataProvider>
  );
};

export default App;