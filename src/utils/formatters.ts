// Common formatting utilities for the CATS application

/**
 * Format a number as currency with compact notation
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

/**
 * Format a number with compact notation
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

/**
 * Format a decimal value as percentage
 */
export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

/**
 * Calculate year-over-year growth rate
 */
export const calculateYoYGrowth = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return (current - previous) / previous;
};

/**
 * Calculate growth rate between two values
 */
export const calculateGrowth = (current: number, previous: number): number => {
  if (!previous || previous === 0) return 0;
  return (current - previous) / previous;
};

/**
 * Calculate percentage relative to industry average (capped between 0-200%)
 */
export const calculatePercentage = (airportValue: number, industryAvg: number): number => {
  if (industryAvg === 0) return 100;
  return Math.min(200, Math.max(0, (airportValue / industryAvg) * 100));
};

/**
 * Calculate growth percentage for radar charts (normalized scale)
 */
export const calculateGrowthPercentage = (airportGrowth: number, industryGrowth: number): number => {
  // Normalize growth rates to positive scale, then calculate relative percentage
  const normalizedAirportGrowth = (airportGrowth + 1) * 100;
  const normalizedIndustryGrowth = (industryGrowth + 1) * 100;

  if (normalizedIndustryGrowth === 0) return 100;
  return Math.min(200, Math.max(0, (normalizedAirportGrowth / normalizedIndustryGrowth) * 100));
};

/**
 * Convert metric field names to user-friendly labels
 */
export const getMetricLabel = (metricKey: string): string => {
  const metricLabels: Record<string, string> = {
    'totalOperatingRevenue': 'Total Operating Revenue',
    'enplanements': 'Enplanements',
    'annualAircraftOperations': 'Aircraft Operations',
    'operatingMargin': 'Operating Margin %',
    'costPerEnplanement': 'Cost Per Enplanement',
    'unrestrictedCashAndInvestments': 'Unrestricted Cash'
  };
  return metricLabels[metricKey] || metricKey;
};

/**
 * Map metric keys to airport map field names (now uses consistent camelCase)
 */
export const mapMetricToAirportMap = (metric: string): string => {
  const mapping: Record<string, string> = {
    'totalOperatingRevenue': 'totalOperatingRevenue',
    'enplanements': 'enplanements',
    'annualAircraftOperations': 'annualAircraftOperations',
    'operatingMargin': 'operatingMargin',
    'costPerEnplanement': 'costPerEnplanement',
    'unrestrictedCashAndInvestments': 'unrestrictedCashAndInvestments'
  };
  return mapping[metric] || 'totalOperatingRevenue';
};