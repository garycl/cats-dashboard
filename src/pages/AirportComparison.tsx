import React from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  Compare,
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  calculateGrowth,
  calculatePercentage,
  calculateGrowthPercentage
} from '../utils/formatters';
import CustomRadarChart from '../components/Charts/RadarChart';
import SankeyChart from '../components/Charts/SankeyChart';

const AirportComparison: React.FC = () => {
  const theme = useTheme();
  const { data, loading, getLatestYear, getAvailableYears, filteredData, selectedYears, setSelectedYears } = useData();

  const [primaryAirport, setPrimaryAirport] = React.useState<string>('ATL');
  const [comparisonAirports, setComparisonAirports] = React.useState<string[]>(['LAX']);
  const [useHubSpecificBenchmark, setUseHubSpecificBenchmark] = React.useState<boolean>(true);
  const [useGrowthRates, setUseGrowthRates] = React.useState<boolean>(false);
  const [excludeNonHub, setExcludeNonHub] = React.useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] = React.useState<string>('totalOperatingRevenue');

  // Use the current year from context
  const selectedYear = selectedYears.length > 0 ? selectedYears[0] : getLatestYear();

  const availableYears = React.useMemo(() => {
    return getAvailableYears();
  }, [getAvailableYears]);
  const availableAirports = React.useMemo(() => {
    return Array.from(new Set(filteredData.map(d => d.locId)))
      .map(locID => {
        const airport = filteredData.find(d => d.locId === locID);
        return {
          locID,
          name: airport?.airportName || '',
          state: airport?.state || '',
        };
      })
      .sort((a, b) => a.locID.localeCompare(b.locID));
  }, [filteredData]);

  const comparisonData = React.useMemo(() => {
    const airports = [primaryAirport, ...comparisonAirports].filter(Boolean);
    return airports.map(locID => {
      const currentData = filteredData.find(d => d.locId === locID && d.fiscalYear === selectedYear);
      const previousData = data.find(d => d.locId === locID && d.fiscalYear === selectedYear - 1);

      return {
        locID,
        name: currentData?.airportName || '',
        state: currentData?.state || '',
        hubSize: currentData?.hubSize || '',
        current: currentData,
        previous: previousData,
      };
    });
  }, [filteredData, data, primaryAirport, comparisonAirports, selectedYear]);

  const handleMetricChange = (event: SelectChangeEvent) => {
    setSelectedMetric(event.target.value);
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return theme.palette.success.main;
    if (growth < 0) return theme.palette.error.main;
    return theme.palette.text.secondary;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp />;
    if (growth < 0) return <TrendingDown />;
    return <Remove />;
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

      case 'cost_per_day':
        return (airport.totalOperatingExpenses || 0) / 365;

      case 'op_cost_per_day_per_fte':
        const costPerDay = (airport.totalOperatingExpenses || 0) / 365;
        return airport.fullTimeEquivalentEmployees > 0 ? costPerDay / airport.fullTimeEquivalentEmployees : 0;

      case 'op_cost_per_fte':
        return airport.fullTimeEquivalentEmployees > 0 ? (airport.totalOperatingExpenses || 0) / airport.fullTimeEquivalentEmployees : 0;

      default:
        return 0;
    }
  };

  const handlePrimaryAirportChange = (event: SelectChangeEvent<string>) => {
    setPrimaryAirport(event.target.value);
  };

  const handleComparisonAirportsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setComparisonAirports(typeof value === 'string' ? value.split(',') : value);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYears([event.target.value as number]);
  };

  // Auto-adjust selected year if it's not available for the new primary airport
  React.useEffect(() => {
    if (primaryAirport && availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYears([availableYears[0]]); // Set to the most recent available year
    }
  }, [primaryAirport, availableYears, selectedYear, setSelectedYears]);

  // Auto-adjust year when Growth Focus is enabled/disabled
  React.useEffect(() => {
    if (availableYears.length > 1) {
      const firstYear = Math.min(...availableYears);
      const secondYear = [...availableYears].sort((a, b) => a - b)[1]; // Second earliest year (use copy to avoid mutation)

      // If Growth Focus is enabled and we're on the first year, switch to second year
      if (useGrowthRates && selectedYear === firstYear) {
        setSelectedYears([secondYear]);
      }
    }
  }, [useGrowthRates, selectedYear, availableYears, setSelectedYears]);



  const comparisonMetrics = [
    // Operations & Volume
    {
      key: 'enplanements',
      label: 'Enplanements',
      formatter: formatNumber,
      theme: 'Operations & Volume',
      themeColor: '#1976d2' // Blue
    },

    // Cost Efficiency
    {
      key: 'costPerEnplanement',
      label: 'Cost Per Enplanement',
      formatter: formatCurrency,
      theme: 'Cost Efficiency',
      themeColor: '#d32f2f' // Red
    },

    // Revenue Performance
    {
      key: 'passengerAirlineLandingFees',
      label: 'Landing Fees',
      formatter: formatCurrency,
      isDirectField: true,
      theme: 'Revenue Performance',
      themeColor: '#2e7d32' // Green
    },
    {
      key: 'aero_rev_per_enpl',
      label: 'Aeronautical Revenue Per Enplanement',
      formatter: formatCurrency,
      isCalculated: true,
      theme: 'Revenue Performance',
      themeColor: '#2e7d32'
    },
    {
      key: 'nonaero_per_enpl',
      label: 'Non-Aeronautical Revenue Per Enplanement',
      formatter: formatCurrency,
      isCalculated: true,
      theme: 'Revenue Performance',
      themeColor: '#2e7d32'
    },
    {
      key: 'op_rev_per_enpl',
      label: 'Total Operating Revenue Per Enplanement',
      formatter: formatCurrency,
      isCalculated: true,
      theme: 'Revenue Performance',
      themeColor: '#2e7d32'
    },

    // Staffing & Operations
    {
      key: 'fullTimeEquivalentEmployees',
      label: 'Full-Time Equivalent Employees',
      formatter: formatNumber,
      theme: 'Staffing & Operations',
      themeColor: '#7b1fa2' // Purple
    },

    // Financial Health
    {
      key: 'days_cash_on_hand',
      label: 'Days Cash on Hand',
      formatter: formatNumber,
      isCalculated: true,
      theme: 'Financial Health',
      themeColor: '#f57c00' // Orange
    },
    {
      key: 'lt_debt_per_enpl',
      label: 'Long-Term Debt Per Enplanement',
      formatter: formatCurrency,
      isCalculated: true,
      theme: 'Financial Health',
      themeColor: '#f57c00'
    },
  ];

  // Airport performance radar data with hub-specific percentage comparisons
  const radarComparisonData = React.useMemo(() => {
    if (filteredData.length === 0) return [];

    const allAirports = [primaryAirport, ...comparisonAirports].filter(Boolean);
    if (allAirports.length === 0) return [];

    // Calculate metrics for each airport as percentage of their hub-specific average
    const airportMetrics = allAirports.map(airportCode => {
      const airportData = filteredData.find(d => d.locId === airportCode && d.fiscalYear === selectedYear);
      const airportPrevData = data.find(d => d.locId === airportCode && d.fiscalYear === selectedYear - 1);

      if (!airportData) return null;

      // Get industry data - either hub-specific or overall, with optional non-hub exclusion
      const airportHubSize = airportData.hubSize;
      const baseFilter = useHubSpecificBenchmark
        ? (d: any) => d.fiscalYear === selectedYear && d.hubSize === airportHubSize
        : (d: any) => d.fiscalYear === selectedYear;
      const prevBaseFilter = useHubSpecificBenchmark
        ? (d: any) => d.fiscalYear === selectedYear - 1 && d.hubSize === airportHubSize
        : (d: any) => d.fiscalYear === selectedYear - 1;

      const industryData = filteredData.filter(d =>
        baseFilter(d) && (!excludeNonHub || d.hubSize !== 'N')
      );
      const prevIndustryData = data.filter(d =>
        prevBaseFilter(d) && (!excludeNonHub || d.hubSize !== 'N')
      );

      if (industryData.length === 0) return null;

      // Calculate industry averages (hub-specific or overall)
      const avgRevenue = industryData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0) / industryData.length;
      const avgMargin = industryData.reduce((sum, d) => sum + (d.operatingMargin || 0), 0) / industryData.length;
      const avgPassengers = industryData.reduce((sum, d) => sum + (d.enplanements || 0), 0) / industryData.length;
      const avgOperations = industryData.reduce((sum, d) => sum + (d.annualAircraftOperations || 0), 0) / industryData.length;
      const avgCash = industryData.reduce((sum, d) => sum + (d.unrestrictedCashAndInvestments || 0), 0) / industryData.length;

      // Debug logging for first airport
      if (airportCode === allAirports[0]) {
        console.log('Industry averages:', {
          avgRevenue,
          avgMargin,
          avgPassengers,
          avgOperations,
          avgCash,
          industryDataLength: industryData.length,
          prevIndustryDataLength: prevIndustryData.length
        });
      }

      // Calculate growth rates
      const prevRevenue = prevIndustryData.reduce((sum, d) => sum + (d.totalOperatingRevenue || 0), 0) / Math.max(prevIndustryData.length, 1);
      const prevOperations = prevIndustryData.reduce((sum, d) => sum + (d.annualAircraftOperations || 0), 0) / Math.max(prevIndustryData.length, 1);

      const industryRevenueGrowth = (avgRevenue - prevRevenue) / Math.max(prevRevenue, 1);
      const industryOperationsGrowth = (avgOperations - prevOperations) / Math.max(prevOperations, 1);

      const airportRevenueGrowth = airportPrevData ?
        (airportData.totalOperatingRevenue - airportPrevData.totalOperatingRevenue) / Math.max(airportPrevData.totalOperatingRevenue, 1) : 0;
      const airportOperationsGrowth = airportPrevData ?
        (airportData.annualAircraftOperations - airportPrevData.annualAircraftOperations) / Math.max(airportPrevData.annualAircraftOperations, 1) : 0;

      // Calculate percentages relative to hub-specific industry averages

      return {
        airport: airportCode,
        hubSize: airportHubSize,
        data: useGrowthRates ? [
          // Growth-focused metrics
          {
            metric: 'Revenue Growth',
            [airportCode]: calculateGrowthPercentage(airportRevenueGrowth, industryRevenueGrowth)
          },
          {
            metric: 'Operations Growth',
            [airportCode]: calculateGrowthPercentage(airportOperationsGrowth, industryOperationsGrowth)
          },
          {
            metric: 'Passenger Growth',
            [airportCode]: airportPrevData ? calculateGrowthPercentage(
              (airportData.enplanements - airportPrevData.enplanements) / Math.max(airportPrevData.enplanements, 1),
              (avgPassengers - (prevIndustryData.reduce((sum, d) => sum + (d.enplanements || 0), 0) / Math.max(prevIndustryData.length, 1))) / Math.max((prevIndustryData.reduce((sum, d) => sum + (d.enplanements || 0), 0) / Math.max(prevIndustryData.length, 1)), 1)
            ) : 100
          },
          {
            metric: 'Profitability Trend',
            [airportCode]: airportPrevData ? calculateGrowthPercentage(
              (airportData.operatingMargin - airportPrevData.operatingMargin),
              (avgMargin - (prevIndustryData.reduce((sum, d) => sum + (d.operatingMargin || 0), 0) / Math.max(prevIndustryData.length, 1)))
            ) : 100
          },
          {
            metric: 'Cash Growth',
            [airportCode]: airportPrevData ? calculateGrowthPercentage(
              (airportData.unrestrictedCashAndInvestments - airportPrevData.unrestrictedCashAndInvestments) / Math.max(airportPrevData.unrestrictedCashAndInvestments, 1),
              (avgCash - (prevIndustryData.reduce((sum, d) => sum + (d.unrestrictedCashAndInvestments || 0), 0) / Math.max(prevIndustryData.length, 1))) / Math.max((prevIndustryData.reduce((sum, d) => sum + (d.unrestrictedCashAndInvestments || 0), 0) / Math.max(prevIndustryData.length, 1)), 1)
            ) : 100
          },
          {
            metric: 'Overall Momentum',
            [airportCode]: (
              calculateGrowthPercentage(airportRevenueGrowth, industryRevenueGrowth) +
              calculateGrowthPercentage(airportOperationsGrowth, industryOperationsGrowth) +
              (airportPrevData ? calculateGrowthPercentage(
                (airportData.enplanements - airportPrevData.enplanements) / Math.max(airportPrevData.enplanements, 1),
                (avgPassengers - (prevIndustryData.reduce((sum, d) => sum + (d.enplanements || 0), 0) / Math.max(prevIndustryData.length, 1))) / Math.max((prevIndustryData.reduce((sum, d) => sum + (d.enplanements || 0), 0) / Math.max(prevIndustryData.length, 1)), 1)
              ) : 100)
            ) / 3
          }
        ] : [
          // Performance benchmark metrics - all standardized so higher = better
          {
            metric: 'Revenue/Pax',
            [airportCode]: (() => {
              const avgRevPerEnpl = industryData.reduce((sum, d) => {
                const revPerEnpl = (d.totalOperatingRevenue || 0) / Math.max(d.enplanements || 0, 1);
                return sum + revPerEnpl;
              }, 0) / industryData.length;
              const airportRevPerEnpl = (airportData.totalOperatingRevenue || 0) / Math.max(airportData.enplanements || 0, 1);
              return avgRevPerEnpl > 0 ? calculatePercentage(airportRevPerEnpl, avgRevPerEnpl) : 100;
            })()
          },
          {
            metric: 'Landing Fees',
            [airportCode]: (() => {
              const avgLandingFees = industryData.reduce((sum, d) => sum + (d.signatoryLandingFeeRatePer1000Lbs || 0), 0) / industryData.length;
              return avgLandingFees > 0 ? calculatePercentage(airportData.signatoryLandingFeeRatePer1000Lbs || 0, avgLandingFees) : 100;
            })()
          },
          {
            metric: 'Op Margin',
            [airportCode]: (() => {
              const avgMargin = industryData.reduce((sum, d) => sum + (d.operatingMargin || 0), 0) / industryData.length;
              return avgMargin > 0 ? calculatePercentage(airportData.operatingMargin || 0, avgMargin) : 100;
            })()
          },
          {
            metric: 'Cash/Debt',
            [airportCode]: (() => {
              const avgCashToDebt = industryData.reduce((sum, d) => {
                const cashToDebt = (d.longTermDebt || 0) > 0 ?
                  (d.unrestrictedCashAndInvestments || 0) / (d.longTermDebt || 0) : 0;
                return sum + cashToDebt;
              }, 0) / industryData.length;
              const airportCashToDebt = (airportData.longTermDebt || 0) > 0 ?
                (airportData.unrestrictedCashAndInvestments || 0) / (airportData.longTermDebt || 0) : 0;
              return avgCashToDebt > 0 ? calculatePercentage(airportCashToDebt, avgCashToDebt) : 100;
            })()
          },
          {
            metric: 'Revenue/FTE',
            [airportCode]: (() => {
              const avgRevPerFTE = industryData.reduce((sum, d) => {
                const revPerFTE = (d.totalOperatingRevenue || 0) / Math.max(d.fullTimeEquivalentEmployees || 0, 1);
                return sum + revPerFTE;
              }, 0) / industryData.length;
              const airportRevPerFTE = (airportData.totalOperatingRevenue || 0) / Math.max(airportData.fullTimeEquivalentEmployees || 0, 1);
              return avgRevPerFTE > 0 ? calculatePercentage(airportRevPerFTE, avgRevPerFTE) : 100;
            })()
          },
          {
            metric: 'Days Cash',
            [airportCode]: (() => {
              const avgDaysCash = industryData.reduce((sum, d) => {
                const daysCash = (d.totalOperatingExpenses || 0) > 0 ?
                  ((d.unrestrictedCashAndInvestments || 0) * 365) / (d.totalOperatingExpenses || 0) : 0;
                return sum + daysCash;
              }, 0) / industryData.length;
              const airportDaysCash = (airportData.totalOperatingExpenses || 0) > 0 ?
                ((airportData.unrestrictedCashAndInvestments || 0) * 365) / (airportData.totalOperatingExpenses || 0) : 0;
              return avgDaysCash > 0 ? calculatePercentage(airportDaysCash, avgDaysCash) : 100;
            })()
          }
        ]
      };
    }).filter((am): am is NonNullable<typeof am> => am !== null);

    // Merge all airport data into combined radar chart format
    const metrics = useGrowthRates ?
      ['Revenue Growth', 'Operations Growth', 'Passenger Growth', 'Profitability Trend', 'Cash Growth', 'Overall Momentum'] :
      ['Revenue/Pax', 'Landing Fees', 'Op Margin', 'Cash/Debt', 'Revenue/FTE', 'Days Cash'];

    return metrics.map(metricName => {
      const dataPoint: any = { metric: metricName };

      airportMetrics.forEach(am => {
        const metricData = am.data.find(d => d.metric === metricName);
        if (metricData) {
          dataPoint[am.airport] = metricData[am.airport];
        }
      });

      return dataPoint;
    });
  }, [filteredData, data, selectedYear, primaryAirport, comparisonAirports, useHubSpecificBenchmark, useGrowthRates, excludeNonHub]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading Airport Performance Data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, pl: 3, pr: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Airport Performance
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Side-by-side analysis and benchmarking of airport performance metrics
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Primary Airport</InputLabel>
              <Select
                value={primaryAirport}
                onChange={handlePrimaryAirportChange}
                label="Primary Airport"
              >
                {availableAirports.map((airport) => (
                  <MenuItem key={airport.locID} value={airport.locID}>
                    {airport.locID} - {airport.name} ({airport.state})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={5}>
            <FormControl fullWidth>
              <InputLabel>Comparison Airports (Max 3)</InputLabel>
              <Select
                multiple
                value={comparisonAirports}
                onChange={handleComparisonAirportsChange}
                label="Comparison Airports (Max 3)"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableAirports
                  .filter(airport => airport.locID !== primaryAirport)
                  .map((airport) => (
                    <MenuItem
                      key={airport.locID}
                      value={airport.locID}
                      disabled={comparisonAirports.length >= 3 && !comparisonAirports.includes(airport.locID)}
                    >
                      {airport.locID} - {airport.name} ({airport.state})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={handleYearChange}
                label="Year"
              >
                {availableYears
                  .filter((year) => {
                    const isFirstYear = year === Math.min(...availableYears);
                    return !(useGrowthRates && isFirstYear);
                  })
                  .map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Industry Performance Comparison */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Performance Benchmark
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Performance Metric Selector */}
            <FormControl sx={{ minWidth: 200 }}>
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
        </Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Tooltip
              title="Compare airports only to similar-sized hubs (Large/Medium/Small/Non-Hub) vs all airports industry-wide"
              placement="bottom"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={useHubSpecificBenchmark}
                    onChange={(e) => setUseHubSpecificBenchmark(e.target.checked)}
                    color="primary"
                  />
                }
                label="Hub-Specific"
                sx={{ m: 0 }}
              />
            </Tooltip>
            <Tooltip
              title="Focus on growth rates and trends (Revenue Growth, Passenger Growth, etc.) vs current performance levels"
              placement="bottom"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={useGrowthRates}
                    onChange={(e) => setUseGrowthRates(e.target.checked)}
                    color="secondary"
                  />
                }
                label="Growth Focus"
                sx={{ m: 0 }}
              />
            </Tooltip>
            <Tooltip
              title="Exclude non-hub airports from industry average calculations - compare only against Large/Medium/Small hub airports"
              placement="bottom"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={excludeNonHub}
                    onChange={(e) => setExcludeNonHub(e.target.checked)}
                    color="warning"
                  />
                }
                label="Exclude Non-Hub"
                sx={{ m: 0 }}
              />
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <CustomRadarChart
              data={radarComparisonData}
              title={`${useGrowthRates ? "Growth Rates: " : ""}Airports vs ${useHubSpecificBenchmark ? "Hub-Specific" : "Overall"} Industry Benchmarks (%)`}
              height={500}
              showComparison={false}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                {useGrowthRates ? "Growth Rate Analysis" : (useHubSpecificBenchmark ? "Hub-Specific Performance Percentages" : "Industry-Wide Performance Percentages")}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
                {useGrowthRates ?
                  `Airports' growth trends and momentum shown as percentages relative to ${useHubSpecificBenchmark ? "hub-specific" : "overall"} industry growth for ${selectedYear}.` :
                  `Each airport's performance shown as a percentage of the ${useHubSpecificBenchmark ? "hub-size specific" : "overall"} industry average for ${selectedYear}.`
                }
              </Typography>

              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 500 }}>
                <strong>100% = {useHubSpecificBenchmark ? "Hub" : "Overall"} Industry Average</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Values above 100% indicate above-average performance {useHubSpecificBenchmark ? "within the hub size category" : "across all airports"}.
              </Typography>

              {useGrowthRates ? (
                <>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Revenue Growth:</strong> Year-over-year revenue change vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Operations Growth:</strong> Aircraft operations growth vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Passenger Growth:</strong> Enplanement growth vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Profitability Trend:</strong> Operating margin improvement vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Cash Growth:</strong> Cash reserves growth vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    • <strong>Overall Momentum:</strong> Combined growth performance across all metrics
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                    All metrics standardized: <strong>Higher values = Better performance</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Revenue/Pax:</strong> Operating revenue per passenger vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Landing Fees:</strong> Signatory landing fee rate per 1,000 lbs vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Op Margin:</strong> Operating margin percentage vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Cash/Debt:</strong> Cash-to-debt ratio (financial strength) vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Revenue/FTE:</strong> Revenue per employee (productivity) vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    • <strong>Days Cash:</strong> Days of cash on hand (liquidity) vs {useHubSpecificBenchmark ? "hub peers" : "industry average"}
                  </Typography>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Financial Flow Analysis */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Financial Flow Analysis
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Revenue sources and fund allocation for {primaryAirport} in {selectedYear}
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12}>
            {comparisonData[0]?.current && (
              <SankeyChart
                data={comparisonData[0].current}
                title={`${comparisonData[0].current.locId} - Fund Flow (${selectedYear})`}
                height={500}
                width={1000}
              />
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Detailed Comparison Table */}
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Detailed Metrics Comparison
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '30%' }}></TableCell>
                {comparisonData.map((airport) => (
                  <TableCell key={airport.locID} align="center" sx={{ fontWeight: 600 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {airport.locID}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {airport.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {airport.state}
                      </Typography>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                const groupedMetrics = comparisonMetrics.reduce((acc, metric) => {
                  if (!acc[metric.theme]) {
                    acc[metric.theme] = [];
                  }
                  acc[metric.theme].push(metric);
                  return acc;
                }, {} as Record<string, typeof comparisonMetrics>);

                return Object.entries(groupedMetrics).map(([themeName, metrics]) => (
                  <React.Fragment key={themeName}>
                    {/* Theme Header Row */}
                    <TableRow>
                      <TableCell
                        colSpan={comparisonData.length + 1}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          backgroundColor: metrics[0].themeColor + '10',
                          color: metrics[0].themeColor,
                          borderLeft: `4px solid ${metrics[0].themeColor}`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {themeName}
                      </TableCell>
                    </TableRow>

                    {/* Metrics in this theme */}
                    {metrics.map((metric) => (
                      <TableRow key={metric.key}>
                        <TableCell sx={{ fontWeight: 500, pl: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 3,
                                height: 20,
                                backgroundColor: metric.themeColor,
                                borderRadius: 1
                              }}
                            />
                            {metric.label}
                          </Box>
                        </TableCell>
                        {comparisonData.map((airport) => {
                          const currentValue = airport.current
                            ? (metric.isCalculated ? calculateDerivedMetric(airport.current, metric.key) :
                               metric.isDirectField ? airport.current[metric.key] || 0 :
                               airport.current[metric.key] || 0)
                            : 0;

                          const previousValue = airport.previous
                            ? (metric.isCalculated ? calculateDerivedMetric(airport.previous, metric.key) :
                               metric.isDirectField ? airport.previous[metric.key] || 0 :
                               airport.previous[metric.key] || 0)
                            : 0;

                          return (
                            <TableCell key={airport.locID} align="center">
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {airport.current
                                    ? metric.formatter(currentValue)
                                    : 'N/A'
                                  }
                                </Typography>
                                {airport.current && airport.previous && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                                    {getGrowthIcon(calculateGrowth(currentValue, previousValue))}
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: getGrowthColor(calculateGrowth(currentValue, previousValue)),
                                        fontWeight: 500,
                                      }}
                                    >
                                      {formatPercentage(Math.abs(calculateGrowth(currentValue, previousValue)))}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ));
              })()}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>


      {/* Quick Actions */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Analysis Tools
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Compare />}
            onClick={() => {
              setPrimaryAirport('ATL');
              setComparisonAirports(['LAX']);
            }}
          >
            Compare ATL vs LAX
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setPrimaryAirport('ORD');
              setComparisonAirports(['DFW']);
            }}
          >
            Compare ORD vs DFW
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setPrimaryAirport('ATL');
              setComparisonAirports(['LAX', 'ORD', 'DFW']);
            }}
          >
            Compare Top 4 Hubs
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AirportComparison;
