import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Card, CardContent, Paper } from '@mui/material';

interface RadarChartProps {
  data: any[];
  title?: string;
  height?: number;
  showComparison?: boolean;
  comparisonData?: any[];
  comparisonLabel?: string;
}

// Metric descriptions for tooltips
const METRIC_DESCRIPTIONS: Record<string, { description: string; interpretation: string }> = {
  'Revenue/Pax': {
    description: 'Revenue per Passenger - Total operating revenue per enplanement compared to industry average',
    interpretation: 'Higher scores indicate better revenue generation efficiency per passenger'
  },
  'Landing Fees': {
    description: 'Landing Fee Rate per 1,000 lbs - Signatory landing fee rate per 1,000 lbs compared to industry average',
    interpretation: 'Higher scores indicate stronger landing fee pricing power'
  },
  'Op Margin': {
    description: 'Operating Margin - Operating margin percentage compared to industry average',
    interpretation: 'Higher scores indicate better profitability and cost management'
  },
  'Cash/Debt': {
    description: 'Cash-to-Debt Ratio - Unrestricted cash divided by long-term debt compared to industry average',
    interpretation: 'Higher scores indicate stronger financial position and lower leverage risk'
  },
  'Revenue/FTE': {
    description: 'Revenue per Employee - Total operating revenue per full-time employee compared to industry average',
    interpretation: 'Higher scores indicate better employee productivity and operational efficiency'
  },
  'Days Cash': {
    description: 'Days Cash on Hand - Number of days of operating expenses covered by unrestricted cash reserves',
    interpretation: 'Higher scores indicate better financial liquidity and resilience'
  },
  'Revenue Growth': {
    description: 'Year-over-year revenue growth compared to hub-specific industry average',
    interpretation: 'Higher scores indicate better revenue growth vs similar-sized airports'
  },
  'Operations Growth': {
    description: 'Year-over-year aircraft operations growth compared to hub-specific industry average',
    interpretation: 'Higher scores indicate better operational growth vs similar-sized airports'
  },
  'Passenger Growth': {
    description: 'Year-over-year passenger growth compared to industry growth rates',
    interpretation: 'Higher scores indicate stronger passenger growth vs industry trends'
  },
  'Profitability Trend': {
    description: 'Operating margin improvement compared to industry profitability trends',
    interpretation: 'Higher scores indicate improving profitability vs industry trends'
  },
  'Cash Growth': {
    description: 'Cash reserves growth compared to industry financial strength trends',
    interpretation: 'Higher scores indicate growing financial reserves vs industry trends'
  },
  'Overall Momentum': {
    description: 'Combined growth score across revenue, operations, and passengers',
    interpretation: 'Higher scores indicate strong overall growth momentum vs industry'
  }
};

const CustomRadarChart: React.FC<RadarChartProps> = ({
  data,
  title = "Performance Radar",
  height = 400,
  showComparison = false,
  comparisonData = [],
  comparisonLabel = "Benchmark"
}) => {
  const theme = useTheme();

  // Determine which airports we have in the data (excluding 'metric')
  const airports = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'metric') : [];

  // Color palette for up to 4 airports: primary blue, red, green
  const colors = [
    theme.palette.primary.main, // Primary blue
    theme.palette.error.main,   // Red
    theme.palette.success.main, // Green
    theme.palette.warning.main  // Fallback (shouldn't be used with max 3)
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {title && (
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
            {title}
          </Typography>
        )}

        <Box sx={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 60, right: 60, bottom: 60, left: 60 }} outerRadius="70%">
              <PolarGrid
                stroke={theme.palette.divider}
                strokeWidth={1}
              />
              <PolarAngleAxis
                dataKey="metric"
                tick={{
                  fontSize: 11,
                  fill: theme.palette.text.primary,
                  fontWeight: 600,
                }}
                className="recharts-polar-angle-axis-tick"
                tickFormatter={(value) => value}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 200]}
                tick={{
                  fontSize: 10,
                  fill: theme.palette.text.secondary
                }}
                strokeWidth={0}
              />
              {/* Render a Radar line for each airport */}
              {airports.map((airport, index) => {
                const isPrimary = index === 0; // First airport is primary
                return (
                  <Radar
                    key={airport}
                    name={airport}
                    dataKey={airport}
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length]}
                    fillOpacity={isPrimary ? 0.15 : 0.05}
                    strokeWidth={isPrimary ? 5 : 3}
                    strokeOpacity={isPrimary ? 1.0 : 0.7}
                    dot={{
                      fill: colors[index % colors.length],
                      strokeWidth: isPrimary ? 4 : 2,
                      stroke: 'white',
                      r: isPrimary ? 7 : 5,
                      fillOpacity: isPrimary ? 1.0 : 0.8
                    }}
                  />
                );
              })}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length && label) {
                    const metricInfo = METRIC_DESCRIPTIONS[label];
                    return (
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: 300,
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          {label}
                        </Typography>
                        {metricInfo && (
                          <Typography variant="body2" sx={{ mb: 1, color: theme.palette.text.secondary }}>
                            {metricInfo.description}
                          </Typography>
                        )}
                        {payload.map((entry, index) => (
                          <Typography key={entry.dataKey} variant="body2" sx={{ fontWeight: 500, color: entry.color }}>
                            {entry.dataKey}: {entry.value?.toFixed(1)}%
                          </Typography>
                        ))}
                        {metricInfo && (
                          <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                            100% = Hub Industry Average
                          </Typography>
                        )}
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{
                  color: theme.palette.text.primary,
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CustomRadarChart;