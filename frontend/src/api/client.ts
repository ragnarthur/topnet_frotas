import axios from 'axios'
import type {
  Alert,
  AlertList,
  AuditAction,
  AuditLog,
  CostCenter,
  CostCenterList,
  DashboardSummary,
  Driver,
  DriverList,
  FuelPriceLatest,
  FuelStation,
  FuelStationList,
  FuelTransaction,
  FuelTransactionCreate,
  FuelTransactionList,
  FuelType,
  PaginatedResponse,
  TokenResponse,
  Vehicle,
  VehicleList,
} from '@/types'
import { tokenStore } from '@/lib/tokenStore'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth interceptor
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const response = await axios.post(
          '/api/auth/token/refresh/',
          {},
          { withCredentials: true }
        )
        const { access } = response.data
        tokenStore.setAccess(access)
        originalRequest.headers.Authorization = `Bearer ${access}`
        return api(originalRequest)
      } catch {
        tokenStore.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// User profile type
export interface UserProfile {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'driver' | null
  is_admin: boolean
  is_driver: boolean
  driver?: {
    id: string
    name: string
    phone: string
    current_vehicle?: {
      id: string
      name: string
      plate: string
      fuel_type: FuelType
    } | null
  }
}

export interface AuditLogFilters {
  action?: AuditAction
  entity_type?: string
  entity_id?: string
  user?: number
  username?: string
  from_date?: string
  to_date?: string
  search?: string
  ordering?: string
  page?: number
}

// Driver Dashboard type
export interface DriverDashboard {
  driver: {
    id: string
    name: string
  }
  period: {
    from: string
    to: string
  }
  stats: {
    total_liters: string
    total_cost: string
    transaction_count: number
    avg_km_per_liter: number | null
  }
  recent_transactions: Array<{
    id: string
    vehicle__name: string
    vehicle__plate: string
    purchased_at: string
    liters: string
    total_cost: string
    odometer_km: number
  }>
}

// Auth
export const auth = {
  login: async (username: string, password: string): Promise<TokenResponse> => {
    const response = await api.post('/auth/token/', { username, password })
    return response.data
  },
  refresh: async (): Promise<{ access: string }> => {
    const response = await api.post('/auth/token/refresh/', {})
    return response.data
  },
  logout: async (): Promise<void> => {
    await api.post('/auth/logout/', {})
  },
  profile: async (): Promise<UserProfile> => {
    const response = await api.get('/auth/profile/')
    return response.data
  },
}

// Driver Dashboard
export const driverDashboard = {
  get: async (): Promise<DriverDashboard> => {
    const response = await api.get('/dashboard/driver/')
    return response.data
  },
}

// Vehicles
export const vehicles = {
  list: async (): Promise<PaginatedResponse<VehicleList>> => {
    const response = await api.get('/vehicles/')
    return response.data
  },
  listActive: async (): Promise<VehicleList[]> => {
    const response = await api.get('/vehicles/active/')
    return response.data
  },
  get: async (id: string): Promise<Vehicle> => {
    const response = await api.get(`/vehicles/${id}/`)
    return response.data
  },
  create: async (data: Partial<Vehicle>): Promise<Vehicle> => {
    const response = await api.post('/vehicles/', data)
    return response.data
  },
  update: async (id: string, data: Partial<Vehicle>): Promise<Vehicle> => {
    const response = await api.patch(`/vehicles/${id}/`, data)
    return response.data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}/`)
  },
}

// Drivers
export const drivers = {
  list: async (): Promise<PaginatedResponse<DriverList>> => {
    const response = await api.get('/drivers/')
    return response.data
  },
  listActive: async (): Promise<DriverList[]> => {
    const response = await api.get('/drivers/active/')
    return response.data
  },
  get: async (id: string): Promise<Driver> => {
    const response = await api.get(`/drivers/${id}/`)
    return response.data
  },
  create: async (data: Partial<Driver>): Promise<Driver> => {
    const response = await api.post('/drivers/', data)
    return response.data
  },
  update: async (id: string, data: Partial<Driver>): Promise<Driver> => {
    const response = await api.patch(`/drivers/${id}/`, data)
    return response.data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/drivers/${id}/`)
  },
}

// Cost Centers
export const costCenters = {
  list: async (): Promise<PaginatedResponse<CostCenterList>> => {
    const response = await api.get('/cost-centers/')
    return response.data
  },
  listActive: async (): Promise<CostCenterList[]> => {
    const response = await api.get('/cost-centers/active/')
    return response.data
  },
  get: async (id: string): Promise<CostCenter> => {
    const response = await api.get(`/cost-centers/${id}/`)
    return response.data
  },
  create: async (data: Partial<CostCenter>): Promise<CostCenter> => {
    const response = await api.post('/cost-centers/', data)
    return response.data
  },
  update: async (id: string, data: Partial<CostCenter>): Promise<CostCenter> => {
    const response = await api.patch(`/cost-centers/${id}/`, data)
    return response.data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/cost-centers/${id}/`)
  },
}

// Fuel Stations
export const fuelStations = {
  list: async (): Promise<PaginatedResponse<FuelStationList>> => {
    const response = await api.get('/fuel-stations/')
    return response.data
  },
  listActive: async (): Promise<FuelStationList[]> => {
    const response = await api.get('/fuel-stations/active/')
    return response.data
  },
  get: async (id: string): Promise<FuelStation> => {
    const response = await api.get(`/fuel-stations/${id}/`)
    return response.data
  },
  create: async (data: Partial<FuelStation>): Promise<FuelStation> => {
    const response = await api.post('/fuel-stations/', data)
    return response.data
  },
  update: async (id: string, data: Partial<FuelStation>): Promise<FuelStation> => {
    const response = await api.patch(`/fuel-stations/${id}/`, data)
    return response.data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/fuel-stations/${id}/`)
  },
}

