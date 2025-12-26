import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
  Navigate,
  Outlet,
} from '@tanstack/react-router'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { Toaster } from '@/components/ui/sonner'

// Lazy load pages
const LoginPage = lazy(() => import('@/pages/Login').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.DashboardPage })))
const DriverDashboardPage = lazy(() => import('@/pages/DriverDashboard').then(m => ({ default: m.DriverDashboardPage })))
const EventsPage = lazy(() => import('@/pages/Events').then(m => ({ default: m.EventsPage })))
const ReportsPage = lazy(() => import('@/pages/Reports').then(m => ({ default: m.ReportsPage })))
const TransactionsPage = lazy(() => import('@/pages/Transactions').then(m => ({ default: m.TransactionsPage })))
const VehiclesPage = lazy(() => import('@/pages/Vehicles').then(m => ({ default: m.VehiclesPage })))
const DriversPage = lazy(() => import('@/pages/Drivers').then(m => ({ default: m.DriversPage })))
const CostCentersPage = lazy(() => import('@/pages/CostCenters').then(m => ({ default: m.CostCentersPage })))
const StationsPage = lazy(() => import('@/pages/Stations').then(m => ({ default: m.StationsPage })))
const AlertsPage = lazy(() => import('@/pages/Alerts').then(m => ({ default: m.AlertsPage })))
const AuditPage = lazy(() => import('@/pages/Audit').then(m => ({ default: m.AuditPage })))

// Loading component
function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  )
}

// Wrapper for lazy components
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Root route with auth check
const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// Public routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <LazyPage><LoginPage /></LazyPage>,
})

// Protected layout
function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return <PageLoader />
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

// Dashboard router - shows admin or driver dashboard based on role
function DashboardRouter() {
  const { isAdmin, isDriver, isLoading } = useAuth()

  if (isLoading) {
    return <PageLoader />
  }

  if (isAdmin) {
    return <LazyPage><DashboardPage /></LazyPage>
  }

  if (isDriver) {
    return <LazyPage><DriverDashboardPage /></LazyPage>
  }

  // Fallback for users without role
  return <LazyPage><DriverDashboardPage /></LazyPage>
}

// Admin only route guard
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAdmin) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: ProtectedLayout,
})

// Protected routes
const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: DashboardRouter,
})

const transactionsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/abastecimentos',
  component: () => <LazyPage><TransactionsPage /></LazyPage>,
})

// Admin only routes
const vehiclesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/veiculos',
  component: () => <AdminRoute><LazyPage><VehiclesPage /></LazyPage></AdminRoute>,
})

const driversRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/motoristas',
  component: () => <AdminRoute><LazyPage><DriversPage /></LazyPage></AdminRoute>,
})

const costCentersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/centros-custo',
  component: () => <AdminRoute><LazyPage><CostCentersPage /></LazyPage></AdminRoute>,
})

const stationsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/postos',
  component: () => <AdminRoute><LazyPage><StationsPage /></LazyPage></AdminRoute>,
})

const alertsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/alertas',
  component: () => <AdminRoute><LazyPage><AlertsPage /></LazyPage></AdminRoute>,
})

const eventsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/eventos',
  component: () => <AdminRoute><LazyPage><EventsPage /></LazyPage></AdminRoute>,
})

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/relatorios',
  component: () => <AdminRoute><LazyPage><ReportsPage /></LazyPage></AdminRoute>,
})

const auditRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/auditoria',
  component: () => <AdminRoute><LazyPage><AuditPage /></LazyPage></AdminRoute>,
})

// Create route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    transactionsRoute,
    vehiclesRoute,
    driversRoute,
    costCentersRoute,
    stationsRoute,
    alertsRoute,
    eventsRoute,
    reportsRoute,
    auditRoute,
  ]),
])

// Create router
const router = createRouter({ routeTree })

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
