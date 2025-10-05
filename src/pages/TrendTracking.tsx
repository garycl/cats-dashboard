import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Card,
  CardContent,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useData } from '../context/DataContext';
import { formatCurrency, formatNumber, formatPercentage, formatCostPerEnplanement } from '../utils/formatters';

// State to region mapping (US Census Bureau definitions) - Moved outside component
const STATE_TO_REGION: { [key: string]: string } = {
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
  // Territories
  'Puerto Rico': 'Territories', 'Virgin Islands': 'Territories', 'American Samoa': 'Territories',
  'Guam': 'Territories', 'Pacific Islands': 'Territories',
};

// State abbreviations - Moved outside component
const STATE_TO_ABBREV: { [key: string]: string } = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA', 'Colorado': 'CO',
  'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA',
  'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
  'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
  'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY', 'Puerto Rico': 'PR', 'Virgin Islands': 'VI',
  'American Samoa': 'AS', 'Guam': 'GU', 'Pacific Islands': 'PI',
};

const REGIONS = ['Northeast', 'South', 'Midwest', 'West', 'Territories'];

const TrendTracking: React.FC = () => {
  const theme = useTheme();
  const { data, loading, selectedAirport, selectedStates, selectedHubSizes } = useData();

  // Apply filters but ignore year filter (we need all years for trends)
  const filteredData = React.useMemo(() => {
    let result = data;

    if (selectedStates.length > 0) {
      result = result.filter(d => selectedStates.includes(d.state));
    }

    if (selectedHubSizes.length > 0) {
      result = result.filter(d => selectedHubSizes.includes(d.hubSize));
    }

    // Filter out airports with no enplanements in last 3 years
    const maxYear = Math.max(...data.map(d => d.fiscalYear));
    const last3Years = [maxYear, maxYear - 1, maxYear - 2];

    const activeAirports = new Set(
      result
        .filter(d => last3Years.includes(d.fiscalYear) && (d.enplanements || 0) > 0)
        .map(d => d.locId)
    );

    result = result.filter(d => activeAirports.has(d.locId));

    return result;
  }, [data, selectedStates, selectedHubSizes]);

  const [selectedAirports, setSelectedAirports] = React.useState<string[]>(['ATL']);
  const [selectedMetric, setSelectedMetric] = React.useState<string>('costPerEnplanement');
  const [selectedRegionAverages, setSelectedRegionAverages] = React.useState<string[]>([]);
  const [selectedStateAverages, setSelectedStateAverages] = React.useState<string[]>([]);
  const [useMedian, setUseMedian] = React.useState<boolean>(false);

  // Get available airports (respects all filters)
  const availableAirports = React.useMemo(() => {
    return Array.from(new Set(filteredData.map(d => d.locId)))
      .map(locID => {
        const airport = filteredData.find(d => d.locId === locID);
        return {
          locID,
          name: airport?.airportName || '',
        };
      })
      .sort((a, b) => a.locID.localeCompare(b.locID));
  }, [filteredData]);

  // Sync with global airport selection
  React.useEffect(() => {
    if (selectedAirport && !selectedAirports.includes(selectedAirport)) {
      setSelectedAirports([selectedAirport]);
    }
  }, [selectedAirport]);

  // Clear selected airports that are no longer available when filters change
  React.useEffect(() => {
    const availableAirportCodes = new Set(availableAirports.map(a => a.locID));
    const validSelections = selectedAirports.filter(code => availableAirportCodes.has(code));

    if (validSelections.length !== selectedAirports.length) {
      setSelectedAirports(validSelections.length > 0 ? validSelections :
        availableAirports.length > 0 ? [availableAirports[0].locID] : []);
    }
  }, [availableAirports, selectedAirports]);

  const handleAirportChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedAirports(typeof value === 'string' ? value.split(',') : value);
  };

  const handleMetricChange = (event: SelectChangeEvent) => {
    setSelectedMetric(event.target.value);
  };

  const calculateDerivedMetric = (airport: any, metricKey: string): number => {
    if (!airport) return 0;

    switch (metricKey) {
      case 'aero_rev_per_enpl':
        return airport.enplanements > 0 ? (airport.totalAeronauticalRevenue || 0) / airport.enplanements : 0;
      case 'nonaero_per_enpl':
        return airport.enplanements > 0 ? (airport.totalNonAeronauticalRevenue || 0) / airport.enplanements : 0;
      case 'op_rev_per_enpl':
        return airport.enplanements > 0 ? (airport.totalOperatingRevenue || 0) / airport.enplanements : 0;
      case 'days_cash_on_hand':
        return airport.totalOperatingExpenses > 0 ? ((airport.unrestrictedCashAndInvestments || 0) * 365) / airport.totalOperatingExpenses : 0;
      case 'lt_debt_per_enpl':
        return airport.enplanements > 0 ? (airport.totalDebt || 0) / airport.enplanements : 0;
      default:
        return airport[metricKey] || 0;
    }
  };

  const metrics = [
    // Staffing & Operations
    { key: 'enplanements', label: 'Enplanements', formatter: formatNumber, category: 'Staffing & Operations' },
    { key: 'annualAircraftOperations', label: 'Annual Aircraft Operations', formatter: formatNumber, category: 'Staffing & Operations' },
    { key: 'fullTimeEquivalentEmployees', label: 'Full-Time Equivalent Employees', formatter: formatNumber, category: 'Staffing & Operations' },

    // Cost Efficiency
    { key: 'costPerEnplanement', label: 'Cost Per Enplanement', formatter: formatCostPerEnplanement, category: 'Cost Efficiency' },

    // Revenue Performance
    { key: 'signatoryLandingFeeRatePer1000Lbs', label: 'Landing Fee Rate (per 1,000 lbs)', formatter: formatCurrency, category: 'Revenue Performance' },
    { key: 'aero_rev_per_enpl', label: 'Aeronautical Revenue Per Enplanement', formatter: formatCurrency, category: 'Revenue Performance', isDerived: true },
    { key: 'nonaero_per_enpl', label: 'Non-Aeronautical Revenue Per Enplanement', formatter: formatCurrency, category: 'Revenue Performance', isDerived: true },
    { key: 'op_rev_per_enpl', label: 'Total Operating Revenue Per Enplanement', formatter: formatCurrency, category: 'Revenue Performance', isDerived: true },

    // Financial Health
    { key: 'days_cash_on_hand', label: 'Days Cash on Hand', formatter: formatNumber, category: 'Financial Health', isDerived: true },
    { key: 'lt_debt_per_enpl', label: 'Long-Term Debt Per Enplanement', formatter: formatCurrency, category: 'Financial Health', isDerived: true },
    { key: 'operatingMargin', label: 'Operating Margin', formatter: formatPercentage, category: 'Financial Health' },
  ];

  const selectedMetricInfo = metrics.find(m => m.key === selectedMetric);


  // Get available states from filtered data
  const availableStates = React.useMemo(() => {
    return Array.from(new Set(filteredData.map(d => d.state))).sort();
  }, [filteredData]);

  // Get available regions based on what states are in filtered data
  const availableRegions = React.useMemo(() => {
    const statesInData = new Set(availableStates);
    const regionsWithData = new Set<string>();

    statesInData.forEach(state => {
      const region = STATE_TO_REGION[state];
      if (region) {
        regionsWithData.add(region);
      }
    });

    return REGIONS.filter(region => regionsWithData.has(region));
  }, [availableStates]);

  // Filter selected regions/states to only include those available in current filtered data
  const activeRegionAverages = React.useMemo(() => {
    const availableRegionSet = new Set(availableRegions);
    return selectedRegionAverages.filter(region => availableRegionSet.has(region));
  }, [selectedRegionAverages, availableRegions]);

  const activeStateAverages = React.useMemo(() => {
    const availableStateSet = new Set(availableStates);
    return selectedStateAverages.filter(state => availableStateSet.has(state));
  }, [selectedStateAverages, availableStates]);

  const trendData = React.useMemo(() => {
    if (selectedAirports.length === 0 && activeRegionAverages.length === 0 && activeStateAverages.length === 0) {
      return [];
    }

    const years = Array.from(new Set(filteredData.map(d => d.fiscalYear))).sort();

    return years.map(year => {
      const dataPoint: any = { year };
      const yearData = filteredData.filter(d => d.fiscalYear === year);

      // Add individual airports
      selectedAirports.forEach(airport => {
        const airportData = yearData.find(d => d.locId === airport);
        if (airportData) {
          dataPoint[airport] = calculateDerivedMetric(airportData, selectedMetric);
        }
      });

      // Add region averages/medians
      activeRegionAverages.forEach(region => {
        const regionData = yearData.filter(d => STATE_TO_REGION[d.state] === region);
        const values = regionData
          .map(d => calculateDerivedMetric(d, selectedMetric))
          .filter(v => v != null && !isNaN(v));

        if (values.length > 0) {
          const label = region;  // Just use region name
          if (useMedian) {
            values.sort((a, b) => a - b);
            const mid = Math.floor(values.length / 2);
            dataPoint[label] = values.length % 2 === 0
              ? (values[mid - 1] + values[mid]) / 2
              : values[mid];
          } else {
            dataPoint[label] = values.reduce((sum, v) => sum + v, 0) / values.length;
          }
        }
      });

      // Add state averages/medians
      activeStateAverages.forEach(state => {
        const stateData = yearData.filter(d => d.state === state);
        const values = stateData
          .map(d => calculateDerivedMetric(d, selectedMetric))
          .filter(v => v != null && !isNaN(v));

        if (values.length > 0) {
          const label = STATE_TO_ABBREV[state] || state;  // Use state abbreviation
          if (useMedian) {
            values.sort((a, b) => a - b);
            const mid = Math.floor(values.length / 2);
            dataPoint[label] = values.length % 2 === 0
              ? (values[mid - 1] + values[mid]) / 2
              : values[mid];
          } else {
            dataPoint[label] = values.reduce((sum, v) => sum + v, 0) / values.length;
          }
        }
      });

      return dataPoint;
    });
  }, [filteredData, selectedAirports, activeRegionAverages, activeStateAverages, selectedMetric, useMedian]);

  // ColorBrewer Set2 palette for airports (bright, vibrant)
  const airportColors = [
    '#66C2A5',   // Teal
    '#FC8D62',   // Orange
    '#8DA0CB',   // Light Blue
    '#E78AC3',   // Pink
    '#FFD92F',   // Yellow
    '#E5C494',   // Beige
  ];

  // Single brown color for all regions
  const regionColor = '#8B6914';   // Dark goldenrod

  // Single gray color for all states
  const stateColor = '#666666';   // Medium gray

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ textAlign: 'center' }}>
          Loading trend data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, pl: 3, pr: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Performance Tracking
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Multi-year trend analysis and historical performance tracking
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Airports (Max 6)</InputLabel>
              <Select
                multiple
                value={selectedAirports}
                onChange={handleAirportChange}
                label="Select Airports (Max 6)"
                renderValue={(selected) => selected.join(', ')}
              >
                {availableAirports.map((airport) => (
                  <MenuItem
                    key={airport.locID}
                    value={airport.locID}
                    disabled={selectedAirports.length >= 6 && !selectedAirports.includes(airport.locID)}
                  >
                    {airport.locID} - {airport.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                onChange={handleMetricChange}
                label="Metric"
              >
                {/* Staffing & Operations */}
                <MenuItem disabled sx={{ fontWeight: 600, color: '#7b1fa2' }}>Staffing & Operations</MenuItem>
                {metrics.filter(m => m.category === 'Staffing & Operations').map((metric) => (
                  <MenuItem key={metric.key} value={metric.key} sx={{ pl: 3 }}>
                    {metric.label}
                  </MenuItem>
                ))}

                {/* Cost Efficiency */}
                <MenuItem disabled sx={{ fontWeight: 600, color: '#d32f2f' }}>Cost Efficiency</MenuItem>
                {metrics.filter(m => m.category === 'Cost Efficiency').map((metric) => (
                  <MenuItem key={metric.key} value={metric.key} sx={{ pl: 3 }}>
                    {metric.label}
                  </MenuItem>
                ))}

                {/* Revenue Performance */}
                <MenuItem disabled sx={{ fontWeight: 600, color: '#2e7d32' }}>Revenue Performance</MenuItem>
                {metrics.filter(m => m.category === 'Revenue Performance').map((metric) => (
                  <MenuItem key={metric.key} value={metric.key} sx={{ pl: 3 }}>
                    {metric.label}
                  </MenuItem>
                ))}

                {/* Financial Health */}
                <MenuItem disabled sx={{ fontWeight: 600, color: '#f57c00' }}>Financial Health</MenuItem>
                {metrics.filter(m => m.category === 'Financial Health').map((metric) => (
                  <MenuItem key={metric.key} value={metric.key} sx={{ pl: 3 }}>
                    {metric.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Add Region Avg/Median</InputLabel>
              <Select
                multiple
                value={selectedRegionAverages}
                onChange={(e) => setSelectedRegionAverages(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                label="Add Region Avg/Median"
                renderValue={(selected) => selected.length > 0 ? `${selected.length} region${selected.length > 1 ? 's' : ''}` : ''}
              >
                {availableRegions.map((region) => (
                  <MenuItem key={region} value={region}>
                    {region}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Add State/Territory Avg/Median</InputLabel>
              <Select
                multiple
                value={selectedStateAverages}
                onChange={(e) => setSelectedStateAverages(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                label="Add State/Territory Avg/Median"
                renderValue={(selected) => selected.length > 0 ? `${selected.length} state${selected.length > 1 ? 's' : ''}` : ''}
              >
                {availableStates.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={useMedian}
                  onChange={(e) => setUseMedian(e.target.checked)}
                  color="warning"
                />
              }
              label={`Use ${useMedian ? 'Median' : 'Average'}`}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Trend Chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          {selectedMetricInfo?.label} Over Time
        </Typography>
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <LineChart data={trendData} margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="year"
                tick={{ fill: theme.palette.text.primary }}
                tickFormatter={(value) => `FY ${value}`}
              />
              <YAxis
                tick={{ fill: theme.palette.text.primary }}
                tickFormatter={(value) => {
                  if (!selectedMetricInfo) return value;
                  // Use compact formatting for y-axis
                  if (selectedMetricInfo.key === 'operatingMargin') {
                    return `${(value * 100).toFixed(0)}%`;
                  }
                  // Currency values - use compact notation
                  if (['totalOperatingRevenue', 'costPerEnplanement', 'signatoryLandingFeeRatePer1000Lbs',
                       'aero_rev_per_enpl', 'nonaero_per_enpl', 'op_rev_per_enpl', 'lt_debt_per_enpl'].includes(selectedMetricInfo.key)) {
                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      notation: 'compact',
                      maximumFractionDigits: 1
                    }).format(value);
                  }
                  // Number values
                  return new Intl.NumberFormat('en-US', {
                    notation: 'compact',
                    maximumFractionDigits: 1
                  }).format(value);
                }}
                width={70}
              />
              <Tooltip
                formatter={(value: any) => selectedMetricInfo?.formatter(value) || value}
                labelFormatter={(label) => `FY ${label}`}
              />
              <Legend />
              {(() => {
                // Organize series: regions and states first (background), then airports (foreground)
                const allKeys = Object.keys(trendData[0] || {}).filter(key => key !== 'year');

                const airports = allKeys.filter(key => selectedAirports.includes(key));
                const regionAvgs = allKeys.filter(key => REGIONS.includes(key));
                const stateAvgs = allKeys.filter(key => {
                  // Check if key is a state abbreviation
                  return Object.values(STATE_TO_ABBREV).includes(key);
                });

                // Render states and regions first (background), then airports on top
                const orderedKeys = [...stateAvgs, ...regionAvgs, ...airports];

                return orderedKeys.map((seriesName) => {
                  const isAirport = selectedAirports.includes(seriesName);
                  const isRegion = regionAvgs.includes(seriesName);
                  const isState = stateAvgs.includes(seriesName);

                  let color;
                  if (isAirport) {
                    const airportIndex = airports.indexOf(seriesName);
                    color = airportColors[airportIndex % airportColors.length];
                  } else if (isRegion) {
                    color = regionColor;
                  } else {
                    color = stateColor;
                  }

                  return (
                    <Line
                      key={seriesName}
                      type="monotone"
                      dataKey={seriesName}
                      stroke={color}
                      strokeWidth={3}
                      strokeDasharray={isAirport ? undefined : '10 5'}
                      dot={isAirport ? { r: 5 } : { r: 0 }}
                      activeDot={{ r: 6 }}
                      opacity={isAirport ? 1 : 0.3}
                    />
                  );
                });
              })()}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Summary Statistics */}
      <Grid container spacing={3}>
        {selectedAirports.slice(0, 6).map((airport, index) => {
          const airportData = filteredData.filter(d => d.locId === airport).sort((a, b) => a.fiscalYear - b.fiscalYear);
          const latestData = airportData[airportData.length - 1];
          const earliestData = airportData[0];

          if (!latestData || !earliestData) return null;

          const latestValue = latestData[selectedMetric as keyof typeof latestData] as number || 0;
          const earliestValue = earliestData[selectedMetric as keyof typeof earliestData] as number || 0;
          const growth = earliestValue !== 0 ? ((latestValue - earliestValue) / earliestValue) * 100 : 0;

          return (
            <Grid item xs={12} sm={6} md={4} lg={2} key={airport}>
              <Card sx={{ height: '100%', borderLeft: `4px solid ${airportColors[index % airportColors.length]}` }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {airport}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {availableAirports.find(a => a.locID === airport)?.name}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedMetricInfo?.formatter(latestValue)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    FY {latestData.fiscalYear}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: growth >= 0 ? theme.palette.success.main : theme.palette.error.main,
                      fontWeight: 600,
                    }}
                  >
                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% since FY {earliestData.fiscalYear}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default TrendTracking;
