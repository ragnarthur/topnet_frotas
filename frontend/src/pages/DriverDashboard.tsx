import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  DollarSign,
  Droplets,
  Fuel,
  TrendingUp,
  Car,
} from 'lucide-react'
import { driverDashboard } from '@/api/client'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export function DriverDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['driver-dashboard'],
    queryFn: () => driverDashboard.get(),
  })

  if (isLoading) {
    return <DriverDashboardSkeleton />
  }

  if (!data) {
    return <div>Erro ao carregar dados</div>
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">
          <span className="gradient-text">{getGreeting()}, {data.driver.name.split(' ')[0]}!</span>
        </h1>
        <p className="text-muted-foreground">
          Seu resumo dos ultimos 30 dias
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Custo Total"
          value={formatCurrency(Number(data.stats.total_cost))}
          subtitle={`${data.stats.transaction_count} abastecimentos`}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Total de Litros"
          value={`${formatNumber(Number(data.stats.total_liters))} L`}
          subtitle="abastecidos"
          icon={Droplets}
          color="sky"
        />
        <StatCard
          title="Abastecimentos"
          value={data.stats.transaction_count.toString()}
          subtitle="no periodo"
          icon={Fuel}
          color="emerald"
        />
        <StatCard
          title="Media km/L"
          value={data.stats.avg_km_per_liter ? formatNumber(data.stats.avg_km_per_liter) : '-'}
          subtitle={data.stats.avg_km_per_liter ? 'calculado' : 'dados insuficientes'}
          icon={TrendingUp}
          color="sky"
        />
      </motion.div>

      {/* Recent Transactions */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold">Abastecimentos Recentes</h3>
          <p className="text-sm text-muted-foreground">Seus ultimos registros</p>
        </div>
        {data.recent_transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Data</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Veiculo</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Litros</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Valor</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Odometro</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_transactions.map((tx, index) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium">{formatDate(tx.purchased_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Car className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{tx.vehicle__name}</p>
                          <p className="text-sm text-muted-foreground">{tx.vehicle__plate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {formatNumber(Number(tx.liters))} L
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-sky-400">
                      {formatCurrency(Number(tx.total_cost))}
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {formatNumber(tx.odometer_km)} km
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            <Fuel className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum abastecimento registrado nos ultimos 30 dias</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  color: 'blue' | 'sky' | 'emerald' | 'red'
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const iconBgClasses = {
    blue: 'from-blue-500 to-blue-600',
    sky: 'from-sky-500 to-sky-600',
    emerald: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
  }

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -5 }}
      className="glass-card rounded-2xl p-6 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${iconBgClasses[color]} shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </motion.div>
  )
}

function DriverDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-9 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-5 w-64 bg-white/5 rounded-lg animate-pulse mt-2" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 h-40 shimmer" />
        ))}
      </div>
      <div className="glass-card rounded-2xl p-6 h-96 shimmer" />
    </div>
  )
}
