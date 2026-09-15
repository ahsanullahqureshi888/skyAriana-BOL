export interface RouteStop {
  id: string
  location: string
  locationPersian: string
  stopOrder: number
  stopLabel?: string
  transportMode?: "truck" | "vessel" | "airplane" | "train" | "road"
  estimatedDuration?: string
  estimatedCost?: string
  costType?: string
  costTypePersian?: string
  costUSD?: number
  isExportLeg?: boolean
  capacity?: string
  arrivalDate?: string
  departureDate?: string
  notes?: string
  plateNumber?: string
  chassisNumber?: string
  trailerMan?: string
  customsSealRequired?: boolean
  customsSealNote?: string
}

export interface PredefinedRoute {
  id: string
  name: string
  namePersian: string
  country: string
}

export interface BillOfLading {
  id: string
  bol_number: string
  issue_date: string
  shipper_name: string
  shipper_address: string | null
  consignee_name: string
  consignee_address: string | null
  notify_party: string | null
  notify_party_address: string | null
  vessel_name: string | null
  voyage_number: string | null
  port_of_loading: string | null
  port_of_discharge: string | null
  place_of_delivery: string | null
  cargo_description: string | null
  net_weight: string | null
  gross_weight: string | null
  measurement: string | null
  container_numbers: string | null
  seal_numbers: string | null
  number_of_packages: string | null
  kgs_per_carton: string | null
  gross_weight_per_carton: string | null
  rate_per_kgs: string | null
  goods_value: string | null
  freight_payable_at: string | null
  freight_terms: string | null
  remarks: string | null
  created_at: string
  updated_at: string
}

export interface AfghanistanDocumentDetail {
  documentNumber: string
  dateIssued: string
  expiryDate?: string
  issuingAuthority: string
  issuingLocation?: string
  remarks?: string
  verified?: boolean
}

export type NoteTheme = 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'gray'

export const NOTE_THEMES: { value: NoteTheme; label: string; color: string }[] = [
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'green', label: 'Green', color: '#22c55e' },
  { value: 'orange', label: 'Orange', color: '#f97316' },
  { value: 'purple', label: 'Purple', color: '#a855f7' },
  { value: 'gray', label: 'Gray', color: '#6b7280' },
]

export interface BillOfLadingFormData {
  // Document ID (for PDF storage linking)
  id?: string
  bol_number?: string
  issue_date?: string
  notes_1?: string
  notes_1_label?: string
  notes_1_theme?: 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'gray'
  notes_2?: string
  notes_2_label?: string
  notes_2_theme?: 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'gray'
  
  // Truck Information
  truck_number: string
  driver_name: string
  driver_father_name: string
  driver_contact: string
  driver_rent: string
  driver_rent_currency?: "USD" | "AFN"
  driver_rent_usd?: number
  shipping_cost?: string
  shipping_cost_currency?: "USD" | "AFN"
  shipping_cost_usd?: number
  afn_to_usd_rate?: number
  
  // Routes (multiple stops)
  routes: RouteStop[]
  
  // Container Details
  container_type: string
  container_size: string
  container_numbers: string
  seal_numbers: string
  equipment_type?: string // '40RF', '20RF', '40HC', etc.
  temperature_setting?: string // e.g. '-18°C Frozen', '+4°C Chilled'
  plugging_days?: number // e.g. 7 days
  escort_service_required?: boolean // مامور بدرقه
  genset_required?: boolean
  
  // Shipper Information
  shipper_name: string
  shipper_address: string
  shipper_contact?: string
  shipper_email?: string
  shipper_licence?: string
  consignee_name: string
  consignee_address: string
  consignee_contact?: string
  consignee_email?: string
  consignee_fssai?: string
  notify_party: string
  notify_party_address: string
  vessel_name: string
  voyage_number: string
  port_of_loading: string
  port_of_discharge: string
  place_of_delivery: string
  cargo_description: string
  booking_number?: string
  invoice_number?: string
  invoice_date?: string
  hs_code?: string
  package_type?: string
  marks_and_numbers?: string
  packing_date?: string
  expiry_date?: string
  lot_no?: string
  lot_number?: string
  company_name?: string
  company_subtitle?: string
  company_phone?: string
  company_email?: string
  company_address?: string
  company_licence?: string
  net_weight: string
  gross_weight: string
  measurement: string
  number_of_packages: string
  kgs_per_carton: string
  gross_weight_per_carton: string
  rate_per_kgs: string
  goods_value: string
  freight_payable_at: string
  freight_terms: string
  remarks: string
  
