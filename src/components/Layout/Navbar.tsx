import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Chip,
  Typography,
  useTheme,
  Autocomplete,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Menu,
  Clear,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const location = useLocation();
  const {
    data,
    loading,
    selectedYears,
    selectedHubSizes,
    selectedStates,
    selectedAirport,
    setSelectedYears,
    setSelectedHubSizes,
    setSelectedStates,
    setSelectedAirport,
    getAvailableYears,
    getAvailableStates,
    filteredData,
  } = useData();

  const availableYears = getAvailableYears();
  const currentYear = selectedYears.length > 0 ? selectedYears[0] : Math.max(...availableYears);

  // Hide year filter on Trend Tracking page
  const showYearFilter = location.pathname !== '/trend-tracking';

  // US Census Bureau Region mapping (using full state names as they appear in the data)
  const stateToRegion: { [key: string]: string } = {
    // Northeast Region
    'Connecticut': 'Northeast', 'Maine': 'Northeast', 'Massachusetts': 'Northeast', 'New Hampshire': 'Northeast',
    'Rhode Island': 'Northeast', 'Vermont': 'Northeast', 'New Jersey': 'Northeast', 'New York': 'Northeast', 'Pennsylvania': 'Northeast',
    // South Region
    'Delaware': 'South', 'Florida': 'South', 'Georgia': 'South', 'Maryland': 'South',
    'North Carolina': 'South', 'South Carolina': 'South', 'Virginia': 'South', 'West Virginia': 'South',
    'Alabama': 'South', 'Kentucky': 'South', 'Mississippi': 'South', 'Tennessee': 'South',
    'Arkansas': 'South', 'Louisiana': 'South', 'Oklahoma': 'South', 'Texas': 'South',
    // Midwest Region
    'Illinois': 'Midwest', 'Indiana': 'Midwest', 'Michigan': 'Midwest', 'Ohio': 'Midwest', 'Wisconsin': 'Midwest',
    'Iowa': 'Midwest', 'Kansas': 'Midwest', 'Minnesota': 'Midwest', 'Missouri': 'Midwest', 'Nebraska': 'Midwest',
    'North Dakota': 'Midwest', 'South Dakota': 'Midwest',
    // West Region
    'Alaska': 'West', 'California': 'West', 'Colorado': 'West', 'Hawaii': 'West', 'Idaho': 'West',
    'Montana': 'West', 'Nevada': 'West', 'Oregon': 'West', 'Utah': 'West', 'Washington': 'West', 'Wyoming': 'West',
    'Arizona': 'West', 'New Mexico': 'West',
    // Territories (not part of Census regions, grouped separately)
    'Puerto Rico': 'Territories', 'Virgin Islands': 'Territories', 'American Samoa': 'Territories',
    'Guam': 'Territories', 'Pacific Islands': 'Territories',
  };

  const regions = ['Northeast', 'South', 'Midwest', 'West', 'Territories'];
  const [selectedRegions, setSelectedRegions] = React.useState<string[]>([]);

  // Get unique airports for autocomplete
  const airportOptions = React.useMemo(() => {
    return Array.from(new Set(filteredData.map(d => d.locId)))
      .map(locId => {
        const airport = filteredData.find(d => d.locId === locId);
        return {
          locId,
          label: `${locId} - ${airport?.airportName || ''}`,
          airportName: airport?.airportName || '',
          state: airport?.state || '',
        };
      })
      .sort((a, b) => a.locId.localeCompare(b.locId));
  }, [filteredData]);

  const handleYearChange = (event: SelectChangeEvent) => {
    setSelectedYears([Number(event.target.value)]);
  };

  const handleHubSizeChange = (_event: React.MouseEvent<HTMLElement>, newHubSizes: string[]) => {
    setSelectedHubSizes(newHubSizes);
  };

  const handleRegionChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const newRegions = typeof value === 'string' ? value.split(',') : value;
    setSelectedRegions(newRegions);

    // Auto-update states based on selected regions
    if (newRegions.length > 0) {
      // Only include states that exist in the data AND are in the selected regions
      const availableStates = getAvailableStates();
      const statesInRegions = availableStates.filter(state =>
        newRegions.includes(stateToRegion[state])
      );
      console.log('Selected regions:', newRegions);
      console.log('Available states:', availableStates);
      console.log('States in selected regions:', statesInRegions);
      console.log('State to region mapping sample:', { 'California': stateToRegion['California'], 'Texas': stateToRegion['Texas'] });
      setSelectedStates(statesInRegions);
    } else {
      // Clear state filter when no regions selected
      setSelectedStates([]);
    }
  };

  const handleStateChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const newStates = typeof value === 'string' ? value.split(',') : value;
    setSelectedStates(newStates);

    // Clear region filter if manually selecting states
    setSelectedRegions([]);
  };

  const handleAirportSearch = (_event: any, value: any) => {
    setSelectedAirport(value?.locId || null);
  };

  const handleClearFilters = () => {
    setSelectedHubSizes([]);
    setSelectedRegions([]);
    setSelectedStates([]);
    setSelectedAirport(null);
  };

  const activeFilterCount = selectedHubSizes.length + selectedRegions.length + selectedStates.length + (selectedAirport ? 1 : 0);

  // Calculate filtered airport count
  const { totalAirports, filteredAirportCount } = React.useMemo(() => {
    // Filter to current year first
    const currentYearData = filteredData.filter(d => d.fiscalYear === currentYear);
    const total = new Set(currentYearData.map(d => d.locId)).size;

    let filtered = currentYearData;

    // Apply hub size filter
    if (selectedHubSizes.length > 0) {
      filtered = filtered.filter(d => selectedHubSizes.includes(d.hubSize));
    }

    // Apply airport filter
    if (selectedAirport) {
      filtered = filtered.filter(d => d.locId === selectedAirport);
    }

    const count = new Set(filtered.map(d => d.locId)).size;

    return { totalAirports: total, filteredAirportCount: count };
  }, [filteredData, selectedHubSizes, selectedAirport, currentYear]);

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: 'white',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', gap: 2, py: 1 }}>
        {/* Left Section - Menu Toggle */}
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ color: theme.palette.text.primary }}
        >
          <Menu />
        </IconButton>

        {/* Center Section - Global Filters */}
        {!loading && data.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            {/* Year Selector - Hidden on Trend Tracking page */}
            {showYearFilter && (
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={currentYear.toString()}
                  onChange={handleYearChange}
                  label="Year"
                >
                  {availableYears.map(year => (
                    <MenuItem key={year} value={year}>FY {year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Hub Size Toggle */}
            <ToggleButtonGroup
              value={selectedHubSizes}
              onChange={handleHubSizeChange}
              size="small"
              aria-label="hub size filter"
                sx={{
                  '& .MuiToggleButton-root': {
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.warning.main,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: theme.palette.warning.dark,
                      },
                    },
                  },
                }}
              >
              <ToggleButton value="L" aria-label="large hub">L</ToggleButton>
              <ToggleButton value="M" aria-label="medium hub">M</ToggleButton>
              <ToggleButton value="S" aria-label="small hub">S</ToggleButton>
              <ToggleButton value="N" aria-label="non hub">N</ToggleButton>
            </ToggleButtonGroup>

            {/* Region Filter */}
            <FormControl
              size="small"
              sx={{
                minWidth: 120,
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: selectedRegions.length > 0 ? theme.palette.warning.main : undefined,
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: selectedRegions.length > 0 ? theme.palette.warning.main : undefined,
                },
              }}
            >
              <InputLabel>Region</InputLabel>
              <Select
                multiple
                value={selectedRegions}
                onChange={handleRegionChange}
                label="Region"
                renderValue={(selected) => {
                  if (selected.length === 0) return 'All';
                  if (selected.length === 1) return '1 region';
                  return `${selected.length} regions`;
                }}
                sx={{
                  '& .MuiSelect-select': {
                    color: selectedRegions.length > 0 ? theme.palette.warning.main : undefined,
                    fontWeight: selectedRegions.length > 0 ? 600 : 400,
                  }
                }}
              >
                {regions.map(region => (
                  <MenuItem key={region} value={region}>{region}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* State/Territory Filter */}
            <FormControl
              size="small"
              sx={{
                minWidth: 120,
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: selectedStates.length > 0 ? theme.palette.warning.main : undefined,
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: selectedStates.length > 0 ? theme.palette.warning.main : undefined,
                },
              }}
            >
              <InputLabel>State/Territory</InputLabel>
              <Select
                multiple
                value={selectedStates}
                onChange={handleStateChange}
                label="State/Territory"
                renderValue={(selected) => {
                  if (selected.length === 0) return 'All';
                  if (selected.length === 1) return '1 state';
                  return `${selected.length} states`;
                }}
                sx={{
                  '& .MuiSelect-select': {
                    color: selectedStates.length > 0 ? theme.palette.warning.main : undefined,
                    fontWeight: selectedStates.length > 0 ? 600 : 400,
                  }
                }}
              >
                {getAvailableStates()
                  .filter(state => selectedRegions.length === 0 || selectedRegions.includes(stateToRegion[state]))
                  .map(state => (
                    <MenuItem key={state} value={state}>{state}</MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Airport Search */}
            <Autocomplete
              options={airportOptions}
              getOptionLabel={(option) => option.label}
              value={airportOptions.find(opt => opt.locId === selectedAirport) || null}
              onChange={handleAirportSearch}
              sx={{ minWidth: 280, flexGrow: 1 }}
              size="small"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Airport"
                  placeholder="Type code or name..."
                />
              )}
            />
          </Box>
        )}

        {/* Right Section - Airport Count & Clear Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!loading && data.length > 0 && (
            <Chip
              label={
                activeFilterCount > 0
                  ? `${filteredAirportCount} / ${totalAirports} Airports`
                  : `${totalAirports} Airports`
              }
              size="small"
              color={activeFilterCount > 0 ? 'warning' : 'default'}
              sx={{ fontWeight: 500 }}
            />
          )}
          {activeFilterCount > 0 && (
            <IconButton
              size="small"
              onClick={handleClearFilters}
              sx={{ color: theme.palette.text.secondary }}
              title="Clear filters"
            >
              <Clear />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;