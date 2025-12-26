// Enums
export type FuelType = 'GASOLINE' | 'ETHANOL' | 'DIESEL'
export type UsageCategory = 'OPERATIONAL' | 'PERSONAL'
export type CostCenterCategory = 'RURAL' | 'URBAN' | 'INSTALLATION' | 'MAINTENANCE' | 'ADMIN'
export type AlertType = 'ODOMETER_REGRESSION' | 'LITERS_OVER_TANK' | 'OUTLIER_CONSUMPTION' | 'PERSONAL_USAGE'
export type AlertSeverity = 'INFO' | 'WARN' | 'CRITICAL'
export type RealtimeEventType =
  | 'FUEL_TRANSACTION_CREATED'
  | 'FUEL_TRANSACTION_UPDATED'
  | 'ALERT_CREATED'
  | 'ALERT_RESOLVED'
  | 'ALERT_RESOLVED_BULK'
  | 'FUEL_PRICE_UPDATED'
  | 'EVENT'

export interface RealtimeEventPayload {
  vehicle_id?: string
  alert_count?: number
  severity_counts?: Partial<Record<AlertSeverity, number>>
  total_cost?: number
  [key: string]: unknown
}

export interface RealtimeEvent {
  id: string
  type: RealtimeEventType | string
  timestamp: string
  payload?: RealtimeEventPayload
}

// Base types
export interface BaseModel {
  id: string
  created_at: string
  updated_at: string
}

// Vehicle
export interface Vehicle extends BaseModel {
  plate: string
  name: string
  model: string
  fuel_type: FuelType
  fuel_type_display: string
  tank_capacity_liters: number | null
  usage_category: UsageCategory
  usage_category_display: string
  min_expected_km_per_liter: number | null
  max_expected_km_per_liter: number | null
  active: boolean
  last_odometer: number | null
}

export interface VehicleList {
  id: string
  plate: string
  name: string
  fuel_type: FuelType
  usage_category: UsageCategory
  usage_category_display: string
  active: boolean
}

// Driver
export interface Driver extends BaseModel {
  name: string
  doc_id: string
  phone: string
  active: boolean
  current_vehicle: string | null
  current_vehicle_detail?: VehicleList | null
}

export interface DriverList {
  id: string
  name: string
  doc_id: string
  phone: string
  active: boolean
  current_vehicle: string | null
  current_vehicle_detail?: VehicleList | null
}

// Cost Center
export interface CostCenter extends BaseModel {
  name: string
  category: CostCenterCategory
  category_display: string
  active: boolean
}

export interface CostCenterList {
  id: string
  name: string
  category: CostCenterCategory
  category_display: string
  active: boolean
}

// Fuel Station
export interface FuelStation extends BaseModel {
  name: string
  city: string
  address: string
  active: boolean
}

export interface FuelStationList {
  id: string
  name: string
  city: string
  address: string
  active: boolean
}

// Fuel Transaction
export interface FuelTransaction extends BaseModel {
  vehicle: string
  vehicle_detail: VehicleList
  driver: string | null
  driver_detail: DriverList | null
  station: string | null
  station_detail: FuelStationList | null
  cost_center: string | null
  cost_center_detail: CostCenterList | null
  purchased_at: string
  liters: number
  unit_price: number
  total_cost: number
  odometer_km: number
  fuel_type: FuelType
  fuel_type_display: string
  notes: string
  attachment: string | null
  km_per_liter: number | null
}

export interface FuelTransactionList {
  id: string
  vehicle: string
  vehicle_name: string
  vehicle_plate: string
  driver_name: string | null
  station_name: string | null
  cost_center_name: string | null
  purchased_at: string
  liters: number
  unit_price: number
  total_cost: number
  odometer_km: number
  fuel_type: FuelType
}

export interface FuelTransactionCreate {
  vehicle: string
  driver?: string
  station?: string
  cost_center?: string
  purchased_at: string
  liters: number
  unit_price: number
  odometer_km: number
  fuel_type: FuelType
  notes?: string
  attachment?: File
}

// Fuel Price
export interface FuelPriceLatest {
  fuel_type: FuelType
  price_per_liter: number
  collected_at: string
  source: string
  station_id: string | null
  station_name: string | null
}

// Alert
export interface Alert extends BaseModel {
  vehicle: string
  vehicle_detail: VehicleList
  fuel_transaction: string | null
  type: AlertType
  type_display: string
  severity: AlertSeverity
  severity_display: string
  message: string
  is_resolved: boolean
  resolved_at: string | null
}

export interface AlertList {
  id: string
  vehicle: string
  vehicle_name: string
  type: AlertType
  type_display: string
  severity: AlertSeverity
  severity_display: string
  message: string
  resolved_at: string | null
  created_at: string
}

// Dashboard
export interface DashboardSummary {
  period: {
    from: string
    to: string
    include_personal: boolean
  }
  summary: {
    total_cost: number
    total_liters: number
    transaction_count: number
  }
  price_reference: {
    national_avg_price: number | null
    national_avg_prices: Array<{
      fuel_type: FuelType
      price_per_liter: number | null
      collected_at: string | null
      source: string | null
    }>
    coverage_liters: number
    coverage_ratio: number
    expected_cost: number | null
    actual_cost: number | null
    delta: number | null
    delta_percent: number | null
  }
  cost_by_vehicle: Array<{
    vehicle__id: string
    vehicle__name: string
    vehicle__plate: string
    total_cost: number
    total_liters: number
    transaction_count: number
    km_per_liter: number | null
    cost_per_km: number | null
  }>
  monthly_trend: Array<{
    month: string
    total_cost: number
    total_liters: number
  }>
  alerts: {
    open_count: number
    top_alerts: Array<{
      id: string
      vehicle__name: string
      type: AlertType
      severity: AlertSeverity
      message: string
      created_at: string
    }>
  }
}

// Pagination
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Auth
export interface TokenResponse {
  access: string
}

export interface User {
  id: number
  username: string
  email: string
}
