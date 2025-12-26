import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, TrendingUp, Droplets, Fuel, BadgeDollarSign, Sparkles } from 'lucide-react'
import { dashboard, reports } from '@/api/client'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

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

function getDefaultFromDate() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  return first.toISOString().slice(0, 10)
}

function getDefaultToDate() {
  return new Date().toISOString().slice(0, 10)
}

export function ReportsPage() {
  const [fromDate, setFromDate] = useState(getDefaultFromDate())
  const [toDate, setToDate] = useState(getDefaultToDate())
  const [includePersonal, setIncludePersonal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary', fromDate, toDate, includePersonal],
    queryFn: () => dashboard.summary({
      from: fromDate,
      to: toDate,
      include_personal: includePersonal,
    }),
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      const { blob, filename } = await reports.exportTransactions({
        from: fromDate,
        to: toDate,
        include_personal: includePersonal,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      toast.success('Relatório exportado com sucesso')
    },
    onError: () => {
      toast.error('Falha ao exportar relatório')
    },
  })

  const topByCost = useMemo(() => {
    return data?.cost_by_vehicle
      ? [...data.cost_by_vehicle].sort((a, b) => b.total_cost - a.total_cost).slice(0, 5)
      : []
  }, [data])

  const topByLiters = useMemo(() => {
    return data?.cost_by_vehicle
      ? [...data.cost_by_vehicle].sort((a, b) => b.total_liters - a.total_liters).slice(0, 5)
      : []
  }, [data])

  const avgCostPerLiter = data?.summary.total_liters
    ? data.summary.total_cost / data.summary.total_liters
    : 0
  const priceRef = data?.price_reference
  const nationalAvgPrice = priceRef?.national_avg_price
  const expectedCost = priceRef?.expected_cost
  const actualCost = priceRef?.actual_cost
  const hasCoverage = priceRef?.coverage_liters ? priceRef.coverage_liters > 0 : false
  const deltaValue = priceRef?.delta ?? 0
  const deltaLabel = deltaValue > 0 ? 'Economia' : deltaValue < 0 ? 'Custo acima' : 'Neutro'
  const deltaColor = deltaValue > 0 ? 'text-emerald-400' : deltaValue < 0 ? 'text-red-400' : 'text-muted-foreground'
  const deltaPercent = priceRef?.delta_percent ? Math.abs(priceRef.delta_percent) : 0
  const coveragePercent = priceRef?.coverage_ratio
    ? Math.min(priceRef.coverage_ratio * 100, 100)
    : 0
  const maxCost = topByCost[0]?.total_cost || 0
  const maxLiters = topByLiters[0]?.total_liters || 0

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Resumo executivo e rankings do período</p>
        </div>
        <Button
          onClick={() => exportMutation.mutate()}
          className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-400 hover:to-sky-400"
          disabled={exportMutation.isPending}
        >
          <Download className="mr-2 h-4 w-4" />
          {exportMutation.isPending ? 'Exportando...' : 'Exportar CSV'}
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-sky-300" />
              Relatório do período
            </div>
            <h2 className="text-2xl font-bold">Visão executiva do consumo</h2>
            <p className="text-sm text-muted-foreground">
              Ajuste o intervalo, compare com a média nacional e exporte os dados.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">
                {formatDate(fromDate)} → {formatDate(toDate)}
              </Badge>
              <Badge variant={includePersonal ? 'secondary' : 'outline'}>
                {includePersonal ? 'Inclui uso pessoal' : 'Somente operacional'}
              </Badge>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[420px]">
            <div className="space-y-2">
              <Label>De</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Até</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="include-personal"
                type="checkbox"
                checked={includePersonal}
                onChange={(e) => setIncludePersonal(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/5"
              />
              <Label htmlFor="include-personal" className="cursor-pointer">
                Incluir uso pessoal
              </Label>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/20 text-sky-300">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <Badge variant="secondary">custo</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Custo total</p>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : formatCurrency(data?.summary.total_cost || 0)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/20 text-sky-300">
              <Droplets className="h-5 w-5" />
            </div>
            <Badge variant="secondary">volume</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Litros abastecidos</p>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : `${formatNumber(data?.summary.total_liters || 0)} L`}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/20 text-sky-300">
              <Fuel className="h-5 w-5" />
            </div>
            <Badge variant="secondary">média</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Custo médio/L</p>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : formatCurrency(avgCostPerLiter)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/20 text-sky-300">
              <TrendingUp className="h-5 w-5" />
            </div>
            <Badge variant="secondary">ações</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Total de abastecimentos</p>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : data?.summary.transaction_count || 0}
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Impacto vs média nacional</h3>
              <p className="text-sm text-muted-foreground">
                Baseado na cobertura de {formatNumber(coveragePercent, 1)}% dos litros do período
              </p>
            </div>
            <Badge variant="secondary">referência</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-muted-foreground">Média nacional</p>
                  <p className="text-lg font-semibold">
                    {nationalAvgPrice !== null && nationalAvgPrice !== undefined
                      ? formatCurrency(Number(nationalAvgPrice))
                      : '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Preço médio por litro</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-muted-foreground">Custo real</p>
                  <p className="text-lg font-semibold">
                    {actualCost !== null && actualCost !== undefined
                      ? formatCurrency(Number(actualCost))
                      : formatCurrency(data?.summary.total_cost || 0)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Soma do período</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Cobertura de litros</span>
                  <span>{formatNumber(coveragePercent, 1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-sky-400/80 to-blue-500/80"
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              {hasCoverage && expectedCost !== null && expectedCost !== undefined ? (
                <>
                  <p className={`text-3xl font-bold ${deltaColor}`}>
                    {deltaValue > 0 ? '+' : ''}
                    {formatCurrency(Math.abs(Number(deltaValue)))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {deltaLabel} ({formatNumber(deltaPercent, 1)}%)
                  </p>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Esperado: {formatCurrency(Number(expectedCost))}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cadastre um snapshot global para calcular ganhos/perdas.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Ranking por custo</h3>
          <div className="space-y-3">
            {topByCost.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
            ) : (
              topByCost.map((item, index) => {
                const width = maxCost ? Math.round((item.total_cost / maxCost) * 100) : 0
                return (
                  <div key={item.vehicle__id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {index + 1}. {item.vehicle__name} ({item.vehicle__plate})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.transaction_count} abastecimentos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(item.total_cost)}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.km_per_liter ? `${formatNumber(item.km_per_liter)} km/L` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/5">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500/60 to-sky-400/80"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Ranking por litros</h3>
          <div className="space-y-3">
            {topByLiters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
            ) : (
              topByLiters.map((item, index) => {
                const width = maxLiters ? Math.round((item.total_liters / maxLiters) * 100) : 0
                return (
                  <div key={item.vehicle__id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {index + 1}. {item.vehicle__name} ({item.vehicle__plate})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.transaction_count} abastecimentos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatNumber(item.total_liters)} L
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.cost_per_km ? `${formatCurrency(item.cost_per_km)}/km` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/5">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500/60 to-sky-400/80"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
