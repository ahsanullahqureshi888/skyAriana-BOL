/**
 * Type definitions for Bills of Lading database operations
 */

export interface BillOfLadingRecord {
  id: string
  user_id: string
  bol_number: string
  issue_date: string
  status: string
  shipper_name?: string
  shipper_address?: string
  shipper_contact?: string
  consignee_name?: string
  consignee_address?: string
  consignee_contact?: string
  truck_number?: string
  driver_name?: string
  driver_father_name?: string
  driver_contact?: string
  driver_rent?: string
  container_number?: string
  container_type?: string
  equipment_type?: string // '40RF', '20RF', '40HC'
  temperature_setting?: string
  plugging_days?: number
  escort_service_required?: boolean
  seal_number?: string
  commodity_description?: string
  net_weight?: string
  commodity_weight?: number
  commodity_unit?: string
  commodity_value?: number
  pickup_location?: string
  delivery_location?: string
  freight_charges?: number
  kgs_per_carton?: string
  gross_weight_per_carton?: string
  rate_per_kgs?: string
  goods_value?: string
  payment_terms?: string
  freight_currency?: string
  notes_1?: string
  notes_1_label?: string
  notes_2?: string
  notes_2_label?: string
  iran_office_building?: string
  iran_office_location?: string
  iran_office_pobox?: string
  iran_office_telefax?: string
  iran_office_cellphone?: string
  iran_office_email?: string
  created_at: string
  updated_at: string
  pdf_url?: string
}

export interface BOLHistoryRecord {
  id: string
  bol_id: string
  user_id: string
  action: string
  changes?: Record<string, any>
  created_at: string
}

export interface BOLTemplateRecord {
  id: string
  user_id: string
  name: string
  description?: string
  template_data: Record<string, any>
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface BOLDocumentRecord {
  id: string
  bol_id: string
  user_id: string
  pdf_url: string
  file_size: number
  created_at: string
}

export interface CreateBOLRequest {
  bol_number?: string
  issue_date: string
  shipper_name?: string
  shipper_address?: string
  shipper_contact?: string
  consignee_name?: string
  consignee_address?: string
  consignee_contact?: string
  truck_number?: string
  driver_name?: string
  driver_father_name?: string
  driver_contact?: string
  driver_rent?: string
  container_number?: string
  container_type?: string
  seal_number?: string
  commodity_description?: string
  net_weight?: string
  commodity_weight?: number
  commodity_unit?: string
  commodity_value?: number
  pickup_location?: string
  delivery_location?: string
  freight_charges?: number
  kgs_per_carton?: string
  gross_weight_per_carton?: string
  rate_per_kgs?: string
  goods_value?: string
  payment_terms?: string
  freight_currency?: string
  notes_1?: string
  notes_1_label?: string
  notes_2?: string
  notes_2_label?: string
  iran_office_building?: string
  iran_office_location?: string
  iran_office_pobox?: string
  iran_office_telefax?: string
  iran_office_cellphone?: string
  iran_office_email?: string
}

export interface UpdateBOLRequest extends Partial<CreateBOLRequest> {
  status?: string
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  template_data: Record<string, any>
  is_default?: boolean
}
