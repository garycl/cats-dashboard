import { AirportData } from '../context/DataContext';

const DATA_URL = '/data/FULL_Merged.json';

export const loadCATSData = async (): Promise<any[]> => {
  try {
    console.log('Loading data from:', DATA_URL);
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const rawData = await response.json();
    const yearSet = new Set(rawData.map((r: any) => r.fiscalYear));
    const uniqueYears = Array.from(yearSet).sort();
    const uniqueAirports = new Set(rawData.map((r: any) => r.locId)).size;

    console.log('Loaded data:', {
      totalRecords: rawData.length,
      sampleRecord: rawData[0],
      uniqueYears: uniqueYears,
      uniqueAirports: uniqueAirports,
      sampleKeys: rawData[0] ? Object.keys(rawData[0]).slice(0, 10) : []
    });
    return rawData;

  } catch (error) {
    console.error('Error loading CATS data:', error);
    throw new Error('Failed to load airport data');
  }
};

export const processAirportData = (rawData: any[]): AirportData[] => {
  // Filter out records with invalid years first
  const validData = rawData.filter(row => {
    const year = safeNumber(row.fiscalYear);
    return year >= 2019 && year <= 2024; // Only include valid years
  });

  console.log(`Filtered data: ${rawData.length} -> ${validData.length} records (removed ${rawData.length - validData.length} invalid records)`);

  const processed = validData.map(row => {
    // Map standardized field names directly from raw data
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
      operatingIncome: safeNumber(row.operatingIncome),
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
      unrestrictedCashAndInvestments: safeNumber(row.unrestrictedCashAndInvestments),
      bondProceeds: safeNumber(row.bondProceeds),
      proceedsSaleOfProperty: safeNumber(row.proceedsSaleOfProperty),
      debtServiceExclCoverage: safeNumber(row.debtServiceExclCoverage),
      debtServiceNetPfc: safeNumber(row.debtServiceNetPfc),

      // Aggregated Revenue Categories
      totalAeroPassengerRevenue: safeNumber(row.totalAeroPassengerRevenue),
      totalAeroNonpassengerRevenue: safeNumber(row.totalAeroNonpassengerRevenue),
      totalAeronauticalRevenue: safeNumber(row.totalAeronauticalRevenue),
      totalNonAeronauticalRevenue: safeNumber(row.totalNonAeronauticalRevenue),
      totalOperatingRevenue: safeNumber(row.totalOperatingRevenue),
      totalOperatingExpenses: safeNumber(row.totalOperatingExpenses),
      totalOperatingIncome: safeNumber(row.totalOperatingIncome),
      totalNonoperatingNetAndCapital: safeNumber(row.totalNonoperatingNetAndCapital),
      totalCapitalExpenditures: safeNumber(row.totalCapitalExpenditures ?? row.totalCapex),
      totalDebt: safeNumber(row.totalDebt),
      totalRestrictedAssetsCalculated: safeNumber(row.totalRestrictedAssetsCalculated ?? row.totalRestrictedAssets),
      reportingYearProceeds: safeNumber(row.reportingYearProceeds),
      totalDebtService: safeNumber(row.totalDebtService),

      // Operations
      enplanements: safeNumber(row.enplanements),
      landedWeightsInPounds: safeNumber(row.landedWeightsInPounds),
      annualAircraftOperations: safeNumber(row.annualAircraftOperations),
      signatoryLandingFeeRatePer1000Lbs: safeNumber(row.signatoryLandingFeeRatePer1000Lbs),
      fullTimeEquivalentEmployees: safeNumber(row.fullTimeEquivalentEmployees),

      // KPIs
      costPerEnplanement: safeNumber(row.costPerEnplanement),
      operatingMargin: safeNumber(row.operatingMargin),
      passengerAirlineCostPerEnplanement: safeNumber(row.passengerAirlineCostPerEnplanement),

      // Cost Categories
      securityAndLawEnforcementCosts: safeNumber(row.securityAndLawEnforcementCosts),
      arffCosts: safeNumber(row.arffCosts),
      repairsAndMaintenance: safeNumber(row.repairsAndMaintenance),
      marketingAdvertisingPromotions: safeNumber(row.marketingAdvertisingPromotions),

      // Legacy field mappings for backward compatibility
      LOC_ID: row.locId || '',
      Airport: row.airportName || '',
      City: row.city || '',
      State: row.state || '',
      Hub_FY25: row.hubSize || '',
      FYE: row.fiscalYearEnd || '',
      'Date Filed': row.dateFiled || '',
      FYE_year: safeNumber(row.fiscalYear),
      NTAD_LAT_DECIMAL: safeNumber(row.latitude),
      NTAD_LONG_DECIMAL: safeNumber(row.longitude),
      LocID: row.locId || '',
      'Hub Size': row.hubSize || '',
      Year: safeNumber(row.fiscalYear),
      Latitude: safeNumber(row.latitude),
      Longitude: safeNumber(row.longitude),
      Enplanements: safeNumber(row.enplanements),
      'Landed weights in pounds': safeNumber(row.landedWeightsInPounds),
      'Annual aircraft operations': safeNumber(row.annualAircraftOperations),
      'Tot Op Rev': safeNumber(row.totalOperatingRevenue),
      'Tot Op Exp': safeNumber(row.totalOperatingExpenses),
      'Op Margin %': safeNumber(row.operatingMargin),
      CPE: safeNumber(row.costPerEnplanement),
      'Unrestricted Cash': safeNumber(row.unrestrictedCashAndInvestments),
      'Aircraft Ops': safeNumber(row.annualAircraftOperations),
      'FTE Emp': safeNumber(row.fullTimeEquivalentEmployees),
      'Passenger airline cost per enplanement': safeNumber(row.passengerAirlineCostPerEnplanement),
      'Full time equivalent employees at end of year': safeNumber(row.fullTimeEquivalentEmployees),
      'Security and law enforcement costs': safeNumber(row.securityAndLawEnforcementCosts),
      'ARFF costs': safeNumber(row.arffCosts),
      'Repairs and maintenance': safeNumber(row.repairsAndMaintenance),
      'Marketing - Advertising - Promotions': safeNumber(row.marketingAdvertisingPromotions),
      aero_passenger_rev: safeNumber(row.totalAeroPassengerRevenue),
      aero_nonpassenger_rev: safeNumber(row.totalAeroNonpassengerRevenue),
      aero_total_rev: safeNumber(row.totalAeronauticalRevenue),
      nonaero_rev: safeNumber(row.totalNonAeronauticalRevenue),
      op_rev: safeNumber(row.totalOperatingRevenue),
      op_exp: safeNumber(row.totalOperatingExpenses),
      op_income: safeNumber(row.totalOperatingIncome),
      unrestricted_cash_investments: safeNumber(row.unrestrictedCashAndInvestments),
      debt_total: safeNumber(row.totalDebt),
      restricted_assets_total: safeNumber(row.totalRestrictedAssetsCalculated ?? row.totalRestrictedAssets),
      Parking: safeNumber(row.parkingCapex),
      passenger_airline_landing_fees: safeNumber(row.passengerAirlineLandingFees),
      capex_total: safeNumber(row.totalCapitalExpenditures ?? row.totalCapex),
      debt_service_total: safeNumber(row.totalDebtService),
      kpi_cpe: safeNumber(row.costPerEnplanement),
      kpi_oper_margin: safeNumber(row.operatingMargin),
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
