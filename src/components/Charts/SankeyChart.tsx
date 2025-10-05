import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyJustify, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { AirportData } from '../../context/DataContext';
import { formatCurrency } from '../../utils/formatters';

interface SankeyChartProps {
  data: AirportData;
  title?: string;
  height?: number;
  width?: number;
}

type FlowNodeDatum = {
  id: string;
  name: string;
  level: number;
  color: string;
  category: string;
};

type FlowLinkDatum = Record<string, unknown>;

type FlowNode = SankeyNode<FlowNodeDatum, FlowLinkDatum>;
type FlowLink = SankeyLink<FlowNodeDatum, FlowLinkDatum>;

type ChartMode = 'revenue' | 'expenses' | 'capital';
type RevenueMode = 'all' | 'passenger' | 'nonpassenger' | 'nonaero';

interface ChartLegendItem {
  label: string;
  color: string;
}

const FINANCIAL_COLORS = {
  passengerAero: '#1565c0',
  nonPassengerAero: '#2e7d32',
  nonAeronautical: '#ef6c00',
  totalRevenue: '#009688',
  expense: '#c62828',
  nonOperating: '#7b1fa2',
  capitalUse: '#6d4c41',
  netAssets: '#4527a0',
  balanceSheet: '#37474f'
} as const;

const chartModes: { value: ChartMode; label: string }[] = [
  { value: 'revenue', label: 'Revenue Composition' },
  { value: 'expenses', label: 'Operating Expenses' },
  { value: 'capital', label: 'Capital & Net Assets' }
];

const revenueModes: { value: RevenueMode; label: string }[] = [
  { value: 'all', label: 'Subtotals' },
  { value: 'passenger', label: 'Passenger Aeronautical' },
  { value: 'nonpassenger', label: 'Non-Passenger Aeronautical' },
  { value: 'nonaero', label: 'Non-Aeronautical' }
];