// Fuel Transactions
export const fuelTransactions = {
  list: async (params?: {
    from_date?: string
    to_date?: string
    vehicle?: string
    driver?: string
    cost_center?: string
    station?: string
    fuel_type?: FuelType
  }): Promise<PaginatedResponse<FuelTransactionList>> => {
    const response = await api.get('/fuel-transactions/', { params })
    return response.data
  },
  get: async (id: string): Promise<FuelTransaction> => {
    const response = await api.get(`/fuel-transactions/${id}/`)
    return response.data
  },
  create: async (data: FuelTransactionCreate): Promise<FuelTransaction> => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value)
        } else {
          formData.append(key, String(value))
        }
      }
    })
    const response = await api.post('/fuel-transactions/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  update: async (id: string, data: Partial<FuelTransactionCreate>): Promise<FuelTransaction> => {
    const response = await api.patch(`/fuel-transactions/${id}/`, data)
    return response.data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/fuel-transactions/${id}/`)
  },
}

// Fuel Prices
export const fuelPrices = {
  latest: async (fuelType: FuelType, stationId?: string): Promise<FuelPriceLatest> => {
    const params: Record<string, string> = { fuel_type: fuelType }
    if (stationId) params.station_id = stationId
    const response = await api.get('/fuel-prices/latest/', { params })
    return response.data
  },
  updateNational: async (fuelType: FuelType, price_per_liter: number): Promise<FuelPriceLatest> => {
    const response = await api.post('/fuel-prices/national/', {
      fuel_type: fuelType,
      price_per_liter,
    })
    return response.data
  },
  fetchANP: async (): Promise<{
    message: string
    prices_updated: Array<{ fuel_type: string; price: string; action: string }>
    source_url?: string
  }> => {
    const response = await api.post('/fuel-prices/fetch-anp/')
    return response.data
  },
}

// Dashboard
export const dashboard = {
  summary: async (params?: {
    from?: string
    to?: string
    include_personal?: boolean
  }): Promise<DashboardSummary> => {
    const queryParams: Record<string, string> = {}
    if (params?.from) queryParams.from = params.from
    if (params?.to) queryParams.to = params.to
    if (params?.include_personal) queryParams.include_personal = '1'
    const response = await api.get('/dashboard/summary/', { params: queryParams })
    return response.data
  },
}

// Reports
export const reports = {
  exportTransactions: async (params?: {
    from?: string
    to?: string
    include_personal?: boolean
  }): Promise<{ blob: Blob; filename: string }> => {
    const queryParams: Record<string, string> = {}
    if (params?.from) queryParams.from = params.from
    if (params?.to) queryParams.to = params.to
    if (params?.include_personal) queryParams.include_personal = '1'

    const response = await api.get('/reports/transactions/export/', {
      params: queryParams,
      responseType: 'blob',
    })

    const disposition = response.headers['content-disposition'] as string | undefined
    let filename = 'abastecimentos.csv'
    if (disposition) {
      const match = disposition.match(/filename="([^"]+)"/)
      if (match?.[1]) {
        filename = match[1]
      }
    }

    return { blob: response.data, filename }
  },
}

// Alerts
export const alerts = {
  list: async (params?: {
    from_date?: string
    to_date?: string
    vehicle?: string
    type?: string
    severity?: string
    resolved?: boolean
  }): Promise<PaginatedResponse<AlertList>> => {
    const response = await api.get('/alerts/', { params })
    return response.data
  },
  listOpen: async (): Promise<PaginatedResponse<AlertList>> => {
    const response = await api.get('/alerts/open/')
    return response.data
  },
  get: async (id: string): Promise<Alert> => {
    const response = await api.get(`/alerts/${id}/`)
    return response.data
  },
  resolve: async (id: string): Promise<Alert> => {
    const response = await api.post(`/alerts/${id}/resolve/`)
    return response.data
  },
  resolveBulk: async (ids: string[]): Promise<{ message: string; count: number }> => {
    const response = await api.post('/alerts/resolve_bulk/', { ids })
    return response.data
  },
}

// Audit Logs
export const auditLogs = {
  list: async (params?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> => {
    const response = await api.get('/audit-logs/', { params })
    return response.data
  },
}

export default api
