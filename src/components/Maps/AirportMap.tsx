import React, { useCallback, useMemo } from 'react';
import Map, { Marker, Popup, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Box,
  Paper,
  Typography,
  Chip,
  useTheme,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Flight,
  AttachMoney,
  People,
  TrendingUp,
  Place,
} from '@mui/icons-material';
import { AirportData, useData } from '../../context/DataContext';
import { formatCurrency, formatNumber, formatCostPerEnplanement } from '../../utils/formatters';

// Use CartoDB Dark with 2x resolution for crisp labels
const MAP_STYLE = {
  version: 8 as const,
  sources: {
    'dark-tiles': {
      type: 'raster' as const,
      tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}@2x.png'],
      tileSize: 512,
      attribution: '© CartoDB, © OpenStreetMap contributors'
    },
    'labels': {
      type: 'raster' as const,
      tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/dark_only_labels/{z}/{x}/{y}@2x.png'],
      tileSize: 512
    }
  },
  layers: [
    {
      id: 'dark-tiles',
      type: 'raster' as const,
      source: 'dark-tiles'
    },
    {
      id: 'labels',
      type: 'raster' as const,
      source: 'labels',
      paint: {
        'raster-opacity': 1.0
      }
    }
  ]
};

interface AirportMapProps {
  airports: AirportData[]; // Filtered airports for display
  allAirports?: AirportData[]; // Raw data for growth rate calculations
  height?: number | string;
  selectedMetric?: string; // External metric control
  showGrowthRate?: boolean; // External growth rate toggle
  onGrowthRateChange?: (showGrowthRate: boolean) => void; // Callback for growth rate changes
  externalHubSizeFilter?: string; // External hub size filter
  selectedYear?: number; // External year selection for growth rate calculations
  showBenchmark?: boolean; // External benchmark comparison toggle
  onBenchmarkChange?: (showBenchmark: boolean) => void; // Callback for benchmark changes
}

// Colorblind-friendly color scheme with transparency (matching CoverageMap)
const hubColors = {
  L: '#440154',    // Large - Deep Purple (most distinctive)
  M: '#3b528b',    // Medium - Dark Blue
  S: '#21908c',    // Small - Teal
  N: '#5dc863',    // Non-Hub - Green (easy to distinguish)
  default: '#fde725' // Default - Yellow
} as const;

// Highlight color for selected airport (bright yellow - highly visible against green/red)
const HIGHLIGHT_COLOR = '#FFD700';  // Gold/Yellow - stands out against red/green palette

type MetricOption = {
  value: string;
  label: string;
  format: 'number' | 'currency';
  better: 'higher' | 'lower';
  target?: number;
};

const metricOptions: MetricOption[] = [
  { value: 'enplanements', label: 'Enplanements', format: 'number', better: 'higher' },
  { value: 'totalOperatingRevenue', label: 'Operating Revenue', format: 'currency', better: 'higher' },
  { value: 'annualAircraftOperations', label: 'Aircraft Operations', format: 'number', better: 'higher' },
  { value: 'fullTimeEquivalentEmployees', label: 'FTE Employees', format: 'number', better: 'higher' },
  { value: 'operatingMargin', label: 'Operating Margin (%)', format: 'number', better: 'higher' },
  { value: 'costPerEnplanement', label: 'Cost Per Enplanement', format: 'currency', better: 'lower' },
  { value: 'unrestrictedCashAndInvestments', label: 'Unrestricted Cash', format: 'currency', better: 'higher' },
  { value: 'signatoryLandingFeeRatePer1000Lbs', label: 'Landing Fee Rate', format: 'currency', better: 'lower' },
  { value: 'aero_rev_per_enpl', label: 'Aero Revenue/Enpl', format: 'currency', better: 'higher' },
  { value: 'nonaero_per_enpl', label: 'Non-Aero Revenue/Enpl', format: 'currency', better: 'higher' },
  { value: 'op_rev_per_enpl', label: 'Operating Revenue/Enpl', format: 'currency', better: 'higher' },
  { value: 'days_cash_on_hand', label: 'Days Cash on Hand', format: 'number', better: 'higher' },
  { value: 'lt_debt_per_enpl', label: 'LT Debt/Enpl', format: 'currency', better: 'lower' }
];

