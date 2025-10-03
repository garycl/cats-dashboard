import { AirportData } from '../context/DataContext';

// Data URLs for different loading strategies
const DATA_URLS = {
  compressed: '/data/FULL_Merged.json.gz',
  uncompressed: '/data/FULL_Merged.json'
};

// Cache for loaded data to avoid re-fetching
const dataCache = new Map<string, any>();

// Check if browser supports gzip
const supportsGzip = (): boolean => {
  return typeof window !== 'undefined' &&
         'CompressionStream' in window ||
         navigator.userAgent.includes('gzip');
};

// Decompress gzipped data
const decompressGzip = async (response: Response): Promise<any> => {
  try {
    // Check if the server already decompressed the data (Content-Encoding: gzip)
    const contentEncoding = response.headers.get('content-encoding');

    if (contentEncoding === 'gzip') {
      // Server already handled decompression, just parse as JSON
      console.log('Server already decompressed gzip data');
      return await response.json();
    }

    // For modern browsers that support compression streams (manual decompression)
    if ('DecompressionStream' in window) {
      const stream = response.body?.pipeThrough(new DecompressionStream('gzip'));
      const decompressedResponse = new Response(stream);
      return await decompressedResponse.json();
    }

    // Fallback: let browser handle it
    return await response.json();
  } catch (error) {
    console.warn('Gzip decompression failed, falling back to uncompressed:', error);
    throw error;
  }
};

