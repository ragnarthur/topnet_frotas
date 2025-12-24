import { Link, useLocation } from '@tanstack/react-router'
import {
  Car,
  Fuel,
  LayoutDashboard,
  LogOut,
  AlertTriangle,
  Users,
  Building2,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Fuel className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">TopNet Frotas</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <Separator />
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Fuel className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">TopNet Frotas</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
