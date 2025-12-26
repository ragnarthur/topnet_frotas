import { Link, useLocation } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Car,
  Fuel,
  LayoutDashboard,
  LogOut,
  AlertTriangle,
  Users,
  Building2,
  MapPin,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Globe,
  Activity,
  FileText,
  ClipboardList,
  MoreHorizontal,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { drivers, vehicles } from '@/api/client'
import { Button } from '@/components/ui/button'
import { tokenStore } from '@/lib/tokenStore'
import { toast } from 'sonner'
import type { RealtimeEvent, RealtimeEventPayload } from '@/types'

interface NavItem {
  name: string
  href: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

const allNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Abastecimentos', href: '/abastecimentos', icon: Fuel },
  { name: 'Importar CSV', href: '/importar', icon: Upload, adminOnly: true },
  { name: 'Eventos', href: '/eventos', icon: Activity, adminOnly: true },
  { name: 'Relatórios', href: '/relatorios', icon: FileText, adminOnly: true },
  { name: 'Auditoria', href: '/auditoria', icon: ClipboardList, adminOnly: true },
  { name: 'Veículos', href: '/veiculos', icon: Car, adminOnly: true },
  { name: 'Motoristas', href: '/motoristas', icon: Users, adminOnly: true },
  { name: 'Centros de Custo', href: '/centros-custo', icon: Building2, adminOnly: true },
  { name: 'Postos', href: '/postos', icon: MapPin, adminOnly: true },
  { name: 'Alertas', href: '/alertas', icon: AlertTriangle, adminOnly: true },
]

