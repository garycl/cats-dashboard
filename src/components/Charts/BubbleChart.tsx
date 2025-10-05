import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ZoomableGroup,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { AirportData, useData } from '../../context/DataContext';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

interface BubbleChartProps {
  data: AirportData[];
  title?: string;
  height?: number;
  externalChartMode?: ChartMode;
  externalExecutiveView?: ExecutiveView;
  onChartModeChange?: (mode: ChartMode) => void;
  onExecutiveViewChange?: (view: ExecutiveView) => void;
  hideControls?: boolean;
}

interface MetricOption {
  value: keyof AirportData;
  label: string;
  format: 'currency' | 'number' | 'percentage';
  description: string;
}

type ChartMode = 'explore' | 'executive';
type ExecutiveView = 'growth-profitability' | 'cash-burden' | 'unit-economics';

interface ExecutiveConfig {
  title: string;
  description: string;
  xAxis: string;
  yAxis: string;
  sizeMetric: string;
  colorMetric: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  {
    value: 'operatingMargin',
    label: 'Operating Margin',
    format: 'percentage',
    description: 'Profitability as percentage of revenue'
  },
  {
    value: 'totalOperatingRevenue',
    label: 'Total Operating Revenue',
    format: 'currency',
    description: 'Annual operating revenue'
  },
  {
    value: 'enplanements',
    label: 'Passenger Enplanements',
    format: 'number',
    description: 'Annual passenger volume'
  },
  {
    value: 'costPerEnplanement',
    label: 'Cost Per Enplanement',
    format: 'currency',
    description: 'Operating efficiency metric'
  },
  {
    value: 'unrestrictedCashAndInvestments',
    label: 'Unrestricted Cash',
    format: 'currency',
    description: 'Available cash reserves'
  },
  {
    value: 'totalDebt',
    label: 'Total Debt',
    format: 'currency',
    description: 'Outstanding debt obligations'
  },
  {
    value: 'annualAircraftOperations',
    label: 'Aircraft Operations',
    format: 'number',
    description: 'Annual flight operations'
  },
  {
    value: 'fullTimeEquivalentEmployees',
    label: 'FTE Employees',
    format: 'number',
    description: 'Full-time equivalent staff'
  },
  // Growth metrics
  {
    value: 'revenueGrowth',
    label: 'Revenue Growth',
    format: 'percentage',
    description: 'Year-over-year revenue growth rate'
  },
  {
    value: 'passengerGrowth',
    label: 'Passenger Growth',
    format: 'percentage',
    description: 'Year-over-year passenger growth rate'
  },
  {
    value: 'operationsGrowth',
    label: 'Operations Growth',
    format: 'percentage',
    description: 'Year-over-year operations growth rate'
  },
  // Executive-specific metrics
  {
    value: 'revenueCAGR3Y',
    label: '3-Year Revenue CAGR',
    format: 'percentage',
    description: '3-year compound annual growth rate for revenue'
  },
  {
    value: 'nonAirlineRevenueShare',
    label: 'Non-Airline Revenue Share',
    format: 'percentage',
    description: 'Percentage of revenue from non-airline sources'
  },
  {
    value: 'debtServiceBurden',
    label: 'Debt Service Burden',
    format: 'percentage',
    description: 'Debt service as percentage of revenue'
  },
  {
    value: 'capexIntensity',
    label: 'Capital Expenditure Intensity',
    format: 'percentage',
    description: 'Capital expenditures as percentage of revenue'
  },
  {
    value: 'nonAirlineRevenuePerEnplanement',
    label: 'Non-Airline Revenue Per Passenger',
    format: 'currency',
    description: 'Non-airline revenue divided by passenger enplanements'
  },
  {
    value: 'omExpensePerEnplanement',
    label: 'Operating Expense Per Passenger',
    format: 'currency',
    description: 'Operating and maintenance expenses per passenger'
  },
];

// Using Okabe-Ito colorblind-friendly palette for categorical data
const HUB_COLORS = {
  'L': '#0173B2', // Large - Blue (distinctive, professional)
  'M': '#029E73', // Medium - Teal/Green (clearly different from blue)
  'S': '#DE8F05', // Small - Orange (warm contrast)
  'N': '#CC78BC', // Non-hub - Purple (unique, easily distinguished)
};

