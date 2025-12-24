import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { fuelTransactions, vehicles, drivers, fuelStations, costCenters, fuelPrices } from '@/api/client'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import type { FuelType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'GASOLINE', label: 'Gasolina' },
  { value: 'ETHANOL', label: 'Etanol' },
  { value: 'DIESEL', label: 'Diesel' },
]

export function TransactionsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    vehicle: '',
    driver: '',
    station: '',
    cost_center: '',
    purchased_at: new Date().toISOString().slice(0, 16),
    liters: '',
    unit_price: '',
    odometer_km: '',
    fuel_type: 'GASOLINE' as FuelType,
    notes: '',
  })

  const queryClient = useQueryClient()

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['fuel-transactions'],
    queryFn: () => fuelTransactions.list(),
  })

  const { data: vehiclesList } = useQuery({
    queryKey: ['vehicles-active'],
    queryFn: () => vehicles.listActive(),
  })

  const { data: driversList } = useQuery({
    queryKey: ['drivers-active'],
    queryFn: () => drivers.listActive(),
  })

  const { data: stationsList } = useQuery({
    queryKey: ['stations-active'],
    queryFn: () => fuelStations.listActive(),
  })

  const { data: costCentersList } = useQuery({
    queryKey: ['cost-centers-active'],
    queryFn: () => costCenters.listActive(),
  })

  const createMutation = useMutation({
    mutationFn: fuelTransactions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowForm(false)
      setForm({
        vehicle: '',
        driver: '',
        station: '',
        cost_center: '',
        purchased_at: new Date().toISOString().slice(0, 16),
        liters: '',
        unit_price: '',
        odometer_km: '',
        fuel_type: 'GASOLINE',
        notes: '',
      })
    },
  })

  const handleVehicleChange = async (vehicleId: string) => {
    setForm((prev) => ({ ...prev, vehicle: vehicleId }))
    const vehicle = vehiclesList?.find((v) => v.id === vehicleId)
    if (vehicle) {
      setForm((prev) => ({ ...prev, fuel_type: vehicle.fuel_type }))
      try {
        const price = await fuelPrices.latest(vehicle.fuel_type)
        if (price) {
          setForm((prev) => ({ ...prev, unit_price: String(price.price_per_liter) }))
        }
      } catch {
        // Ignore error, price will be empty
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      vehicle: form.vehicle,
      driver: form.driver || undefined,
      station: form.station || undefined,
      cost_center: form.cost_center || undefined,
      purchased_at: form.purchased_at,
      liters: Number(form.liters),
      unit_price: Number(form.unit_price),
      odometer_km: Number(form.odometer_km),
      fuel_type: form.fuel_type,
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Abastecimentos</h1>
          <p className="text-muted-foreground">
            Gerencie os registros de abastecimento da frota
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Abastecimento
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Abastecimento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select value={form.vehicle} onValueChange={handleVehicleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiclesList?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.plate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motorista</Label>
                <Select value={form.driver} onValueChange={(v) => setForm((prev) => ({ ...prev, driver: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {driversList?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Posto</Label>
                <Select value={form.station} onValueChange={(v) => setForm((prev) => ({ ...prev, station: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stationsList?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Select value={form.cost_center} onValueChange={(v) => setForm((prev) => ({ ...prev, cost_center: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {costCentersList?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data/Hora *</Label>
                <Input
                  type="datetime-local"
                  value={form.purchased_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, purchased_at: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Combustível *</Label>
                <Select
                  value={form.fuel_type}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, fuel_type: v as FuelType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value}>
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Litros *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.liters}
                  onChange={(e) => setForm((prev) => ({ ...prev, liters: e.target.value }))}
                  placeholder="0.000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Preço por Litro *</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.unit_price}
                  onChange={(e) => setForm((prev) => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="0.0000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Odômetro (km) *</Label>
                <Input
                  type="number"
                  value={form.odometer_km}
                  onChange={(e) => setForm((prev) => ({ ...prev, odometer_km: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label>Observações</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações adicionais..."
                />
              </div>

              <div className="flex gap-2 md:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="text-right">Litros</TableHead>
                <TableHead className="text-right">Preço/L</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Odômetro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : transactionsData?.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum abastecimento registrado
                  </TableCell>
                </TableRow>
              ) : (
                transactionsData?.results.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDateTime(tx.purchased_at)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{tx.vehicle_name}</div>
                      <div className="text-sm text-muted-foreground">{tx.vehicle_plate}</div>
                    </TableCell>
                    <TableCell>{tx.driver_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(tx.liters, 3)} L
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(tx.unit_price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(tx.total_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{tx.odometer_km.toLocaleString()} km</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
