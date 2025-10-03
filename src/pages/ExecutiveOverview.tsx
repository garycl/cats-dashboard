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
} from '@mui/icons-material';
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

const ExecutiveOverview: React.FC = () => {
  const theme = useTheme();
  const { data, loading, filteredData, selectedYears, setSelectedYears, getAvailableYears } = useData();

  const [selectedMetric, setSelectedMetric] = React.useState<string>('totalOperatingRevenue');
  const [selectedHubSize, setSelectedHubSize] = React.useState<string>('All');
  const [selectedTab, setSelectedTab] = React.useState<number>(0);
  const [showGrowthRate, setShowGrowthRate] = React.useState<boolean>(false);
  const [showBenchmark, setShowBenchmark] = React.useState<boolean>(true);

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

  // Filter data based on hub size selection
  const hubFilteredData = React.useMemo(() => {
    if (selectedHubSize === 'All') {
      return filteredData;
    }
    return filteredData.filter(d => d.hubSize === selectedHubSize);
  }, [filteredData, selectedHubSize]);


  // Executive Summary Logic (from ExecutiveDashboard)
  const executiveSummary = React.useMemo(() => {
    if (filteredData.length === 0) return null;

    const currentData = filteredData.filter(d => d.fiscalYear === currentYear);
    const previousData = data.filter(d => d.fiscalYear === previousYear);

    const totalRevenue = currentData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0);
    const totalExpenses = currentData.reduce((sum, d) => sum + (d.totalOperatingExpenses || 0), 0);
    const totalPassengers = currentData.reduce((sum, d) => sum + (d.enplanements || 0), 0);
    const totalDebt = currentData.reduce((sum, d) => sum + (d.totalDebt || 0), 0);
    const totalCash = currentData.reduce((sum, d) => sum + (d.unrestrictedCashAndInvestments || 0), 0);

    const prevTotalRevenue = previousData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0);
    const prevTotalPassengers = previousData.reduce((sum, d) => sum + (d.enplanements || 0), 0);

    const revenueGrowth = prevTotalRevenue ? (totalRevenue - prevTotalRevenue) / prevTotalRevenue : 0;
    const passengerGrowth = prevTotalPassengers ? (totalPassengers - prevTotalPassengers) / prevTotalPassengers : 0;

    const avgMargin = (totalRevenue - totalExpenses) / totalRevenue;
    const cashToDebtRatio = totalDebt ? totalCash / totalDebt : 0;

    const profitableAirports = currentData.filter(d => (d.operatingMargin || 0) > 0).length;
    const totalAirports = currentData.length;

    return {
      totalRevenue,
      totalExpenses,
      totalPassengers,
      totalDebt,
      totalCash,
      revenueGrowth,
      passengerGrowth,
      avgMargin,
      cashToDebtRatio,
      profitableAirports,
      totalAirports,
      netIncome: totalRevenue - totalExpenses,
    };
  }, [filteredData, currentYear, previousYear, selectedYears, data]);

  // Industry KPIs Logic (from Overview)
  const industryKPIs = React.useMemo(() => {
    if (filteredData.length === 0) return null;

    // Filter by hub size first, then by year (don't use hubFilteredData as it's already filtered by selectedYears)
    const hubSizeFilteredData = selectedHubSize === 'All' ? filteredData : filteredData.filter(d => d.hubSize === selectedHubSize);

    const currentData = hubSizeFilteredData.filter(d => d.fiscalYear === currentYear);
    // Use raw data for previous year, then apply hub size filter
    const previousDataRaw = data.filter(d => d.fiscalYear === previousYear);
    const previousData = selectedHubSize === 'All' ? previousDataRaw : previousDataRaw.filter(d => d.hubSize === selectedHubSize);


    const currentRevenue = currentData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0);
    const previousRevenue = previousData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0);

    const currentPassengers = currentData.reduce((sum, d) => sum + (d.enplanements || 0), 0);
    const previousPassengers = previousData.reduce((sum, d) => sum + (d.enplanements || 0), 0);

    const currentOperations = currentData.reduce((sum, d) => sum + (d.annualAircraftOperations || 0), 0);
    const previousOperations = previousData.reduce((sum, d) => sum + (d.annualAircraftOperations || 0), 0);

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
  }, [filteredData, selectedHubSize, currentYear, previousYear, selectedYears, data]);

  const topPerformers = React.useMemo(() => {
    if (hubFilteredData.length === 0) return [];

    if (showGrowthRate) {
      // Calculate growth rates between current and previous year
      // Use raw data to access all years, then apply hub size filter
      const latestYear = Math.max(...data.map(a => a.fiscalYear));
      const previousYear = latestYear - 1;

      // Get current year data from hubFilteredData (already filtered by hub size and enplanements > 0)
      const currentYearData = hubFilteredData.filter(d => d.fiscalYear === latestYear && d[selectedMetric] > 0);

      // Get previous year data from raw data, then apply hub size filter and metric filter
      const previousYearDataRaw = data.filter(d => d.fiscalYear === previousYear && d[selectedMetric] > 0);
      const previousYearData = selectedHubSize === 'All'
        ? previousYearDataRaw
        : previousYearDataRaw.filter(d => d.hubSize === selectedHubSize);

      const airportsWithGrowth = currentYearData
        .map(current => {
          const previous = previousYearData.find(p => p.locId === current.locId);
          if (!previous) return null;

          const currentValue = current[selectedMetric as keyof AirportData] as number;
          const previousValue = previous[selectedMetric as keyof AirportData] as number;

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
        .sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0))
        .slice(0, 10);

      return airportsWithGrowth;
    } else {
      // Get unique airports by LocID, taking the one with highest metric value
      const uniqueAirports = hubFilteredData
        .filter(d => selectedYears.includes(d.fiscalYear) && d[selectedMetric] > 0)
        .reduce((acc, current) => {
          const existing = acc.find(airport => airport.locId === current.locId);
          if (!existing || (current[selectedMetric] || 0) > (existing[selectedMetric] || 0)) {
            acc = acc.filter(airport => airport.locId !== current.locId);
            acc.push({
              ...current,
              displayValue: current[selectedMetric] || 0
            });
          }
          return acc;
        }, [] as any[]);

      return uniqueAirports
        .sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0))
        .slice(0, 10);
    }
  }, [hubFilteredData, selectedMetric, selectedYears, showGrowthRate, currentYear, previousYear, data, selectedHubSize]);

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

  const handleHubSizeChange = (event: SelectChangeEvent<string>) => {
    setSelectedHubSize(event.target.value);
  };

  // Map ExecutiveOverview metrics to AirportMap metrics

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
      formatter: formatNumber,
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
          Loading Executive Overview...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, pl: 3, pr: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Executive Overview
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Comprehensive analysis and strategic insights for US airport financial performance
        </Typography>
      </Box>



      {/* Filters and Performance Analysis Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          Analysis Controls
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYears[0] || currentYear}
                onChange={handleYearChange}
                label="Year"
                disabled={selectedTab === 1 && showGrowthRate}
              >
                {availableYears
                  .filter(year => !showGrowthRate || year !== Math.min(...availableYears))
                  .map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Hub Size</InputLabel>
              <Select
                value={selectedHubSize}
                onChange={handleHubSizeChange}
                label="Hub Size"
              >
                <MenuItem value="All">All Hub Sizes</MenuItem>
                <MenuItem value="L">Large Hubs</MenuItem>
                <MenuItem value="M">Medium Hubs</MenuItem>
                <MenuItem value="S">Small Hubs</MenuItem>
                <MenuItem value="N">Non-Hub</MenuItem>
              </Select>
            </FormControl>
          </Grid>


        </Grid>
      </Paper>

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
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedTab} onChange={handleTabChange} aria-label="performance analysis tabs">
            <Tab label="📊 Geographic Map" />
            <Tab label="🏆 Top Performers" />
            <Tab label="🔍 Performance Matrix" />
          </Tabs>
        </Box>

        {selectedTab === 0 && (
          <Box>
            {/* Tab Controls */}
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 3 }}>
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Performance Metric</InputLabel>
                <Select
                  value={selectedMetric}
                  onChange={handleMetricChange}
                  label="Performance Metric"
                  size="small"
                >
                  <MenuItem value="totalOperatingRevenue">Total Operating Revenue</MenuItem>
                  <MenuItem value="enplanements">Enplanements</MenuItem>
                  <MenuItem value="annualAircraftOperations">Aircraft Operations</MenuItem>
                  <MenuItem value="operatingMargin">Operating Margin %</MenuItem>
                  <MenuItem value="costPerEnplanement">Cost Per Enplanement</MenuItem>
                  <MenuItem value="unrestrictedCashAndInvestments">Unrestricted Cash</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Interactive map showing airport performance across the United States.
              Click on airports to view detailed metrics. Markers are colored by performance relative to industry benchmarks.
            </Typography>

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
                  externalHubSizeFilter={selectedHubSize}
                  selectedYear={currentYear}
                  showBenchmark={showBenchmark}
                  onBenchmarkChange={setShowBenchmark}
                />
              </Suspense>
            </Box>
          </Box>
        )}

        {selectedTab === 1 && (
          <Box>
            {/* Tab Controls */}
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 3 }}>
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Performance Metric</InputLabel>
                <Select
                  value={selectedMetric}
                  onChange={handleMetricChange}
                  label="Performance Metric"
                  size="small"
                >
                  <MenuItem value="totalOperatingRevenue">Total Operating Revenue</MenuItem>
                  <MenuItem value="enplanements">Enplanements</MenuItem>
                  <MenuItem value="annualAircraftOperations">Aircraft Operations</MenuItem>
                  <MenuItem value="operatingMargin">Operating Margin %</MenuItem>
                  <MenuItem value="costPerEnplanement">Cost Per Enplanement</MenuItem>
                  <MenuItem value="unrestrictedCashAndInvestments">Unrestricted Cash</MenuItem>
                </Select>
              </FormControl>

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
                  </Typography>
                }
                sx={{ margin: 0 }}
              />
            </Box>

            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              {showGrowthRate
                ? `Top 10 airports with highest growth rates for ${getMetricLabel(selectedMetric)} (${previousYear} to ${currentYear}).`
                : `Top 10 performing airports based on ${getMetricLabel(selectedMetric)}.`}
              {' '}Rankings are calculated using the latest available data.
            </Typography>

            <Grid container spacing={3}>
              {topPerformers.length === 0 ? (
                <Grid item xs={12}>
                  <Typography variant="body1" color="textSecondary" sx={{ p: 3, textAlign: 'center' }}>
                    No airports found matching the current criteria. Try adjusting your filters or switching to absolute values.
                    <br/><br/>
                    Debug Info:
                    <br/>• topPerformers length = {topPerformers.length}
                    <br/>• hubFilteredData length = {hubFilteredData.length}
                    <br/>• showGrowthRate = {showGrowthRate.toString()}
                    <br/>• currentYear = {currentYear}
                    <br/>• previousYear = {previousYear}
                    <br/>• selectedMetric = {selectedMetric}
                    <br/>• availableYears = [{availableYears.join(', ')}]
                    <br/>• current year data = {hubFilteredData.filter(d => d.fiscalYear === currentYear && d[selectedMetric] > 0).length}
                    <br/>• previous year data = {(() => {
                      const previousYearDataRaw = data.filter(d => d.fiscalYear === previousYear && d[selectedMetric] > 0);
                      return selectedHubSize === 'All' ? previousYearDataRaw.length : previousYearDataRaw.filter(d => d.hubSize === selectedHubSize).length;
                    })()}
                  </Typography>
                </Grid>
              ) : (
                topPerformers.map((airport, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={2.4} key={airport.locId}>
                  <Card
                    sx={{
                      textAlign: 'center',
                      py: 2,
                      position: 'relative',
                      backgroundColor: index < 3 ? `${theme.palette.secondary.main}15` : 'white',
                    }}
                  >
                    <CardContent>
                      {index < 3 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: theme.palette.secondary.main,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {index + 1}
                        </Box>
                      )}

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

                      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                        {showGrowthRate
                          ? `${(airport.growthRate || 0) >= 0 ? '+' : ''}${(airport.growthRate || 0).toFixed(1)}%`
                          : selectedMetric.includes('%')
                            ? formatPercentage(airport[selectedMetric] || 0)
                            : selectedMetric.includes('Rev') || selectedMetric.includes('Cash') || selectedMetric.includes('CPE')
                              ? formatCurrency(airport[selectedMetric] || 0)
                              : formatNumber(airport[selectedMetric] || 0)}
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
                ))
              )}
            </Grid>
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

      {/* Strategic Insights */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
              Strategic Insights
            </Typography>

            <Grid container spacing={3}>
              {strategicInsights.map((insight, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.light, color: 'white', mr: 2, width: 32, height: 32 }}>
                        {index === 0 ? <Business fontSize="small" /> :
                         index === 1 ? <AccountBalance fontSize="small" /> :
                         <Assessment fontSize="small" />}
                      </Avatar>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {insight.title}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {insight.description}
                    </Typography>

                    <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.primary.main, fontSize: '0.85rem' }}>
                      {insight.recommendation}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Performance Summary */}
      <Box sx={{ mt: 4, textAlign: 'center', py: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Executive Summary
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 800, mx: 'auto' }}>
          The US airport industry demonstrates resilience with {industryKPIs?.airports || 0} reporting airports
          generating {formatCurrency(executiveSummary?.totalRevenue || 0)} in combined revenue.
          Strategic focus on operational efficiency, revenue diversification, and infrastructure investment
          will drive continued growth and competitive advantage in the global aviation market.
        </Typography>
      </Box>
    </Box>
  );
};

export default ExecutiveOverview;