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
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { TransactionsPage } from '@/pages/Transactions'
import { VehiclesPage } from '@/pages/Vehicles'

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
  component: LoginPage,
})

// Protected layout
function ProtectedLayout() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
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
  component: DashboardPage,
})

const transactionsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/abastecimentos',
  component: TransactionsPage,
})

const vehiclesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/veiculos',
  component: VehiclesPage,
})

// Placeholder pages for other routes
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground">Em desenvolvimento...</p>
    </div>
  )
}

const driversRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/motoristas',
  component: () => <PlaceholderPage title="Motoristas" />,
})

const costCentersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/centros-custo',
  component: () => <PlaceholderPage title="Centros de Custo" />,
})

const stationsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/postos',
  component: () => <PlaceholderPage title="Postos" />,
})

const alertsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/alertas',
  component: () => <PlaceholderPage title="Alertas" />,
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
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
