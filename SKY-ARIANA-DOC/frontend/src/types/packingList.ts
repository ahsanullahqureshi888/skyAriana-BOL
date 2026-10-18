/**
 * Data Schema for International Export/Import Packing List
 * Tailored for Sky Ariana & Balam Bar Baran Export Management System
 * Optimized for A4 / PDF Export and exact formatting compliance.
 */

export interface ExporterDetails {
  company_name: string;        // e.g., "PAHLAWAN NOORI LTD"
  address: string;             // e.g., "T.L NO: 1173-27 SH ORAN DAM INDUSTRIAL AREA KANDAHAR AFGHANISTAN"
  telephone: string;           // e.g., "+93707 070 975"
  license_number?: string;     // e.g., "1173-27"
  beneficiary_name: string;    // e.g., "PAHLAWAN NOORI LTD"
  account_number: string;      // e.g., "104502USD2341068"
  bank_name: string;           // e.g., "AFGHAN UNITED BANK"
  bank_address: string;        // e.g., "AUB BUILDING ZARGHONA MAI DAN, SHAHRIE-NOW, KABUL"
  swift_code: string;          // e.g., "AFGUAFKAXXX"
  correspondent_bank?: {
    bank_name: string;         // e.g., "AL SALAM BANK"
    account_number: string;    // e.g., "BH61ALSA00500951200102"
    instructions?: string;     // e.g., "PLEASE STATE AFGUAFKAXXX IN THE FIELD 57A OF THE MT 103"
  };
}

export interface ImporterDetails {
  company_name: string;        // e.g., "SV INTERNATIONAL"
  address: string;             // e.g., "71 GANDHI GALI, KHARI, BAOLI DELHI-110006 (INDIA)"
  gst_number?: string;         // e.g., "07ACPFS5791R1ZU"
  fssai_number?: string;       // e.g., "13324999000209"
  iec_code?: string;           // e.g., "0514045841"
  phone_number: string;        // e.g., "+919999494148"
}

export interface ShippingDetails {
  packing_list_number: string; // e.g., "011"
  date: string;                // e.g., "18/07/2026"
  invoice_number?: string;     // Source commercial invoice, when applicable
  airway_bill?: {
    form_type?: string;        // e.g., "Afghan Transit Form Airway Bill"
    number: string;            // Airway Bill / Transit Form No
    date?: string;             // Airway Bill Date
  };
  terms_of_payment: {
    letter_of_credit_no?: string; // Letter of Credit No
    collection_basis_no?: string; // Collection Basis No
  };
  routing: {
    through?: string;          // e.g., "KABUL / DELHI"
    via: string;               // e.g., "BY AIR FROM HAMID KARZAI AIRPORT TO INDIA"
  };
}

export interface PackingLineItem {
  item_no: number;             // e.g., 1
  product_name: string;        // e.g., "BLACK RAISINS GRADE 1"
  origin_country: string;      // e.g., "Afghanistan"
  quantity_cartons: number;    // e.g., 412
  unit_label: string;          // e.g., "CTNS"
  net_weight_kg: number;       // e.g., 6592
  gross_weight_kg: number;     // e.g., 7128
  dimensions: {
    length_cm: number;         // e.g., 47
    width_cm: number;          // e.g., 30
    height_cm: number;         // e.g., 25
  };
  volume_per_carton_cbm: number; // e.g., 0.035
  total_volume_cbm?: number;     // e.g., 14.52 (calculated if omitted)
}

export interface PackingListDocument {
  id?: string;
  exporter: ExporterDetails;
  importer: ImporterDetails;
  shipping: ShippingDetails;
  items: PackingLineItem[];
  remarks?: string;
  signatory_company?: string;  // e.g., "PHALAWAN NOORI LTD"
}
