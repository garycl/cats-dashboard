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

const HUB_COLORS = {
  'L': '#1976d2', // Large - Blue
  'M': '#388e3c', // Medium - Green
  'S': '#f57c00', // Small - Orange
  'N': '#d32f2f', // Non-hub - Red
};

const EXECUTIVE_VIEWS: Record<ExecutiveView, ExecutiveConfig> = {
  'growth-profitability': {
    title: 'Growth-Profitability Map',
    description: 'Revenue growth vs operating margin - the executive growth-returns framework',
    xAxis: 'revenueCAGR3Y',
    yAxis: 'operatingMargin',
    sizeMetric: 'enplanements',
    colorMetric: 'nonAirlineRevenueShare'
  },
  'cash-burden': {
    title: 'Cash & Burden Analysis',
    description: 'Financial resilience - growth vs debt burden with cash reserves',
    xAxis: 'revenueCAGR3Y',
    yAxis: 'debtServiceBurden',
    sizeMetric: 'unrestrictedCashAndInvestments',
    colorMetric: 'capexIntensity'
  },
  'unit-economics': {
    title: 'Unit Economics',
    description: 'Operational efficiency - non-airline revenue and cost per passenger',
    xAxis: 'nonAirlineRevenuePerEnplanement',
    yAxis: 'omExpensePerEnplanement',
    sizeMetric: 'enplanements',
    colorMetric: 'operatingMargin'
  }
};

