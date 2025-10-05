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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Compare,
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useData } from '../context/DataContext';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  calculateGrowth
} from '../utils/formatters';
import CustomRadarChart from '../components/Charts/RadarChart';
import SankeyChart from '../components/Charts/SankeyChart';

const Benchmarking: React.FC = () => {
  const theme = useTheme();
  const { data, loading, getLatestYear, getAvailableYears, filteredData, selectedYears, setSelectedYears, selectedAirport, selectedStates, selectedHubSizes } = useData();

  const [primaryAirport, setPrimaryAirport] = React.useState<string>('ATL');
  const [comparisonAirports, setComparisonAirports] = React.useState<string[]>(['LAX']);

  // Sync primary airport with global search when selectedAirport changes
  React.useEffect(() => {
    if (selectedAirport && selectedAirport !== primaryAirport) {
      setPrimaryAirport(selectedAirport);
    }
  }, [selectedAirport]);
  const [performanceCategory, setPerformanceCategory] = React.useState<string>('overall');

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
      // Apply same state/hub filters to previous year data
      let previousYearData = data.filter(d => d.fiscalYear === selectedYear - 1);
      if (selectedStates.length > 0) {
        previousYearData = previousYearData.filter(d => selectedStates.includes(d.state));
      }
      if (selectedHubSizes.length > 0) {
        previousYearData = previousYearData.filter(d => selectedHubSizes.includes(d.hubSize));
      }
      const previousData = previousYearData.find(d => d.locId === locID);

      return {
        locID,
        name: currentData?.airportName || '',
        state: currentData?.state || '',
        hubSize: currentData?.hubSize || '',
        current: currentData,
        previous: previousData,
      };
    });
  }, [filteredData, data, primaryAirport, comparisonAirports, selectedYear, selectedStates, selectedHubSizes]);

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

  // Clear airports that are no longer available when filters change
  React.useEffect(() => {
    const availableAirportCodes = new Set(availableAirports.map(a => a.locID));

    // Clear primary airport if not available
    if (primaryAirport && !availableAirportCodes.has(primaryAirport)) {
      setPrimaryAirport(availableAirports.length > 0 ? availableAirports[0].locID : '');
    }

    // Clear comparison airports that are no longer available
    const validComparisonAirports = comparisonAirports.filter(code => availableAirportCodes.has(code));
    if (validComparisonAirports.length !== comparisonAirports.length) {
      setComparisonAirports(validComparisonAirports);
    }
  }, [availableAirports, primaryAirport, comparisonAirports]);

  // Auto-adjust selected year if it's not available for the new primary airport
  React.useEffect(() => {
    if (primaryAirport && availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYears([availableYears[0]]); // Set to the most recent available year
    }
  }, [primaryAirport, availableYears, selectedYear, setSelectedYears]);

  // Auto-adjust year when Growth category is selected
  React.useEffect(() => {
    if (availableYears.length > 1) {
      const firstYear = Math.min(...availableYears);
      const secondYear = [...availableYears].sort((a, b) => a - b)[1]; // Second earliest year (use copy to avoid mutation)

      // If Growth category is selected and we're on the first year, switch to second year
      if (performanceCategory === 'growth' && selectedYear === firstYear) {
        setSelectedYears([secondYear]);
      }
    }
  }, [performanceCategory, selectedYear, availableYears, setSelectedYears]);



  const comparisonMetrics = [
    // Staffing & Operations
    {
      key: 'enplanements',
      label: 'Enplanements',
      formatter: formatNumber,
      theme: 'Staffing & Operations',
      themeColor: '#7b1fa2' // Purple
    },
    {
      key: 'fullTimeEquivalentEmployees',
      label: 'Full-Time Equivalent Employees',
      formatter: formatNumber,
      theme: 'Staffing & Operations',
      themeColor: '#7b1fa2' // Purple
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
      key: 'signatoryLandingFeeRatePer1000Lbs',
      label: 'Landing Fee Rate (per 1,000 lbs)',
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

  // Airport performance radar data comparing to maximum values
  const radarComparisonData = React.useMemo(() => {
    if (filteredData.length === 0) return [];

    const allAirports = [primaryAirport, ...comparisonAirports].filter(Boolean);
    if (allAirports.length === 0) return [];

    // First pass: Calculate raw metric values for all airports
    const airportRawMetrics = allAirports.map(airportCode => {
      const airportData = filteredData.find(d => d.locId === airportCode && d.fiscalYear === selectedYear);
      if (!airportData) return null;

      let previousYearData = data.filter(d => d.fiscalYear === selectedYear - 1);
      if (selectedStates.length > 0) {
        previousYearData = previousYearData.filter(d => selectedStates.includes(d.state));
      }
      if (selectedHubSizes.length > 0) {
        previousYearData = previousYearData.filter(d => selectedHubSizes.includes(d.hubSize));
      }
      const airportPrevData = previousYearData.find(d => d.locId === airportCode);

      return {
        airportCode,
        revPerEnpl: (airportData.totalOperatingRevenue || 0) / Math.max(airportData.enplanements || 0, 1),
        landingFees: airportData.signatoryLandingFeeRatePer1000Lbs || 0,
        opMargin: airportData.operatingMargin || 0,
        cashToDebt: (airportData.longTermDebt || 0) > 0 ? (airportData.unrestrictedCashAndInvestments || 0) / (airportData.longTermDebt || 0) : 0,
        efficiency: (airportData.totalOperatingExpenses || 0) > 0 ? (airportData.totalOperatingRevenue || 0) / (airportData.totalOperatingExpenses || 0) : 0,
        scale: airportData.enplanements || 0,
        daysCash: (airportData.totalOperatingExpenses || 0) > 0 ? ((airportData.unrestrictedCashAndInvestments || 0) * 365) / (airportData.totalOperatingExpenses || 0) : 0,
        costPerEnpl: (airportData.enplanements || 0) > 0 ? (airportData.totalOperatingExpenses || 0) / (airportData.enplanements || 0) : 0,
        totalRevenue: airportData.totalOperatingRevenue || 0,
        revenueGrowth: airportPrevData ? ((airportData.totalOperatingRevenue - airportPrevData.totalOperatingRevenue) / Math.max(airportPrevData.totalOperatingRevenue, 1)) : 0,
        operationsGrowth: airportPrevData ? ((airportData.annualAircraftOperations - airportPrevData.annualAircraftOperations) / Math.max(airportPrevData.annualAircraftOperations, 1)) : 0,
        passengerGrowth: airportPrevData ? ((airportData.enplanements - airportPrevData.enplanements) / Math.max(airportPrevData.enplanements, 1)) : 0,
        marginTrend: airportPrevData ? (airportData.operatingMargin - airportPrevData.operatingMargin) : 0,
        cashGrowth: airportPrevData ? ((airportData.unrestrictedCashAndInvestments - airportPrevData.unrestrictedCashAndInvestments) / Math.max(airportPrevData.unrestrictedCashAndInvestments, 1)) : 0,
      };
    }).filter(Boolean);

    if (airportRawMetrics.length === 0) return [];

    // Always use hub-specific benchmarks
    let benchmarkData = airportRawMetrics;
    if (airportRawMetrics.length > 0) {
      // Get the hub size of the primary airport
      const primaryAirportData = filteredData.find(d => d.locId === primaryAirport && d.fiscalYear === selectedYear);
      if (primaryAirportData) {
        const primaryHubSize = primaryAirportData.hubSize;
        // Include all airports of the same hub size from filteredData
        const hubSpecificAirports = filteredData
          .filter(d => d.fiscalYear === selectedYear && d.hubSize === primaryHubSize)
          .map(airportData => {
            let previousYearData = data.filter(d => d.fiscalYear === selectedYear - 1);
            if (selectedStates.length > 0) {
              previousYearData = previousYearData.filter(d => selectedStates.includes(d.state));
            }
            if (selectedHubSizes.length > 0) {
              previousYearData = previousYearData.filter(d => selectedHubSizes.includes(d.hubSize));
            }
            const airportPrevData = previousYearData.find(d => d.locId === airportData.locId);

            return {
              airportCode: airportData.locId,
              revPerEnpl: (airportData.totalOperatingRevenue || 0) / Math.max(airportData.enplanements || 0, 1),
              landingFees: airportData.signatoryLandingFeeRatePer1000Lbs || 0,
              opMargin: airportData.operatingMargin || 0,
              cashToDebt: (airportData.longTermDebt || 0) > 0 ? (airportData.unrestrictedCashAndInvestments || 0) / (airportData.longTermDebt || 0) : 0,
              efficiency: (airportData.totalOperatingExpenses || 0) > 0 ? (airportData.totalOperatingRevenue || 0) / (airportData.totalOperatingExpenses || 0) : 0,
              scale: airportData.enplanements || 0,
              daysCash: (airportData.totalOperatingExpenses || 0) > 0 ? ((airportData.unrestrictedCashAndInvestments || 0) * 365) / (airportData.totalOperatingExpenses || 0) : 0,
              costPerEnpl: (airportData.enplanements || 0) > 0 ? (airportData.totalOperatingExpenses || 0) / (airportData.enplanements || 0) : 0,
              totalRevenue: airportData.totalOperatingRevenue || 0,
              revenueGrowth: airportPrevData ? ((airportData.totalOperatingRevenue - airportPrevData.totalOperatingRevenue) / Math.max(airportPrevData.totalOperatingRevenue, 1)) : 0,
              operationsGrowth: airportPrevData ? ((airportData.annualAircraftOperations - airportPrevData.annualAircraftOperations) / Math.max(airportPrevData.annualAircraftOperations, 1)) : 0,
              passengerGrowth: airportPrevData ? ((airportData.enplanements - airportPrevData.enplanements) / Math.max(airportPrevData.enplanements, 1)) : 0,
              marginTrend: airportPrevData ? (airportData.operatingMargin - airportPrevData.operatingMargin) : 0,
              cashGrowth: airportPrevData ? ((airportData.unrestrictedCashAndInvestments - airportPrevData.unrestrictedCashAndInvestments) / Math.max(airportPrevData.unrestrictedCashAndInvestments, 1)) : 0,
            };
          });
        benchmarkData = hubSpecificAirports;
      }
    }

    // Calculate maximum values for each metric (from compared airports or hub-specific benchmark)
    // Use Math.max with 0.0001 as minimum to prevent division by zero and ensure stable chart rendering
    const maxValues = {
      revPerEnpl: Math.max(...benchmarkData.map(a => a!.revPerEnpl), 0.0001),
      landingFees: Math.max(...benchmarkData.map(a => a!.landingFees), 0.0001),
      opMargin: Math.max(...benchmarkData.map(a => a!.opMargin), 0.0001),
      cashToDebt: Math.max(...benchmarkData.map(a => a!.cashToDebt), 0.0001),
      efficiency: Math.max(...benchmarkData.map(a => a!.efficiency), 0.0001),
      scale: Math.max(...benchmarkData.map(a => a!.scale), 0.0001),
      daysCash: Math.max(...benchmarkData.map(a => a!.daysCash), 0.0001),
      costPerEnpl: Math.max(...benchmarkData.map(a => a!.costPerEnpl), 0.0001),
      totalRevenue: Math.max(...benchmarkData.map(a => a!.totalRevenue), 0.0001),
      revenueGrowth: Math.max(...benchmarkData.map(a => a!.revenueGrowth), 0.0001),
      operationsGrowth: Math.max(...benchmarkData.map(a => a!.operationsGrowth), 0.0001),
      passengerGrowth: Math.max(...benchmarkData.map(a => a!.passengerGrowth), 0.0001),
      marginTrend: Math.max(...benchmarkData.map(a => a!.marginTrend), 0.0001),
      cashGrowth: Math.max(...benchmarkData.map(a => a!.cashGrowth), 0.0001),
    };

    // Second pass: Convert to percentages of maximum for each metric
    const airportMetrics = airportRawMetrics.map(rawMetric => {
      const airportCode = rawMetric!.airportCode;

      // Define metric sets based on performance category
      let metricsData: any[] = [];

      switch (performanceCategory) {
        case 'overall':
          metricsData = [
            {
              metric: 'Revenue/Pax',
              [airportCode]: maxValues.revPerEnpl > 0 ? (rawMetric!.revPerEnpl / maxValues.revPerEnpl) * 100 : 0
            },
            {
              metric: 'Op Margin',
              [airportCode]: maxValues.opMargin > 0 ? (rawMetric!.opMargin / maxValues.opMargin) * 100 : 0
            },
            {
              metric: 'Cash/Debt',
              [airportCode]: maxValues.cashToDebt > 0 ? (rawMetric!.cashToDebt / maxValues.cashToDebt) * 100 : 0
            },
            {
              metric: 'Efficiency',
              [airportCode]: maxValues.efficiency > 0 ? (rawMetric!.efficiency / maxValues.efficiency) * 100 : 0
            },
            {
              metric: 'Landing Fees',
              [airportCode]: maxValues.landingFees > 0 ? (rawMetric!.landingFees / maxValues.landingFees) * 100 : 0
            },
            {
              metric: 'Scale',
              [airportCode]: maxValues.scale > 0 ? (rawMetric!.scale / maxValues.scale) * 100 : 0
            }
          ];
          break;

        case 'financial':
          metricsData = [
            {
              metric: 'Op Margin',
              [airportCode]: maxValues.opMargin > 0 ? (rawMetric!.opMargin / maxValues.opMargin) * 100 : 0
            },
            {
              metric: 'Cash/Debt',
              [airportCode]: maxValues.cashToDebt > 0 ? (rawMetric!.cashToDebt / maxValues.cashToDebt) * 100 : 0
            },
            {
              metric: 'Days Cash',
              [airportCode]: maxValues.daysCash > 0 ? (rawMetric!.daysCash / maxValues.daysCash) * 100 : 0
            },
            {
              metric: 'Total Revenue',
              [airportCode]: maxValues.totalRevenue > 0 ? (rawMetric!.totalRevenue / maxValues.totalRevenue) * 100 : 0
            }
          ];
          break;

        case 'operations':
          metricsData = [
            {
              metric: 'Efficiency',
              [airportCode]: maxValues.efficiency > 0 ? (rawMetric!.efficiency / maxValues.efficiency) * 100 : 0
            },
            {
              metric: 'Cost Per Enpl',
              [airportCode]: maxValues.costPerEnpl > 0 ? (rawMetric!.costPerEnpl / maxValues.costPerEnpl) * 100 : 0
            },
            {
              metric: 'Scale',
              [airportCode]: maxValues.scale > 0 ? (rawMetric!.scale / maxValues.scale) * 100 : 0
            },
            {
              metric: 'Revenue/Pax',
              [airportCode]: maxValues.revPerEnpl > 0 ? (rawMetric!.revPerEnpl / maxValues.revPerEnpl) * 100 : 0
            }
          ];
          break;

        case 'revenue':
          metricsData = [
            {
              metric: 'Revenue/Pax',
              [airportCode]: maxValues.revPerEnpl > 0 ? (rawMetric!.revPerEnpl / maxValues.revPerEnpl) * 100 : 0
            },
            {
              metric: 'Landing Fees',
              [airportCode]: maxValues.landingFees > 0 ? (rawMetric!.landingFees / maxValues.landingFees) * 100 : 0
            },
            {
              metric: 'Total Revenue',
              [airportCode]: maxValues.totalRevenue > 0 ? (rawMetric!.totalRevenue / maxValues.totalRevenue) * 100 : 0
            },
            {
              metric: 'Scale',
              [airportCode]: maxValues.scale > 0 ? (rawMetric!.scale / maxValues.scale) * 100 : 0
            }
          ];
          break;

        case 'scale':
          metricsData = [
            {
              metric: 'Scale',
              [airportCode]: maxValues.scale > 0 ? (rawMetric!.scale / maxValues.scale) * 100 : 0
            },
            {
              metric: 'Total Revenue',
              [airportCode]: maxValues.totalRevenue > 0 ? (rawMetric!.totalRevenue / maxValues.totalRevenue) * 100 : 0
            },
            {
              metric: 'Landing Fees',
              [airportCode]: maxValues.landingFees > 0 ? (rawMetric!.landingFees / maxValues.landingFees) * 100 : 0
            },
            {
              metric: 'Days Cash',
              [airportCode]: maxValues.daysCash > 0 ? (rawMetric!.daysCash / maxValues.daysCash) * 100 : 0
            }
          ];
          break;

        case 'growth':
          metricsData = [
            {
              metric: 'Revenue Growth',
              [airportCode]: maxValues.revenueGrowth > 0 ? (rawMetric!.revenueGrowth / maxValues.revenueGrowth) * 100 : 0
            },
            {
              metric: 'Passenger Growth',
              [airportCode]: maxValues.passengerGrowth > 0 ? (rawMetric!.passengerGrowth / maxValues.passengerGrowth) * 100 : 0
            },
            {
              metric: 'Operations Growth',
              [airportCode]: maxValues.operationsGrowth > 0 ? (rawMetric!.operationsGrowth / maxValues.operationsGrowth) * 100 : 0
            },
            {
              metric: 'Margin Trend',
              [airportCode]: maxValues.marginTrend > 0 ? (rawMetric!.marginTrend / maxValues.marginTrend) * 100 : 0
            },
            {
              metric: 'Cash Growth',
              [airportCode]: maxValues.cashGrowth > 0 ? (rawMetric!.cashGrowth / maxValues.cashGrowth) * 100 : 0
            },
            {
              metric: 'Overall Momentum',
              [airportCode]: (() => {
                const revGrowthPct = maxValues.revenueGrowth > 0 ? (rawMetric!.revenueGrowth / maxValues.revenueGrowth) * 100 : 0;
                const opsGrowthPct = maxValues.operationsGrowth > 0 ? (rawMetric!.operationsGrowth / maxValues.operationsGrowth) * 100 : 0;
                const paxGrowthPct = maxValues.passengerGrowth > 0 ? (rawMetric!.passengerGrowth / maxValues.passengerGrowth) * 100 : 0;
                return (revGrowthPct + opsGrowthPct + paxGrowthPct) / 3;
              })()
            }
          ];
          break;
      }

      return {
        airport: airportCode,
        data: metricsData
      };
    }).filter((am): am is NonNullable<typeof am> => am !== null);

    // Merge all airport data into combined radar chart format
    let metrics: string[] = [];

    switch (performanceCategory) {
      case 'overall':
        metrics = ['Revenue/Pax', 'Op Margin', 'Cash/Debt', 'Efficiency', 'Landing Fees', 'Scale'];
        break;
      case 'financial':
        metrics = ['Op Margin', 'Cash/Debt', 'Days Cash', 'Total Revenue'];
        break;
      case 'operations':
        metrics = ['Efficiency', 'Cost Per Enpl', 'Scale', 'Revenue/Pax'];
        break;
      case 'revenue':
        metrics = ['Revenue/Pax', 'Landing Fees', 'Total Revenue', 'Scale'];
        break;
      case 'scale':
        metrics = ['Scale', 'Total Revenue', 'Landing Fees', 'Days Cash'];
        break;
      case 'growth':
        metrics = ['Revenue Growth', 'Passenger Growth', 'Operations Growth', 'Margin Trend', 'Cash Growth', 'Overall Momentum'];
        break;
    }

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
  }, [filteredData, data, selectedYear, primaryAirport, comparisonAirports, performanceCategory, selectedStates, selectedHubSizes]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading Airport Benchmarking Data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, pl: 3, pr: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Airport Benchmarking
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Side-by-side analysis and benchmarking of airport performance metrics
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            💡 Tip: Use the search bar in the navbar to quickly select an airport
          </Typography>
        </Box>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>Primary Airport</InputLabel>
              <Select
                value={primaryAirport}
                onChange={handlePrimaryAirportChange}
                label="Primary Airport"
              >
                {availableAirports.map((airport) => (
                  <MenuItem key={airport.locID} value={airport.locID}>
                    {airport.locID} - {airport.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={8}>
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
                      {airport.locID} - {airport.name}
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
        </Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <ToggleButtonGroup
              value={performanceCategory}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) {
                  setPerformanceCategory(newValue);
                }
              }}
              aria-label="performance category"
              size="small"
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
              <ToggleButton value="overall" aria-label="overall">
                Overall
              </ToggleButton>
              <ToggleButton value="financial" aria-label="financial">
                Financial
              </ToggleButton>
              <ToggleButton value="operations" aria-label="operations">
                Operations
              </ToggleButton>
              <ToggleButton value="revenue" aria-label="revenue">
                Revenue
              </ToggleButton>
              <ToggleButton value="scale" aria-label="scale">
                Scale
              </ToggleButton>
              <ToggleButton value="growth" aria-label="growth">
                Growth
              </ToggleButton>
            </ToggleButtonGroup>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <CustomRadarChart
              data={radarComparisonData}
              title={`Airport Performance Comparison (% of Max)`}
              height={500}
              showComparison={false}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                {performanceCategory === 'growth' ? "Growth Rate Analysis" : "Performance Comparison"}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
                {performanceCategory === 'growth' ?
                  `Airports' growth trends and momentum shown as percentages relative to the maximum growth among same hub-sized airports for ${selectedYear}.` :
                  `Each airport's performance shown as a percentage of the maximum value among same hub-sized airports for ${selectedYear}.`
                }
              </Typography>

              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 500 }}>
                <strong>100% = Maximum Among Hub Peers</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Comparing against all airports in the same hub size category. The airport with the highest value for each metric scores 100%.
              </Typography>

              {performanceCategory === 'overall' && (
                <>
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                    All metrics standardized: <strong>Higher values = Better performance</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Revenue/Pax:</strong> Operating revenue per passenger
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Landing Fees:</strong> Signatory landing fee rate per 1,000 lbs
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Op Margin:</strong> Operating margin percentage
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Cash/Debt:</strong> Cash-to-debt ratio (financial strength)
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Efficiency:</strong> Revenue-to-expense ratio (operational efficiency)
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    • <strong>Scale:</strong> Total enplanements (airport size)
                  </Typography>
                </>
              )}

              {performanceCategory === 'financial' && (
                <>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Op Margin:</strong> Operating margin percentage
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Cash/Debt:</strong> Cash-to-debt ratio (financial strength)
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Days Cash:</strong> Days of operating expenses covered by cash
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    • <strong>Total Revenue:</strong> Total operating revenue
                  </Typography>
                </>
              )}

              {performanceCategory === 'operations' && (
                <>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Efficiency:</strong> Revenue-to-expense ratio
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Cost Per Enpl:</strong> Operating expenses per enplanement
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Scale:</strong> Total enplanements
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    • <strong>Revenue/Pax:</strong> Operating revenue per passenger
                  </Typography>
                </>
              )}

              {performanceCategory === 'revenue' && (
                <>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Revenue/Pax:</strong> Operating revenue per passenger
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Landing Fees:</strong> Signatory landing fee rate per 1,000 lbs
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Total Revenue:</strong> Total operating revenue
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    • <strong>Scale:</strong> Total enplanements
                  </Typography>
                </>
              )}

              {performanceCategory === 'scale' && (
                <>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Scale:</strong> Total enplanements (airport size)
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Total Revenue:</strong> Total operating revenue
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Landing Fees:</strong> Signatory landing fee rate per 1,000 lbs
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    • <strong>Days Cash:</strong> Days of operating expenses covered by cash
                  </Typography>
                </>
              )}

              {performanceCategory === 'growth' && (
                <>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Revenue Growth:</strong> Year-over-year revenue change
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Passenger Growth:</strong> Enplanement growth
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Operations Growth:</strong> Aircraft operations growth
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Margin Trend:</strong> Operating margin improvement (change in margin)
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    • <strong>Cash Growth:</strong> Cash reserves growth
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    • <strong>Overall Momentum:</strong> Average of Revenue, Operations, and Passenger Growth
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

        <Box sx={{ width: '100%' }}>
          {comparisonData[0]?.current && (
            <SankeyChart
              data={comparisonData[0].current}
              title={`${comparisonData[0].current.locId} - Fund Flow (${selectedYear})`}
              height={500}
            />
          )}
        </Box>
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
                        <TableCell sx={{ fontWeight: 500, pl: 3, py: 1 }}>
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
                            <TableCell key={airport.locID} align="center" sx={{ py: 1 }}>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {airport.current
                                    ? metric.formatter(currentValue)
                                    : 'N/A'
                                  }
                                </Typography>
                                {airport.current && airport.previous && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.25 }}>
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

export default Benchmarking;
