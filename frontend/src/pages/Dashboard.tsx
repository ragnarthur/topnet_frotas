import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Car, DollarSign, Droplets } from 'lucide-react'
import { dashboard } from '@/api/client'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

  const severityVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive'
      case 'WARN':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Período: {data.period.from} a {data.period.to}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.total_cost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.transaction_count} abastecimentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Litros</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.summary.total_liters)} L
            </div>
            <p className="text-xs text-muted-foreground">
              Média: {formatCurrency(data.summary.total_cost / data.summary.total_liters)}/L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veículos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.cost_by_vehicle.length}
            </div>
            <p className="text-xs text-muted-foreground">
              com abastecimentos no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Abertos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.alerts.open_count}
            </div>
            <p className="text-xs text-muted-foreground">
              pendentes de resolução
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost by Vehicle */}
      <Card>
        <CardHeader>
          <CardTitle>Custo por Veículo</CardTitle>
          <CardDescription>
            Detalhamento do consumo e custo por veículo no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veículo</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="text-right">Litros</TableHead>
                <TableHead className="text-right">km/L</TableHead>
                <TableHead className="text-right">R$/km</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cost_by_vehicle.map((vehicle) => (
                <TableRow key={vehicle.vehicle__id}>
                  <TableCell className="font-medium">
                    {vehicle.vehicle__name}
                  </TableCell>
                  <TableCell>{vehicle.vehicle__plate}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(vehicle.total_cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(vehicle.total_liters)} L
                  </TableCell>
                  <TableCell className="text-right">
                    {vehicle.km_per_liter
                      ? formatNumber(vehicle.km_per_liter)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {vehicle.cost_per_km
                      ? formatCurrency(vehicle.cost_per_km)
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alerts */}
      {data.alerts.top_alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas Recentes</CardTitle>
            <CardDescription>
              Últimos alertas de consistência detectados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.alerts.top_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{alert.vehicle__name}</span>
                      <Badge variant={severityVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
