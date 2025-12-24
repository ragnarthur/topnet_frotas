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
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Abastecimentos', href: '/abastecimentos', icon: Fuel },
  { name: 'Veículos', href: '/veiculos', icon: Car },
  { name: 'Motoristas', href: '/motoristas', icon: Users },
  { name: 'Centros de Custo', href: '/centros-custo', icon: Building2 },
  { name: 'Postos', href: '/postos', icon: MapPin },
  { name: 'Alertas', href: '/alertas', icon: AlertTriangle },
]

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden gradient-bg">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-violet-600/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 -right-40 w-80 h-80 bg-cyan-600/30 rounded-full blur-[100px]" />
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
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg glow">
            <Fuel className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold gradient-text">TopNet</span>
            <span className="text-lg font-bold text-foreground"> Frotas</span>
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
                      ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white border border-violet-500/30 shadow-lg shadow-violet-500/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300',
                      isActive
                        ? 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-lg'
                        : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                    />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
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
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500">
                  <Fuel className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold gradient-text">TopNet</span>
                  <span className="text-lg font-bold text-foreground"> Frotas</span>
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
                          ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white border border-violet-500/30'
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
              <div className="p-4 border-t border-white/10">
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
