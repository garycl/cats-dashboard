import React from 'react';
import {
  Box,
  Container,
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
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Flight,
  Business,
  Assessment,
  Speed,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { formatCurrency, formatNumber, formatPercentage, calculateYoYGrowth } from '../utils/formatters';
import CustomRadarChart from '../components/Charts/RadarChart';

const Overview: React.FC = () => {
  const theme = useTheme();
  const { data, loading, filteredData, selectedYears, setSelectedYears, getAvailableYears } = useData();

  const [selectedMetric, setSelectedMetric] = React.useState<string>('totalOperatingRevenue');
  const [selectedHubSize, setSelectedHubSize] = React.useState<string>('All');

  const availableYears = getAvailableYears();
  const currentYear = Math.max(...availableYears);
  const previousYear = availableYears.length > 1 ? availableYears[1] : currentYear - 1;

  // Filter data based on hub size selection
  const hubFilteredData = React.useMemo(() => {
    if (selectedHubSize === 'All') {
      return filteredData;
    }
    return filteredData.filter(d => d.hubSize === selectedHubSize);
  }, [filteredData, selectedHubSize]);


  const industryKPIs = React.useMemo(() => {
    if (data.length === 0) return null;

    // Use hub-filtered data for calculations
    const currentData = hubFilteredData.filter(d => d.fiscalYear === currentYear);
    const previousData = hubFilteredData.filter(d => d.fiscalYear === previousYear);

    const currentRevenue = currentData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0);
    const previousRevenue = previousData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0);

    const currentPassengers = currentData.reduce((sum, d) => sum + (d.enplanements || 0), 0);
    const previousPassengers = previousData.reduce((sum, d) => sum + (d.enplanements || 0), 0);

    const currentOperations = currentData.reduce((sum, d) => sum + (d.annualAircraftOperations || 0), 0);
    const previousOperations = previousData.reduce((sum, d) => sum + (d.annualAircraftOperations || 0), 0);

    const currentMargin = currentData.reduce((sum, d) => sum + (d.operatingMargin || 0), 0) / currentData.length;
    const previousMargin = previousData.reduce((sum, d) => sum + (d.operatingMargin || 0), 0) / previousData.length;

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
      airports: currentData.length,
    };
  }, [hubFilteredData, currentYear, previousYear]);

  const topPerformers = React.useMemo(() => {
    if (hubFilteredData.length === 0) return [];

    // Get unique airports by LocID, taking the one with highest metric value
    const uniqueAirports = hubFilteredData
      .filter(d => selectedYears.includes(d.fiscalYear) && d[selectedMetric] > 0)
      .reduce((acc, current) => {
        const existing = acc.find(airport => airport.locId === current.locId);
        if (!existing || (current[selectedMetric] || 0) > (existing[selectedMetric] || 0)) {
          acc = acc.filter(airport => airport.locId !== current.locId);
          acc.push(current);
        }
        return acc;
      }, [] as typeof hubFilteredData);

    return uniqueAirports
      .sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0))
      .slice(0, 10);
  }, [hubFilteredData, selectedMetric, selectedYears]);

  // Radar chart data for industry performance metrics
  const radarData = React.useMemo(() => {
    if (!industryKPIs || hubFilteredData.length === 0) return [];

    const currentData = hubFilteredData.filter(d => selectedYears.includes(d.fiscalYear));
    if (currentData.length === 0) return [];

    // Calculate normalized scores (0-100) for different metrics
    const avgRevenue = currentData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0) / currentData.length;
    const avgMargin = currentData.reduce((sum, d) => sum + (d.operatingMargin || 0), 0) / currentData.length;
    const avgPassengers = currentData.reduce((sum, d) => sum + (d.enplanements || 0), 0) / currentData.length;
    const avgOperations = currentData.reduce((sum, d) => sum + (d.annualAircraftOperations || 0), 0) / currentData.length;
    const avgCash = currentData.reduce((sum, d) => sum + (d.unrestrictedCashAndInvestments || 0), 0) / currentData.length;

    // Normalize to 0-100 scale (using industry benchmarks)
    return [
      {
        metric: 'Revenue Growth',
        score: Math.min(100, Math.max(0, (industryKPIs.revenue.growth + 0.2) * 250)) // -20% to +20% maps to 0-100
      },
      {
        metric: 'Profitability',
        score: Math.min(100, Math.max(0, avgMargin * 500)) // 0-20% margin maps to 0-100
      },
      {
        metric: 'Passenger Volume',
        score: Math.min(100, (avgPassengers / 50000000) * 100) // Up to 50M passengers = 100
      },
      {
        metric: 'Operational Efficiency',
        score: Math.min(100, Math.max(0, (industryKPIs.operations.growth + 0.3) * 166)) // -30% to +30% maps to 0-100
      },
      {
        metric: 'Financial Strength',
        score: Math.min(100, (avgCash / 1000000000) * 100) // Up to $1B cash = 100
      },
      {
        metric: 'Market Position',
        score: Math.min(100, (avgPassengers / 10000000) * 100) // Up to 10M passengers = 100
      }
    ];
  }, [industryKPIs, hubFilteredData, selectedYears]);

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
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading Industry Overview...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Industry Overview
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Comprehensive analysis of US airport financial performance and operational metrics
        </Typography>
      </Box>

      {/* Filters - Single Year & Hub Size */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYears[0] || currentYear}
                onChange={handleYearChange}
                label="Year"
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Hub Size</InputLabel>
              <Select
                value={selectedHubSize}
                onChange={handleHubSizeChange}
                label="Hub Size"
              >
                <MenuItem value="All">All Hub Sizes</MenuItem>
                <MenuItem value="L">Large Hubs (L)</MenuItem>
                <MenuItem value="M">Medium Hubs (M)</MenuItem>
                <MenuItem value="S">Small Hubs (S)</MenuItem>
                <MenuItem value="N">Non-Hub (N)</MenuItem>
              </Select>
            </FormControl>
          </Grid>


          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: { xs: 'left', md: 'right' }, pt: 1 }}>
              <Typography variant="body2" color="textSecondary">
                {selectedHubSize === 'All' ? 'All Hub Sizes' :
                 selectedHubSize === 'N' ? 'Non-Hub Only' : `${selectedHubSize} Hubs Only`}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {industryKPIs?.airports || 0} Airports Reporting
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Dashboard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((kpi, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
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

      {/* Analytics Section */}
      <Grid container spacing={4}>
        {/* Performance Rankings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Top 10 Performers
              </Typography>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Metric</InputLabel>
                <Select
                  value={selectedMetric}
                  onChange={handleMetricChange}
                  label="Metric"
                  size="small"
                >
                  <MenuItem value="totalOperatingRevenue">Total Operating Revenue</MenuItem>
                  <MenuItem value="enplanements">Enplanements</MenuItem>
                  <MenuItem value="annualAircraftOperations">Aircraft Operations</MenuItem>
                  <MenuItem value="operatingMargin">Operating Margin (%)</MenuItem>
                  <MenuItem value="costPerEnplanement">Cost Per Enplanement</MenuItem>
                  <MenuItem value="unrestrictedCashAndInvestments">Unrestricted Cash</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Grid container spacing={2}>
              {topPerformers.map((airport, index) => (
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
                        {selectedMetric === 'operatingMargin'
                          ? formatPercentage(airport[selectedMetric] || 0)
                          : selectedMetric === 'totalOperatingRevenue' || selectedMetric === 'unrestrictedCashAndInvestments' || selectedMetric === 'costPerEnplanement'
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
              ))}
            </Grid>
          </Paper>
        </Grid>

      </Grid>

      {/* Performance Summary */}
      <Box sx={{ mt: 4, textAlign: 'center', py: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Analytics Summary
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 800, mx: 'auto' }}>
          The US airport industry shows strong performance indicators with comprehensive coverage across
          {' '}{industryKPIs?.airports || 0} reporting airports. Year-over-year growth metrics indicate
          strategic opportunities for operational excellence and financial optimization.
        </Typography>
      </Box>
    </Container>
  );
};

export default Overview;