const EXECUTIVE_VIEWS: Record<ExecutiveView, ExecutiveConfig> = {
  'growth-profitability': {
    title: 'Growth-Profitability Map',
    description: 'Revenue growth vs operating margin - the executive growth-returns framework',
    xAxis: 'revenueCAGR3Y',
    yAxis: 'operatingMargin',
    sizeMetric: 'enplanements',
    colorMetric: 'quadrant'
  },
  'cash-burden': {
    title: 'Cash & Burden Analysis',
    description: 'Financial resilience - growth vs debt burden with cash reserves',
    xAxis: 'revenueCAGR3Y',
    yAxis: 'debtServiceBurden',
    sizeMetric: 'unrestrictedCashAndInvestments',
    colorMetric: 'quadrant'
  },
  'unit-economics': {
    title: 'Unit Economics',
    description: 'Operational efficiency - non-airline revenue and cost per passenger',
    xAxis: 'nonAirlineRevenuePerEnplanement',
    yAxis: 'omExpensePerEnplanement',
    sizeMetric: 'enplanements',
    colorMetric: 'quadrant'
  }
};

const BubbleChart: React.FC<BubbleChartProps> = ({
  data,
  title = 'Airport Performance Matrix',
  height = 600,
}) => {
  const theme = useTheme();
  const { data: allData, selectedAirport, setSelectedAirport } = useData();

  const [chartMode, setChartMode] = useState<ChartMode>('executive');
  const [executiveView, setExecutiveView] = useState<ExecutiveView>('growth-profitability');
  const [xAxis, setXAxis] = useState<keyof AirportData>('operatingMargin');
  const [yAxis, setYAxis] = useState<keyof AirportData>('revenueGrowth');
  const [sizeMetric, setSizeMetric] = useState<keyof AirportData>('enplanements');
  const [colorMetric, setColorMetric] = useState<string>('quadrant'); // 'hubSize', 'quadrant', or metric key
  const [quadrantMode, setQuadrantMode] = useState<'off' | 'average' | 'median'>('average');
  const [hoveredAirport, setHoveredAirport] = useState<string | null>(null);
  const [excludeOutliers, setExcludeOutliers] = useState<boolean>(true);

  // Auto-configure axes when in executive mode
  React.useEffect(() => {
    if (chartMode === 'executive') {
      const config = EXECUTIVE_VIEWS[executiveView];
      setXAxis(config.xAxis as keyof AirportData);
      setYAxis(config.yAxis as keyof AirportData);
      setSizeMetric(config.sizeMetric as keyof AirportData);
    }
  }, [chartMode, executiveView]);

  // Calculate growth rates and executive metrics for airports
  const processedData = React.useMemo(() => {
    // Use the filtered data for current year display, but all data for growth calculations
    const currentYear = Math.max(...allData.map(d => d.fiscalYear));
    const currentYearData = data; // Use filtered data for current display
    const previousYearData = allData.filter(d => d.fiscalYear === currentYear - 1);

    // Helper function to calculate CAGR
    const calculateCAGR = (locId: string, metric: keyof AirportData, years: number = 3): number | null => {
      const targetYear = currentYear - years;
      const currentValue = currentYearData.find(d => d.locId === locId)?.[metric] as number;
      const baseValue = allData.find(d => d.locId === locId && d.fiscalYear === targetYear)?.[metric] as number;

      if (!currentValue || !baseValue || baseValue <= 0) return null;
      return (Math.pow(currentValue / baseValue, 1 / years) - 1) * 100;
    };

    return currentYearData.map(airport => {
      const prevAirport = previousYearData.find(p => p.locId === airport.locId);

      // Calculate growth rates
      const revenueGrowth = prevAirport && prevAirport.totalOperatingRevenue > 0
        ? ((airport.totalOperatingRevenue - prevAirport.totalOperatingRevenue) / prevAirport.totalOperatingRevenue) * 100
        : null;

      const passengerGrowth = prevAirport && prevAirport.enplanements > 0
        ? ((airport.enplanements - prevAirport.enplanements) / prevAirport.enplanements) * 100
        : null;

      const operationsGrowth = prevAirport && prevAirport.annualAircraftOperations > 0
        ? ((airport.annualAircraftOperations - prevAirport.annualAircraftOperations) / prevAirport.annualAircraftOperations) * 100
        : null;

      // Calculate derived metrics
      const debtToRevenueRatio = airport.totalOperatingRevenue > 0
        ? (airport.totalDebt / airport.totalOperatingRevenue) * 100
        : 0;

      const revenuePerEnplanement = airport.enplanements > 0
        ? airport.totalOperatingRevenue / airport.enplanements
        : 0;

      const daysCashOnHand = airport.totalOperatingExpenses > 0
        ? (airport.unrestrictedCashAndInvestments / airport.totalOperatingExpenses) * 365
        : 0;

      // Executive metrics calculations
      const revenueCAGR3Y = calculateCAGR(airport.locId, 'totalOperatingRevenue', 3);
      const revenueCAGR5Y = calculateCAGR(airport.locId, 'totalOperatingRevenue', 5);

      // Non-airline revenue share (4.x line items for non-aeronautical)
      const nonAirlineRevenueShare = airport.totalOperatingRevenue > 0
        ? (airport.totalNonAeronauticalRevenue / airport.totalOperatingRevenue) * 100
        : 0;

      // Debt service burden
      const debtServiceBurden = airport.totalOperatingRevenue > 0
        ? (airport.totalDebtService / airport.totalOperatingRevenue) * 100
        : 0;

      // Capex intensity
      const capexIntensity = airport.totalOperatingRevenue > 0
        ? (airport.totalCapitalExpenditures / airport.totalOperatingRevenue) * 100
        : 0;

      // Per-enplanement metrics
      const nonAirlineRevenuePerEnplanement = airport.enplanements > 0
        ? airport.totalNonAeronauticalRevenue / airport.enplanements
        : 0;

      // O&M expenses per enplanement (exclude depreciation)
      const omExpenses = airport.totalOperatingExpenses - (airport.depreciation || 0);
      const omExpensePerEnplanement = airport.enplanements > 0
        ? omExpenses / airport.enplanements
        : 0;

      const result = {
        ...airport,
        revenueGrowth,
        passengerGrowth,
        operationsGrowth,
        debtToRevenueRatio,
        revenuePerEnplanement,
        daysCashOnHand,
        // Executive metrics
        revenueCAGR3Y,
        revenueCAGR5Y,
        nonAirlineRevenueShare,
        debtServiceBurden,
        capexIntensity,
        nonAirlineRevenuePerEnplanement,
        omExpensePerEnplanement,
        // Add z-value for bubble size
        z: Number(airport[sizeMetric]) || 0,
      };


      return result;
    }).filter((airport, index) => {
      // Only include airports that have valid numeric values for selected metrics
      // For growth metrics that can be null, exclude those airports from rendering
      const xValue = airport[xAxis];
      const yValue = airport[yAxis];
      const sizeValue = airport[sizeMetric];

      const isValid = typeof xValue === 'number' &&
                     typeof yValue === 'number' &&
                     typeof sizeValue === 'number' &&
                     !isNaN(xValue) &&
                     !isNaN(yValue) &&
                     !isNaN(sizeValue);


      return isValid;
    });
  }, [data, allData, xAxis, yAxis, sizeMetric]);

  // Filter outliers using IQR method
  const filteredData = React.useMemo(() => {
    if (!excludeOutliers) return processedData;

    const xValues = processedData.map(d => Number(d[xAxis]) || 0);
    const yValues = processedData.map(d => Number(d[yAxis]) || 0);

    // Calculate IQR for X axis
    const xSorted = [...xValues].sort((a, b) => a - b);
    const xQ1 = xSorted[Math.floor(xSorted.length * 0.25)];
    const xQ3 = xSorted[Math.floor(xSorted.length * 0.75)];
    const xIQR = xQ3 - xQ1;
    const xLowerBound = xQ1 - 1.5 * xIQR;
    const xUpperBound = xQ3 + 1.5 * xIQR;

    // Calculate IQR for Y axis
    const ySorted = [...yValues].sort((a, b) => a - b);
    const yQ1 = ySorted[Math.floor(ySorted.length * 0.25)];
    const yQ3 = ySorted[Math.floor(ySorted.length * 0.75)];
    const yIQR = yQ3 - yQ1;
    const yLowerBound = yQ1 - 1.5 * yIQR;
    const yUpperBound = yQ3 + 1.5 * yIQR;

    return processedData.filter(d => {
      const xValue = Number(d[xAxis]) || 0;
      const yValue = Number(d[yAxis]) || 0;
      return xValue >= xLowerBound && xValue <= xUpperBound &&
             yValue >= yLowerBound && yValue <= yUpperBound;
    });
  }, [processedData, excludeOutliers, xAxis, yAxis]);

  // Check if growth metrics are available
  const hasMultipleYears = React.useMemo(() => {
    const years = new Set(allData.map(d => d.fiscalYear));
    return years.size >= 2;
  }, [allData]);

  // Check if selected metrics are growth metrics and no data available
  const isGrowthMetricSelected = React.useMemo(() => {
    const growthMetrics = ['revenueGrowth', 'passengerGrowth', 'operationsGrowth'];
    return growthMetrics.includes(xAxis as string) || growthMetrics.includes(yAxis as string);
  }, [xAxis, yAxis]);

  // Calculate size scaling for bubbles
  const sizeRange = React.useMemo(() => {
    if (filteredData.length === 0) return { min: 0, max: 1 };

    const values = filteredData.map(d => Number(d[sizeMetric]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max };
  }, [filteredData, sizeMetric]);

  const calculateBubbleSize = (value: number) => {
    if (sizeRange.max === sizeRange.min) return 10;
    const normalized = (value - sizeRange.min) / (sizeRange.max - sizeRange.min);
    const size = Math.max(3, Math.min(40, 5 + normalized * 35)); // Radius in pixels
    return size;
  };

  // Calculate axis domains with padding to center the cluster
  const axisDomains = React.useMemo(() => {
    if (filteredData.length === 0) return { xDomain: [0, 1], yDomain: [0, 1] };

    const xValues = filteredData.map(d => Number(d[xAxis]) || 0);
    const yValues = filteredData.map(d => Number(d[yAxis]) || 0);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    // Add padding to center the cluster better (20% padding on each side)
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const xPadding = xRange * 0.2;
    const yPadding = yRange * 0.2;

    return {
      xDomain: [xMin - xPadding, xMax + xPadding],
      yDomain: [yMin - yPadding, yMax + yPadding]
    };
  }, [filteredData, xAxis, yAxis]);

  // Calculate normalized ranges for quadrant gradient
  const axisRanges = React.useMemo(() => {
    if (filteredData.length === 0) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

    const xValues = filteredData.map(d => Number(d[xAxis]) || 0);
    const yValues = filteredData.map(d => Number(d[yAxis]) || 0);

    return {
      xMin: Math.min(...xValues),
      xMax: Math.max(...xValues),
      yMin: Math.min(...yValues),
      yMax: Math.max(...yValues),
    };
  }, [filteredData, xAxis, yAxis]);

  const getQuadrantScore = (airport: any) => {
    const xValue = Number(airport[xAxis]) || 0;
    const yValue = Number(airport[yAxis]) || 0;

    // Normalize x and y to 0-1 range
    const xNorm = axisRanges.xMax > axisRanges.xMin
      ? (xValue - axisRanges.xMin) / (axisRanges.xMax - axisRanges.xMin)
      : 0.5;
    const yNorm = axisRanges.yMax > axisRanges.yMin
      ? (yValue - axisRanges.yMin) / (axisRanges.yMax - axisRanges.yMin)
      : 0.5;

    // Composite score: average of normalized x and y (0 = bottom-left, 1 = top-right)
    return (xNorm + yNorm) / 2;
  };

  // Inverted Viridis color scale helper (yellow to purple)
  const viridisColors = [
    [253, 231, 37],   // 0.0 - bright yellow
    [181, 222, 43],   // 0.1
    [110, 206, 88],   // 0.2
    [53, 183, 121],   // 0.3
    [31, 158, 137],   // 0.4
    [38, 130, 142],   // 0.5
    [49, 104, 142],   // 0.6
    [62, 74, 137],    // 0.7
    [72, 40, 120],    // 0.8
    [68, 1, 84]       // 1.0 - dark purple
  ];

  const getViridisColor = (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    const index = clamped * (viridisColors.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const frac = index - lower;

    const [r1, g1, b1] = viridisColors[lower];
    const [r2, g2, b2] = viridisColors[upper];

    const r = Math.round(r1 + (r2 - r1) * frac);
    const g = Math.round(g1 + (g2 - g1) * frac);
    const b = Math.round(b1 + (b2 - b1) * frac);

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Color scale for executive mode
  const getExecutiveColor = (airport: any) => {
    const metricKey = chartMode === 'executive'
      ? EXECUTIVE_VIEWS[executiveView].colorMetric
      : colorMetric;

    // Quadrant-based coloring (used in both modes)
    if (metricKey === 'quadrant') {
      const score = getQuadrantScore(airport);
      return getViridisColor(score);
    }

    // In explore mode, use selected color metric
    if (chartMode === 'explore') {
      if (colorMetric === 'hubSize') {
        return HUB_COLORS[airport.hubSize as keyof typeof HUB_COLORS];
      }
      // Use Viridis for metric-based coloring in explore mode
      const value = airport[colorMetric];
      if (value === null || value === undefined) return '#grey';

      // Determine range based on filtered data
      const allValues = filteredData.map(d => d[colorMetric] as number).filter(v => v !== null && v !== undefined);
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);
      const normalized = max > min ? (value - min) / (max - min) : 0.5;

      return getViridisColor(normalized);
    }

    return '#1976d2'; // Default blue
  };

  const formatValue = (value: any, format: string) => {
    if (value == null || isNaN(Number(value))) return 'N/A';

    switch (format) {
      case 'currency':
        return formatCurrency(Number(value));
      case 'percentage':
        return formatPercentage(Number(value) / 100);
      case 'number':
        return formatNumber(Number(value));
      default:
        return String(value);
    }
  };

  const getMetricFormat = (metric: keyof AirportData): string => {
    const option = METRIC_OPTIONS.find(m => m.value === metric);
    return option?.format || 'number';
  };

  // Calculate quadrant reference lines and intelligent label positions
  const calculateQuadrantLines = () => {
    if (quadrantMode === 'off') return { xLine: 0, yLine: 0, xLabelStrategy: 'bottom', yLabelStrategy: 'right' };

    const validData = filteredData.filter(d =>
      d[xAxis] != null && !isNaN(Number(d[xAxis])) &&
      d[yAxis] != null && !isNaN(Number(d[yAxis]))
    );

    if (validData.length === 0) return { xLine: 0, yLine: 0, xLabelStrategy: 'bottom', yLabelStrategy: 'right' };

    const xValues = validData.map(d => Number(d[xAxis]));
    const yValues = validData.map(d => Number(d[yAxis]));

    // Calculate min/max for positioning
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    let xLine, yLine;

    if (quadrantMode === 'median') {
      xValues.sort((a, b) => a - b);
      yValues.sort((a, b) => a - b);
      const xMid = Math.floor(xValues.length / 2);
      const yMid = Math.floor(yValues.length / 2);
      xLine = xValues.length % 2 === 0 ?
        (xValues[xMid - 1] + xValues[xMid]) / 2 :
        xValues[xMid];
      yLine = yValues.length % 2 === 0 ?
        (yValues[yMid - 1] + yValues[yMid]) / 2 :
        yValues[yMid];
    } else {
      xLine = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
      yLine = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    }

    // Calculate density on each side of the reference lines
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    // For vertical line (xLine): Count points in label placement areas
    // Define label zones: top 15% and bottom 15% of chart height
    const topZoneMin = yLine + (yMax - yLine) * 0.6;  // Upper region
    const bottomZoneMax = yLine - (yLine - yMin) * 0.6;  // Lower region

    let topZoneCount = 0;
    let bottomZoneCount = 0;

    validData.forEach(d => {
      const xVal = Number(d[xAxis]);
      const yVal = Number(d[yAxis]);

      // Only check points near the vertical line
      if (Math.abs(xVal - xLine) < xRange * 0.15) {
        // Count points that would interfere with label placement
        if (yVal >= topZoneMin) {
          topZoneCount++;
        }
        if (yVal <= bottomZoneMax) {
          bottomZoneCount++;
        }
      }
    });

    // Place label where there are fewer interfering points
    const xLabelStrategy = topZoneCount <= bottomZoneCount ? 'top' : 'bottom';

    // For horizontal line (yLine): Count points in label placement areas
    const leftZoneMax = xLine - (xLine - xMin) * 0.6;  // Left region
    const rightZoneMin = xLine + (xMax - xLine) * 0.6;  // Right region

    let leftZoneCount = 0;
    let rightZoneCount = 0;

    validData.forEach(d => {
      const xVal = Number(d[xAxis]);
      const yVal = Number(d[yAxis]);

      // Only check points near the horizontal line
      if (Math.abs(yVal - yLine) < yRange * 0.15) {
        // Count points that would interfere with label placement
        if (xVal <= leftZoneMax) {
          leftZoneCount++;
        }
        if (xVal >= rightZoneMin) {
          rightZoneCount++;
        }
      }
    });

    // Place label where there are fewer interfering points
    const yLabelStrategy = leftZoneCount <= rightZoneCount ? 'left' : 'right';

    return { xLine, yLine, xLabelStrategy, yLabelStrategy };
  };

  const { xLine, yLine, xLabelStrategy, yLabelStrategy } = calculateQuadrantLines();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const xOption = METRIC_OPTIONS.find(m => m.value === xAxis);
      const yOption = METRIC_OPTIONS.find(m => m.value === yAxis);
      const sizeOption = METRIC_OPTIONS.find(m => m.value === sizeMetric);

      // Safely get values with fallbacks
      const xValue = data[xAxis] ?? 'N/A';
      const yValue = data[yAxis] ?? 'N/A';
      const sizeValue = data[sizeMetric] ?? 'N/A';
      const airportName = data.airportName || data.locId || 'Unknown Airport';
      const city = data.city || 'Unknown';
      const state = data.state || 'Unknown';
      const hubSize = data.hubSize || 'N';

      const hubSizeLabel = hubSize === 'L' ? 'Large' :
                          hubSize === 'M' ? 'Medium' :
                          hubSize === 'S' ? 'Small' : 'Non-Hub';

      return (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            p: 2,
            boxShadow: theme.shadows[8],
            minWidth: 280,
            maxWidth: 350,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.primary.main }}>
            {airportName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {city}, {state} • {hubSizeLabel} Hub
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {xOption?.label || 'X-Axis'}:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {xValue !== 'N/A' ? formatValue(xValue, getMetricFormat(xAxis)) : 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {yOption?.label || 'Y-Axis'}:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {yValue !== 'N/A' ? formatValue(yValue, getMetricFormat(yAxis)) : 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {sizeOption?.label || 'Size'}:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {sizeValue !== 'N/A' ? formatValue(sizeValue, getMetricFormat(sizeMetric)) : 'N/A'}
              </Typography>
            </Box>
          </Box>
        </Box>
      );
    }
    return null;
  };

  const xOption = METRIC_OPTIONS.find(m => m.value === xAxis);
  const yOption = METRIC_OPTIONS.find(m => m.value === yAxis);
  const sizeOption = METRIC_OPTIONS.find(m => m.value === sizeMetric);


  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>

        {/* Mode Toggle */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Analysis Mode</InputLabel>
            <Select
              value={chartMode}
              label="Analysis Mode"
              onChange={(e) => setChartMode(e.target.value as ChartMode)}
            >
              <MenuItem value="executive">Executive Analysis</MenuItem>
              <MenuItem value="explore">Custom Exploration</MenuItem>
            </Select>
          </FormControl>

          {chartMode === 'executive' && (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Executive View</InputLabel>
              <Select
                value={executiveView}
                label="Executive View"
                onChange={(e) => setExecutiveView(e.target.value as ExecutiveView)}
              >
                <MenuItem value="growth-profitability">🎯 Growth-Profitability</MenuItem>
                <MenuItem value="cash-burden">💰 Cash & Burden</MenuItem>
                <MenuItem value="unit-economics">⚡ Unit Economics</MenuItem>
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Quadrants</InputLabel>
            <Select
              value={quadrantMode}
              label="Quadrants"
              onChange={(e) => setQuadrantMode(e.target.value as 'off' | 'average' | 'median')}
            >
              <MenuItem value="off">Off</MenuItem>
              <MenuItem value="average">Average Lines</MenuItem>
              <MenuItem value="median">Median Lines</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={excludeOutliers}
                onChange={(e) => setExcludeOutliers(e.target.checked)}
                size="small"
              />
            }
            label={`Exclude Outliers${excludeOutliers ? ` (${processedData.length - filteredData.length} excl.)` : ''}`}
          />
        </Box>

        {/* Executive View Description */}
        {chartMode === 'executive' && (
          <Box sx={{ mb: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {EXECUTIVE_VIEWS[executiveView].title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {EXECUTIVE_VIEWS[executiveView].description}
            </Typography>
          </Box>
        )}

        {/* Custom Controls for Explore Mode */}
        {chartMode === 'explore' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>X-Axis (Horizontal)</InputLabel>
                <Select
                  value={xAxis}
                  label="X-Axis (Horizontal)"
                  onChange={(e) => setXAxis(e.target.value as keyof AirportData)}
                >
                  {METRIC_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Y-Axis (Vertical)</InputLabel>
                <Select
                  value={yAxis}
                  label="Y-Axis (Vertical)"
                  onChange={(e) => setYAxis(e.target.value as keyof AirportData)}
                >
                  {METRIC_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Bubble Size</InputLabel>
                <Select
                  value={sizeMetric}
                  label="Bubble Size"
                  onChange={(e) => setSizeMetric(e.target.value as keyof AirportData)}
                >
                  {METRIC_OPTIONS.filter(option => !option.value.includes('Growth')).map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Color By</InputLabel>
                <Select
                  value={colorMetric}
                  label="Color By"
                  onChange={(e) => setColorMetric(e.target.value)}
                >
                  <MenuItem value="quadrant">Quadrant</MenuItem>
                  <MenuItem value="hubSize">Hub Size</MenuItem>
                  {METRIC_OPTIONS.filter(option => !option.value.includes('Growth')).map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {/* Legend */}
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Color Legend - Dynamic based on actual data */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
              Colors:
            </Typography>
            {(chartMode === 'explore' && colorMetric === 'quadrant') || (chartMode === 'executive' && EXECUTIVE_VIEWS[executiveView].colorMetric === 'quadrant') ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Composite Score (X + Y Position)
                </Typography>
                <Box sx={{
                  width: 200,
                  height: 20,
                  background: 'linear-gradient(to right, #fde725, #7ad151, #22a884, #2a788e, #414487, #440154)',
                  borderRadius: 1,
                  border: '1px solid rgba(0,0,0,0.1)'
                }} />
                <Typography variant="caption" color="text.secondary">
                  Low → High
                </Typography>
              </Box>
            ) : chartMode === 'explore' && colorMetric !== 'hubSize' ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {METRIC_OPTIONS.find(m => m.value === colorMetric)?.label || colorMetric}
                </Typography>
                <Box sx={{
                  width: 200,
                  height: 20,
                  background: 'linear-gradient(to right, #fde725, #7ad151, #22a884, #2a788e, #414487, #440154)',
                  borderRadius: 1,
                  border: '1px solid rgba(0,0,0,0.1)'
                }} />
                <Typography variant="caption" color="text.secondary">
                  Low → High
                </Typography>
              </Box>
            ) : (
              (() => {
                const uniqueHubSizes = Array.from(new Set(filteredData.map(d => d.hubSize))).sort();
                const hubSizeLabels = {
                  'L': 'Large Hub',
                  'M': 'Medium Hub',
                  'S': 'Small Hub',
                  'N': 'Non-Hub'
                };

                return uniqueHubSizes.map(hubSize => (
                  <Chip
                    key={hubSize}
                    label={hubSizeLabels[hubSize as keyof typeof hubSizeLabels]}
                    size="small"
                    sx={{ backgroundColor: HUB_COLORS[hubSize as keyof typeof HUB_COLORS], color: 'white' }}
                  />
                ));
              })()
            )}
          </Box>

          {/* Size Legend */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Bubble Size:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sizeOption?.label || 'Scale Metric'} (larger = higher value)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main,
                  opacity: 0.7
                }}
              />
              <Typography variant="caption">Small</Typography>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main,
                  opacity: 0.7,
                  mx: 1
                }}
              />
              <Typography variant="caption">Medium</Typography>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main,
                  opacity: 0.7,
                  ml: 1
                }}
              />
              <Typography variant="caption">Large</Typography>
            </Box>
          </Box>

        </Box>

        {/* Chart */}
        <Box sx={{ width: '100%', height: height, position: 'relative' }}>
          {filteredData.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography variant="h6" color="text.secondary">
                {isGrowthMetricSelected && !hasMultipleYears
                  ? 'Growth metrics require multiple years of data'
                  : 'No data available for bubble chart'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isGrowthMetricSelected && !hasMultipleYears
                  ? 'Select non-growth metrics or ensure dataset includes previous year data'
                  : 'Try adjusting the year or hub size filters'
                }
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                data={filteredData}
                margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
              >
                <defs>
                  <clipPath id="clip-path">
                    <rect x="0" y="0" width="100%" height="100%" />
                  </clipPath>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis
                  dataKey={xAxis}
                  type="number"
                  name={xOption?.label}
                  domain={axisDomains.xDomain}
                  tick={{ fontSize: 13 }}
                  tickFormatter={(value) => formatValue(value, getMetricFormat(xAxis))}
                  label={{
                    value: xOption?.label,
                    position: 'insideBottom',
                    offset: -40,
                    style: { textAnchor: 'middle', fontSize: '13px', fontWeight: 600 }
                  }}
                />
                <YAxis
                  dataKey={yAxis}
                  type="number"
                  name={yOption?.label}
                  domain={axisDomains.yDomain}
                  tick={{ fontSize: 13 }}
                  tickFormatter={(value) => formatValue(value, getMetricFormat(yAxis))}
                  label={{
                    value: yOption?.label,
                    angle: -90,
                    position: 'insideLeft',
                    offset: -25,
                    style: { textAnchor: 'middle', fontSize: '13px', fontWeight: 600 }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Quadrant Reference Lines - just the lines */}
                {quadrantMode !== 'off' && (
                  <>
                    <ReferenceLine
                      x={xLine}
                      stroke={theme.palette.primary.main}
                      strokeDasharray="8 4"
                      strokeWidth={2}
                    />
                    <ReferenceLine
                      y={yLine}
                      stroke={theme.palette.primary.main}
                      strokeDasharray="8 4"
                      strokeWidth={2}
                    />
                  </>
                )}

                <Scatter
                  data={filteredData}
                  fill="#8884d8"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    const radius = calculateBubbleSize(Number(payload[sizeMetric]));
                    const isSelected = selectedAirport?.locId === payload.locId;
                    const isHovered = hoveredAirport === payload.locId;

                    let color = getExecutiveColor(payload);
                    // Override color for selected airport
                    if (isSelected) {
                      color = '#DE8F05'; // Orange
                    }

                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={color}
                        fillOpacity={isHovered || isSelected ? 0.9 : 0.7}
                        stroke={isSelected ? '#CC6600' : (isHovered ? '#000' : color)}
                        strokeWidth={isSelected ? 3 : (isHovered ? 2 : 1)}
                        style={{ cursor: isHovered ? 'pointer' : 'default' }}
                        onMouseEnter={() => setHoveredAirport(payload.locId)}
                        onMouseLeave={() => setHoveredAirport(null)}
                      />
                    );
                  }}
                />

                {/* Quadrant Reference Line Labels - rendered after scatter to appear on top */}
                {quadrantMode !== 'off' && (
                  <>
                    <ReferenceLine
                      x={xLine}
                      stroke="transparent"
                      strokeWidth={0}
                      label={(props: any) => {
                        const { viewBox } = props;
                        const text = formatValue(xLine, getMetricFormat(xAxis));
                        const labelX = viewBox.x + viewBox.width / 2;
                        const labelY = xLabelStrategy === 'top'
                          ? viewBox.y + 35
                          : viewBox.y + viewBox.height - 35;

                        return (
                          <g>
                            <rect
                              x={labelX - 35}
                              y={labelY - 12}
                              width={70}
                              height={24}
                              fill="white"
                              stroke={theme.palette.primary.light}
                              strokeWidth={1}
                              rx={4}
                            />
                            <text
                              x={labelX}
                              y={labelY + 5}
                              textAnchor="middle"
                              fontSize={13}
                              fontWeight={600}
                              fill={theme.palette.primary.main}
                            >
                              {text}
                            </text>
                          </g>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={yLine}
                      stroke="transparent"
                      strokeWidth={0}
                      label={(props: any) => {
                        const { viewBox } = props;
                        const text = formatValue(yLine, getMetricFormat(yAxis));
                        // Always place at least 25% into the chart to avoid y-axis overlap
                        const chartWidth = viewBox.width;
                        let labelX;
                        if (yLabelStrategy === 'left') {
                          labelX = viewBox.x + Math.max(chartWidth * 0.25, 150);
                        } else {
                          labelX = viewBox.x + Math.min(chartWidth * 0.75, chartWidth - 150);
                        }
                        const labelY = viewBox.y;

                        return (
                          <g>
                            <rect
                              x={labelX - 35}
                              y={labelY - 12}
                              width={70}
                              height={24}
                              fill="white"
                              stroke={theme.palette.primary.light}
                              strokeWidth={1}
                              rx={4}
                            />
                            <text
                              x={labelX}
                              y={labelY + 5}
                              textAnchor="middle"
                              fontSize={13}
                              fontWeight={600}
                              fill={theme.palette.primary.main}
                            >
                              {text}
                            </text>
                          </g>
                        );
                      }}
                    />
                  </>
                )}
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Box>

      </CardContent>
    </Card>
  );
};

export default BubbleChart;