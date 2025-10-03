import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Menu,
} from '@mui/icons-material';
import { useData } from '../../context/DataContext';
import { formatCurrency } from '../../utils/formatters';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const { data, loading, getLatestYear } = useData();

  // Get unique airports from the raw dataset (all airports)
  const latestYear = getLatestYear();
  const latestYearData = data.filter(d => d.fiscalYear === latestYear);

  const totalRevenue = latestYearData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0);
  const totalAirports = new Set(latestYearData.map(d => d.locId)).size;

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: 'white',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Left Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{ color: theme.palette.text.primary }}
          >
            <Menu />
          </IconButton>

          <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
            CATS Dashboard
          </Typography>
        </Box>

        {/* Center Section - Key Metrics */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!loading && data.length > 0 && (
            <>
              <Chip
                label={`${totalAirports} Airports`}
                sx={{
                  backgroundColor: theme.palette.primary.light,
                  color: 'white',
                  fontWeight: 500,
                }}
                size="small"
              />
              <Chip
                label={`${formatCurrency(totalRevenue)} Revenue`}
                sx={{
                  backgroundColor: theme.palette.success.main,
                  color: 'white',
                  fontWeight: 500,
                }}
                size="small"
              />
              <Chip
                label={`FY ${latestYear}`}
                sx={{
                  backgroundColor: theme.palette.secondary.main,
                  color: 'white',
                  fontWeight: 500,
                }}
                size="small"
              />
            </>
          )}
        </Box>

        {/* Right Section - Empty for now */}
        <Box sx={{ width: 48 }} />
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;