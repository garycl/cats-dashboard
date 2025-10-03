import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  loadCATSDataProgressive,
  loadLatestYearData,
  processAirportData
} from '../services/optimizedDataService';

// Types
export interface AirportData {
  // Basic identifiers (camelCase standard)
  locId: string;
  airportName: string;
  city: string;
  state: string;
  hubSize: string;
  fiscalYearEnd: string;
  dateFiled: string;
  fiscalYear: number;
  latitude: number;
  longitude: number;

  // Operations (camelCase standard)
  enplanements: number;
  landedWeightsInPounds: number;
  annualAircraftOperations: number;
  signatoryLandingFeeRatePer1000Lbs: number;
  fullTimeEquivalentEmployees: number;

  // Revenue (camelCase standard)
  totalOperatingRevenue: number;
  totalOperatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;

  // Financial (camelCase standard)
  unrestrictedCashAndInvestments: number;
  totalDebt: number;
  totalCapitalExpenditures: number;
  totalDebtService: number;

  // KPIs (camelCase standard)
  costPerEnplanement: number;
  passengerAirlineCostPerEnplanement: number;

  // Cost Categories (camelCase standard)
  securityAndLawEnforcementCosts: number;
  arffCosts: number;
  repairsAndMaintenance: number;
  marketingAdvertisingPromotions: number;

  // Revenue Components - Passenger Aeronautical
  passengerAirlineLandingFees: number;
  terminalArrivalRentUtil: number;
  terminalApronCharges: number;
  federalInspectionFees: number;
  otherPassengerAeroFees: number;
  totalPassengerAeroRevenue: number;

  // Revenue Components - Non-Passenger Aeronautical
  cargoLandingFees: number;
  gaAndMilitaryLandingFees: number;
  fboRevenue: number;
  cargoHangarRentals: number;
  aviationFuelTaxRetained: number;
  fuelSalesOrFlowage: number;
  federalSecurityReimbursement: number;
  otherNonpassengerAeroRevenue: number;
  totalNonpassengerAeroRevenue: number;

  // Revenue Components - Non-Aeronautical
  landAndNonterminalLeases: number;
  terminalFoodAndBeverage: number;
  terminalRetailAndDutyFree: number;
  terminalServicesAndOther: number;
  rentalCarsExclCfc: number;
  parkingAndGroundTransport: number;
  hotelRevenue: number;
  otherNonAeroRevenue: number;

  // Operating Expense Categories
  personnelCompensationAndBenefits: number;
  communicationsAndUtilities: number;
  suppliesAndMaterials: number;
  contractualServices: number;
  insuranceClaimsAndSettlements: number;
  otherOperatingExpenses: number;
  depreciation: number;

  // Financial Results
  interestIncome: number;
  interestExpense: number;
  grantReceipts: number;
  passengerFacilityCharges: number;
  capitalContributions: number;
  specialItemsLoss: number;
  otherNonoperatingRevenue: number;

  // Net Assets
  netAssetsChange: number;
  netAssetsBeginning: number;
  netAssetsEnd: number;

  // Capital Expenditures
  airfieldCapex: number;
  terminalCapex: number;
  parkingCapex: number;
  roadwaysRailTransitCapex: number;
  otherCapitalExpenditures: number;

  // Debt
  longTermBonds: number;
  loansAndInterimFinancing: number;
  specialFacilityBonds: number;
  totalDebtEndYear: number;

  // Restricted Assets
  restrictedDebtReserves: number;
  restrictedRenewalsAndReplacements: number;
  restrictedOther: number;
  totalRestrictedAssets: number;

  // Cash and Other Financial Items
  bondProceeds: number;
  proceedsSaleOfProperty: number;
  debtServiceExclCoverage: number;
  debtServiceNetPfc: number;

  // Aggregated Revenue Categories
  totalAeroPassengerRevenue: number;
  totalAeroNonpassengerRevenue: number;
  totalAeronauticalRevenue: number;
  totalNonAeronauticalRevenue: number;
  totalOperatingIncome: number;
  totalNonoperatingNetAndCapital: number;
  totalRestrictedAssetsCalculated: number;
  reportingYearProceeds: number;

  [key: string]: any;
}

