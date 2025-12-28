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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Fuel,
  Calendar,
  Banknote,
  Droplets,
  Car,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { dashboard } from '@/api/client'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboard.summary(),
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">Erro ao carregar dados</div>
  }

  // Cálculos básicos
  const custoMedioLitro = data.summary.total_liters > 0
    ? data.summary.total_cost / data.summary.total_liters
    : 0

  const diasNoPeriodo = Math.max(1, Math.ceil(
    (new Date(data.period.to).getTime() - new Date(data.period.from).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1)

  const gastoMedioDiario = data.summary.total_cost / diasNoPeriodo

  // Variação mensal
  const monthlyTrendSorted = [...data.monthly_trend].sort(
    (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
  )
  const mesAtual = monthlyTrendSorted[monthlyTrendSorted.length - 1]
  const mesAnterior = monthlyTrendSorted[monthlyTrendSorted.length - 2]

  const variacaoMensal = mesAtual && mesAnterior && mesAnterior.total_cost > 0
    ? ((mesAtual.total_cost - mesAnterior.total_cost) / mesAnterior.total_cost) * 100
    : null

  // Dados para gráficos
  const monthlyData = monthlyTrendSorted.map(item => ({
    mes: new Date(item.month).toLocaleDateString('pt-BR', { month: 'short' }),
    valor: Number(item.total_cost),
  }))

  const costCenterData = data.cost_by_cost_center.map((item, index) => ({
    name: item.cost_center__name,
    value: Number(item.total_cost),
    color: COLORS[index % COLORS.length],
  }))

  const getCurrentMonthYear = () => {
    return new Date().toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).replace(/^\w/, (c) => c.toUpperCase())
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold">Painel de Controle</h1>
        <p className="text-muted-foreground">
          Resumo financeiro de {getCurrentMonthYear()}
        </p>
      </motion.div>

      {/* Cards Principais - Resumo Financeiro */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Gasto Total no Mês"
          value={formatCurrency(data.summary.total_cost)}
          subtitle={`${data.summary.transaction_count} abastecimentos`}
          icon={Banknote}
          highlight
        />
        <SummaryCard
          title="Total de Litros"
          value={`${formatNumber(data.summary.total_liters)} L`}
          subtitle={`Custo médio: ${formatCurrency(custoMedioLitro)}/L`}
          icon={Droplets}
        />
        <SummaryCard
          title="Gasto Médio/Dia"
          value={formatCurrency(gastoMedioDiario)}
          subtitle={`${diasNoPeriodo} dias no período`}
          icon={Calendar}
        />
        <SummaryCard
          title="Variação vs Mês Anterior"
          value={variacaoMensal !== null ? `${variacaoMensal > 0 ? '+' : ''}${formatNumber(variacaoMensal, 1)}%` : '—'}
          subtitle={variacaoMensal !== null
            ? (variacaoMensal > 0 ? 'Aumento de gastos' : variacaoMensal < 0 ? 'Redução de gastos' : 'Estável')
            : 'Sem dados anteriores'
          }
          icon={variacaoMensal !== null && variacaoMensal > 0 ? TrendingUp : TrendingDown}
          trend={variacaoMensal !== null ? (variacaoMensal > 0 ? 'up' : variacaoMensal < 0 ? 'down' : 'neutral') : 'neutral'}
        />
      </motion.div>

      {/* Seção ANP - Preços de Referência */}
      {data.price_reference && (
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Fuel className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-lg font-semibold">Preços de Referência ANP</h2>
                <p className="text-sm text-muted-foreground">Médias nacionais atualizadas</p>
              </div>
            </div>
            <a
              href="https://www.gov.br/anp/pt-br"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              ANP
            </a>
          </div>

          {/* Grid de preços por tipo de combustível */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            {data.price_reference.national_avg_prices.map((price) => {
              const fuelLabels: Record<string, { label: string; color: string; bgColor: string }> = {
                GASOLINE: { label: 'Gasolina', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
                ETHANOL: { label: 'Etanol', color: 'text-green-400', bgColor: 'bg-green-500/20' },
                DIESEL: { label: 'Diesel', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
              }
              const config = fuelLabels[price.fuel_type] || { label: price.fuel_type, color: 'text-blue-400', bgColor: 'bg-blue-500/20' }

              return (
                <div
                  key={price.fuel_type}
                  className={`rounded-xl p-4 ${config.bgColor} border border-white/5`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                    {price.collected_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        {new Date(price.collected_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold">
                    {price.price_per_liter
                      ? `R$ ${formatNumber(price.price_per_liter, 2)}`
                      : '—'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">por litro</p>
                </div>
              )
            })}
          </div>

          {/* Comparativo de custos */}
          {data.price_reference.expected_cost !== null && data.price_reference.actual_cost !== null && (
            <div className="border-t border-white/10 pt-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Custo Esperado (ANP)</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {formatCurrency(data.price_reference.expected_cost)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(data.price_reference.coverage_liters)} L cobertos ({formatNumber(data.price_reference.coverage_ratio * 100, 0)}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Real</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(data.price_reference.actual_cost)}
                  </p>
                  <p className="text-xs text-muted-foreground">valor pago</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Diferença</p>
                  <p className={`text-lg font-semibold ${
                    data.price_reference.delta && data.price_reference.delta > 0
                      ? 'text-red-400'
                      : data.price_reference.delta && data.price_reference.delta < 0
                        ? 'text-emerald-400'
                        : ''
                  }`}>
                    {data.price_reference.delta !== null
                      ? `${data.price_reference.delta > 0 ? '+' : ''}${formatCurrency(data.price_reference.delta)}`
                      : '—'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.price_reference.delta && data.price_reference.delta > 0
                      ? 'acima da média'
                      : data.price_reference.delta && data.price_reference.delta < 0
                        ? 'abaixo da média'
                        : 'na média'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Variação %</p>
                  <p className={`text-lg font-semibold ${
                    data.price_reference.delta_percent && data.price_reference.delta_percent > 0
                      ? 'text-red-400'
                      : data.price_reference.delta_percent && data.price_reference.delta_percent < 0
                        ? 'text-emerald-400'
                        : ''
                  }`}>
                    {data.price_reference.delta_percent !== null
                      ? `${data.price_reference.delta_percent > 0 ? '+' : ''}${formatNumber(data.price_reference.delta_percent, 1)}%`
                      : '—'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">vs média nacional</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Alertas (se houver) */}
      {data.alerts.open_count > 0 && (
        <motion.div variants={itemVariants} className="glass-card rounded-xl p-4 border-l-4 border-amber-500 bg-amber-500/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium">Atenção: {data.alerts.open_count} alerta{data.alerts.open_count > 1 ? 's' : ''} pendente{data.alerts.open_count > 1 ? 's' : ''}</p>
              <p className="text-sm text-muted-foreground">Verifique inconsistências nos abastecimentos</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Seção Principal - 2 Colunas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gastos por Centro de Custo */}
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Gastos por Centro de Custo</h2>
              <p className="text-sm text-muted-foreground">Distribuição para contabilidade</p>
            </div>
            <Badge variant="secondary">contábil</Badge>
          </div>

          {costCenterData.length > 0 ? (
            <div className="space-y-4">
              {/* Mini gráfico de pizza */}
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costCenterData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                    >
                      {costCenterData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Lista detalhada */}
              <div className="space-y-2">
                {data.cost_by_cost_center.map((item, index) => {
                  const percent = data.summary.total_cost > 0
                    ? (item.total_cost / data.summary.total_cost) * 100
                    : 0
                  return (
                    <div key={item.cost_center__id || 'none'} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm">{item.cost_center__name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.total_cost)}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(percent, 1)}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum gasto registrado no período</p>
            </div>
          )}
        </motion.div>

        {/* Gastos por Veículo */}
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Gastos por Veículo</h2>
              <p className="text-sm text-muted-foreground">Ranking de consumo</p>
            </div>
            <Badge variant="secondary">{data.cost_by_vehicle.length} veículos</Badge>
          </div>

          {data.cost_by_vehicle.length > 0 ? (
            <div className="space-y-3">
              {data.cost_by_vehicle.slice(0, 6).map((vehicle, index) => {
                const percent = data.summary.total_cost > 0
                  ? (vehicle.total_cost / data.summary.total_cost) * 100
                  : 0
                const maxCost = data.cost_by_vehicle[0]?.total_cost || 1
                const barWidth = (vehicle.total_cost / maxCost) * 100

                return (
                  <div key={vehicle.vehicle__id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{vehicle.vehicle__name}</span>
                        <span className="text-muted-foreground">({vehicle.vehicle__plate})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(vehicle.total_cost)}</span>
                        <span className="text-muted-foreground text-xs ml-2">({formatNumber(percent, 0)}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(vehicle.total_liters)} L</span>
                      <span>{vehicle.transaction_count} abastec.</span>
                      {vehicle.km_per_liter && <span>{formatNumber(vehicle.km_per_liter)} km/L</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum veículo com abastecimentos</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Evolução Mensal */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Evolução dos Gastos</h2>
            <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
          </div>
        </div>

        <div className="h-[250px]">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="mes"
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
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Gasto']}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGasto)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Sem dados históricos</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Resumo para Fechamento Contábil */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6 border border-blue-500/20 bg-blue-500/5">
        <div className="flex items-center gap-2 mb-4">
          <Fuel className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold">Resumo para Fechamento</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Período</p>
            <p className="font-semibold">
              {new Date(data.period.from).toLocaleDateString('pt-BR')} a {new Date(data.period.to).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Combustível</p>
            <p className="font-semibold text-xl">{formatCurrency(data.summary.total_cost)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Volume Total</p>
            <p className="font-semibold">{formatNumber(data.summary.total_liters)} litros</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Qtd. Abastecimentos</p>
            <p className="font-semibold">{data.summary.transaction_count}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface SummaryCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  highlight?: boolean
  trend?: 'up' | 'down' | 'neutral'
}

function SummaryCard({ title, value, subtitle, icon: Icon, highlight, trend }: SummaryCardProps) {
  const trendColors = {
    up: 'text-red-400',
    down: 'text-emerald-400',
    neutral: 'text-muted-foreground',
  }

  return (
    <motion.div
      variants={itemVariants}
      className={`glass-card rounded-xl p-4 ${highlight ? 'border border-blue-500/30 bg-blue-500/5' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${highlight ? 'bg-blue-500/20' : 'bg-white/5'}`}>
          <Icon className={`w-5 h-5 ${highlight ? 'text-blue-400' : 'text-muted-foreground'} ${trend ? trendColors[trend] : ''}`} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${trend ? trendColors[trend] : ''}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-5 w-64 bg-white/5 rounded-lg animate-pulse mt-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-xl p-4 h-32 animate-pulse bg-white/5" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6 h-80 animate-pulse bg-white/5" />
        <div className="glass-card rounded-2xl p-6 h-80 animate-pulse bg-white/5" />
      </div>
    </div>
  )
}
