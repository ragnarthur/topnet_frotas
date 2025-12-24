import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import {
  AlertTriangle,
  Car,
  DollarSign,
  Droplets,
  Fuel,
  ArrowUpRight,
} from 'lucide-react'
import { dashboard } from '@/api/client'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboard.summary(),
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return <div>Erro ao carregar dados</div>
  }

  const avgCostPerLiter = data.summary.total_liters > 0
    ? data.summary.total_cost / data.summary.total_liters
    : 0

  const monthlyData = data.monthly_trend.map(item => ({
    month: new Date(item.month).toLocaleDateString('pt-BR', { month: 'short' }),
    custo: Number(item.total_cost),
    litros: Number(item.total_liters),
  }))

  const vehicleData = data.cost_by_vehicle.slice(0, 5).map(v => ({
    name: v.vehicle__name,
    custo: Number(v.total_cost),
    litros: Number(v.total_liters),
  }))

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
          <span className="gradient-text">Dashboard</span>
        </h1>
        <p className="text-muted-foreground">
          Período: {data.period.from} a {data.period.to}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Custo Total"
          value={formatCurrency(data.summary.total_cost)}
          subtitle={`${data.summary.transaction_count} abastecimentos`}
          icon={DollarSign}
          tag="Período atual"
          tagTone="default"
          color="violet"
        />
        <StatCard
          title="Total de Litros"
          value={`${formatNumber(data.summary.total_liters)} L`}
          subtitle={`Média: ${formatCurrency(avgCostPerLiter)}/L`}
          icon={Droplets}
          tag="Média calculada"
          tagTone="default"
          color="cyan"
        />
        <StatCard
          title="Veículos Ativos"
          value={data.cost_by_vehicle.length.toString()}
          subtitle="com abastecimentos"
          icon={Car}
          tag="Frota ativa"
          tagTone="default"
          color="emerald"
        />
        <StatCard
          title="Alertas Abertos"
          value={data.alerts.open_count.toString()}
          subtitle="pendentes"
          icon={AlertTriangle}
          color={data.alerts.open_count > 0 ? 'red' : 'emerald'}
          alert={data.alerts.open_count > 0}
          tag={data.alerts.open_count > 0 ? 'Atencao' : 'Sem alertas'}
          tagTone={data.alerts.open_count > 0 ? 'danger' : 'success'}
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend Chart */}
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Evolução Mensal</h3>
              <p className="text-sm text-muted-foreground">Custo e consumo</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span className="text-muted-foreground">Custo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-muted-foreground">Litros</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLitros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value, name) => [
                    name === 'custo' ? formatCurrency(Number(value)) : `${formatNumber(Number(value))} L`,
                    name === 'custo' ? 'Custo' : 'Litros'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="custo"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCusto)"
                />
                <Area
                  type="monotone"
                  dataKey="litros"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLitros)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Vehicle Cost Chart */}
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Custo por Veículo</h3>
              <p className="text-sm text-muted-foreground">Top 5 consumidores</p>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value / 1000}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Custo']}
                />
                <Bar dataKey="custo" radius={[0, 8, 8, 0]}>
                  {vehicleData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Vehicle Details Table */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold">Detalhamento por Veículo</h3>
          <p className="text-sm text-muted-foreground">Consumo e eficiência no período</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Veículo</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Custo Total</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Litros</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">km/L</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">R$/km</th>
              </tr>
            </thead>
            <tbody>
              {data.cost_by_vehicle.map((vehicle, index) => (
                <motion.tr
                  key={vehicle.vehicle__id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
                      >
                        <Fuel className="w-5 h-5" style={{ color: COLORS[index % COLORS.length] }} />
                      </div>
                      <div>
                        <p className="font-medium">{vehicle.vehicle__name}</p>
                        <p className="text-sm text-muted-foreground">{vehicle.vehicle__plate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {formatCurrency(vehicle.total_cost)}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">
                    {formatNumber(vehicle.total_liters)} L
                  </td>
                  <td className="px-6 py-4 text-right">
                    {vehicle.km_per_liter ? (
                      <span className="text-cyan-400">{formatNumber(vehicle.km_per_liter)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {vehicle.cost_per_km ? (
                      <span className="text-violet-400">{formatCurrency(vehicle.cost_per_km)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Alerts Section */}
      {data.alerts.top_alerts.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Alertas Recentes</h3>
              <p className="text-sm text-muted-foreground">Verificações de consistência</p>
            </div>
            <Badge variant="destructive" className="animate-pulse">
              {data.alerts.open_count} pendentes
            </Badge>
          </div>
          <div className="space-y-4">
            {data.alerts.top_alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{alert.vehicle__name}</span>
                    <Badge
                      variant={alert.severity === 'CRITICAL' ? 'destructive' : 'warning'}
                      className="text-xs"
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  color: 'violet' | 'cyan' | 'emerald' | 'red'
  alert?: boolean
  tag?: string
  tagTone?: 'default' | 'success' | 'warning' | 'danger'
}

function StatCard({ title, value, subtitle, icon: Icon, color, alert, tag, tagTone = 'default' }: StatCardProps) {
  const iconBgClasses = {
    violet: 'from-violet-500 to-violet-600',
    cyan: 'from-cyan-500 to-cyan-600',
    emerald: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
  }

  const tagClasses = {
    default: 'border-white/10 bg-white/5 text-muted-foreground',
    success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200',
    warning: 'border-amber-500/30 bg-amber-500/15 text-amber-200',
    danger: 'border-red-500/30 bg-red-500/15 text-red-200',
  }

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -5 }}
      className={`glass-card rounded-2xl p-6 transition-all duration-300 ${alert ? 'pulse-glow' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${iconBgClasses[color]} shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        {tag && (
          <span className={`rounded-full border px-3 py-1 text-xs ${tagClasses[tagTone]}`}>
            {tag}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </motion.div>
  )
}

function DashboardSkeleton() {
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
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6 h-96 shimmer" />
        <div className="glass-card rounded-2xl p-6 h-96 shimmer" />
      </div>
    </div>
  )
}
