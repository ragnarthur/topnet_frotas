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
  User,
  Globe,
  Activity,
  FileText,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
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
  { name: 'Eventos', href: '/eventos', icon: Activity, adminOnly: true },
  { name: 'Relatórios', href: '/relatorios', icon: FileText, adminOnly: true },
  { name: 'Veículos', href: '/veiculos', icon: Car, adminOnly: true },
  { name: 'Motoristas', href: '/motoristas', icon: Users, adminOnly: true },
  { name: 'Centros de Custo', href: '/centros-custo', icon: Building2, adminOnly: true },
  { name: 'Postos', href: '/postos', icon: MapPin, adminOnly: true },
  { name: 'Alertas', href: '/alertas', icon: AlertTriangle, adminOnly: true },
]

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { logout, user, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  return (
    <div className="flex h-screen overflow-hidden gradient-bg">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-600/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 -right-40 w-80 h-80 bg-sky-600/30 rounded-full blur-[100px]" />
      </div>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="hidden md:flex w-72 flex-col glass border-r border-white/10"
      >
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 shadow-lg glow globe-pulse">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <div>
                <span className="text-lg font-bold text-white">Top</span>
                <span className="text-lg font-bold text-blue-400">NET</span>
              </div>
              <span className="text-[8px] tracking-[0.2em] text-muted-foreground uppercase">Internet Banda Larga</span>
            </div>
            <span className="text-lg font-bold text-foreground">Frotas</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item, index) => {
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
                    'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
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
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="w-1.5 h-1.5 rounded-full bg-sky-400"
                    />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-sky-500/20 border border-blue-500/30">
                <User className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
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
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  realtimeStatus === 'online' && 'bg-emerald-400',
                  realtimeStatus === 'connecting' && 'bg-yellow-400',
                  realtimeStatus === 'offline' && 'bg-red-400'
                )}
              />
              Tempo real: {realtimeStatus === 'online' ? 'online' : realtimeStatus === 'connecting' ? 'conectando' : 'offline'}
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl py-6"
            onClick={logout}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5">
              <LogOut className="h-4 w-4" />
            </div>
            <span>Sair do Sistema</span>
          </Button>
        </div>
      </motion.aside>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="glass rounded-xl"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

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
              className="md:hidden fixed inset-y-0 left-0 w-72 glass border-r border-white/10 z-50"
            >
              {/* Logo */}
              <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <div>
                      <span className="text-lg font-bold text-white">Top</span>
                      <span className="text-lg font-bold text-blue-400">NET</span>
                    </div>
                    <span className="text-[8px] tracking-[0.2em] text-muted-foreground uppercase">Internet Banda Larga</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">Frotas</span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                        isActive
                          ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/20 text-white border border-blue-500/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                      {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                    </Link>
                  )
                })}
              </nav>

              {/* User section */}
              <div className="p-4 border-t border-white/10 space-y-2">
                {user && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-sky-500/20 border border-blue-500/30">
                      <User className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
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
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        realtimeStatus === 'online' && 'bg-emerald-400',
                        realtimeStatus === 'connecting' && 'bg-yellow-400',
                        realtimeStatus === 'offline' && 'bg-red-400'
                      )}
                    />
                    Tempo real: {realtimeStatus === 'online' ? 'online' : realtimeStatus === 'connecting' ? 'conectando' : 'offline'}
                  </div>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground rounded-xl"
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

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 md:p-8">
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