export interface DataContextType {
  data: AirportData[];
  loading: boolean;
  loadingProgress: number;
  error: string | null;
  filteredData: AirportData[];
  selectedYears: number[];
  selectedStates: string[];
  selectedHubSizes: string[];
  selectedAirport: string | null;
  setSelectedYears: (years: number[]) => void;
  setSelectedStates: (states: string[]) => void;
  setSelectedHubSizes: (hubSizes: string[]) => void;
  setSelectedAirport: (airport: string | null) => void;
  getAirportsByDistance: (centerAirport: string, maxDistance: number) => AirportData[];
  getLatestYear: () => number;
  getAvailableYears: () => number[];
  getAvailableStates: () => string[];
  getAvailableHubSizes: () => string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AirportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedHubSizes, setSelectedHubSizes] = useState<string[]>([]);
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);

  // Load data on mount with progressive loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingProgress(0);
        setError(null);

        // Use progressive loading with progress callback
        const rawData = await loadCATSDataProgressive((loaded, total) => {
          const progress = Math.round((loaded / total) * 85); // Reserve 15% for processing
          setLoadingProgress(progress);
        });

        setLoadingProgress(85);
        const processedData = processAirportData(rawData);
        setLoadingProgress(95);

        setData(processedData);

        // Set default filters to latest available year
        const latestYear = Math.max(...processedData.map(d => d.fiscalYear));
        setSelectedYears([latestYear]);

        setLoadingProgress(100);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoadingProgress(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtered data based on selections
  const filteredData = React.useMemo(() => {
    let filtered = data;
    console.log(`Total airports in dataset: ${data.length}`);

    if (selectedYears.length > 0) {
      filtered = filtered.filter(d => selectedYears.includes(d.fiscalYear));
    }

    if (selectedStates.length > 0) {
      filtered = filtered.filter(d => selectedStates.includes(d.state));
    }

    if (selectedHubSizes.length > 0) {
      filtered = filtered.filter(d => selectedHubSizes.includes(d.hubSize));
    }

    // Filter out airports with no enplanements in the last three years
    const allYears = Array.from(new Set(data.map(d => d.fiscalYear))).sort((a, b) => b - a);
    const lastThreeYears = allYears.slice(0, 3);

    if (lastThreeYears.length > 0) {
      // Get airports that have at least some enplanements in any of the last 3 years
      const airportsWithEnplanements = new Set(
        data
          .filter(d =>
            lastThreeYears.includes(d.fiscalYear) &&
            (d.enplanements || 0) > 0
          )
          .map(d => d.locId)
      );

      const beforeFilterCount = filtered.length;
      filtered = filtered.filter(d => airportsWithEnplanements.has(d.locId));
      console.log(`Airport filtering: ${beforeFilterCount} → ${filtered.length} airports (removed ${beforeFilterCount - filtered.length} inactive airports)`);
    }

    return filtered;
  }, [data, selectedYears, selectedStates, selectedHubSizes]);

  // Helper functions
  const getAirportsByDistance = (centerAirport: string, maxDistance: number): AirportData[] => {
    const center = data.find(d => d.locId === centerAirport);
    if (!center) return [];

    return filteredData.filter(airport => {
      if (airport.locId === centerAirport) return true;

      const distance = calculateDistance(
        center.latitude,
        center.longitude,
        airport.latitude,
        airport.longitude
      );

      return distance <= maxDistance;
    });
  };

  const getLatestYear = (): number => {
    if (data.length === 0) return 2023;
    return Math.max(...data.map(d => d.fiscalYear));
  };

  const getAvailableYears = (): number[] => {
    return Array.from(new Set(data.map(d => d.fiscalYear))).sort((a, b) => b - a);
  };

  const getAvailableStates = (): string[] => {
    return Array.from(new Set(data.map(d => d.state))).sort();
  };

  const getAvailableHubSizes = (): string[] => {
    return ['L', 'M', 'S', 'N'];
  };

  const contextValue: DataContextType = {
    data,
    loading,
    loadingProgress,
    error,
    filteredData,
    selectedYears,
    selectedStates,
    selectedHubSizes,
    selectedAirport,
    setSelectedYears,
    setSelectedStates,
    setSelectedHubSizes,
    setSelectedAirport,
    getAirportsByDistance,
    getLatestYear,
    getAvailableYears,
    getAvailableStates,
    getAvailableHubSizes,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Utility function to calculate distance between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};