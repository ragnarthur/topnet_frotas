import axios from 'axios'
import type {
  Alert,
  AlertList,
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

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
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
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const response = await axios.post('/api/auth/token/refresh/', { refresh })
          const { access } = response.data
          localStorage.setItem('access_token', access)
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const auth = {
  login: async (username: string, password: string): Promise<TokenResponse> => {
    const response = await api.post('/auth/token/', { username, password })
    return response.data
  },
  refresh: async (refresh: string): Promise<{ access: string }> => {
    const response = await api.post('/auth/token/refresh/', { refresh })
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

export default api
