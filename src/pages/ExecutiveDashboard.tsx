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
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Flight,
  Speed,
  Warning,
  CheckCircle,
  Business,
  Assessment,
  AccountBalance,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters';

const ExecutiveDashboard: React.FC = () => {
  const theme = useTheme();
  const { data, loading, getLatestYear } = useData();

  const currentYear = getLatestYear();
  const previousYear = currentYear - 1;


  const executiveSummary = React.useMemo(() => {
    if (data.length === 0) return null;

    const currentData = data.filter(d => d.fiscalYear === currentYear);
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
  }, [data, currentYear, previousYear]);

  const riskFactors = React.useMemo(() => {
    if (!executiveSummary) return [];

    const factors = [];

    if (executiveSummary.avgMargin < 0.05) {
      factors.push({
        level: 'high',
        title: 'Low Industry Margins',
        description: 'Average operating margins below 5% indicate industry-wide profitability challenges.',
      });
    }

    if (executiveSummary.cashToDebtRatio < 0.2) {
      factors.push({
        level: 'medium',
        title: 'Debt Coverage Concern',
        description: 'Low cash-to-debt ratio may indicate liquidity constraints.',
      });
    }

    if (executiveSummary.revenueGrowth < 0) {
      factors.push({
        level: 'high',
        title: 'Revenue Decline',
        description: 'Negative year-over-year revenue growth requires strategic attention.',
      });
    }

    const profitabilityRate = executiveSummary.profitableAirports / executiveSummary.totalAirports;
    if (profitabilityRate < 0.7) {
      factors.push({
        level: 'medium',
        title: 'Profitability Distribution',
        description: 'Less than 70% of airports showing positive operating margins.',
      });
    }

    return factors;
  }, [executiveSummary]);

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
          Loading Executive Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Executive Dashboard
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Strategic insights and high-level performance indicators for executive decision-making
        </Typography>
      </Box>

      {/* Executive Summary Cards */}
      {executiveSummary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`, color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <AttachMoney fontSize="large" />
                  </Avatar>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {formatCurrency(executiveSummary.totalRevenue)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Industry Revenue
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {executiveSummary.revenueGrowth >= 0 ? (
                    <TrendingUp fontSize="small" />
                  ) : (
                    <TrendingDown fontSize="small" />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatPercentage(Math.abs(executiveSummary.revenueGrowth))} YoY
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`, color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <Flight fontSize="large" />
                  </Avatar>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {formatNumber(executiveSummary.totalPassengers)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Passengers
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {executiveSummary.passengerGrowth >= 0 ? (
                    <TrendingUp fontSize="small" />
                  ) : (
                    <TrendingDown fontSize="small" />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatPercentage(Math.abs(executiveSummary.passengerGrowth))} YoY
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`, color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <TrendingUp fontSize="large" />
                  </Avatar>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {formatPercentage(executiveSummary.avgMargin)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Average Operating Margin
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Industry Performance
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Key Financial Metrics */}
      {executiveSummary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Financial Performance Overview
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                      {formatCurrency(executiveSummary.netIncome)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Net Operating Income
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                      {formatCurrency(executiveSummary.totalCash)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Unrestricted Cash
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                      {formatCurrency(executiveSummary.totalDebt)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Industry Debt
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                      {executiveSummary.profitableAirports}/{executiveSummary.totalAirports}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Profitable Airports
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Risk Assessment
              </Typography>

              {riskFactors.length === 0 ? (
                <Alert severity="success" icon={<CheckCircle />}>
                  <Typography variant="body2">
                    No significant risk factors identified. Industry performance is within acceptable parameters.
                  </Typography>
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {riskFactors.map((factor, index) => (
                    <Alert
                      key={index}
                      severity={factor.level === 'high' ? 'error' : 'warning'}
                      icon={<Warning />}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {factor.title}
                      </Typography>
                      <Typography variant="caption">
                        {factor.description}
                      </Typography>
                    </Alert>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Strategic Insights */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          Strategic Insights & Recommendations
        </Typography>

        <Grid container spacing={3}>
          {strategicInsights.map((insight, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.light, color: 'white', mr: 2 }}>
                    {index === 0 ? <Business /> : index === 1 ? <AccountBalance /> : <Assessment />}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {insight.title}
                  </Typography>
                </Box>

                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {insight.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.primary.main }}>
                  Recommendation:
                </Typography>
                <Typography variant="body2">
                  {insight.recommendation}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4, p: 3, backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Executive Summary
          </Typography>
          <Typography variant="body1">
            The US airport industry demonstrates resilience with {executiveSummary?.totalAirports || 0} airports
            generating {formatCurrency(executiveSummary?.totalRevenue || 0)} in combined revenue.
            Strategic focus on operational efficiency, revenue diversification, and infrastructure investment
            will drive continued growth and competitive advantage in the global aviation market.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ExecutiveDashboard;