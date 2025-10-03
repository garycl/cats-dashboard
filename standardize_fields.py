#!/usr/bin/env python3
"""
Script to standardize field names in FULL_Merged.json
Converts all field names to consistent camelCase and removes duplicates
"""

import json
import re

# Field mapping from old names to new standardized camelCase names
FIELD_MAPPING = {
    # Basic identifiers
    "LOC_ID": "locId",
    "Airport": "airportName",
    "City": "city",
    "State": "state",
    "Hub_FY25": "hubSize",
    "FYE": "fiscalYearEnd",
    "Date Filed": "dateFiled",
    "FYE_year": "fiscalYear",
    "NTAD_LAT_DECIMAL": "latitude",
    "NTAD_LONG_DECIMAL": "longitude",

    # Passenger Aeronautical Revenue (1.1-1.5)
    "passenger_airline_landing_fees": "passengerAirlineLandingFees",
    "terminal_arrival_rent_util": "terminalArrivalRentUtil",
    "terminal_apron_charges": "terminalApronCharges",
    "federal_inspection_fees": "federalInspectionFees",
    "other_passenger_aero_fees": "otherPassengerAeroFees",
    "Total Passenger Airline Aeronautical Revenue": "totalPassengerAeroRevenue",

    # Non-Passenger Aeronautical Revenue (2.1-2.8)
    "landing_fees_cargo": "cargoLandingFees",
    "landing_fees_ga_mil": "gaAndMilitaryLandingFees",
    "fbo_revenue": "fboRevenue",
    "cargo_hangar_rentals": "cargoHangarRentals",
    "aviation_fuel_tax_retained": "aviationFuelTaxRetained",
    "fuel_sales_or_flowage": "fuelSalesOrFlowage",
    "security_reimb_fed": "federalSecurityReimbursement",
    "other_nonpassenger_aero": "otherNonpassengerAeroRevenue",
    "Total Non-Passenger Aeronautical Revenue": "totalNonpassengerAeroRevenue",

    # Non-Aeronautical Revenue (4.1-4.8)
    "land_nonterminal_leases": "landAndNonterminalLeases",
    "terminal_food_bev": "terminalFoodAndBeverage",
    "terminal_retail_dutyfree": "terminalRetailAndDutyFree",
    "terminal_services_other": "terminalServicesAndOther",
    "rental_cars_excl_cfc": "rentalCarsExclCfc",
    "parking_ground_transport": "parkingAndGroundTransport",
    "hotel": "hotelRevenue",
    "other_nonaero": "otherNonAeroRevenue",

    # Operating Expenses (6.1-6.8)
    "personnel_comp_benefits": "personnelCompensationAndBenefits",
    "communications_utilities": "communicationsAndUtilities",
    "supplies_materials": "suppliesAndMaterials",
    "contractual_services": "contractualServices",
    "insurance_claims_settlements": "insuranceClaimsAndSettlements",
    "other_operating_expenses": "otherOperatingExpenses",
    "depreciation": "depreciation",

    # Income/Revenue Categories
    "Operating Income": "operatingIncome",
    "op_income": "totalOperatingIncome",  # Keep calculated version separate

    # Non-Operating Items (8.1-8.7)
    "interest_income": "interestIncome",
    "interest_expense": "interestExpense",
    "grant_receipts": "grantReceipts",
    "pfc": "passengerFacilityCharges",
    "capital_contributions": "capitalContributions",
    "special_items_loss": "specialItemsLoss",
    "other_nonoperating_revenue": "otherNonoperatingRevenue",

    # Net Assets (9.1-9.3)
    "net_assets_change": "netAssetsChange",
    "net_assets_beg": "netAssetsBeginning",
    "net_assets_end": "netAssetsEnd",

    # Capital Expenditures (10.1-10.5)
    "Airfield": "airfieldCapex",
    "Terminal": "terminalCapex",
    "Parking": "parkingCapex",
    "Roadways - Rail - Transit": "roadwaysRailTransitCapex",
    "Other Capital Expenditures": "otherCapitalExpenditures",
    "total_capex": "totalCapex",

    # Debt (11.1-11.3)
    "Long Term Bonds": "longTermBonds",
    "Loans and interim financing": "loansAndInterimFinancing",
    "Special facility bonds": "specialFacilityBonds",
    "total_debt_end_year": "totalDebtEndYear",

    # Restricted Assets (12.1-12.4)
    "restricted_debt_reserves": "restrictedDebtReserves",
    "restricted_renewals_repl": "restrictedRenewalsAndReplacements",
    "Restricted other": "restrictedOther",
    "Total Restricted Assets": "totalRestrictedAssets",

    # Cash and Investments (13.0)
    "unrestricted_cash_investments": "unrestrictedCashAndInvestments",

    # Other Financial Items
    "Bond proceeds": "bondProceeds",
    "proceeds_sale_property": "proceedsSaleOfProperty",
    "debt_service_excl_coverage": "debtServiceExclCoverage",
    "debt_service_net_pfc": "debtServiceNetPfc",

    # Operations & Performance Metrics
    "enplanements": "enplanements",
    "Landed weights in pounds": "landedWeightsInPounds",
    "Signatory landing fee rate per 1000 lbs": "signatoryLandingFeeRatePer1000Lbs",
    "Annual aircraft operations": "annualAircraftOperations",
    "Passenger airline cost per enplanement": "passengerAirlineCostPerEnplanement",
    "Full time equivalent employees at end of year": "fullTimeEquivalentEmployees",

    # Cost Categories
    "Security and law enforcement costs": "securityAndLawEnforcementCosts",
    "ARFF costs": "arffCosts",
    "Repairs and maintenance": "repairsAndMaintenance",
    "Marketing - Advertising - Promotions": "marketingAdvertisingPromotions",

    # Calculated Aggregates (from data processing)
    "aero_passenger_rev": "totalAeroPassengerRevenue",
    "aero_nonpassenger_rev": "totalAeroNonpassengerRevenue",
    "aero_total_rev": "totalAeronauticalRevenue",
    "nonaero_rev": "totalNonAeronauticalRevenue",
    "op_rev": "totalOperatingRevenue",
    "op_exp": "totalOperatingExpenses",
    "nonop_net_and_capital": "totalNonoperatingNetAndCapital",
    "capex_total": "totalCapitalExpenditures",
    "debt_total": "totalDebt",
    "restricted_assets_total": "totalRestrictedAssetsCalculated",
    "reporting_year_proceeds": "reportingYearProceeds",
    "debt_service_total": "totalDebtService",

    # KPIs
    "kpi_cpe": "costPerEnplanement",
    "kpi_oper_margin": "operatingMargin"
}

def standardize_json_fields(input_file, output_file):
    """
    Read JSON file and standardize all field names according to mapping
    """
    print(f"Loading data from {input_file}...")

    with open(input_file, 'r') as f:
        data = json.load(f)

    print(f"Processing {len(data)} records...")

    # Transform each record
    standardized_data = []
    for i, record in enumerate(data):
        if i % 1000 == 0:
            print(f"Processing record {i+1}...")

        new_record = {}

        # Apply field mappings
        for old_field, value in record.items():
            new_field = FIELD_MAPPING.get(old_field, old_field)

            # Convert string numbers to actual numbers where appropriate
            if isinstance(value, str) and value.replace('.', '').replace('-', '').replace('E+', '').replace('e+', '').isdigit():
                try:
                    if 'E+' in value or 'e+' in value:
                        value = float(value)
                    elif '.' in value:
                        value = float(value)
                    else:
                        value = int(value)
                except (ValueError, TypeError):
                    pass  # Keep as string if conversion fails

            new_record[new_field] = value

        standardized_data.append(new_record)

    print(f"Writing standardized data to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(standardized_data, f, indent=2)

    print("Field standardization complete!")

    # Print summary of changes
    print(f"\nField mapping summary:")
    print(f"Total fields mapped: {len(FIELD_MAPPING)}")
    print(f"Records processed: {len(standardized_data)}")

if __name__ == "__main__":
    input_file = "/Users/Gary/Dropbox/Unison/Analytics/CATS/data/FULL_Merged.json"
    output_file = "/Users/Gary/Dropbox/Unison/Analytics/CATS/data/FULL_Merged_standardized.json"

    standardize_json_fields(input_file, output_file)