const BubbleChart: React.FC<BubbleChartProps> = ({
  data,
  title = 'Airport Performance Matrix',
  height = 600,
}) => {
  const theme = useTheme();
  const { data: allData } = useData(); // Get full dataset for growth calculations

  const [chartMode, setChartMode] = useState<ChartMode>('executive');
  const [executiveView, setExecutiveView] = useState<ExecutiveView>('growth-profitability');
  const [xAxis, setXAxis] = useState<keyof AirportData>('operatingMargin');
  const [yAxis, setYAxis] = useState<keyof AirportData>('revenueGrowth');
  const [sizeMetric, setSizeMetric] = useState<keyof AirportData>('enplanements');
  const [quadrantMode, setQuadrantMode] = useState<'off' | 'average' | 'median'>('average');

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
    if (processedData.length === 0) return { min: 0, max: 1 };

    const values = processedData.map(d => Number(d[sizeMetric]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max };
  }, [processedData, sizeMetric]);

  const calculateBubbleSize = (value: number) => {
    if (sizeRange.max === sizeRange.min) return 10;
    const normalized = (value - sizeRange.min) / (sizeRange.max - sizeRange.min);
    const size = Math.max(3, Math.min(40, 5 + normalized * 35)); // Radius in pixels
    return size;
  };

  // Color scale for executive mode
  const getExecutiveColor = (airport: any) => {
    if (chartMode === 'explore') {
      return HUB_COLORS[airport.hubSize as keyof typeof HUB_COLORS];
    }

    const colorMetric = EXECUTIVE_VIEWS[executiveView].colorMetric;
    const value = airport[colorMetric];

    if (value === null || value === undefined) return '#grey';

    // Color scales for different metrics
    if (colorMetric === 'nonAirlineRevenueShare') {
      // Low to High: Red to Green
      const normalized = Math.min(100, Math.max(0, value)) / 100;
      const red = Math.round(255 * (1 - normalized));
      const green = Math.round(255 * normalized);
      return `rgb(${red}, ${green}, 50)`;
    } else if (colorMetric === 'operatingMargin') {
      // Negative to Positive: Red to Green
      const normalized = Math.min(50, Math.max(-50, value)) / 100 + 0.5;
      const red = Math.round(255 * (1 - normalized));
      const green = Math.round(255 * normalized);
      return `rgb(${red}, ${green}, 50)`;
    } else if (colorMetric === 'capexIntensity') {
      // Low to High: Green to Red (lower is better)
      const normalized = Math.min(50, Math.max(0, value)) / 50;
      const red = Math.round(255 * normalized);
      const green = Math.round(255 * (1 - normalized));
      return `rgb(${red}, ${green}, 50)`;
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

    const validData = processedData.filter(d =>
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

    // Intelligent positioning: analyze data clusters
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    // Create density map - divide chart into 4 quadrants
    const bottomLeft = validData.filter(d => Number(d[xAxis]) < xLine && Number(d[yAxis]) < yLine).length;
    const bottomRight = validData.filter(d => Number(d[xAxis]) >= xLine && Number(d[yAxis]) < yLine).length;
    const topLeft = validData.filter(d => Number(d[xAxis]) < xLine && Number(d[yAxis]) >= yLine).length;
    const topRight = validData.filter(d => Number(d[xAxis]) >= xLine && Number(d[yAxis]) >= yLine).length;

    // For X-axis label (vertical line): choose top or bottom based on where fewer points are
    const bottomDensity = bottomLeft + bottomRight;
    const topDensity = topLeft + topRight;
    const xLabelStrategy = topDensity < bottomDensity ? 'top' : 'bottom';

    // For Y-axis label (horizontal line): choose left or right based on where fewer points are
    const leftDensity = bottomLeft + topLeft;
    const rightDensity = bottomRight + topRight;
    const yLabelStrategy = leftDensity < rightDensity ? 'left' : 'right';

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
            <Grid item xs={12} md={4}>
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

            <Grid item xs={12} md={4}>
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

            <Grid item xs={12} md={4}>
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
          </Grid>
        )}

        {/* Legend */}
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Color Legend - Dynamic based on actual data */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
              Colors:
            </Typography>
            {(() => {
              const uniqueHubSizes = Array.from(new Set(processedData.map(d => d.hubSize))).sort();
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
            })()}
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

          {/* Quadrant Explanation */}
          {quadrantMode !== 'off' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Quadrants:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chart divided by {quadrantMode} values:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="caption" sx={{
                  px: 1,
                  py: 0.5,
                  backgroundColor: theme.palette.success.light,
                  borderRadius: 1,
                  color: 'white',
                  fontSize: '10px'
                }}>
                  Top-Right: High-High
                </Typography>
                <Typography variant="caption" sx={{
                  px: 1,
                  py: 0.5,
                  backgroundColor: theme.palette.warning.light,
                  borderRadius: 1,
                  color: 'white',
                  fontSize: '10px'
                }}>
                  Other Quadrants
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Chart */}
        <Box sx={{ width: '100%', height: height }}>
          {processedData.length === 0 ? (
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
                data={processedData}
                margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis
                  dataKey={xAxis}
                  type="number"
                  name={xOption?.label}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => formatValue(value, getMetricFormat(xAxis))}
                  label={{
                    value: xOption?.label,
                    position: 'insideBottom',
                    offset: -40,
                    style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 600 }
                  }}
                />
                <YAxis
                  dataKey={yAxis}
                  type="number"
                  name={yOption?.label}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => formatValue(value, getMetricFormat(yAxis))}
                  label={{
                    value: yOption?.label,
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 600 }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Quadrant Reference Lines */}
                {quadrantMode !== 'off' && (
                  <>
                    {/* Lines without labels first (background) */}
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

                    {/* Labels on top (foreground) with background boxes */}
                    <ReferenceLine
                      x={xLine}
                      stroke="transparent"
                      strokeWidth={0}
                      label={(props: any) => {
                        const { viewBox } = props;
                        const text = formatValue(xLine, getMetricFormat(xAxis));
                        const x = viewBox.x + viewBox.width / 2;
                        const y = xLabelStrategy === 'top'
                          ? viewBox.y + 40
                          : viewBox.y + viewBox.height - 40;

                        return (
                          <g>
                            <rect
                              x={x - 30}
                              y={y - 10}
                              width={60}
                              height={20}
                              fill="white"
                              stroke={theme.palette.primary.light}
                              strokeWidth={1}
                              rx={4}
                            />
                            <text
                              x={x}
                              y={y + 4}
                              textAnchor="middle"
                              fontSize={14}
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
                        const x = yLabelStrategy === 'left'
                          ? viewBox.x + 120
                          : viewBox.x + viewBox.width - 120;
                        const y = viewBox.y + viewBox.height / 2;

                        return (
                          <g>
                            <rect
                              x={x - 30}
                              y={y - 10}
                              width={60}
                              height={20}
                              fill="white"
                              stroke={theme.palette.primary.light}
                              strokeWidth={1}
                              rx={4}
                            />
                            <text
                              x={x}
                              y={y + 4}
                              textAnchor="middle"
                              fontSize={14}
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

                <Scatter
                  data={processedData}
                  fill="#8884d8"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    const radius = calculateBubbleSize(Number(payload[sizeMetric]));
                    const color = getExecutiveColor(payload);

                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={color}
                        fillOpacity={0.7}
                        stroke={color}
                        strokeWidth={1}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Box>

      </CardContent>
    </Card>
  );
};

export default BubbleChart;