const AirportMap: React.FC<AirportMapProps> = ({ airports, allAirports, height = 600, selectedMetric: externalMetric, showGrowthRate = false, onGrowthRateChange, externalHubSizeFilter, selectedYear, showBenchmark = true, onBenchmarkChange }) => {
  const theme = useTheme();
  const { selectedAirport } = useData();
  const [popupAirportId, setPopupAirportId] = React.useState<string | null>(null);

  // Use external hub size filter if provided, otherwise use internal state
  const hubSizeFilter = useMemo(() => {
    return externalHubSizeFilter || 'All';
  }, [externalHubSizeFilter]);

  // Use external metric if provided, otherwise default to first option
  const metric = externalMetric || metricOptions[0].value;

  const [viewState, setViewState] = React.useState({
    longitude: -105.0,
    latitude: 45.0,
    zoom: 2.5,
    pitch: 0,
    bearing: 0
  });

  // Get unique airports (latest year data only) and filter out any without valid coordinates
  const uniqueAirports = useMemo(() => {
    const latestYear = Math.max(...airports.map(a => a.fiscalYear));
    return airports
      .filter(a => {
        // Filter for latest year and valid coordinates
        if (a.fiscalYear !== latestYear) return false;

        // Check for valid latitude and longitude (not null, undefined, NaN, or 0)
        const lat = Number(a.latitude);
        const lng = Number(a.longitude);

        return Number.isFinite(lat) && Number.isFinite(lng) &&
               lat !== 0 && lng !== 0 &&
               lat >= -90 && lat <= 90 &&
               lng >= -180 && lng <= 180;
      })
      .reduce((acc, current) => {
        const existing = acc.find(a => a.locId === current.locId);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, [] as AirportData[]);
  }, [airports]);

  // Filter airports by hub size
  const filteredAirports = useMemo(() => {
    if (hubSizeFilter === 'All') {
      return uniqueAirports;
    }
    // Support comma-separated hub sizes from external filter
    const hubSizes = hubSizeFilter.split(',');
    return uniqueAirports.filter(airport => hubSizes.includes(airport.hubSize));
  }, [uniqueAirports, hubSizeFilter]);

  const getMetricValue = useCallback((airport: AirportData, key: string): number => {
    if (!airport) return 0;

    switch (key) {
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
        return Number(airport[key as keyof AirportData] ?? 0);
    }
  }, []);

  const computeAverage = (values: number[]): number => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const metricThresholds = useMemo(() => {
    const thresholds: Record<string, number> = {};
    metricOptions.forEach(option => {
      if (showGrowthRate) {
        // Calculate average growth rate for this metric
        const dataForGrowth = allAirports || airports;
        const currentYear = selectedYear || Math.max(...dataForGrowth.map(a => a.fiscalYear));
        const previousYear = currentYear - 1;

        // Get current and previous year data from all data, excluding inactive airports
        let currentYearData = dataForGrowth.filter(d => d.fiscalYear === currentYear && d.enplanements && d.enplanements > 0);
        let previousYearData = dataForGrowth.filter(d => d.fiscalYear === previousYear && d.enplanements && d.enplanements > 0);

        // Filter by hub size if not 'All'
        if (hubSizeFilter !== 'All') {
          const hubSizes = hubSizeFilter.split(',');
          currentYearData = currentYearData.filter(d => hubSizes.includes(d.hubSize));
          previousYearData = previousYearData.filter(d => hubSizes.includes(d.hubSize));
        }

        const growthRates = currentYearData
          .map(current => {
            const previous = previousYearData.find(p => p.locId === current.locId);
            if (!previous) return null;

            const currentValue = getMetricValue(current, option.value);
            const previousValue = getMetricValue(previous, option.value);

            // Skip if previous value is zero (division by zero)
            if (previousValue === 0) return null;

            // For percentage metrics (like operating margin), skip if base is too small
            // This prevents misleading extreme growth rates (e.g., 0.01% to 0.1% = 900% growth)
            if (option.value === 'operatingMargin' && Math.abs(previousValue) < 0.01) {
              return null;
            }

            const growthRate = ((currentValue - previousValue) / previousValue) * 100;

            // Filter extreme outliers (>500% growth) - likely data errors or meaningless small-base calculations
            if (!Number.isFinite(growthRate) || Math.abs(growthRate) > 500) return null;

            return growthRate;
          })
          .filter(rate => rate !== null);

        thresholds[option.value] = growthRates.length ? computeAverage(growthRates) : 0;
      } else {
        if (option.target !== undefined) {
          thresholds[option.value] = option.target;
        } else {
          // Use hub-specific or all airports based on filter
          // Use allAirports if available (unfiltered data), otherwise fall back to airports
          const dataForThreshold = allAirports || airports;
          const latestYear = Math.max(...dataForThreshold.map(a => a.fiscalYear));
          const currentYearAirports = dataForThreshold.filter(a => a.fiscalYear === latestYear);
          let airportsForThreshold = currentYearAirports;
          if (hubSizeFilter !== 'All') {
            const hubSizes = hubSizeFilter.split(',');
            airportsForThreshold = currentYearAirports.filter(airport => hubSizes.includes(airport.hubSize));
          }

          const values = airportsForThreshold
            .map(airport => getMetricValue(airport, option.value))
            .filter(value => Number.isFinite(value) && value !== 0);
          thresholds[option.value] = values.length ? computeAverage(values) : 0;
        }
      }
    });
    return thresholds;
  }, [uniqueAirports, hubSizeFilter, getMetricValue, showGrowthRate, airports, allAirports, selectedYear]);

  const getMarkerStyle = useCallback((airport: AirportData, option: MetricOption) => {
    const hubSize = airport.hubSize;
    let value, isPositive;

    if (showGrowthRate) {
      // Calculate growth rate for this specific airport
      const dataForGrowth = allAirports || airports;
      const currentYear = selectedYear || Math.max(...dataForGrowth.map(a => a.fiscalYear));
      const previousYear = currentYear - 1;

      const previousAirport = dataForGrowth.find(a => a.locId === airport.locId && a.fiscalYear === previousYear && a.enplanements && a.enplanements > 0);

      if (!previousAirport) {
        value = 0;
        isPositive = false;
      } else {
        const currentValue = getMetricValue(airport, option.value);
        const previousValue = getMetricValue(previousAirport, option.value);

        if (previousValue <= 0 || currentValue < 0) {
          value = 0;
          isPositive = false;
        } else {
          const growthRate = ((currentValue - previousValue) / previousValue) * 100;

          if (!Number.isFinite(growthRate)) {
            value = 0;
            isPositive = false;
          } else {
            value = growthRate;
            if (showBenchmark) {
              const threshold = metricThresholds[option.value] ?? 0;
              isPositive = growthRate >= threshold; // Growth rates - compare against benchmark
            } else {
              isPositive = growthRate >= 0; // Simple growth vs decline
            }
          }
        }
      }
    } else {
      value = getMetricValue(airport, option.value);
      if (showBenchmark) {
        const threshold = metricThresholds[option.value] ?? 0;
        isPositive = option.better === 'higher' ? value >= threshold : value <= threshold;
      } else {
        // Simple positive/negative for regular metrics when benchmark is off
        isPositive = value > 0;
      }
    }

    // Check if this is the selected airport
    const isSelected = selectedAirport === airport.locId;

    let size = 12;
    switch (hubSize) {
      case 'L':
        size = 24;
        break;
      case 'M':
        size = 18;
        break;
      case 'S':
        size = 14;
        break;
      case 'N':
        size = 9;
        break;
      default:
        size = 12;
    }

    return {
      size,
      color: isSelected ? HIGHLIGHT_COLOR : (isPositive ? '#1cc88a' : '#e74a3b'),
      value,
    };
  }, [getMetricValue, metricThresholds, showGrowthRate, airports, allAirports, selectedYear, showBenchmark, selectedAirport]);


  const getHubSizeLabel = (hubSize: string): string => {
    switch (hubSize) {
      case 'L': return 'Large Hub';
      case 'M': return 'Medium Hub';
      case 'S': return 'Small Hub';
      case 'N': return 'Non-Hub';
      default: return 'Unknown';
    }
  };

  const getHubSizeColor = (hubSize: string): string => {
    return hubColors[hubSize as keyof typeof hubColors] || hubColors.default;
  };

  const formatMetricDisplay = useCallback((value: number, option: MetricOption): string => {
    // Currency metrics (per enplanement, landing fees, CPE)
    const currencyMetrics = ['costPerEnplanement', 'signatoryLandingFeeRatePer1000Lbs', 'totalOperatingRevenue',
                             'unrestrictedCashAndInvestments', 'aero_rev_per_enpl', 'nonaero_per_enpl',
                             'op_rev_per_enpl', 'lt_debt_per_enpl'];
    // Percentage metrics
    const percentageMetrics = ['operatingMargin'];
    // Integer metrics (no decimals)
    const integerMetrics = ['fullTimeEquivalentEmployees'];

    if (percentageMetrics.includes(option.value)) {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (option.value === 'costPerEnplanement') {
      return formatCostPerEnplanement(value);
    }
    if (currencyMetrics.includes(option.value)) {
      return formatCurrency(value);
    }
    if (integerMetrics.includes(option.value)) {
      return Math.round(value).toLocaleString('en-US');
    }
    return formatNumber(value);
  }, []);

  const selectedOption = useMemo(() => {
    return metricOptions.find(option => option.value === metric) ?? metricOptions[0];
  }, [metric]);

  const metricDistribution = useMemo(() => {
    const total = filteredAirports.length;
    if (!total) {
      return { total: 0, positive: 0, negative: 0, positivePercent: 0, negativePercent: 0 };
    }

    const threshold = metricThresholds[selectedOption.value] ?? 0;
    let positive = 0;

    if (showGrowthRate) {
      // For growth rate comparison, calculate actual growth rates
      const dataForGrowth = allAirports || airports;
      const currentYear = selectedYear || Math.max(...dataForGrowth.map(a => a.fiscalYear));
      const previousYear = currentYear - 1;

      const previousYearData = dataForGrowth.filter(d => d.fiscalYear === previousYear);

      filteredAirports.forEach((airport) => {
        const previous = previousYearData.find(p => p.locId === airport.locId);
        if (!previous) return;

        const currentValue = getMetricValue(airport, selectedOption.value);
        const previousValue = getMetricValue(previous, selectedOption.value);

        if (previousValue <= 0 || currentValue < 0) return;

        const growthRate = ((currentValue - previousValue) / previousValue) * 100;

        if (Number.isFinite(growthRate)) {
          let isPositive;
          if (showBenchmark) {
            isPositive = growthRate >= threshold; // Growth rates - compare against benchmark
          } else {
            isPositive = growthRate >= 0; // Simple growth vs decline
          }
          if (isPositive) positive += 1;
        }
      });
    } else {
      // For regular metrics, use the existing logic
      filteredAirports.forEach((airport) => {
        const value = getMetricValue(airport, selectedOption.value);
        let isPositive;
        if (showBenchmark) {
          isPositive = selectedOption.better === 'higher' ? value >= threshold : value <= threshold;
        } else {
          isPositive = value > 0; // Simple positive/negative when benchmark is off
        }
        if (isPositive) positive += 1;
      });
    }

    const negative = total - positive;
    const positivePercent = Math.round((positive / total) * 1000) / 10;
    const negativePercent = Math.round((negative / total) * 1000) / 10;

    return { total, positive, negative, positivePercent, negativePercent };
  }, [filteredAirports, selectedOption, metricThresholds, getMetricValue, showGrowthRate, airports, allAirports, selectedYear, showBenchmark]);

  // Get current popup airport data (dynamically updates with filter changes)
  const popupInfo = useMemo(() => {
    if (!popupAirportId) return null;
    return filteredAirports.find(airport => airport.locId === popupAirportId) || null;
  }, [popupAirportId, filteredAirports]);

  const positiveVerb = selectedOption.better === 'higher' ? 'grew' : 'fell';
  const negativeVerb = selectedOption.better === 'higher' ? 'fell' : 'grew';


  return (
    <Box sx={{ height, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
      >
        {/* Toggles - Top Left */}
        {onBenchmarkChange && (
          <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 5 }}>
            <Paper sx={{
              p: 1.5,
              borderRadius: 2,
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {onBenchmarkChange && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showBenchmark}
                        onChange={(e) => onBenchmarkChange?.(e.target.checked)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: theme.palette.success.main,
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: theme.palette.success.main,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.8)' }}>
                        Industry Benchmark
                      </Typography>
                    }
                    sx={{ margin: 0 }}
                  />
                )}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Performance Statistics - Top Right */}
        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 5 }}>
          <Paper sx={{
            p: 1.5,
            borderRadius: 2,
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
            minWidth: 280,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}>
            {metricDistribution.total ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.8)' }}>
                    Sample Size:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.9)' }}>
                    {metricDistribution.total} airports
                  </Typography>
                </Box>

                {showBenchmark && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.8)' }}>
                        {(() => {
                          if (hubSizeFilter === 'All') return 'Industry Average';
                          const hubSizes = hubSizeFilter.split(',');
                          if (hubSizes.length > 1) {
                            const labels = hubSizes.map(h =>
                              h === 'L' ? 'L' : h === 'M' ? 'M' : h === 'S' ? 'S' : 'N'
                            );
                            return `${labels.join(', ')} Hubs Average`;
                          }
                          return `${hubSizeFilter === 'L' ? 'Large Hub' : hubSizeFilter === 'M' ? 'Medium Hub' : hubSizeFilter === 'S' ? 'Small Hub' : 'Non-Hub'} Average`;
                        })()}:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.9)' }}>
                        {showGrowthRate
                          ? `${(metricThresholds[selectedOption.value] || 0).toFixed(1)}%`
                          : formatMetricDisplay(metricThresholds[selectedOption.value] || 0, selectedOption)
                        }
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0d7940' }}>
                        Above Average:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0d7940' }}>
                        {metricDistribution.positive} ({metricDistribution.positivePercent.toFixed(1)}%)
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#c53030' }}>
                        Below Average:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#c53030' }}>
                        {metricDistribution.negative} ({metricDistribution.negativePercent.toFixed(1)}%)
                      </Typography>
                    </Box>
                  </>
                )}

                {!showBenchmark && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0d7940' }}>
                        {showGrowthRate ? 'Growing:' : 'Positive Values:'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0d7940' }}>
                        {metricDistribution.positive} ({metricDistribution.positivePercent.toFixed(1)}%)
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#c53030' }}>
                        {showGrowthRate ? 'Declining:' : 'Zero/Negative Values:'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#c53030' }}>
                        {metricDistribution.negative} ({metricDistribution.negativePercent.toFixed(1)}%)
                      </Typography>
                    </Box>
                  </>
                )}
              </>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                No airport data available
              </Typography>
            )}
          </Paper>
        </Box>


        {/* Airport Markers */}
        {filteredAirports.map((airport) => {
          const style = getMarkerStyle(airport, selectedOption);

          return (
            <Marker
              key={airport.locId}
              longitude={airport.longitude}
              latitude={airport.latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent?.stopPropagation();
                setPopupAirportId(airport.locId);
                setViewState((prev) => {
                  const latOffset = 20 / Math.pow(2, prev.zoom || 4); // push marker upward based on zoom
                  return {
                    ...prev,
                    longitude: airport.longitude,
                    latitude: airport.latitude + latOffset,
                  };
                });
              }}
            >
              <Box
                sx={{
                  width: style.size,
                  height: style.size,
                  borderRadius: '50%',
                  backgroundColor: `${style.color}CC`, // 80% opacity (CC = 204/255)
                  border: `2px solid ${style.color}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.5)',
                    backgroundColor: `${style.color}FF`, // Full opacity on hover
                    boxShadow: `0 12px 28px rgba(0,0,0,0.5), 0 0 0 4px ${style.color}66`
                  },
                  boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 0 0 3px ${style.color}44`,
                  opacity: 0.9,
                }}
              />
            </Marker>
          );
        })}

        {/* Popup for selected airport */}
        {popupInfo && (
          <Popup
            anchor="bottom"
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={() => setPopupAirportId(null)}
            closeButton
            closeOnClick={false}
            maxWidth="320px"
            offset={[0, -20]}
            className={showBenchmark ? (() => {
              const airportValue = getMetricValue(popupInfo, selectedOption.value);
              const benchmarkValue = metricThresholds[selectedOption.value] || 0;
              const isAbove = selectedOption.better === 'higher'
                ? airportValue >= benchmarkValue
                : airportValue <= benchmarkValue;
              return isAbove ? 'popup-above-benchmark' : 'popup-below-benchmark';
            })() : ''}
            style={{
              ...(showBenchmark && (() => {
                const airportValue = getMetricValue(popupInfo, selectedOption.value);
                const benchmarkValue = metricThresholds[selectedOption.value] || 0;
                const isAbove = selectedOption.better === 'higher'
                  ? airportValue >= benchmarkValue
                  : airportValue <= benchmarkValue;
                const color = isAbove ? '#1cc88a' : '#e74a3b';
                return {
                  '--popup-bg-color': color
                };
              })())
            } as any}
          >
            <Paper sx={{
              p: 1.5,
              minWidth: 240,
              ...(showBenchmark && (() => {
                const airportValue = getMetricValue(popupInfo, selectedOption.value);
                const benchmarkValue = metricThresholds[selectedOption.value] || 0;
                const isAbove = selectedOption.better === 'higher'
                  ? airportValue >= benchmarkValue
                  : airportValue <= benchmarkValue;
                const color = isAbove ? '#1cc88a' : '#e74a3b';
                return {
                  boxShadow: `0 0 0 4px ${color}44, 0 4px 12px rgba(0,0,0,0.2)`
                };
              })())
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Flight sx={{ color: theme.palette.primary.main }} fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {popupInfo.locId}
                </Typography>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  {popupInfo.airportName}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Place fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {popupInfo.city}, {popupInfo.state}
                </Typography>
                <Chip
                  label={getHubSizeLabel(popupInfo.hubSize)}
                  size="small"
                  sx={{
                    backgroundColor: `${getHubSizeColor(popupInfo.hubSize)}20`,
                    color: getHubSizeColor(popupInfo.hubSize),
                    fontWeight: 600
                  }}
                />
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {selectedOption.value !== 'enplanements' && (
                  <Chip
                    label={`${formatNumber(popupInfo.enplanements)} PAX`}
                    size="small"
                    variant="outlined"
                    icon={<People fontSize="inherit" />}
                    sx={{ fontWeight: 500 }}
                  />
                )}
                <Chip
                  label={(() => {
                    if (showGrowthRate) {
                      // Calculate growth rate
                      const dataForGrowth = allAirports || airports;
                      const currentYear = selectedYear || Math.max(...dataForGrowth.map(a => a.fiscalYear));
                      const previousYear = currentYear - 1;
                      const previousYearData = dataForGrowth.filter(d => d.fiscalYear === previousYear);
                      const previous = previousYearData.find(p => p.locId === popupInfo.locId);

                      if (!previous) return `${selectedOption.label}: N/A`;

                      const currentValue = getMetricValue(popupInfo, selectedOption.value);
                      const previousValue = getMetricValue(previous, selectedOption.value);

                      if (previousValue <= 0 || currentValue < 0) return `${selectedOption.label}: N/A`;

                      const growthRate = ((currentValue - previousValue) / previousValue) * 100;
                      return `${selectedOption.label}: ${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`;
                    }
                    return `${selectedOption.label}: ${formatMetricDisplay(getMetricValue(popupInfo, selectedOption.value), selectedOption)}`;
                  })()}
                  size="small"
                  variant="outlined"
                  icon={<TrendingUp fontSize="inherit" />}
                  sx={{ fontWeight: 500 }}
                />
                {showBenchmark && (() => {
                  const airportValue = getMetricValue(popupInfo, selectedOption.value);
                  const benchmarkValue = metricThresholds[selectedOption.value] || 0;
                  const isAbove = selectedOption.better === 'higher'
                    ? airportValue >= benchmarkValue
                    : airportValue <= benchmarkValue;
                  return (
                    <Chip
                      label={isAbove ? 'Above Benchmark' : 'Below Benchmark'}
                      size="small"
                      variant="filled"
                      sx={{
                        fontWeight: 600,
                        backgroundColor: isAbove ? '#1cc88a' : '#e74a3b',
                        color: 'white'
                      }}
                    />
                  );
                })()}
              </Stack>
            </Paper>
          </Popup>
        )}
      </Map>
    </Box>
  );
};

export default AirportMap;