  // Iran Office Information
  iran_office_building?: string
  iran_office_location?: string
  iran_office_pobox?: string
  iran_office_telefax?: string
  iran_office_cellphone?: string
  iran_office_email?: string
  
  // Afghanistan Documents
  afghanistan_documents: string[]
  afghanistan_document_details: Record<string, AfghanistanDocumentDetail>
}

export const AFGHANISTAN_DOCUMENT_OPTIONS = [
  { id: "transit_permit", label: "Transit Permit", labelPersian: "اجازه ترانزیت", icon: "truck", category: "transport", description: "Required for goods in transit through Afghanistan", required: true },
  { id: "customs_declaration", label: "Customs Declaration", labelPersian: "اظهارنامه گمرکی", icon: "file-text", category: "customs", description: "Official customs clearance document", required: true },
  { id: "commercial_invoice", label: "Commercial Invoice", labelPersian: "فاکتور تجاری", icon: "receipt", category: "commercial", description: "Invoice for commercial goods", required: true },
  { id: "packing_list", label: "Packing List", labelPersian: "لیست بسته بندی", icon: "list", category: "commercial", description: "Detailed list of packaged items", required: false },
  { id: "certificate_of_origin", label: "Certificate of Origin", labelPersian: "گواهی مبدا", icon: "globe", category: "customs", description: "Certifies country of origin", required: false },
  { id: "insurance_certificate", label: "Insurance Certificate", labelPersian: "گواهی بیمه", icon: "shield", category: "insurance", description: "Cargo insurance documentation", required: false },
  { id: "phytosanitary_cert", label: "Phytosanitary Certificate", labelPersian: "گواهی بهداشت نباتی", icon: "leaf", category: "health", description: "For plant products and agricultural goods", required: false },
  { id: "health_certificate", label: "Health Certificate", labelPersian: "گواهی بهداشت", icon: "heart", category: "health", description: "Health inspection certificate", required: false },
  { id: "weight_certificate", label: "Weight Certificate", labelPersian: "گواهی وزن", icon: "scale", category: "commercial", description: "Official weight measurement document", required: false },
  { id: "tir_carnet", label: "TIR Carnet", labelPersian: "کارنه تیر", icon: "bookmark", category: "transport", description: "International road transport document", required: true },
  { id: "driver_license", label: "Driver License Copy", labelPersian: "کپی جواز رانندگی", icon: "id-card", category: "driver", description: "Valid driver's license copy", required: false },
  { id: "vehicle_registration", label: "Vehicle Registration", labelPersian: "ثبت وسیله نقلیه", icon: "car", category: "driver", description: "Vehicle registration document", required: false },
  { id: "chamber_of_commerce", label: "Chamber of Commerce Cert.", labelPersian: "گواهی اتاق تجارت", icon: "building", category: "commercial", description: "Chamber of Commerce certification", required: false },
  { id: "tax_clearance", label: "Tax Clearance", labelPersian: "مفاصا حساب مالیاتی", icon: "landmark", category: "customs", description: "Tax payment clearance certificate", required: false },
  { id: "border_crossing_permit", label: "Border Crossing Permit", labelPersian: "اجازه عبور مرزی", icon: "map-pin", category: "transport", description: "Permit for border crossing", required: true },
  { id: "passport_copy", label: "Passport/ID Copy", labelPersian: "کپی پاسپورت/تذکره", icon: "user", category: "driver", description: "Driver's passport or national ID", required: false },
  { id: "loading_permit", label: "Loading Permit", labelPersian: "اجازه بارگیری", icon: "package", category: "transport", description: "Permission to load cargo", required: false },
  { id: "security_clearance", label: "Security Clearance", labelPersian: "تأییدیه امنیتی", icon: "shield-check", category: "security", description: "Security verification document", required: false },
] as const

export type DocumentCategory = "transport" | "customs" | "commercial" | "health" | "insurance" | "driver" | "security"