const SankeyChart: React.FC<SankeyChartProps> = ({
  data,
  title = 'Airport Fund Flow',
  height = 520,
  width
}) => {
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = React.useState<ChartMode>('revenue');
  const [revenueMode, setRevenueMode] = React.useState<RevenueMode>('all');
  const [legendItems, setLegendItems] = React.useState<ChartLegendItem[]>([]);
  const [containerWidth, setContainerWidth] = React.useState(width || 980);

  // Update width based on container size
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        if (newWidth > 0) {
          setContainerWidth(width || newWidth);
        }
      }
    };

    // Set initial width with a slight delay to ensure container is rendered
    const timer = setTimeout(updateWidth, 0);

    // Update on resize
    if (!width) {
      window.addEventListener('resize', updateWidth);
    }

    return () => {
      clearTimeout(timer);
      if (!width) {
        window.removeEventListener('resize', updateWidth);
      }
    };
  }, [width]);

  useEffect(() => {
    if (!data || !svgRef.current || containerWidth === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const getValue = (key: string, defaultValue = 0): number => {
      const raw = data[key as keyof AirportData];
      const numeric = typeof raw === 'number' ? raw : Number(raw ?? defaultValue);
      return Number.isFinite(numeric) ? numeric : defaultValue;
    };

    const addNode = (nodes: FlowNodeDatum[], node: FlowNodeDatum) => {
      if (!nodes.find(n => n.id === node.id)) {
        nodes.push(node);
      }
    };

  const buildRevenueFlow = () => {
      const nodes: FlowNodeDatum[] = [];
      const links: FlowLink[] = [];

      const allRevenueGroups: { aggregate: FlowNodeDatum; components: FlowNodeDatum[]; mode: RevenueMode }[] = [
        {
          mode: 'passenger',
          aggregate: {
            id: 'totalAeroPassengerRevenue',
            name: 'Passenger Aeronautical\nRevenue',
            level: 1,
            color: FINANCIAL_COLORS.passengerAero,
            category: 'Passenger Aeronautical'
          },
          components: [
            { id: 'passengerAirlineLandingFees', name: 'Passenger Landing Fees', level: 0, color: FINANCIAL_COLORS.passengerAero, category: 'Passenger Aeronautical' },
            { id: 'terminalArrivalRentUtil', name: 'Terminal Rent & Utilities', level: 0, color: FINANCIAL_COLORS.passengerAero, category: 'Passenger Aeronautical' },
            { id: 'terminalApronCharges', name: 'Apron Charges', level: 0, color: FINANCIAL_COLORS.passengerAero, category: 'Passenger Aeronautical' },
            { id: 'federalInspectionFees', name: 'Federal Inspection Fees', level: 0, color: FINANCIAL_COLORS.passengerAero, category: 'Passenger Aeronautical' },
            { id: 'otherPassengerAeroFees', name: 'Other Passenger Fees', level: 0, color: FINANCIAL_COLORS.passengerAero, category: 'Passenger Aeronautical' }
          ]
        },
        {
          mode: 'nonaero',
          aggregate: {
            id: 'totalNonAeronauticalRevenue',
            name: 'Non-Aeronautical\nRevenue',
            level: 1,
            color: FINANCIAL_COLORS.nonAeronautical,
            category: 'Non-Aeronautical'
          },
          components: [
            { id: 'landAndNonterminalLeases', name: 'Land & Non-Terminal Leases', level: 0, color: FINANCIAL_COLORS.nonAeronautical, category: 'Non-Aeronautical' },
            { id: 'terminalFoodAndBeverage', name: 'Food & Beverage', level: 0, color: FINANCIAL_COLORS.nonAeronautical, category: 'Non-Aeronautical' },
            { id: 'terminalRetailAndDutyFree', name: 'Retail & Duty Free', level: 0, color: FINANCIAL_COLORS.nonAeronautical, category: 'Non-Aeronautical' },
            { id: 'terminalServicesAndOther', name: 'Terminal Services', level: 0, color: FINANCIAL_COLORS.nonAeronautical, category: 'Non-Aeronautical' },
            { id: 'rentalCarsExclCfc', name: 'Rental Cars', level: 0, color: FINANCIAL_COLORS.nonAeronautical, category: 'Non-Aeronautical' },
            { id: 'parkingAndGroundTransport', name: 'Parking & Ground Transport', level: 0, color: FINANCIAL_COLORS.nonAeronautical, category: 'Non-Aeronautical' },
            { id: 'hotelRevenue', name: 'Hotel Revenue', level: 0, color: FINANCIAL_COLORS.nonAeronautical, category: 'Non-Aeronautical' },
            { id: 'otherNonAeroRevenue', name: 'Other Commercial', level: 0, color: FINANCIAL_COLORS.nonAeronautical, category: 'Non-Aeronautical' }
          ]
        },
        {
          mode: 'nonpassenger',
          aggregate: {
            id: 'totalAeroNonpassengerRevenue',
            name: 'Non-Passenger Aeronautical\nRevenue',
            level: 1,
            color: FINANCIAL_COLORS.nonPassengerAero,
            category: 'Non-Passenger Aeronautical'
          },
          components: [
            { id: 'cargoLandingFees', name: 'Cargo Landing Fees', level: 0, color: FINANCIAL_COLORS.nonPassengerAero, category: 'Non-Passenger Aeronautical' },
            { id: 'gaAndMilitaryLandingFees', name: 'GA & Military Landing Fees', level: 0, color: FINANCIAL_COLORS.nonPassengerAero, category: 'Non-Passenger Aeronautical' },
            { id: 'fboRevenue', name: 'FBO Revenue', level: 0, color: FINANCIAL_COLORS.nonPassengerAero, category: 'Non-Passenger Aeronautical' },
            { id: 'cargoHangarRentals', name: 'Cargo & Hangar Rentals', level: 0, color: FINANCIAL_COLORS.nonPassengerAero, category: 'Non-Passenger Aeronautical' },
            { id: 'fuelSalesOrFlowage', name: 'Fuel Sales & Flowage', level: 0, color: FINANCIAL_COLORS.nonPassengerAero, category: 'Non-Passenger Aeronautical' },
            { id: 'federalSecurityReimbursement', name: 'Federal Security', level: 0, color: FINANCIAL_COLORS.nonPassengerAero, category: 'Non-Passenger Aeronautical' },
            { id: 'otherNonpassengerAeroRevenue', name: 'Other Cargo/GA Revenue', level: 0, color: FINANCIAL_COLORS.nonPassengerAero, category: 'Non-Passenger Aeronautical' }
          ]
        }
      ];

      // Filter revenue groups based on selected mode
      const revenueGroups = revenueMode === 'all'
        ? allRevenueGroups
        : allRevenueGroups.filter(group => group.mode === revenueMode);

      const totalOperatingRevenue: FlowNodeDatum = {
        id: 'totalOperatingRevenue',
        name: revenueMode === 'all' ? 'Total Operating\nRevenue' :
              revenueMode === 'passenger' ? 'Passenger Aeronautical\nRevenue' :
              revenueMode === 'nonpassenger' ? 'Non-Passenger Aeronautical\nRevenue' :
              'Non-Aeronautical\nRevenue',
        level: revenueMode === 'all' ? 2 : 1,
        color: revenueMode === 'all' ? FINANCIAL_COLORS.totalRevenue :
               revenueMode === 'passenger' ? FINANCIAL_COLORS.passengerAero :
               revenueMode === 'nonpassenger' ? FINANCIAL_COLORS.nonPassengerAero :
               FINANCIAL_COLORS.nonAeronautical,
        category: 'Total Operating Revenue'
      };

      const addRevenueLink = (source: FlowNodeDatum, target: FlowNodeDatum, key: string) => {
        const value = getValue(key);
        if (value <= 0) return;
        addNode(nodes, source);
        addNode(nodes, target);
        links.push({ source: source.id, target: target.id, value });
      };

      // Process all components by group to maintain proper ordering
      const allSortedComponents: { component: FlowNodeDatum; value: number; groupId: string; groupColor: string; groupCategory: string }[] = [];

      revenueGroups.forEach(({ aggregate, components, mode }) => {
        const sortedComponents = components
          .map(component => ({ component, value: getValue(component.id) }))
          .filter(item => item.value > 0)
          .sort((a, b) => b.value - a.value);

        // Add top 5 components with group information
        sortedComponents.slice(0, 5).forEach(({ component, value }) => {
          allSortedComponents.push({
            component,
            value,
            groupId: aggregate.id,
            groupColor: aggregate.color,
            groupCategory: aggregate.category
          });
        });

        // Handle "other" components
        const otherValue = sortedComponents.slice(5).reduce((sum, item) => sum + item.value, 0);
        if (otherValue > 0) {
          const otherNodeName =
            aggregate.id === 'totalAeroPassengerRevenue' ? 'Other Passenger' :
            aggregate.id === 'totalNonAeronauticalRevenue' ? 'Other Commercial' :
            aggregate.id === 'totalAeroNonpassengerRevenue' ? 'Other Cargo/GA' :
            'Other';

          const otherNode: FlowNodeDatum = {
            id: `${aggregate.id}-other`,
            name: otherNodeName,
            level: 0,
            color: aggregate.color,
            category: aggregate.category
          };
          allSortedComponents.push({
            component: otherNode,
            value: otherValue,
            groupId: aggregate.id,
            groupColor: aggregate.color,
            groupCategory: aggregate.category
          });
        }
      });

      // Now process the revenue flow logic
      revenueGroups.forEach(({ aggregate, components, mode }) => {
        const groupComponents = allSortedComponents.filter(item => item.groupId === aggregate.id);

        if (revenueMode === 'all') {
          // Simplified view: only show aggregate subtotals → total (no individual components)
          addNode(nodes, aggregate);
          addRevenueLink(aggregate, totalOperatingRevenue, aggregate.id);
        } else {
          // Detailed view: components → total (skip intermediate aggregate)
          // Add individual components to nodes for detailed views
          groupComponents.forEach(({ component }) => {
            addNode(nodes, component);
          });

          groupComponents.forEach(({ component, value }) => {
            addNode(nodes, totalOperatingRevenue);
            links.push({ source: component.id, target: totalOperatingRevenue.id, value });
          });
        }
      });

      const legend: ChartLegendItem[] = (() => {
        switch (revenueMode) {
          case 'passenger':
            return [
              { label: 'Passenger Aeronautical Components', color: FINANCIAL_COLORS.passengerAero }
            ];
          case 'nonpassenger':
            return [
              { label: 'Non-Passenger Aeronautical Components', color: FINANCIAL_COLORS.nonPassengerAero }
            ];
          case 'nonaero':
            return [
              { label: 'Non-Aeronautical Components', color: FINANCIAL_COLORS.nonAeronautical }
            ];
          default:
            return [
              { label: 'Passenger Aeronautical', color: FINANCIAL_COLORS.passengerAero },
              { label: 'Non-Passenger Aeronautical', color: FINANCIAL_COLORS.nonPassengerAero },
              { label: 'Non-Aeronautical', color: FINANCIAL_COLORS.nonAeronautical },
              { label: 'Total Operating Revenue', color: FINANCIAL_COLORS.totalRevenue }
            ];
        }
      })();

      return { nodes, links, legend };
    };

    const buildExpenseFlow = () => {
      const nodes: FlowNodeDatum[] = [];
      const links: FlowLink[] = [];

      const totalRevenue: FlowNodeDatum = {
        id: 'totalOperatingRevenue',
        name: 'Total Operating\nRevenue',
        level: 0,
        color: FINANCIAL_COLORS.totalRevenue,
        category: 'Total Operating Revenue'
      };

      const totalExpenses: FlowNodeDatum = {
        id: 'totalOperatingExpenses',
        name: 'Total Operating\nExpenses',
        level: 1,
        color: FINANCIAL_COLORS.expense,
        category: 'Operating Expenses'
      };

      const expenseCategories: FlowNodeDatum[] = [
        { id: 'personnelCompensationAndBenefits', name: 'Personnel Compensation\n& Benefits', level: 2, color: FINANCIAL_COLORS.expense, category: 'Operating Expenses' },
        { id: 'communicationsAndUtilities', name: 'Communications\n& Utilities', level: 2, color: FINANCIAL_COLORS.expense, category: 'Operating Expenses' },
        { id: 'suppliesAndMaterials', name: 'Supplies &\nMaterials', level: 2, color: FINANCIAL_COLORS.expense, category: 'Operating Expenses' },
        { id: 'contractualServices', name: 'Contractual\nServices', level: 2, color: FINANCIAL_COLORS.expense, category: 'Operating Expenses' },
        { id: 'insuranceClaimsAndSettlements', name: 'Insurance Claims\n& Settlements', level: 2, color: FINANCIAL_COLORS.expense, category: 'Operating Expenses' },
        { id: 'otherOperatingExpenses', name: 'Other Operating\nExpenses', level: 2, color: FINANCIAL_COLORS.expense, category: 'Operating Expenses' },
        { id: 'depreciation', name: 'Depreciation', level: 2, color: FINANCIAL_COLORS.expense, category: 'Operating Expenses' }
      ];

      const operatingIncome = getValue('totalOperatingIncome');
      const expenseTotal = getValue('totalOperatingExpenses');
      const revenueTotal = getValue('totalOperatingRevenue');
      const remainder = revenueTotal - expenseTotal;

      const operatingResult: FlowNodeDatum | null = remainder === 0
        ? null
        : {
            id: remainder >= 0 ? 'operatingIncome' : 'operatingLoss',
            name: remainder >= 0 ? 'Operating Income' : 'Operating Loss',
            level: 1,
            color: remainder >= 0 ? FINANCIAL_COLORS.totalRevenue : FINANCIAL_COLORS.expense,
            category: 'Operating Result'
          };

      addNode(nodes, totalRevenue);
      addNode(nodes, totalExpenses);

      links.push({ source: totalRevenue.id, target: totalExpenses.id, value: expenseTotal });
      if (operatingResult) {
        addNode(nodes, operatingResult);
        links.push({ source: totalRevenue.id, target: operatingResult.id, value: Math.abs(remainder) });
      }

      expenseCategories.forEach(category => {
        const value = getValue(category.id);
        if (value > 0) {
          addNode(nodes, category);
          links.push({ source: totalExpenses.id, target: category.id, value });
        }
      });

      const legend: ChartLegendItem[] = [
        { label: 'Total Operating Revenue', color: FINANCIAL_COLORS.totalRevenue },
        { label: 'Operating Expenses', color: FINANCIAL_COLORS.expense }
      ];

      if (operatingResult) {
        legend.push({ label: 'Operating Result', color: operatingResult.color });
      }

      return { nodes, links, legend };
    };

    const buildCapitalFlow = () => {
      const nodes: FlowNodeDatum[] = [];
      const links: FlowLink[] = [];

      const netAssetsChange: FlowNodeDatum = {
        id: 'netAssetsChange',
        name: 'Change in Net Assets',
        level: 0,
        color: FINANCIAL_COLORS.netAssets,
        category: 'Net Assets'
      };

      const capitalExpenditures: FlowNodeDatum = {
        id: 'totalCapitalExpenditures',
        name: 'Capital Expenditures\n& CIP',
        level: 1,
        color: FINANCIAL_COLORS.capitalUse,
        category: 'Capital Uses'
      };

      const debtService: FlowNodeDatum = {
        id: 'totalDebtService',
        name: 'Debt Service',
        level: 1,
        color: FINANCIAL_COLORS.capitalUse,
        category: 'Capital Uses'
      };

      const unrestrictedCash: FlowNodeDatum = {
        id: 'unrestrictedCashAndInvestments',
        name: 'Unrestricted Cash\n& Investments',
        level: 1,
        color: FINANCIAL_COLORS.balanceSheet,
        category: 'Balance Sheet'
      };

      const restrictedAssets: FlowNodeDatum = {
        id: 'totalRestrictedAssetsCalculated',
        name: 'Restricted Assets',
        level: 1,
        color: FINANCIAL_COLORS.balanceSheet,
        category: 'Balance Sheet'
      };

      const netAssetsEnd: FlowNodeDatum = {
        id: 'netAssetsEnd',
        name: 'Net Assets End\nof Year',
        level: 1,
        color: FINANCIAL_COLORS.balanceSheet,
        category: 'Balance Sheet'
      };

      const addCapitalLink = (target: FlowNodeDatum, key: string) => {
        const value = getValue(key);
        if (value <= 0) return;
        addNode(nodes, netAssetsChange);
        addNode(nodes, target);
        links.push({ source: netAssetsChange.id, target: target.id, value });
      };

      addCapitalLink(capitalExpenditures, 'totalCapitalExpenditures');
      addCapitalLink(debtService, 'totalDebtService');
      addCapitalLink(unrestrictedCash, 'unrestrictedCashAndInvestments');
      addCapitalLink(restrictedAssets, 'totalRestrictedAssetsCalculated');

      const endingNetAssets = getValue('netAssetsEnd');
      const beginningNetAssets = getValue('netAssetsBeginning');
      const netAssetsGain = endingNetAssets > beginningNetAssets ? endingNetAssets - beginningNetAssets : 0;
      if (netAssetsGain > 0) {
        addNode(nodes, netAssetsEnd);
        addNode(nodes, netAssetsChange);
        links.push({ source: netAssetsChange.id, target: netAssetsEnd.id, value: netAssetsGain });
      }

      const legend: ChartLegendItem[] = [
        { label: 'Net Assets', color: FINANCIAL_COLORS.netAssets },
        { label: 'Capital Uses', color: FINANCIAL_COLORS.capitalUse },
        { label: 'Balance Sheet', color: FINANCIAL_COLORS.balanceSheet }
      ];

      return { nodes, links, legend };
    };

    const { nodes, links, legend } =
      mode === 'revenue' ? buildRevenueFlow() : mode === 'expenses' ? buildExpenseFlow() : buildCapitalFlow();

    setLegendItems(links.length > 0 ? legend : []);

    if (nodes.length === 0 || links.length === 0) {
      return;
    }

    const adjustedHeight = height;

    const generator = sankey<FlowNodeDatum, FlowLinkDatum>()
      .nodeId(node => node.id)
      .nodeWidth(mode === 'revenue' ? 14 : 22)
      .nodePadding(mode === 'revenue' ? (revenueMode === 'all' ? 40 : 20) : 25)
      .nodeAlign(sankeyJustify)
      .extent([[100, 40], [containerWidth - 80, adjustedHeight - 40]]);

    const graph = generator({
      nodes: nodes.map(node => ({ ...node })),
      links: links.map(link => ({ ...link }))
    });

    const svg = d3
      .select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', adjustedHeight)
      .style('font-family', theme.typography.fontFamily || 'sans-serif')
      .style('font-size', '15px');

    svg
      .append('g')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', d => (d.source as FlowNode).color)
      .attr('stroke-opacity', 0.55)
      .attr('stroke-width', d => Math.max(2, (d.width || 0) * 1.15))
      .attr('fill', 'none')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke-opacity', 0.85);
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'sankey-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0,0,0,0.85)')
          .style('color', 'white')
          .style('padding', '8px 10px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', 1000)
          .html(`
            <strong>${(d.source as FlowNode).name.replace(/\n/g, ' ')} → ${(d.target as FlowNode).name.replace(/\n/g, ' ')}</strong><br/>
            ${formatCurrency(d.value || 0)}
          `);
        tooltip.style('left', `${event.pageX + 12}px`).style('top', `${event.pageY - 20}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke-opacity', 0.55);
        d3.selectAll('.sankey-tooltip').remove();
      });

    const nodeGroup = svg
      .append('g')
      .selectAll('g')
      .data(graph.nodes)
      .join('g');

    nodeGroup
      .append('rect')
      .attr('x', d => d.x0 || 0)
      .attr('y', d => d.y0 || 0)
      .attr('height', d => Math.max(0, (d.y1 || 0) - (d.y0 || 0)))
      .attr('width', d => Math.max(0, (d.x1 || 0) - (d.x0 || 0)))
      .attr('fill', d => (d as FlowNode).color)
      .attr('stroke', theme.palette.divider)
      .attr('stroke-width', 1)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill-opacity', 0.85);
        const value = d.value || 0;
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'sankey-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0,0,0,0.85)')
          .style('color', 'white')
          .style('padding', '8px 10px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', 1000)
          .html(`
            <strong>${(d as FlowNode).name.replace(/\n/g, ' ')}</strong><br/>
            ${formatCurrency(value)}
          `);
        tooltip.style('left', `${event.pageX + 12}px`).style('top', `${event.pageY - 20}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill-opacity', 1);
        d3.selectAll('.sankey-tooltip').remove();
      });

    nodeGroup.each(function (d) {
      const nodeData = d as FlowNode;
      const textLines = nodeData.name.split('\n');

      const text = d3
        .select(this)
        .append('text')
        .attr('x', ((d.x0 || 0) + (d.x1 || 0)) / 2)
        .attr('y', ((d.y0 || 0) + (d.y1 || 0)) / 2 - (textLines.length - 1) * 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '13px')
        .attr('font-weight', 700)
        .attr('fill', '#ffffff')
        .style('paint-order', 'stroke')
        .style('stroke', 'rgba(0,0,0,0.9)')
        .style('stroke-width', '3px')
        .style('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.7))');

      textLines.forEach((line, index) => {
        text
          .append('tspan')
          .attr('x', ((d.x0 || 0) + (d.x1 || 0)) / 2)
          .attr('dy', index === 0 ? 0 : 16)
          .text(line);
      });
    });
  }, [data, height, containerWidth, theme, mode, revenueMode]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            {title && (
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Choose a focus area to explore revenue, expense, or capital flows independently.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="sankey-mode-label">View</InputLabel>
              <Select
                labelId="sankey-mode-label"
                value={mode}
                label="View"
                onChange={(event) => setMode(event.target.value as ChartMode)}
              >
                {chartModes.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {mode === 'revenue' && (
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel id="revenue-mode-label">Revenue Breakdown</InputLabel>
                <Select
                  labelId="revenue-mode-label"
                  value={revenueMode}
                  label="Revenue Breakdown"
                  onChange={(event) => setRevenueMode(event.target.value as RevenueMode)}
                >
                  {revenueModes.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </Box>

        <Box ref={containerRef} sx={{ width: '100%', height: mode === 'revenue' && revenueMode === 'all' ? height + 100 : height, overflow: 'hidden' }}>
          <svg ref={svgRef} />
        </Box>

        {legendItems.length > 0 && (
          <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
            {legendItems.map(item => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 12, height: 12, backgroundColor: item.color, borderRadius: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SankeyChart;
