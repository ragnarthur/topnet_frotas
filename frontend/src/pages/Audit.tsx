import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { auditLogs } from '@/api/client'
import { formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AuditAction, AuditLog } from '@/types'

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

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Criacao',
  UPDATE: 'Alteracao',
  DELETE: 'Exclusao',
}

const ENTITY_LABELS: Record<string, string> = {
  Vehicle: 'Veiculo',
  Driver: 'Motorista',
  CostCenter: 'Centro de Custo',
  FuelStation: 'Posto',
  FuelTransaction: 'Abastecimento',
  Alert: 'Alerta',
  FuelPriceSnapshot: 'Preco Combustivel',
}

const ACTION_BADGE_CLASS: Record<AuditAction, string> = {
  CREATE: 'bg-emerald-600/80 text-white',
  UPDATE: 'bg-amber-500/80 text-white',
  DELETE: 'bg-rose-600/80 text-white',
}

function formatJson(data: Record<string, unknown> | null) {
  if (!data) {
    return 'Sem dados.'
  }
  return JSON.stringify(data, null, 2)
}

export function AuditPage() {
  const [actionFilter, setActionFilter] = useState<AuditAction | 'ALL'>('ALL')
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    setPage(1)
  }, [actionFilter, entityTypeFilter, dateFrom, dateTo, searchTerm])

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter, entityTypeFilter, dateFrom, dateTo, searchTerm, page],
    queryFn: () => auditLogs.list({
      action: actionFilter === 'ALL' ? undefined : actionFilter,
      entity_type: entityTypeFilter === 'ALL' ? undefined : entityTypeFilter,
      from_date: dateFrom || undefined,
      to_date: dateTo || undefined,
      search: searchTerm || undefined,
      page,
    }),
  })

  const logs = data?.results ?? []

  const entityOptions = useMemo(() => {
    const uniqueTypes = new Set(logs.map((log) => log.entity_type))
    return Array.from(uniqueTypes).sort()
  }, [logs])

  const totalCount = data?.count ?? 0
  const hasNext = Boolean(data?.next)
  const hasPrev = page > 1

  const clearFilters = () => {
    setActionFilter('ALL')
    setEntityTypeFilter('ALL')
    setDateFrom('')
    setDateTo('')
    setSearchTerm('')
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditoria</h1>
          <p className="text-muted-foreground">
            Registros de alteracoes criticas no sistema
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          {totalCount} registros
        </Badge>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <p className="text-xs text-muted-foreground">Busca geral</p>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Usuario, entidade, id ou IP"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Acao</p>
            <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as AuditAction | 'ALL')}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Entidade</p>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {entityOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ENTITY_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Periodo</p>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Logs recentes</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasNext}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Proxima
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acao</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Alteracoes</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum log encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const changeKeys = log.changes ? Object.keys(log.changes) : []
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.username || 'Sistema'}
                    </TableCell>
                    <TableCell>
                      <Badge className={ACTION_BADGE_CLASS[log.action]}>
                        {ACTION_LABELS[log.action]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.entity_description || log.entity_id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {changeKeys.length ? (
                        <div className="flex flex-wrap gap-2">
                          {changeKeys.slice(0, 3).map((key) => (
                            <Badge key={key} variant="outline">
                              {key}
                            </Badge>
                          ))}
                          {changeKeys.length > 3 && (
                            <Badge variant="secondary">
                              +{changeKeys.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      <Dialog open={Boolean(selectedLog)} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da alteracao</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={ACTION_BADGE_CLASS[selectedLog.action]}>
                  {ACTION_LABELS[selectedLog.action]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(selectedLog.timestamp)} • {selectedLog.username || 'Sistema'}
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <p className="font-medium">
                  {ENTITY_LABELS[selectedLog.entity_type] || selectedLog.entity_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedLog.entity_description || selectedLog.entity_id}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Antes</p>
                  <pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                    {formatJson(selectedLog.old_data)}
                  </pre>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Depois</p>
                  <pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                    {formatJson(selectedLog.new_data)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
