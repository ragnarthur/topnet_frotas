import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, TrendingUp, Droplets, Fuel, BadgeDollarSign } from 'lucide-react'
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
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>De</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Até</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
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
          <div className="flex items-end justify-end">
            <Badge variant="secondary">
              {formatDate(fromDate)} → {formatDate(toDate)}
            </Badge>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <BadgeDollarSign className="h-5 w-5 text-sky-400" />
            <Badge variant="secondary">custo</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Custo total</p>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : formatCurrency(data?.summary.total_cost || 0)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <Droplets className="h-5 w-5 text-sky-400" />
            <Badge variant="secondary">volume</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Litros abastecidos</p>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : `${formatNumber(data?.summary.total_liters || 0)} L`}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <Fuel className="h-5 w-5 text-sky-400" />
            <Badge variant="secondary">média</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Custo médio/L</p>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : formatCurrency(avgCostPerLiter)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <TrendingUp className="h-5 w-5 text-sky-400" />
            <Badge variant="secondary">ações</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Total de abastecimentos</p>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : data?.summary.transaction_count || 0}
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Ranking por custo</h3>
          <div className="space-y-3">
            {topByCost.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
            ) : (
              topByCost.map((item, index) => (
                <div key={item.vehicle__id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
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
              ))
            )}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Ranking por litros</h3>
          <div className="space-y-3">
            {topByLiters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
            ) : (
              topByLiters.map((item, index) => (
                <div key={item.vehicle__id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
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
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
