import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, Fuel, RefreshCcw, ShieldAlert } from 'lucide-react'
import { vehicles } from '@/api/client'
import { formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AlertSeverity, RealtimeEvent } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

const SEVERITY_OPTIONS: AlertSeverity[] = ['INFO', 'WARN', 'CRITICAL']

const TYPE_LABELS: Record<string, string> = {
  FUEL_TRANSACTION_CREATED: 'Novo abastecimento',
  FUEL_TRANSACTION_UPDATED: 'Abastecimento atualizado',
  ALERT_CREATED: 'Novo alerta',
  ALERT_RESOLVED: 'Alerta resolvido',
  ALERT_RESOLVED_BULK: 'Alertas resolvidos',
  FUEL_PRICE_UPDATED: 'Preço atualizado',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  FUEL_TRANSACTION_CREATED: Fuel,
  FUEL_TRANSACTION_UPDATED: RefreshCcw,
  ALERT_CREATED: AlertTriangle,
  ALERT_RESOLVED: ShieldAlert,
  ALERT_RESOLVED_BULK: ShieldAlert,
  FUEL_PRICE_UPDATED: Activity,
}

export function EventsPage() {
  const [typeFilter, setTypeFilter] = useState<RealtimeEvent['type'] | 'ALL'>('ALL')
  const [vehicleFilter, setVehicleFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL')

  const { data: events = [] } = useQuery<RealtimeEvent[]>({
    queryKey: ['realtime-events'],
    queryFn: async () => [],
    enabled: false,
    initialData: [],
  })

  const { data: vehiclesList } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicles.list(),
  })

  const eventTypes = useMemo(() => {
    const types = Array.from(new Set(events.map((event) => event.type)))
    return types.sort()
  }, [events])

  const vehicleMap = useMemo(() => {
    const map = new Map<string, string>()
    vehiclesList?.results.forEach((vehicle) => {
      map.set(vehicle.id, `${vehicle.name} (${vehicle.plate})`)
    })
    return map
  }, [vehiclesList])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (typeFilter !== 'ALL' && event.type !== typeFilter) {
        return false
      }

      if (vehicleFilter !== 'ALL') {
        const vehicleId = event.payload?.vehicle_id
        if (!vehicleId || vehicleId !== vehicleFilter) {
          return false
        }
      }

      if (severityFilter !== 'ALL') {
        const severityCounts = event.payload?.severity_counts
        if (!severityCounts || !severityCounts[severityFilter]) {
          return false
        }
      }

      return true
    })
  }, [events, typeFilter, vehicleFilter, severityFilter])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Eventos em Tempo Real</h1>
          <p className="text-muted-foreground">
            Monitoramento das atualizações do sistema em tempo real
          </p>
        </div>
        <Badge variant="secondary">live</Badge>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Tipo de evento</p>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Veículo</p>
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {vehiclesList?.results.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.plate})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Severidade</p>
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as AlertSeverity | 'ALL')}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {SEVERITY_OPTIONS.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Linha do tempo</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter('ALL')
              setVehicleFilter('ALL')
              setSeverityFilter('ALL')
            }}
          >
            Limpar filtros
          </Button>
        </div>
        {filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento encontrado com os filtros atuais.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const Icon = TYPE_ICONS[event.type] || Activity
              const vehicleName = event.payload?.vehicle_id
                ? vehicleMap.get(event.payload.vehicle_id)
                : null
              return (
                <div key={event.id} className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-sky-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {TYPE_LABELS[event.type] || event.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vehicleName || 'Atualização geral'} • {event.payload?.alert_count ? `Alertas: ${event.payload.alert_count}` : 'Sistema'}
                      </p>
                      {event.payload?.severity_counts && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {SEVERITY_OPTIONS.map((severity) => (
                            <Badge key={severity} variant="outline">
                              {severity}: {event.payload?.severity_counts?.[severity] || 0}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