const PRIMARY_NAV_HREFS = new Set([
  '/',
  '/abastecimentos',
  '/alertas',
  '/relatorios',
])

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { logout, user, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'online' | 'offline'>('connecting')

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const pushEvent = (payload: RealtimeEventPayload) => {
      const eventId = String(payload.event_id ?? `${payload.type || 'event'}-${payload.timestamp || Date.now()}`)
      const nextEvent: RealtimeEvent = {
        id: eventId,
        type: String(payload.type || 'EVENT'),
        timestamp: String(payload.timestamp || new Date().toISOString()),
        payload,
      }
      queryClient.setQueryData<RealtimeEvent[]>(
        ['realtime-events'],
        (old = []) => [nextEvent, ...old].slice(0, 20)
      )
    }

    const connect = () => {
      const token = tokenStore.getAccess()
      if (!token) {
        setRealtimeStatus('offline')
        return
      }

      setRealtimeStatus('connecting')
      source = new EventSource(`/api/events/stream/?token=${encodeURIComponent(token)}`)

      source.onopen = () => {
        setRealtimeStatus('online')
      }

      source.onerror = () => {
        setRealtimeStatus('offline')
        source?.close()
        if (!stopped) {
          reconnectTimer = setTimeout(connect, 3000)
        }
      }

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimeEventPayload
          pushEvent(payload)

          if (payload?.type === 'FUEL_TRANSACTION_CREATED') {
            toast.info('Novo abastecimento registrado')
            queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            queryClient.invalidateQueries({ queryKey: ['alerts'] })
          } else if (payload?.type === 'FUEL_TRANSACTION_UPDATED') {
            queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            queryClient.invalidateQueries({ queryKey: ['alerts'] })
          } else if (payload?.type === 'ALERT_CREATED') {
            toast.warning(`Novo alerta (${payload.alert_count ?? 1})`)
            queryClient.invalidateQueries({ queryKey: ['alerts'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          } else if (payload?.type === 'ALERT_RESOLVED' || payload?.type === 'ALERT_RESOLVED_BULK') {
            queryClient.invalidateQueries({ queryKey: ['alerts'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          } else if (payload?.type === 'FUEL_PRICE_UPDATED') {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          }
        } catch {
          // Ignore malformed events
        }
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (source) {
        source.close()
      }
    }
  }, [isAdmin, queryClient])

  // Filter navigation based on user role
  const navigation = useMemo(() => {
    if (isAdmin) {
      return allNavigation
    }
    return allNavigation.filter((item) => !item.adminOnly)
  }, [isAdmin])

  const primaryNavigation = useMemo(
    () => navigation.filter((item) => PRIMARY_NAV_HREFS.has(item.href)),
    [navigation]
  )
  const moreNavigation = useMemo(
    () => navigation.filter((item) => !PRIMARY_NAV_HREFS.has(item.href)),
    [navigation]
  )
  const hasActiveMore = moreNavigation.some((item) => item.href === location.pathname)
  const realtimeLabel = realtimeStatus === 'online'
    ? 'online'
    : realtimeStatus === 'connecting'
      ? 'conectando'
      : 'offline'
  const realtimeDotClass = realtimeStatus === 'online'
    ? 'bg-emerald-400'
    : realtimeStatus === 'connecting'
      ? 'bg-yellow-400'
      : 'bg-red-400'
  const realtimePingClass = realtimeStatus === 'online'
    ? 'bg-emerald-400/40'
    : 'bg-yellow-400/40'
  const driverVehicle = user?.driver?.current_vehicle ?? null
  const userInitials = useMemo(() => {
    if (!user) {
      return ''
    }
    const first = user.first_name?.trim() ?? ''
    const last = user.last_name?.trim() ?? ''
    let initials = ''
    if (first) {
      initials += first[0]
    }
    if (last) {
      initials += last[0]
    }
    if (!initials) {
      const fallback = user.username?.trim() ?? ''
      if (fallback) {
        const parts = fallback.split(/[\s._-]+/).filter(Boolean)
        if (parts.length >= 2) {
          initials = `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`
        } else {
          initials = fallback.slice(0, 2)
        }
      }
    }
    return initials.toUpperCase()
  }, [user])

  const { data: vehiclesActive = [], isLoading: isVehiclesLoading } = useQuery({
    queryKey: ['vehicles-active-count'],
    queryFn: () => vehicles.listActive(),
    enabled: isAdmin,
  })

  const { data: driversActive = [], isLoading: isDriversLoading } = useQuery({
    queryKey: ['drivers-active-count'],
    queryFn: () => drivers.listActive(),
    enabled: isAdmin,
  })

  useEffect(() => {
    if (!moreMenuOpen) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moreMenuOpen])

  return (
    <div className="flex h-screen overflow-hidden gradient-bg">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-600/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 -right-40 w-80 h-80 bg-sky-600/30 rounded-full blur-[100px]" />
      </div>

      {/* Mobile compact rail */}
      <aside className="md:hidden fixed inset-y-0 left-0 z-30 flex w-16 flex-col glass border-r border-white/10">
        <div className="flex h-16 items-center justify-center border-b border-white/10">
          <Button
            variant="ghost"
            size="icon"
            className="glass rounded-xl"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-2">
          {primaryNavigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
                title={item.name}
              >
                {isActive && (
                  <motion.span
                    layoutId="railActiveIndicator"
                    className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-sky-300"
                  />
                )}
                <item.icon className="h-5 w-5" />
                <span className="sr-only">{item.name}</span>
              </Link>
            )
          })}
          {moreNavigation.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreMenuOpen(true)}
              className={cn(
                'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300',
                hasActiveMore
                  ? 'bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
              title="Mais"
              aria-label="Mais atalhos"
            >
              {hasActiveMore && (
                <motion.span
                  layoutId="railActiveIndicator"
                  className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-sky-300"
                />
              )}
              <MoreHorizontal className="h-5 w-5" />
            </button>
          )}
        </nav>
        <div className="border-t border-white/10 p-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sair do Sistema</span>
          </Button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="hidden md:flex w-72 flex-col glass border-r border-white/10 overflow-hidden md:fixed md:inset-y-0 md:left-0 md:z-30"
      >
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 shadow-lg glow globe-pulse">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <div>
                <span className="text-2xl font-bold tracking-wide text-white">Top</span>
                <span className="text-2xl font-bold tracking-wide text-blue-400">NET</span>
              </div>
              <span className="text-[8px] tracking-[0.2em] text-muted-foreground uppercase">Internet Banda Larga</span>
            </div>
            <span className="text-lg font-bold text-foreground">Frotas</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {primaryNavigation.map((item, index) => {
            const isActive = location.pathname === item.href
            return (
              <motion.div
                key={item.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  to={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="navActiveIndicator"
                      className="absolute left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                    />
                  )}
                  <div
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300',
                      isActive
                        ? 'bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg'
                        : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1">{item.name}</span>
                </Link>
              </motion.div>
            )
          })}

          {moreNavigation.length > 0 && (
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setMoreMenuOpen(true)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                  hasActiveMore
                    ? 'bg-gradient-to-r from-blue-500/10 to-sky-500/10 text-white border border-blue-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
                aria-expanded={moreMenuOpen}
                aria-controls="sidebar-more-nav"
              >
                {hasActiveMore && (
                  <motion.span
                    layoutId="navActiveIndicator"
                    className="absolute left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                  />
                )}
                <div
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300',
                    hasActiveMore
                      ? 'bg-gradient-to-br from-blue-500/60 to-sky-500/60 text-white shadow-lg'
                      : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-foreground'
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </div>
                <span className="flex-1">Mais</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="mt-auto p-4 border-t border-white/10 space-y-3">
          {user && (
            <div className="flex items-center gap-4 px-4 py-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/35 to-sky-500/35 border border-blue-500/40 shadow-sm">
                <span className="text-base font-bold tracking-wide text-white">
                  {userInitials || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground truncate">
                  {user.first_name || user.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Administrador' : 'Motorista'}
                </p>
              </div>
            </div>
          )}
          {isAdmin && (
            <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                {realtimeStatus !== 'offline' && (
                  <span className={cn('absolute inline-flex h-full w-full rounded-full animate-ping', realtimePingClass)} />
                )}
                <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', realtimeDotClass)} />
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Status</span>
              <span className="text-xs font-semibold text-foreground">{realtimeLabel}</span>
            </div>
          )}
          {isAdmin ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-sky-300" />
                  Veículos ativos
                </span>
                <span className="font-semibold text-foreground">
                  {isVehiclesLoading ? '...' : vehiclesActive.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-300" />
                  Motoristas ativos
                </span>
                <span className="font-semibold text-foreground">
                  {isDriversLoading ? '...' : driversActive.length}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span>Veículo atual</span>
                <span className="max-w-[140px] truncate font-semibold text-foreground">
                  {driverVehicle ? driverVehicle.name : 'Não definido'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Placa</span>
                <span className="font-semibold text-foreground">
                  {driverVehicle ? driverVehicle.plate : '-'}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl py-6"
            onClick={logout}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5">
              <LogOut className="h-4 w-4" />
            </div>
            <span>Sair do Sistema</span>
          </Button>
        </div>
      </motion.aside>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 w-72 glass border-r border-white/10 z-50 flex flex-col"
            >
              {/* Logo */}
              <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <div>
                      <span className="text-2xl font-bold tracking-wide text-white">Top</span>
                      <span className="text-2xl font-bold tracking-wide text-blue-400">NET</span>
                    </div>
                    <span className="text-[8px] tracking-[0.2em] text-muted-foreground uppercase">Internet Banda Larga</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">Frotas</span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-2">
                {primaryNavigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                        isActive
                          ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/20 text-white border border-blue-500/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="drawerActiveIndicator"
                          className="absolute left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-sky-400"
                        />
                      )}
                      <item.icon className="h-5 w-5" />
                      {item.name}
                      {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                    </Link>
                  )
                })}
                {moreNavigation.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setMoreMenuOpen(true)
                    }}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                      hasActiveMore
                        ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/20 text-white border border-blue-500/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    )}
                  >
                    {hasActiveMore && (
                      <motion.span
                        layoutId="drawerActiveIndicator"
                        className="absolute left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-sky-400"
                      />
                    )}
                    <MoreHorizontal className="h-5 w-5" />
                    Mais atalhos
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </button>
                )}
              </nav>

              {/* User section */}
              <div className="mt-auto p-4 border-t border-white/10 space-y-3">
                {user && (
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/35 to-sky-500/35 border border-blue-500/40 shadow-sm">
                      <span className="text-base font-bold tracking-wide text-white">
                        {userInitials || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground truncate">
                        {user.first_name || user.username}
                      </p>
                        <p className="text-xs text-muted-foreground">
                          {isAdmin ? 'Administrador' : 'Motorista'}
                        </p>
                      </div>
                    </div>
                  )}
                {isAdmin && (
                  <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground">
                    <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                      {realtimeStatus !== 'offline' && (
                        <span className={cn('absolute inline-flex h-full w-full rounded-full animate-ping', realtimePingClass)} />
                      )}
                      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', realtimeDotClass)} />
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Status</span>
                    <span className="text-xs font-semibold text-foreground">{realtimeLabel}</span>
                  </div>
                )}
                {isAdmin ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-sky-300" />
                        Veículos ativos
                      </span>
                      <span className="font-semibold text-foreground">
                        {isVehiclesLoading ? '...' : vehiclesActive.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-sky-300" />
                        Motoristas ativos
                      </span>
                      <span className="font-semibold text-foreground">
                        {isDriversLoading ? '...' : driversActive.length}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>Veículo atual</span>
                      <span className="max-w-[140px] truncate font-semibold text-foreground">
                        {driverVehicle ? driverVehicle.name : 'Não definido'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Placa</span>
                      <span className="font-semibold text-foreground">
                        {driverVehicle ? driverVehicle.plate : '-'}
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                  onClick={logout}
                >
                  <LogOut className="h-5 w-5" />
                  Sair do Sistema
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moreMenuOpen && moreNavigation.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMoreMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="glass-card w-full max-w-4xl rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Navegacao</p>
                    <h3 className="text-lg font-semibold">Mais atalhos</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => setMoreMenuOpen(false)}
                    aria-label="Fechar menu"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div id="sidebar-more-nav" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {moreNavigation.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMoreMenuOpen(false)}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition-all duration-300',
                          isActive
                            ? 'border-blue-500/40 bg-blue-500/10 text-white'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300',
                            isActive
                              ? 'bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg'
                              : 'bg-white/10 text-muted-foreground group-hover:text-foreground'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1">{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden ml-16 md:ml-72">
        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