// Progressive data loader
export const loadCATSDataProgressive = async (
  onProgress?: (loaded: number, total: number) => void
): Promise<any[]> => {
  const cacheKey = 'full_cats_data';

  // Return cached data if available
  if (dataCache.has(cacheKey)) {
    console.log('Returning cached data');
    onProgress?.(100, 100);
    return dataCache.get(cacheKey);
  }

  try {
    console.log('Loading compressed data...');

    // Try compressed version first
    let response: Response;
    let useCompressed = true;

    try {
      response = await fetch(DATA_URLS.compressed, {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });

      if (!response.ok) {
        throw new Error(`Compressed fetch failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Compressed data failed, falling back to uncompressed:', error);
      useCompressed = false;
      response = await fetch(DATA_URLS.uncompressed);

      if (!response.ok) {
        throw new Error(`Uncompressed fetch failed: ${response.status}`);
      }
    }

    // Report initial progress
    onProgress?.(10, 100);

    // Handle response based on compression
    let rawData: any[];
    if (useCompressed) {
      console.log(`Loading compressed data (${(response.headers.get('content-length') || '915000')} bytes)`);
      onProgress?.(30, 100);

      try {
        rawData = await decompressGzip(response);
      } catch (error) {
        console.warn('Decompression failed, retrying with uncompressed...');
        const fallbackResponse = await fetch(DATA_URLS.uncompressed);
        rawData = await fallbackResponse.json();
      }
    } else {
      console.log(`Loading uncompressed data (${(response.headers.get('content-length') || '7500000')} bytes)`);
      rawData = await response.json();
    }

    onProgress?.(70, 100);

    // Validate and log data info
    const yearSet = new Set(rawData.map((r: any) => r.fiscalYear));
    const uniqueYears = Array.from(yearSet).sort();
    const uniqueAirports = new Set(rawData.map((r: any) => r.locId)).size;

    console.log('Data loaded successfully:', {
      totalRecords: rawData.length,
      uniqueYears: uniqueYears,
      uniqueAirports: uniqueAirports,
      compressionUsed: useCompressed,
      sampleRecord: rawData[0]
    });

    // Cache the data
    dataCache.set(cacheKey, rawData);
    onProgress?.(100, 100);

    return rawData;

  } catch (error) {
    console.error('Error loading CATS data:', error);
    onProgress?.(0, 100);
    throw new Error('Failed to load airport data');
  }
};

// Load data for specific years only (for faster initial loads)
export const loadCATSDataByYear = async (years: number[]): Promise<any[]> => {
  const cacheKey = `cats_data_${years.join('_')}`;

  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  // Load full data first
  const fullData = await loadCATSDataProgressive();

  // Filter by years
  const filteredData = fullData.filter(record =>
    years.includes(safeNumber(record.fiscalYear))
  );

  // Cache filtered data
  dataCache.set(cacheKey, filteredData);

  console.log(`Filtered data for years ${years.join(', ')}: ${filteredData.length} records`);
  return filteredData;
};

// Load latest year data only (fastest initial load)
export const loadLatestYearData = async (): Promise<any[]> => {
  try {
    // First, quickly get the latest year without loading all data
    const fullData = await loadCATSDataProgressive();
    const years = Array.from(new Set(fullData.map((r: any) => safeNumber(r.fiscalYear))));
    const latestYear = Math.max(...years.filter(y => y > 0));

    return loadCATSDataByYear([latestYear]);
  } catch (error) {
    console.error('Error loading latest year data:', error);
    throw error;
  }
};

// Original function for backward compatibility
export const loadCATSData = loadCATSDataProgressive;

// Process airport data - standardized camelCase fields only
export const processAirportData = (rawData: any[]): AirportData[] => {
  // Filter out records with invalid years first
  const validData = rawData.filter(row => {
    const year = safeNumber(row.fiscalYear);
    return year >= 2019 && year <= 2024; // Only include valid years
  });

  console.log(`Filtered data: ${rawData.length} -> ${validData.length} records (removed ${rawData.length - validData.length} invalid records)`);

  const processed = validData.map(row => {
    // Map to standardized camelCase field names only
    const processed: AirportData = {
      // Basic identifiers
      locId: row.locId || '',
      airportName: row.airportName || '',
      city: row.city || '',
      state: row.state || '',
      hubSize: row.hubSize || '',
      fiscalYearEnd: row.fiscalYearEnd || '',
      dateFiled: row.dateFiled || '',
      fiscalYear: safeNumber(row.fiscalYear),
      latitude: safeNumber(row.latitude),
      longitude: safeNumber(row.longitude),

      // Operations
      enplanements: safeNumber(row.enplanements),
      landedWeightsInPounds: safeNumber(row.landedWeightsInPounds),
      annualAircraftOperations: safeNumber(row.annualAircraftOperations),
      signatoryLandingFeeRatePer1000Lbs: safeNumber(row.signatoryLandingFeeRatePer1000Lbs),
      fullTimeEquivalentEmployees: safeNumber(row.fullTimeEquivalentEmployees),

      // Revenue
      totalOperatingRevenue: safeNumber(row.totalOperatingRevenue),
      totalOperatingExpenses: safeNumber(row.totalOperatingExpenses),
      operatingIncome: safeNumber(row.operatingIncome),
      operatingMargin: safeNumber(row.operatingMargin),

      // Financial
      unrestrictedCashAndInvestments: safeNumber(row.unrestrictedCashAndInvestments),
      totalDebt: safeNumber(row.totalDebt),
      totalCapitalExpenditures: safeNumber(row.totalCapitalExpenditures ?? row.totalCapex),
      totalDebtService: safeNumber(row.totalDebtService),

      // KPIs
      costPerEnplanement: safeNumber(row.costPerEnplanement),
      passengerAirlineCostPerEnplanement: safeNumber(row.passengerAirlineCostPerEnplanement),

      // Cost Categories
      securityAndLawEnforcementCosts: safeNumber(row.securityAndLawEnforcementCosts),
      arffCosts: safeNumber(row.arffCosts),
      repairsAndMaintenance: safeNumber(row.repairsAndMaintenance),
      marketingAdvertisingPromotions: safeNumber(row.marketingAdvertisingPromotions),

      // Revenue Components - Passenger Aeronautical
      passengerAirlineLandingFees: safeNumber(row.passengerAirlineLandingFees),
      terminalArrivalRentUtil: safeNumber(row.terminalArrivalRentUtil),
      terminalApronCharges: safeNumber(row.terminalApronCharges),
      federalInspectionFees: safeNumber(row.federalInspectionFees),
      otherPassengerAeroFees: safeNumber(row.otherPassengerAeroFees),
      totalPassengerAeroRevenue: safeNumber(row.totalPassengerAeroRevenue),

      // Revenue Components - Non-Passenger Aeronautical
      cargoLandingFees: safeNumber(row.cargoLandingFees),
      gaAndMilitaryLandingFees: safeNumber(row.gaAndMilitaryLandingFees),
      fboRevenue: safeNumber(row.fboRevenue),
      cargoHangarRentals: safeNumber(row.cargoHangarRentals),
      aviationFuelTaxRetained: safeNumber(row.aviationFuelTaxRetained),
      fuelSalesOrFlowage: safeNumber(row.fuelSalesOrFlowage),
      federalSecurityReimbursement: safeNumber(row.federalSecurityReimbursement),
      otherNonpassengerAeroRevenue: safeNumber(row.otherNonpassengerAeroRevenue),
      totalNonpassengerAeroRevenue: safeNumber(row.totalNonpassengerAeroRevenue),

      // Revenue Components - Non-Aeronautical
      landAndNonterminalLeases: safeNumber(row.landAndNonterminalLeases),
      terminalFoodAndBeverage: safeNumber(row.terminalFoodAndBeverage),
      terminalRetailAndDutyFree: safeNumber(row.terminalRetailAndDutyFree),
      terminalServicesAndOther: safeNumber(row.terminalServicesAndOther),
      rentalCarsExclCfc: safeNumber(row.rentalCarsExclCfc),
      parkingAndGroundTransport: safeNumber(row.parkingAndGroundTransport),
      hotelRevenue: safeNumber(row.hotelRevenue),
      otherNonAeroRevenue: safeNumber(row.otherNonAeroRevenue),

      // Operating Expense Categories
      personnelCompensationAndBenefits: safeNumber(row.personnelCompensationAndBenefits),
      communicationsAndUtilities: safeNumber(row.communicationsAndUtilities),
      suppliesAndMaterials: safeNumber(row.suppliesAndMaterials),
      contractualServices: safeNumber(row.contractualServices),
      insuranceClaimsAndSettlements: safeNumber(row.insuranceClaimsAndSettlements),
      otherOperatingExpenses: safeNumber(row.otherOperatingExpenses),
      depreciation: safeNumber(row.depreciation),

      // Financial Results
      interestIncome: safeNumber(row.interestIncome),
      interestExpense: safeNumber(row.interestExpense),
      grantReceipts: safeNumber(row.grantReceipts),
      passengerFacilityCharges: safeNumber(row.passengerFacilityCharges),
      capitalContributions: safeNumber(row.capitalContributions),
      specialItemsLoss: safeNumber(row.specialItemsLoss),
      otherNonoperatingRevenue: safeNumber(row.otherNonoperatingRevenue),

      // Net Assets
      netAssetsChange: safeNumber(row.netAssetsChange),
      netAssetsBeginning: safeNumber(row.netAssetsBeginning),
      netAssetsEnd: safeNumber(row.netAssetsEnd),

      // Capital Expenditures
      airfieldCapex: safeNumber(row.airfieldCapex),
      terminalCapex: safeNumber(row.terminalCapex),
      parkingCapex: safeNumber(row.parkingCapex),
      roadwaysRailTransitCapex: safeNumber(row.roadwaysRailTransitCapex),
      otherCapitalExpenditures: safeNumber(row.otherCapitalExpenditures),

      // Debt
      longTermBonds: safeNumber(row.longTermBonds),
      loansAndInterimFinancing: safeNumber(row.loansAndInterimFinancing),
      specialFacilityBonds: safeNumber(row.specialFacilityBonds),
      totalDebtEndYear: safeNumber(row.totalDebtEndYear),

      // Restricted Assets
      restrictedDebtReserves: safeNumber(row.restrictedDebtReserves),
      restrictedRenewalsAndReplacements: safeNumber(row.restrictedRenewalsAndReplacements),
      restrictedOther: safeNumber(row.restrictedOther),
      totalRestrictedAssets: safeNumber(row.totalRestrictedAssets),

      // Cash and Other Financial Items
      bondProceeds: safeNumber(row.bondProceeds),
      proceedsSaleOfProperty: safeNumber(row.proceedsSaleOfProperty),
      debtServiceExclCoverage: safeNumber(row.debtServiceExclCoverage),
      debtServiceNetPfc: safeNumber(row.debtServiceNetPfc),

      // Aggregated Revenue Categories
      totalAeroPassengerRevenue: safeNumber(row.totalAeroPassengerRevenue),
      totalAeroNonpassengerRevenue: safeNumber(row.totalAeroNonpassengerRevenue),
      totalAeronauticalRevenue: safeNumber(row.totalAeronauticalRevenue),
      totalNonAeronauticalRevenue: safeNumber(row.totalNonAeronauticalRevenue),
      totalOperatingIncome: safeNumber(row.totalOperatingIncome),
      totalNonoperatingNetAndCapital: safeNumber(row.totalNonoperatingNetAndCapital),
      totalRestrictedAssetsCalculated: safeNumber(row.totalRestrictedAssetsCalculated ?? row.totalRestrictedAssets),
      reportingYearProceeds: safeNumber(row.reportingYearProceeds),
    };

    return processed;
  });

  return processed;
};

const safeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isFinite(num) ? num : 0;
};

// Clear cache function for development
export const clearDataCache = (): void => {
  dataCache.clear();
  console.log('Data cache cleared');
};