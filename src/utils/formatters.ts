// Common formatting utilities for the CATS application

/**
 * Format a number as currency with compact notation
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
};

/**
 * Format cost per enplanement with special handling for very small values
 */
export const formatCostPerEnplanement = (value: number): string => {
  // For very small values (> 0 but < 0.005), show 2 decimals to avoid rounding to $0.0
  if (value > 0 && value < 0.005) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  // Otherwise use standard compact notation
  return formatCurrency(value);
};

/**
 * Format a number with compact notation
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: 1,
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
    'annualAircraftOperations': 'Annual Aircraft Operations',
    'operatingMargin': 'Operating Margin',
    'costPerEnplanement': 'Cost Per Enplanement',
    'unrestrictedCashAndInvestments': 'Unrestricted Cash',
    'fullTimeEquivalentEmployees': 'Full-Time Equivalent Employees',
    'signatoryLandingFeeRatePer1000Lbs': 'Landing Fee Rate (per 1,000 lbs)',
    'aero_rev_per_enpl': 'Aeronautical Revenue Per Enplanement',
    'nonaero_per_enpl': 'Non-Aeronautical Revenue Per Enplanement',
    'op_rev_per_enpl': 'Total Operating Revenue Per Enplanement',
    'days_cash_on_hand': 'Days Cash on Hand',
    'lt_debt_per_enpl': 'Long-Term Debt Per Enplanement'
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
    'fullTimeEquivalentEmployees': 'fullTimeEquivalentEmployees',
    'operatingMargin': 'operatingMargin',
    'costPerEnplanement': 'costPerEnplanement',
    'unrestrictedCashAndInvestments': 'unrestrictedCashAndInvestments',
    'signatoryLandingFeeRatePer1000Lbs': 'signatoryLandingFeeRatePer1000Lbs',
    'aero_rev_per_enpl': 'aero_rev_per_enpl',
    'nonaero_per_enpl': 'nonaero_per_enpl',
    'op_rev_per_enpl': 'op_rev_per_enpl',
    'days_cash_on_hand': 'days_cash_on_hand',
    'lt_debt_per_enpl': 'lt_debt_per_enpl'
  };
  return mapping[metric] || 'totalOperatingRevenue';
};