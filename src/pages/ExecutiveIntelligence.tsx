import React, { Suspense } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  useTheme,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Flight,
  Business,
  Assessment,
  Speed,
  Warning,
  CheckCircle,
  AccountBalance,
  Public,
  Leaderboard,
  ScatterPlot,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Label,
  Cell,
} from 'recharts';
import { useData } from '../context/DataContext';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  calculateYoYGrowth,
  getMetricLabel,
  mapMetricToAirportMap
} from '../utils/formatters';
import CustomRadarChart from '../components/Charts/RadarChart';
import BubbleChart from '../components/Charts/BubbleChart';

// Lazy load the interactive map
const AirportMap = React.lazy(() => import('../components/Maps/AirportMap'));

// Loading component for the map
const MapLoader: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: 500,
      gap: 2,
      backgroundColor: 'rgba(0,0,0,0.02)',
      borderRadius: 3
    }}
  >
    <CircularProgress size={32} />
    <Typography variant="body2" color="text.secondary">
      Loading interactive map...
    </Typography>
  </Box>
);

const ExecutiveIntelligence: React.FC = () => {
  const theme = useTheme();
  const { data, loading, filteredData, selectedYears, setSelectedYears, getAvailableYears, selectedHubSizes, selectedStates, selectedAirport } = useData();

  const [selectedMetric, setSelectedMetric] = React.useState<string>('enplanements');
  const [selectedTab, setSelectedTab] = React.useState<number>(0);
  const [showGrowthRate, setShowGrowthRate] = React.useState<boolean>(false);
  const [showBenchmark, setShowBenchmark] = React.useState<boolean>(true);
  const [selectedPercentiles, setSelectedPercentiles] = React.useState<number[]>([25, 75]);

  // Helper function to calculate derived metrics
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

  const availableYears = getAvailableYears();
  const currentYear = selectedYears.length > 0 ? selectedYears[0] : Math.max(...availableYears);

  // Reset to latest year if somehow an old year is selected and we're in growth rate mode on Top Performers tab
  // Also prevent selection of first year when growth rate is enabled
  React.useEffect(() => {
    const latestYear = Math.max(...availableYears);
    const earliestYear = Math.min(...availableYears);

    if (selectedTab === 1 && showGrowthRate && currentYear !== latestYear && availableYears.length > 0) {
      setSelectedYears([latestYear]);
    } else if (showGrowthRate && currentYear === earliestYear && availableYears.length > 1) {
      // If growth rate is enabled and user has first year selected, switch to second year
      const sortedYears = availableYears.sort((a, b) => a - b); // Sort ascending
      const secondYear = sortedYears[1];
      setSelectedYears([secondYear]);
    }
  }, [showGrowthRate, selectedTab, currentYear, availableYears, setSelectedYears]);

  // Find the actual previous year that exists in the data
  const sortedYears = availableYears.sort((a, b) => b - a); // Sort descending
  const currentYearIndex = sortedYears.indexOf(currentYear);
  const previousYear = currentYearIndex < sortedYears.length - 1 ? sortedYears[currentYearIndex + 1] : currentYear - 1;

  // hubFilteredData is the same as filteredData since filteredData already respects navbar hub size filter
  const hubFilteredData = filteredData;

  // Industry KPIs Logic
  const industryKPIs = React.useMemo(() => {
    if (filteredData.length === 0) return null;

    // filteredData already respects all navbar filters (years, states, hub sizes)
    const currentData = filteredData.filter(d => d.fiscalYear === currentYear);

    // For previous year, get raw data then apply the same filters as filteredData (except year)
    let previousData = data.filter(d => d.fiscalYear === previousYear);

    // Apply state filter if active
    if (selectedStates.length > 0) {
      previousData = previousData.filter(d => selectedStates.includes(d.state));
    }

    // Apply hub size filter if active
    if (selectedHubSizes.length > 0) {
      previousData = previousData.filter(d => selectedHubSizes.includes(d.hubSize));
    }


    const currentRevenue = currentData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0);
    const previousRevenue = previousData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0);

    const currentPassengers = currentData.reduce((sum, d) => sum + (d.enplanements || 0), 0);
    const previousPassengers = previousData.reduce((sum, d) => sum + (d.enplanements || 0), 0);

    const currentOperations = currentData.reduce((sum, d) => sum + (d.annualAircraftOperations || 0), 0);
    const previousOperations = previousData.reduce((sum, d) => sum + (d.annualAircraftOperations || 0), 0);

    // Calculate average operating margin (simple average of individual airport margins)
    const currentMargin = currentData.reduce((sum, d) => sum + (d.operatingMargin || 0), 0) / currentData.length;
    const previousMargin = previousData.reduce((sum, d) => sum + (d.operatingMargin || 0), 0) / previousData.length;

    const currentProfitable = currentData.filter(d => (d.operatingMargin || 0) > 0).length;
    const previousProfitable = previousData.filter(d => (d.operatingMargin || 0) > 0).length;

    return {
      revenue: {
        current: currentRevenue,
        growth: calculateYoYGrowth(currentRevenue, previousRevenue),
      },
      passengers: {
        current: currentPassengers,
        growth: calculateYoYGrowth(currentPassengers, previousPassengers),
      },
      operations: {
        current: currentOperations,
        growth: calculateYoYGrowth(currentOperations, previousOperations),
      },
      margin: {
        current: currentMargin,
        growth: calculateYoYGrowth(currentMargin, previousMargin),
      },
      profitable: {
        current: currentProfitable,
        growth: calculateYoYGrowth(currentProfitable, previousProfitable),
      },
      airports: currentData.length,
    };
  }, [filteredData, currentYear, previousYear, selectedYears, selectedStates, selectedHubSizes, data]);

  // Determine if the metric is a "cost" measure (lower is better)
  const isCostMetric = (metric: string): boolean => {
    const costMetrics = ['costPerEnplanement', 'lt_debt_per_enpl'];
    return costMetrics.includes(metric);
  };

  const topPerformers = React.useMemo(() => {
    if (hubFilteredData.length === 0) return [];

    const isCost = isCostMetric(selectedMetric);

    if (showGrowthRate) {
      // Calculate growth rates between current and previous year
      // Use raw data to access all years, then apply hub size filter
      const latestYear = Math.max(...data.map(a => a.fiscalYear));
      const previousYear = latestYear - 1;

      // Get current year data from hubFilteredData (already filtered by navbar filters)
      const currentYearData = hubFilteredData.filter(d => d.fiscalYear === latestYear);

      // Get previous year data from raw data, then apply the same filters as hubFilteredData (except year)
      let previousYearData = data.filter(d => d.fiscalYear === previousYear);

      // Apply state filter if active
      if (selectedStates.length > 0) {
        previousYearData = previousYearData.filter(d => selectedStates.includes(d.state));
      }

      // Apply hub size filter if active
      if (selectedHubSizes.length > 0) {
        previousYearData = previousYearData.filter(d => selectedHubSizes.includes(d.hubSize));
      }

      const airportsWithGrowth = currentYearData
        .map(current => {
          const previous = previousYearData.find(p => p.locId === current.locId);
          if (!previous) return null;

          const currentValue = calculateDerivedMetric(current, selectedMetric);
          const previousValue = calculateDerivedMetric(previous, selectedMetric);

          // Filter out if current value is 0 or negative
          if (currentValue <= 0) return null;

          // Ensure both values are valid numbers and previous value is positive
          if (!currentValue && currentValue !== 0) return null;
          if (!previousValue || previousValue <= 0) return null;

          const growthRate = ((currentValue - previousValue) / previousValue) * 100;

          // Filter out NaN growth rates
          if (!Number.isFinite(growthRate)) return null;

          return {
            ...current,
            growthRate,
            displayValue: growthRate
          };
        })
        .filter((airport): airport is NonNullable<typeof airport> => airport !== null)
        // For cost metrics, reverse sort (lower growth is better)
        .sort((a, b) => isCost ? (a.growthRate || 0) - (b.growthRate || 0) : (b.growthRate || 0) - (a.growthRate || 0));

      const top5 = airportsWithGrowth.slice(0, 5);
      const bottom5 = airportsWithGrowth.slice(-5).reverse();

      return [...top5, ...bottom5];
    } else {
      // Get unique airports by LocID, taking the one with highest/lowest metric value
      const uniqueAirports = hubFilteredData
        .filter(d => selectedYears.includes(d.fiscalYear) && calculateDerivedMetric(d, selectedMetric) > 0)
        .reduce((acc, current) => {
          const existing = acc.find(airport => airport.locId === current.locId);
          const currentValue = calculateDerivedMetric(current, selectedMetric);
          const existingValue = existing ? calculateDerivedMetric(existing, selectedMetric) : 0;
          if (!existing || currentValue > existingValue) {
            acc = acc.filter(airport => airport.locId !== current.locId);
            acc.push({
              ...current,
              displayValue: currentValue
            });
          }
          return acc;
        }, [] as any[]);

      // Sort and take top 5 and bottom 5
      const sorted = uniqueAirports.sort((a, b) => {
        const aVal = calculateDerivedMetric(a, selectedMetric);
        const bVal = calculateDerivedMetric(b, selectedMetric);
        return isCost ? aVal - bVal : bVal - aVal;
      });

      const top5 = sorted.slice(0, 5);
      const bottom5 = sorted.slice(-5).reverse();

      return [...top5, ...bottom5];
    }
  }, [hubFilteredData, selectedMetric, selectedYears, showGrowthRate, currentYear, previousYear, data, selectedStates, selectedHubSizes]);

  // Interactive Risk Assessment Logic
  const riskFactors = React.useMemo(() => {
    if (!industryKPIs) return [];

    const factors = [];

    // Use the filtered industryKPIs data instead of executiveSummary
    if (industryKPIs.margin.current < 0.05) {
      factors.push({
        level: 'high',
        title: 'Low Operating Margins',
        description: 'Average operating margins below 5% indicate profitability challenges for selected filters.',
      });
    }

    if (industryKPIs.revenue.growth < 0) {
      factors.push({
        level: 'high',
        title: 'Revenue Decline',
        description: 'Negative year-over-year revenue growth requires strategic attention.',
      });
    }

    if (industryKPIs.passengers.growth < -0.05) {
      factors.push({
        level: 'medium',
        title: 'Passenger Volume Decline',
        description: 'Significant passenger volume decline may impact future revenue.',
      });
    }

    const profitabilityRate = (industryKPIs.profitable.current || 0) / (industryKPIs.airports || 1);
    if (profitabilityRate < 0.7) {
      factors.push({
        level: 'medium',
        title: 'Profitability Distribution',
        description: 'Less than 70% of airports showing positive operating margins.',
      });
    }

    return factors;
  }, [industryKPIs]);

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    const value = event.target.value;
    setSelectedYears([typeof value === 'string' ? parseInt(value) : value]);
  };

  const handleMetricChange = (event: SelectChangeEvent<string>) => {
    setSelectedMetric(event.target.value);
  };

  // Hub size is now controlled by global navbar filter

  // Map ExecutiveIntelligence metrics to AirportMap metrics

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const kpiCards = [
    {
      title: 'Total Operating Revenue',
      value: industryKPIs?.revenue.current || 0,
      growth: industryKPIs?.revenue.growth || 0,
      icon: <AttachMoney />,
      color: theme.palette.primary.main,
      formatter: formatCurrency,
    },
    {
      title: 'Total Passengers',
      value: industryKPIs?.passengers.current || 0,
      growth: industryKPIs?.passengers.growth || 0,
      icon: <Flight />,
      color: theme.palette.secondary.main,
      formatter: formatNumber,
    },
    {
      title: 'Aircraft Operations',
      value: industryKPIs?.operations.current || 0,
      growth: industryKPIs?.operations.growth || 0,
      icon: <Speed />,
      color: theme.palette.info.main,
      formatter: formatNumber,
    },
    {
      title: 'Average Operating Margin',
      value: industryKPIs?.margin.current || 0,
      growth: industryKPIs?.margin.growth || 0,
      icon: <TrendingUp />,
      color: theme.palette.success.main,
      formatter: formatPercentage,
    },
    {
      title: 'Profitable Airports',
      value: industryKPIs?.profitable.current || 0,
      growth: industryKPIs?.profitable.growth || 0,
      icon: <Business />,
      color: theme.palette.warning.main,
      formatter: (value: number) => Math.round(value).toLocaleString('en-US'),
    },
  ];

  const strategicInsights = [
    {
      title: 'Market Leadership',
      description: 'US airports maintain global competitiveness with strong operational metrics.',
      recommendation: 'Continue investing in infrastructure modernization and passenger experience.',
    },
    {
      title: 'Financial Resilience',
      description: 'Diversified revenue streams provide stability during market volatility.',
      recommendation: 'Expand non-aeronautical revenue opportunities and partnerships.',
    },
    {
      title: 'Operational Excellence',
      description: 'Efficiency improvements drive margin expansion across hub classifications.',
      recommendation: 'Implement best practices sharing and benchmarking programs.',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading Executive Intelligence...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, pl: 3, pr: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Executive Intelligence
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Comprehensive analysis and strategic insights for US airport financial performance
        </Typography>
      </Box>



      {/* KPI Dashboard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((kpi, index) => (
          <Grid item xs={12} sm={6} lg={2.4} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: `${kpi.color}15`,
                      color: kpi.color,
                    }}
                  >
                    {kpi.icon}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {kpi.growth >= 0 ? (
                      <TrendingUp sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                    ) : (
                      <TrendingDown sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        color: kpi.growth >= 0 ? theme.palette.success.main : theme.palette.error.main,
                        fontWeight: 600,
                      }}
                    >
                      {formatPercentage(Math.abs(kpi.growth))}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {kpi.formatter(kpi.value)}
                </Typography>

                <Typography variant="body2" color="textSecondary">
                  {kpi.title}
                </Typography>

                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                  YoY Growth vs Previous Year
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Interactive Risk Assessment */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          Risk Assessment
        </Typography>

        {riskFactors.length === 0 ? (
          <Alert severity="success" icon={<CheckCircle />}>
            <Typography variant="body2">
              No significant risk factors identified. Performance is within acceptable parameters for selected filters.
            </Typography>
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {riskFactors.map((factor, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Alert
                  severity={factor.level === 'high' ? 'error' : 'warning'}
                  icon={<Warning />}
                  sx={{ height: '100%' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {factor.title}
                  </Typography>
                  <Typography variant="caption">
                    {factor.description}
                  </Typography>
                </Alert>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Performance Analysis - Tabbed Interface */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', mb: 3, pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Performance Overview
          </Typography>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            aria-label="performance analysis tabs"
            sx={{
              minHeight: 'auto',
              '& .MuiTab-root': {
                minHeight: 'auto',
                py: 1,
                fontSize: '0.875rem'
              }
            }}
          >
            <Tab icon={<Public fontSize="small" />} label="Map" iconPosition="start" />
            <Tab icon={<Leaderboard fontSize="small" />} label="Rankings" iconPosition="start" />
            <Tab icon={<ScatterPlot fontSize="small" />} label="Matrix" iconPosition="start" />
          </Tabs>
        </Box>

        {selectedTab === 0 && (
          <Box>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Interactive map showing airport performance across the United States.
              Click on airports to view detailed metrics. Markers are colored by performance relative to industry benchmarks.
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 3 }}>
              <FormControl sx={{ minWidth: 250 }} size="small">
                <InputLabel>Metric</InputLabel>
                <Select
                  value={selectedMetric}
                  onChange={handleMetricChange}
                  label="Metric"
                >
                    {/* Staffing & Operations */}
                    <MenuItem disabled sx={{ fontWeight: 600, color: '#7b1fa2' }}>Staffing & Operations</MenuItem>
                    <MenuItem value="enplanements" sx={{ pl: 3 }}>Enplanements</MenuItem>
                    <MenuItem value="annualAircraftOperations" sx={{ pl: 3 }}>Annual Aircraft Operations</MenuItem>
                    <MenuItem value="fullTimeEquivalentEmployees" sx={{ pl: 3 }}>Full-Time Equivalent Employees</MenuItem>

                    {/* Cost Efficiency */}
                    <MenuItem disabled sx={{ fontWeight: 600, color: '#d32f2f' }}>Cost Efficiency</MenuItem>
                    <MenuItem value="costPerEnplanement" sx={{ pl: 3 }}>Cost Per Enplanement</MenuItem>

                    {/* Revenue Performance */}
                    <MenuItem disabled sx={{ fontWeight: 600, color: '#2e7d32' }}>Revenue Performance</MenuItem>
                    <MenuItem value="signatoryLandingFeeRatePer1000Lbs" sx={{ pl: 3 }}>Landing Fee Rate (per 1,000 lbs)</MenuItem>
                    <MenuItem value="aero_rev_per_enpl" sx={{ pl: 3 }}>Aeronautical Revenue Per Enplanement</MenuItem>
                    <MenuItem value="nonaero_per_enpl" sx={{ pl: 3 }}>Non-Aeronautical Revenue Per Enplanement</MenuItem>
                    <MenuItem value="op_rev_per_enpl" sx={{ pl: 3 }}>Total Operating Revenue Per Enplanement</MenuItem>

                    {/* Financial Health */}
                    <MenuItem disabled sx={{ fontWeight: 600, color: '#f57c00' }}>Financial Health</MenuItem>
                    <MenuItem value="days_cash_on_hand" sx={{ pl: 3 }}>Days Cash on Hand</MenuItem>
                    <MenuItem value="lt_debt_per_enpl" sx={{ pl: 3 }}>Long-Term Debt Per Enplanement</MenuItem>
                    <MenuItem value="operatingMargin" sx={{ pl: 3 }}>Operating Margin (%)</MenuItem>
                  </Select>
                </FormControl>

                <MuiTooltip
                  title={
                    selectedMetric === 'operatingMargin' && showGrowthRate
                      ? "Growth rate filters: Excludes airports with previous margin <1% to avoid misleading extreme values. Also excludes growth rates >500%."
                      : "Toggle to view year-over-year growth rates"
                  }
                  arrow
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showGrowthRate}
                        onChange={(e) => setShowGrowthRate(e.target.checked)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: theme.palette.primary.main,
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: theme.palette.primary.main,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Growth Rate
                        {selectedMetric === 'operatingMargin' && showGrowthRate && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                            *
                          </Typography>
                        )}
                      </Typography>
                    }
                    sx={{ margin: 0 }}
                  />
                </MuiTooltip>
              </Box>

            <Box sx={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}`
            }}>
              <Suspense fallback={<MapLoader />}>
                <AirportMap
                  airports={filteredData}
                  allAirports={data}
                  height={500}
                  selectedMetric={mapMetricToAirportMap(selectedMetric)}
                  showGrowthRate={showGrowthRate}
                  onGrowthRateChange={setShowGrowthRate}
                  selectedYear={currentYear}
                  showBenchmark={showBenchmark}
                  onBenchmarkChange={setShowBenchmark}
                  externalHubSizeFilter={selectedHubSizes.length > 0 ? selectedHubSizes.join(',') : 'All'}
                />
              </Suspense>
            </Box>
          </Box>
        )}

        {selectedTab === 1 && (
          <Box>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              {showGrowthRate
                ? `Top and bottom performing airports based on growth rates for ${getMetricLabel(selectedMetric).toLowerCase()} (${previousYear} to ${currentYear}).`
                : `Top and bottom performing airports based on ${getMetricLabel(selectedMetric).toLowerCase()} for FY ${currentYear}.`}
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 3 }}>
              <FormControl sx={{ minWidth: 250 }} size="small">
                <InputLabel>Metric</InputLabel>
                <Select
                  value={selectedMetric}
                  onChange={handleMetricChange}
                  label="Metric"
                >
                    {/* Staffing & Operations */}
                    <MenuItem disabled sx={{ fontWeight: 600, color: '#7b1fa2' }}>Staffing & Operations</MenuItem>
                    <MenuItem value="enplanements" sx={{ pl: 3 }}>Enplanements</MenuItem>
                    <MenuItem value="annualAircraftOperations" sx={{ pl: 3 }}>Annual Aircraft Operations</MenuItem>
                    <MenuItem value="fullTimeEquivalentEmployees" sx={{ pl: 3 }}>Full-Time Equivalent Employees</MenuItem>

                    {/* Cost Efficiency */}
                    <MenuItem disabled sx={{ fontWeight: 600, color: '#d32f2f' }}>Cost Efficiency</MenuItem>
                    <MenuItem value="costPerEnplanement" sx={{ pl: 3 }}>Cost Per Enplanement</MenuItem>

                    {/* Revenue Performance */}
                    <MenuItem disabled sx={{ fontWeight: 600, color: '#2e7d32' }}>Revenue Performance</MenuItem>
                    <MenuItem value="signatoryLandingFeeRatePer1000Lbs" sx={{ pl: 3 }}>Landing Fee Rate (per 1,000 lbs)</MenuItem>
                    <MenuItem value="aero_rev_per_enpl" sx={{ pl: 3 }}>Aeronautical Revenue Per Enplanement</MenuItem>
                    <MenuItem value="nonaero_per_enpl" sx={{ pl: 3 }}>Non-Aeronautical Revenue Per Enplanement</MenuItem>
                    <MenuItem value="op_rev_per_enpl" sx={{ pl: 3 }}>Total Operating Revenue Per Enplanement</MenuItem>

                    {/* Financial Health */}
                    <MenuItem disabled sx={{ fontWeight: 600, color: '#f57c00' }}>Financial Health</MenuItem>
                    <MenuItem value="days_cash_on_hand" sx={{ pl: 3 }}>Days Cash on Hand</MenuItem>
                    <MenuItem value="lt_debt_per_enpl" sx={{ pl: 3 }}>Long-Term Debt Per Enplanement</MenuItem>
                    <MenuItem value="operatingMargin" sx={{ pl: 3 }}>Operating Margin (%)</MenuItem>
                  </Select>
                </FormControl>

                <MuiTooltip
                  title={
                    selectedMetric === 'operatingMargin' && showGrowthRate
                      ? "Growth rate filters: Excludes airports with previous margin <1% to avoid misleading extreme values. Also excludes growth rates >500%."
                      : "Toggle to view year-over-year growth rates"
                  }
                  arrow
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showGrowthRate}
                        onChange={(e) => setShowGrowthRate(e.target.checked)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: theme.palette.primary.main,
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: theme.palette.primary.main,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Growth Rate
                        {selectedMetric === 'operatingMargin' && showGrowthRate && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                            *
                          </Typography>
                        )}
                      </Typography>
                    }
                    sx={{ margin: 0 }}
                  />
                </MuiTooltip>
              </Box>

            {/* Performance Rankings Cards */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                {showGrowthRate ? 'Growth Rate Rankings' : 'Performance Rankings'}
              </Typography>
              <Grid container spacing={3}>
                {topPerformers.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography variant="body1" color="textSecondary" sx={{ p: 3, textAlign: 'center' }}>
                      No airports found matching the current criteria.
                    </Typography>
                  </Grid>
                ) : (
                  topPerformers.map((airport, index) => {
                  // Get sparkline data for this airport - filtered through current year
                  const historicalData = data
                    .filter(d => d.locId === airport.locId && d.fiscalYear <= currentYear)
                    .sort((a, b) => a.fiscalYear - b.fiscalYear);

                  const sparklineData = historicalData.map((d, idx) => {
                    let value: number;

                    if (showGrowthRate) {
                      // For growth rate, calculate YoY growth for each year
                      if (idx === 0) {
                        value = 0; // First year has no previous year to compare
                      } else {
                        const currentValue = calculateDerivedMetric(d, selectedMetric);
                        const previousValue = calculateDerivedMetric(historicalData[idx - 1], selectedMetric);
                        value = previousValue && previousValue > 0
                          ? ((currentValue - previousValue) / previousValue) * 100
                          : 0;
                      }
                    } else {
                      // For absolute values, use the metric directly
                      value = calculateDerivedMetric(d, selectedMetric);
                    }

                    return {
                      year: d.fiscalYear,
                      value: value,
                    };
                  });

                  const isTopPerformer = index < 5;
                  const isBottomPerformer = index >= 5;
                  const isCost = isCostMetric(selectedMetric);

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={airport.locId}>
                      <Card
                        sx={{
                          textAlign: 'center',
                          py: 2,
                          position: 'relative',
                          backgroundColor: isTopPerformer
                            ? `${theme.palette.success.main}10`
                            : isBottomPerformer
                              ? `${theme.palette.error.main}10`
                              : 'white',
                          border: isTopPerformer
                            ? `2px solid ${theme.palette.success.main}30`
                            : isBottomPerformer
                              ? `2px solid ${theme.palette.error.main}30`
                              : 'none',
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              backgroundColor: isTopPerformer
                                ? theme.palette.success.main
                                : theme.palette.error.main,
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            {isTopPerformer ? (isCost ? 'LOWEST' : 'TOP') : (isCost ? 'HIGHEST' : 'BOT')} {(index % 5) + 1}
                          </Box>

                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {airport.locId}
                          </Typography>

                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{
                              mb: 2,
                              fontSize: '0.85rem',
                              minHeight: '2.4em',
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.2
                            }}
                          >
                            {airport.airportName}
                          </Typography>

                          {/* Sparkline */}
                          <Box sx={{ width: '100%', height: 40, mb: 2 }}>
                            <ResponsiveContainer>
                              <AreaChart data={sparklineData}>
                                <defs>
                                  <linearGradient id={`gradient-exec-${airport.locId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Tooltip
                                  formatter={(value: any) => {
                                    if (showGrowthRate) {
                                      return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`];
                                    }
                                    // Currency metrics (per enplanement, landing fees, CPE)
                                    const currencyMetrics = ['costPerEnplanement', 'signatoryLandingFeeRatePer1000Lbs',
                                                             'aero_rev_per_enpl', 'nonaero_per_enpl', 'op_rev_per_enpl', 'lt_debt_per_enpl'];
                                    // Percentage metrics
                                    const percentageMetrics = ['operatingMargin'];
                                    // Integer metrics
                                    const integerMetrics = ['fullTimeEquivalentEmployees'];

                                    const formatted = percentageMetrics.includes(selectedMetric)
                                      ? formatPercentage(value)
                                      : currencyMetrics.includes(selectedMetric)
                                        ? formatCurrency(value)
                                        : integerMetrics.includes(selectedMetric)
                                          ? Math.round(value).toLocaleString('en-US')
                                          : formatNumber(value);
                                    return [formatted];
                                  }}
                                  labelFormatter={(label, payload) => {
                                    if (payload && payload.length > 0) {
                                      return `FY ${payload[0].payload.year}`;
                                    }
                                    return `FY ${label}`;
                                  }}
                                  contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: 4,
                                    fontSize: '0.75rem',
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke={theme.palette.primary.main}
                                  strokeWidth={2}
                                  fill={`url(#gradient-exec-${airport.locId})`}
                                  isAnimationActive={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </Box>

                          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                            {showGrowthRate
                              ? `${(airport.growthRate || 0) >= 0 ? '+' : ''}${(airport.growthRate || 0).toFixed(1)}%`
                              : (() => {
                                  const value = calculateDerivedMetric(airport, selectedMetric);
                                  // Currency metrics (per enplanement, landing fees, CPE)
                                  const currencyMetrics = ['costPerEnplanement', 'signatoryLandingFeeRatePer1000Lbs',
                                                           'aero_rev_per_enpl', 'nonaero_per_enpl', 'op_rev_per_enpl', 'lt_debt_per_enpl'];
                                  // Percentage metrics
                                  const percentageMetrics = ['operatingMargin'];
                                  // Integer metrics
                                  const integerMetrics = ['fullTimeEquivalentEmployees'];

                                  if (percentageMetrics.includes(selectedMetric)) return formatPercentage(value);
                                  if (currencyMetrics.includes(selectedMetric)) return formatCurrency(value);
                                  if (integerMetrics.includes(selectedMetric)) return Math.round(value).toLocaleString('en-US');
                                  return formatNumber(value);
                                })()}
                          </Typography>

                          <Chip
                            label={airport.state}
                            size="small"
                            sx={{
                              mt: 1,
                              backgroundColor: theme.palette.grey[100],
                              fontSize: '0.75rem',
                            }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })
              )}
              </Grid>
            </Paper>

            {/* Distribution Chart - Histogram with Bins */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Distribution: {getMetricLabel(selectedMetric)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[
                    { value: 10, label: '10th' },
                    { value: 25, label: 'Q1' },
                    { value: 50, label: 'Median' },
                    { value: 75, label: 'Q3' },
                    { value: 90, label: '90th' }
                  ].map(({ value, label }) => (
                    <Chip
                      key={value}
                      label={label}
                      size="small"
                      onClick={() => {
                        setSelectedPercentiles(prev =>
                          prev.includes(value)
                            ? prev.filter(p => p !== value)
                            : [...prev, value].sort((a, b) => a - b)
                        );
                      }}
                      color={selectedPercentiles.includes(value) ? 'primary' : 'default'}
                      variant={selectedPercentiles.includes(value) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>
              <Box sx={{ width: '100%' }}>
                {(() => {
                  // Get current year data
                  const currentYearData = hubFilteredData
                    .filter(d => d.fiscalYear === currentYear)
                    .map(d => ({
                      value: calculateDerivedMetric(d, selectedMetric),
                      locId: d.locId,
                      name: d.airportName,
                    }))
                    .filter(d => d.value > 0);

                  const airportCount = new Set(currentYearData.map(d => d.locId)).size;

                  if (currentYearData.length === 0) return <Typography variant="body2" color="textSecondary" sx={{ p: 3, textAlign: 'center' }}>No data available</Typography>;

                  return (
                    <>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                        Across {airportCount} selected airports - FY {currentYear}
                      </Typography>
                      {(() => {

                  const values = currentYearData.map(d => d.value).sort((a, b) => a - b);
                  const min = values[0];
                  const max = values[values.length - 1];

                  // Find selected airport
                  let selectedValue: number | null = null;
                  let selectedAirportName = '';
                  if (selectedAirport) {
                    const selectedData = currentYearData.find(d => d.locId === selectedAirport);
                    if (selectedData) {
                      selectedValue = selectedData.value;
                      selectedAirportName = `${selectedData.locId} - ${selectedData.name}`;
                    }
                  }

                  // Create histogram bins (12 bins)
                  const numBins = 12;
                  const binSize = (max - min) / numBins;

                  const bins = Array.from({ length: numBins }, (_, i) => {
                    const binMin = min + (i * binSize);
                    const binMax = i === numBins - 1 ? max : min + ((i + 1) * binSize);
                    const binCenter = (binMin + binMax) / 2;

                    // Count airports in this bin
                    const count = currentYearData.filter(d =>
                      d.value >= binMin && (i === numBins - 1 ? d.value <= binMax : d.value < binMax)
                    ).length;

                    // Use gradient from low (yellow) to high (purple) based on bin position
                    const viridisColors = [
                      '#fde725', // 0-10% - yellow (lowest)
                      '#b5de2b', // 10-20% - lime
                      '#6ece58', // 20-30% - light green
                      '#35b779', // 30-40% - green
                      '#1f9e89', // 40-50% - teal
                      '#26828e', // 50-60% - dark teal
                      '#31688e', // 60-70% - blue
                      '#3e4989', // 70-80% - dark blue
                      '#482878', // 80-90% - violet
                      '#440154', // 90-100% - purple (highest)
                    ];

                    // Map bin index to color (0 = lowest values, numBins-1 = highest values)
                    const colorIndex = Math.min(Math.floor((i / numBins) * viridisColors.length), viridisColors.length - 1);
                    const color = viridisColors[colorIndex];

                    return {
                      range: i === 0 ? `${formatShortValue(binMin)}` : `${formatShortValue(binMin)} - ${formatShortValue(binMax)}`,
                      rangeLabel: formatShortValue(binCenter),
                      count,
                      binMin,
                      binMax,
                      binCenter,
                      color,
                    };
                  });

                  function formatShortValue(value: number): string {
                    if (selectedMetric === 'operatingMargin') return `${(value * 100).toFixed(0)}%`;
                    if (selectedMetric.includes('%')) return `${value.toFixed(0)}%`;
                    if (selectedMetric.includes('Rev') || selectedMetric.includes('Cash') || selectedMetric.includes('CPE')) {
                      return value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : `$${(value / 1000).toFixed(0)}K`;
                    }
                    return value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : formatNumber(value);
                  }

                  const formatValue = (value: number) => {
                    if (selectedMetric === 'operatingMargin') return `${(value * 100).toFixed(1)}%`;
                    if (selectedMetric.includes('%')) return `${value.toFixed(1)}%`;
                    if (selectedMetric.includes('Rev') || selectedMetric.includes('Cash') || selectedMetric.includes('CPE')) {
                      return formatCurrency(value);
                    }
                    return formatNumber(value);
                  };

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      {/* Histogram */}
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={bins} margin={{ top: 20, right: 30, left: 60, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                          <XAxis
                            dataKey="rangeLabel"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tick={{ fill: theme.palette.text.primary, fontSize: 13 }}
                          />
                          <YAxis
                            tick={{ fill: theme.palette.text.primary }}
                            label={{ value: 'Airports', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: 4,
                            }}
                            formatter={(value: any) => [value, 'Airports']}
                            labelFormatter={(label, payload) => {
                              if (payload && payload.length > 0) {
                                return `Range: ${payload[0].payload.range}`;
                              }
                              return label;
                            }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {bins.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>

                          {/* Reference lines - group by bin to avoid overlaps */}
                          {(() => {
                            // Calculate average
                            const average = values.reduce((sum, val) => sum + val, 0) / values.length;
                            const averageBin = bins.find(b => average >= b.binMin && average <= b.binMax);

                            // Calculate percentiles
                            const percentileLabels: Record<number, string> = {
                              10: '10th',
                              25: 'Q1',
                              50: 'Median',
                              75: 'Q3',
                              90: '90th'
                            };

                            const percentileData = selectedPercentiles.map(percentile => {
                              const percentileValue = values[Math.floor(values.length * (percentile / 100))];
                              const percentileBin = bins.find(b => percentileValue >= b.binMin && percentileValue <= b.binMax);
                              return {
                                percentile,
                                label: percentileLabels[percentile] || `${percentile}th`,
                                bin: percentileBin,
                                isSelected: false
                              };
                            }).filter(p => p.bin);

                            // Add selected airport if present
                            const selectedBin = selectedValue !== null ? bins.find(b => selectedValue >= b.binMin && selectedValue <= b.binMax) : null;

                            // Add average to the list
                            const allLines = [
                              ...(averageBin ? [{ percentile: 'avg', label: 'Average', bin: averageBin, isSelected: false }] : []),
                              ...percentileData,
                              ...(selectedBin ? [{ percentile: 'selected', label: 'Selected', bin: selectedBin, isSelected: true }] : [])
                            ];

                            // Group by bin, separating selected from others
                            const groupedByBin = allLines.reduce((acc, line) => {
                              const key = line.bin!.rangeLabel;
                              if (!acc[key]) acc[key] = { selected: [], others: [] };
                              if (line.isSelected) {
                                acc[key].selected.push(line.label);
                              } else {
                                acc[key].others.push(line.label);
                              }
                              return acc;
                            }, {} as Record<string, { selected: string[], others: string[] }>);

                            // Render lines with combined labels, adjusting position to avoid overlap
                            const sortedBins = Object.entries(groupedByBin).sort(([a], [b]) => {
                              const binA = bins.find(bin => bin.rangeLabel === a);
                              const binB = bins.find(bin => bin.rangeLabel === b);
                              return (binA?.binMin || 0) - (binB?.binMin || 0);
                            });

                            // Track label positions to detect overlaps
                            const labelPositions: Array<{ binIndex: number; text: string; offset: number; width: number }> = [];

                            return sortedBins.map(([binLabel, data], index) => {
                              const hasSelected = data.selected.length > 0;
                              const hasOthers = data.others.length > 0;

                              // Combine all labels
                              const allLabels = [...data.selected, ...data.others];
                              const labelText = allLabels.join(' / ');

                              // Estimate label width (roughly 5px per character at 13px font)
                              const labelWidth = labelText.length * 5;
                              const currBinIndex = bins.findIndex(b => b.rangeLabel === binLabel);

                              // Calculate horizontal offset to avoid overlap with previous labels
                              let xOffset = 0;

                              // Check for overlap with all previous labels
                              for (const prevLabel of labelPositions) {
                                const binDistance = Math.abs(currBinIndex - prevLabel.binIndex);
                                const pixelDistance = binDistance * 40; // Approximate: each bin is ~40px wide
                                const halfWidthSum = (labelWidth + prevLabel.width) / 2;

                                // If labels would overlap (their combined half-widths exceed the distance)
                                if (pixelDistance < halfWidthSum) {
                                  const overlapAmount = halfWidthSum - pixelDistance;
                                  // Determine shift direction based on which side has more space
                                  if (currBinIndex < bins.length / 2) {
                                    // Left side of chart - shift right
                                    xOffset = Math.max(xOffset, overlapAmount);
                                  } else {
                                    // Right side of chart - shift left
                                    xOffset = Math.min(xOffset, -overlapAmount);
                                  }
                                }
                              }

                              // Store this label's position
                              labelPositions.push({ binIndex: currBinIndex, text: labelText, offset: xOffset, width: labelWidth });

                              return (
                                <ReferenceLine
                                  key={binLabel}
                                  x={binLabel}
                                  stroke={hasSelected ? theme.palette.warning.main : "#9E9E9E"}
                                  strokeWidth={hasSelected ? 3 : 1.5}
                                  strokeDasharray={hasSelected ? "5 5" : "3 3"}
                                >
                                  <Label
                                    value={labelText}
                                    position="top"
                                    dx={xOffset}
                                    fill={hasSelected ? theme.palette.warning.main : "#757575"}
                                    fontSize={13}
                                    fontWeight={hasSelected ? 600 : 500}
                                  />
                                </ReferenceLine>
                              );
                            });
                          })()}
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Legend - Gradient from Low to High */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, px: 2 }}>
                        <Typography variant="caption" color="textSecondary">Low</Typography>
                        <Box sx={{
                          width: 200,
                          height: 12,
                          background: 'linear-gradient(to right, #fde725, #b5de2b, #35b779, #31688e, #440154)',
                          borderRadius: 1
                        }} />
                        <Typography variant="caption" color="textSecondary">High</Typography>
                      </Box>

                      {/* Selected airport info */}
                      {selectedValue !== null && (
                        <Box sx={{ textAlign: 'center', px: 2, mt: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                            {selectedAirportName}: {formatValue(selectedValue)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {values.length} airports
                          </Typography>
                        </Box>
                      )}
                      {!selectedValue && (
                        <Box sx={{ textAlign: 'center', px: 2, mt: 2 }}>
                          <Typography variant="caption" color="textSecondary">
                            {values.length} airports • Select an airport to see its position in the distribution
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })()}
                    </>
                  );
                })()}
              </Box>
            </Paper>
          </Box>
        )}

        {selectedTab === 2 && (
          <Box>
            {/* Tab Controls - Placeholder for visual consistency */}
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 3 }}>
              <Typography variant="body1" color="textSecondary">
                Interactive bubble chart analysis with chart controls available within the interface below.
                Each bubble represents an airport positioned by key performance metrics.
              </Typography>
            </Box>

            <BubbleChart
              data={hubFilteredData}
              title="Airport Performance Matrix"
              height={600}
            />
          </Box>
        )}
      </Paper>

    </Box>
  );
};

export default ExecutiveIntelligence;