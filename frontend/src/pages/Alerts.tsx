import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Info, XCircle, Filter } from 'lucide-react'
import { alerts } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import type { AlertSeverity, AlertType } from '@/types'

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

const alertTypeLabels: Record<AlertType, string> = {
  ODOMETER_REGRESSION: 'Odometro regrediu',
  LITERS_OVER_TANK: 'Litros acima do tanque',
  OUTLIER_CONSUMPTION: 'Consumo anomalo',
  PERSONAL_USAGE: 'Uso pessoal',
}

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  INFO: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  WARN: { icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  CRITICAL: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/20' },
}

export function AlertsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([])
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', filter],
    queryFn: () => {
      if (filter === 'open') {
        return alerts.listOpen()
      }
      return alerts.list({ resolved: filter === 'resolved' ? true : undefined })
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) => alerts.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alerta resolvido com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao resolver alerta')
    },
  })

  const resolveBulkMutation = useMutation({
    mutationFn: (ids: string[]) => alerts.resolveBulk(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success(`${data.count} alertas resolvidos!`)
      setSelectedAlerts([])
      setIsResolveDialogOpen(false)
    },
    onError: () => {
      toast.error('Erro ao resolver alertas')
    },
  })

  const handleSelectAlert = (id: string) => {
    setSelectedAlerts(prev =>
      prev.includes(id)
        ? prev.filter(a => a !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (!data?.results) return
    const openAlerts = data.results.filter(a => !a.resolved_at).map(a => a.id)
    if (selectedAlerts.length === openAlerts.length) {
      setSelectedAlerts([])
    } else {
      setSelectedAlerts(openAlerts)
    }
  }

  const handleResolveSelected = () => {
    if (selectedAlerts.length > 0) {
      setIsResolveDialogOpen(true)
    }
  }

  const confirmResolveBulk = () => {
    resolveBulkMutation.mutate(selectedAlerts)
  }

  const getSeverityBadge = (severity: AlertSeverity) => {
    const config = severityConfig[severity]
    return (
      <Badge className={`${config.bgColor} ${config.color} border-0`}>
        {severity === 'INFO' ? 'Info' : severity === 'WARN' ? 'Aviso' : 'Critico'}
      </Badge>
    )
  }

  const getTypeBadge = (type: AlertType) => {
    return <Badge variant="outline">{alertTypeLabels[type]}</Badge>
  }

  const openAlerts = data?.results.filter(a => !a.resolved_at) || []

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alertas</h1>
          <p className="text-muted-foreground">
            Monitoramento de inconsistencias e anomalias
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedAlerts.length > 0 && (
            <Button
              onClick={handleResolveSelected}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Resolver ({selectedAlerts.length})
            </Button>
          )}
          <Select value={filter} onValueChange={(v: 'all' | 'open' | 'resolved') => setFilter(v)}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Em aberto</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Criticos</p>
                <p className="text-2xl font-bold">
                  {openAlerts.filter(a => a.severity === 'CRITICAL').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avisos</p>
                <p className="text-2xl font-bold">
                  {openAlerts.filter(a => a.severity === 'WARN').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                <Info className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Informativos</p>
                <p className="text-2xl font-bold">
                  {openAlerts.filter(a => a.severity === 'INFO').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="glass-card border-white/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    {filter !== 'resolved' && (
                      <input
                        type="checkbox"
                        checked={openAlerts.length > 0 && selectedAlerts.length === openAlerts.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-white/10 bg-white/5"
                      />
                    )}
                  </TableHead>
                  <TableHead>Veiculo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum alerta encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.results.map((alert) => {
                    const SeverityIcon = severityConfig[alert.severity].icon
                    const isResolved = !!alert.resolved_at
                    return (
                      <TableRow key={alert.id} className={isResolved ? 'opacity-60' : ''}>
                        <TableCell>
                          {!isResolved && (
                            <input
                              type="checkbox"
                              checked={selectedAlerts.includes(alert.id)}
                              onChange={() => handleSelectAlert(alert.id)}
                              className="h-4 w-4 rounded border-white/10 bg-white/5"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${severityConfig[alert.severity].bgColor}`}>
                              <SeverityIcon className={`h-4 w-4 ${severityConfig[alert.severity].color}`} />
                            </div>
                            {alert.vehicle_name}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(alert.type)}</TableCell>
                        <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {alert.message}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(alert.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isResolved ? 'secondary' : 'destructive'}>
                            {isResolved ? 'Resolvido' : 'Em aberto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!isResolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resolveMutation.mutate(alert.id)}
                              disabled={resolveMutation.isPending}
                              className="hover:bg-green-500/20 hover:text-green-400"
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Resolver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Resolve Confirmation Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              Resolver Alertas
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja resolver{' '}
              <span className="font-semibold text-foreground">
                {selectedAlerts.length} alertas
              </span>
              ? Eles serao marcados como resolvidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResolveDialogOpen(false)}
              className="border-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmResolveBulk}
              disabled={resolveBulkMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400"
            >
              {resolveBulkMutation.isPending ? 'Resolvendo...' : 'Resolver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
