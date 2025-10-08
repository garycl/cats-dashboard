import React, { Suspense } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  useTheme,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Flight,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

// Lazy load the simple coverage map component
const CoverageMap = React.lazy(() => import('../components/Maps/CoverageMap'));

// Loading component for the map
const MapLoader: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: 400,
      gap: 2,
      backgroundColor: 'rgba(0,0,0,0.02)',
      borderRadius: 3
    }}
  >
    <CircularProgress size={32} />
    <Typography variant="body2" color="text.secondary">
      Loading coverage map...
    </Typography>
  </Box>
);

const Home: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { loading, loadingProgress, filteredData } = useData();


  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress variant="determinate" value={loadingProgress} />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading CATS Form 127 Data... {loadingProgress}%
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
          {loadingProgress < 30 && 'Downloading compressed data (915KB)...'}
          {loadingProgress >= 30 && loadingProgress < 85 && 'Decompressing data...'}
          {loadingProgress >= 85 && loadingProgress < 95 && 'Processing airport records...'}
          {loadingProgress >= 95 && 'Finalizing...'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0a1929 0%, #001529 100%)', // Dark navy gradient matching sidebar
          color: 'white',
          py: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h2" sx={{ fontWeight: 700, mb: 2 }}>
                Welcome to CATS Form 127
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 400, mb: 3, opacity: 0.9 }}>
                Analytics Hub
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.8, maxWidth: 600 }}>
                Executive Intelligence for US Airport Financial Performance.
                Comprehensive analysis tools for strategic decision-making and operational excellence.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: theme.palette.secondary.main,
                    '&:hover': { backgroundColor: theme.palette.secondary.dark },
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                  }}
                  onClick={() => navigate('/executive-intelligence')}
                  endIcon={<ArrowForward />}
                >
                  Executive Intelligence
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                  }}
                  onClick={() => navigate('/benchmarking')}
                >
                  Benchmarking
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                  }}
                  onClick={() => navigate('/trend-tracking')}
                >
                  Trend Tracking
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', opacity: 0.7 }}>
                <Flight sx={{ fontSize: 120, mb: 2 }} />
                <Typography variant="body1">
                  Powered by FAA Form 127 Data
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>

        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            opacity: 0.05,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="white" fill-opacity="0.1"%3E%3Cpath d="m0 40l40-40h-40v40zm40 0v-40h-40l40 40z"/%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Airport Coverage and Data Overview */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 4, textAlign: 'center' }}>
            Comprehensive Airport Coverage
          </Typography>

          <Box sx={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.divider}`,
            mb: 4
          }}>
            <Suspense fallback={<MapLoader />}>
              <CoverageMap airports={filteredData} height={400} />
            </Suspense>
          </Box>

          <Typography variant="body1" color="textSecondary" sx={{ mb: 4, textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
            Our analytics platform processes FAA Form 127 data covering financial performance,
            operational metrics, and strategic indicators for airports across the United States.
            Markers are sized by hub classification: Large Hubs, Medium Hubs, Small Hubs, and Non-Hub airports.
          </Typography>

          <Box sx={{ textAlign: 'center' }}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item>
                <Chip label="Financial Performance" variant="outlined" />
              </Grid>
              <Grid item>
                <Chip label="Operational Metrics" variant="outlined" />
              </Grid>
              <Grid item>
                <Chip label="Strategic KPIs" variant="outlined" />
              </Grid>
              <Grid item>
                <Chip label="Peer Benchmarking" variant="outlined" />
              </Grid>
              <Grid item>
                <Chip label="Trend Analysis" variant="outlined" />
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