export const DOCUMENT_CATEGORIES: Record<DocumentCategory, { label: string; labelPersian: string; color: string }> = {
  transport: { label: "Transport", labelPersian: "حمل و نقل", color: "blue" },
  customs: { label: "Customs", labelPersian: "گمرکی", color: "amber" },
  commercial: { label: "Commercial", labelPersian: "تجاری", color: "emerald" },
  health: { label: "Health & Safety", labelPersian: "بهداشت و ایمنی", color: "rose" },
  insurance: { label: "Insurance", labelPersian: "بیمه", color: "purple" },
  driver: { label: "Driver & Vehicle", labelPersian: "راننده و وسیله نقلیه", color: "cyan" },
  security: { label: "Security", labelPersian: "امنیتی", color: "red" },
}

export const initialFormData: BillOfLadingFormData = {
  // Document ID
  id: undefined,
  bol_number: undefined,
  issue_date: undefined,
  notes_1: "نظرمحمد (یارمل)\n(+93) 0 700 203 307",
  notes_1_label: "دکندهار بارګیری مسؤل",
  notes_1_theme: 'red',
  notes_2: "عبدالوهاب ریگوال اسلام قلعه/نجیب الله حسین محمودی مقدم\n0796140001  0703130001\nنماینده دوغارون /شماره تماس : 09152091993",
  notes_2_label: "نماینده نمبر",
  notes_2_theme: 'red',
  
  // Truck Information
  truck_number: "",
  driver_name: "",
  driver_father_name: "",
  driver_contact: "",
  driver_rent: "",
  
  // Routes - default with origin and destination
  routes: [
    {
      id: crypto.randomUUID(),
      location: "Kandahar",
      locationPersian: "کندهار",
      stopOrder: 1,
      transportMode: "truck",
        stopLabel: "Origin",
    },
    {
      id: crypto.randomUUID(),
      location: "Nimroz",
      locationPersian: "نیمروز / میلک",
      stopOrder: 2,
      transportMode: "truck",
        stopLabel: "Stop 1",
    },
    {
      id: crypto.randomUUID(),
      location: "Bandar Abbas, IR",
      locationPersian: "بندرعباس، ایران",
      stopOrder: 3,
      transportMode: "vessel",
        stopLabel: "Stop 2",
    },
    {
      id: crypto.randomUUID(),
      location: "Dubai, AE",
      locationPersian: "دبی، امارات",
      stopOrder: 4,
      transportMode: "vessel",
        stopLabel: "Stop 3",
    },
    {
      id: crypto.randomUUID(),
      location: "Nhava Sheva, IN",
      locationPersian: "نوا شوا، هند",
      stopOrder: 5,
      transportMode: "vessel",
        stopLabel: "Destination",
    },
  ],
  
  // Container Details
  container_type: "",
  container_size: "",
  container_numbers: "",
  seal_numbers: "",
  
  // Shipper Information
  shipper_name: "",
  shipper_address: "",
  shipper_contact: "",
  shipper_email: "",
  consignee_name: "",
  consignee_address: "",
  consignee_contact: "",
  consignee_email: "",
  notify_party: "",
  notify_party_address: "",
  vessel_name: "",
  voyage_number: "",
  port_of_loading: "",
  port_of_discharge: "",
  place_of_delivery: "",
  cargo_description: `📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS
🥬 Cargo: | 📅 Transit Date: | 📄 HS CODE:  │ 📄 Afghan TC No:  │ 📄 Invoice NO: `,
  net_weight: "",
  gross_weight: "",
  measurement: "",
  number_of_packages: "",
  kgs_per_carton: "",
  gross_weight_per_carton: "",
  rate_per_kgs: "",
  goods_value: "",
  freight_payable_at: "",
  freight_terms: "",
  remarks: "",
  
  // Iran Office Information
  iran_office_building: "CUBIC BUILDING",
  iran_office_location: "BANDAR ABBASS - IRAN",
  iran_office_pobox: "7913973295",
  iran_office_telefax: "+98 76 32226028",
  iran_office_cellphone: "+98 09172325086",
  iran_office_email: "info@balambarbaran.com, ceo@balambarbaran.com",
  
  // Afghanistan Documents
  afghanistan_documents: [],
  afghanistan_document_details: {},
}
