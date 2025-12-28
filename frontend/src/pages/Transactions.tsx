import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, Filter, Plus, Pencil, Trash2, X } from 'lucide-react'
import { fuelTransactions, vehicles, drivers, fuelStations, costCenters, fuelPrices } from '@/api/client'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatCurrencyInput,
  maskCurrencyInput,
  parseDecimalInput,
} from '@/lib/utils'
import type { FuelType } from '@/types'
import { useAuth } from '@/hooks/useAuth'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'GASOLINE', label: 'Gasolina' },
  { value: 'ETHANOL', label: 'Etanol' },
  { value: 'DIESEL', label: 'Diesel' },
]

function getNowLocalInput() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join('-') + `T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function maskDecimalInput(value: string, maxDecimals: number) {
  const cleaned = value.replace(/[^\d.,]/g, '')
  const commaIndex = cleaned.indexOf(',')
  const dotIndex = cleaned.indexOf('.')
  const separatorIndex = commaIndex >= 0 ? commaIndex : dotIndex
  const hasTrailingSeparator = separatorIndex === cleaned.length - 1

  let integerPart = cleaned
  let fractionPart = ''
  if (separatorIndex >= 0) {
    integerPart = cleaned.slice(0, separatorIndex)
    fractionPart = cleaned.slice(separatorIndex + 1).replace(/[.,]/g, '')
  }

  integerPart = integerPart.replace(/^0+(?=\d)/, '')
  if (integerPart === '' && fractionPart) {
    integerPart = '0'
  }
  fractionPart = fractionPart.slice(0, maxDecimals)

  if (hasTrailingSeparator) {
    return `${integerPart || '0'},`
  }
  return fractionPart ? `${integerPart},${fractionPart}` : integerPart
}

function maskIntegerInput(value: string) {
  return value.replace(/\D/g, '')
}

export function TransactionsPage() {
  const dateTimeInputRef = useRef<HTMLInputElement | null>(null)
  const { isAdmin, isDriver, user } = useAuth()
  const driverVehicle = user?.driver?.current_vehicle || null
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)

  // Filter states
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterDriver, setFilterDriver] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Edit/Delete states
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<string | null>(null)
  const buildEmptyForm = (vehicleId = '', fuelType: FuelType = 'GASOLINE') => ({
    vehicle: vehicleId,
    driver: '',
    station: '',
    cost_center: '',
    purchased_at: getNowLocalInput(),
    liters: '',
    unit_price: '',
    odometer_km: '',
    fuel_type: fuelType,
    notes: '',
  })
  const [form, setForm] = useState(buildEmptyForm())

  const queryClient = useQueryClient()

  const hasFilters = filterVehicle || filterDriver || filterDateFrom || filterDateTo

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['fuel-transactions', filterVehicle, filterDriver, filterDateFrom, filterDateTo],
    queryFn: () => fuelTransactions.list({
      vehicle: filterVehicle || undefined,
      driver: filterDriver || undefined,
      from_date: filterDateFrom || undefined,
      to_date: filterDateTo || undefined,
    }),
  })

  const clearFilters = () => {
    setFilterVehicle('')
    setFilterDriver('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const { data: vehiclesList } = useQuery({
    queryKey: ['vehicles-active'],
    queryFn: () => vehicles.listActive(),
    enabled: isAdmin,
  })

  const { data: driversList } = useQuery({
    queryKey: ['drivers-active'],
    queryFn: () => drivers.listActive(),
    enabled: isAdmin,
  })

  const { data: stationsList } = useQuery({
    queryKey: ['stations-active'],
    queryFn: () => fuelStations.listActive(),
    enabled: isAdmin,
  })

  const { data: costCentersList } = useQuery({
    queryKey: ['cost-centers-active'],
    queryFn: () => costCenters.listActive(),
    enabled: isAdmin,
  })

  const createMutation = useMutation({
    mutationFn: fuelTransactions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowForm(false)
      setForm(buildEmptyForm(
        isDriver && driverVehicle ? driverVehicle.id : '',
        isDriver && driverVehicle ? driverVehicle.fuel_type : 'GASOLINE'
      ))
      setAttachmentFile(null)
      setAttachmentPreview(null)
      toast.success('Abastecimento registrado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao registrar abastecimento')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fuelTransactions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeletingTransaction(null)
      toast.success('Abastecimento excluído com sucesso')
    },
    onError: () => {
      toast.error('Erro ao excluir abastecimento')
    },
  })

  const loadLatestPrice = async (fuelType: FuelType) => {
    try {
      const price = await fuelPrices.latest(fuelType)
      if (price) {
        setForm((prev) => ({
          ...prev,
          unit_price: formatCurrencyInput(price.price_per_liter, 2)
        }))
      }
    } catch {
      // Ignore error, price will be empty
    }
  }

  useEffect(() => {
    return () => {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview)
      }
    }
  }, [attachmentPreview])

  const handleVehicleChange = async (vehicleId: string) => {
    setForm((prev) => ({ ...prev, vehicle: vehicleId }))
    const vehicle = vehiclesList?.find((v) => v.id === vehicleId)
    if (vehicle) {
      setForm((prev) => ({ ...prev, fuel_type: vehicle.fuel_type }))
      await loadLatestPrice(vehicle.fuel_type)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const vehicleId = isDriver && driverVehicle ? driverVehicle.id : form.vehicle
    if (!vehicleId) {
      toast.error('Defina o veículo atual antes de registrar o abastecimento.')
      return
    }
    createMutation.mutate({
      vehicle: vehicleId,
      driver: isAdmin ? (form.driver || undefined) : undefined,
      station: isAdmin ? (form.station || undefined) : undefined,
      cost_center: isAdmin ? (form.cost_center || undefined) : undefined,
      purchased_at: form.purchased_at,
      liters: parseDecimalInput(form.liters),
      unit_price: parseDecimalInput(form.unit_price),
      odometer_km: Number(maskIntegerInput(form.odometer_km)),
      fuel_type: isDriver && driverVehicle ? driverVehicle.fuel_type : form.fuel_type,
      notes: form.notes || undefined,
      attachment: attachmentFile || undefined,
    })
  }

  const handleAttachmentChange = (file: File | null) => {
    if (!file) {
      setAttachmentFile(null)
      setAttachmentPreview(null)
      return
    }

    const maxSizeMb = 5
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(file.type)) {
      toast.error('Envie apenas imagens (JPG, PNG, WEBP).')
      return
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Limite de ${maxSizeMb}MB.`)
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setAttachmentFile(file)
    setAttachmentPreview(previewUrl)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Abastecimentos</h1>
          <p className="text-muted-foreground">
            Gerencie os registros de abastecimento da frota
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
              {hasFilters && (
                <Badge variant="secondary" className="ml-2">
                  {[filterVehicle, filterDriver, filterDateFrom, filterDateTo].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          )}
        <Button
          onClick={() => {
            if (isDriver && !driverVehicle) {
              toast.error('Veículo atual não definido. Solicite ao administrador.')
              return
            }
            if (!showForm) {
              if (isDriver && driverVehicle) {
                setForm(buildEmptyForm(driverVehicle.id, driverVehicle.fuel_type))
                void loadLatestPrice(driverVehicle.fuel_type)
              } else {
                setForm((prev) => ({ ...prev, purchased_at: getNowLocalInput() }))
              }
            }
            setShowForm((prev) => !prev)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Abastecimento
          </Button>
        </div>
      </motion.div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="glass-card border-white/10">
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-2">
                    <Label>Veículo</Label>
                    <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
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
                    <Select value={filterDriver} onValueChange={setFilterDriver}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        {driversList?.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      disabled={!hasFilters}
                      className="w-full"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle>Novo Abastecimento</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Veículo *</Label>
                    {isAdmin ? (
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
                    ) : (
                      <Input
                        value={driverVehicle ? `${driverVehicle.name} (${driverVehicle.plate})` : ''}
                        placeholder="Veículo atual não definido"
                        disabled
                      />
                    )}
                  </div>

                  {isAdmin && (
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
                  )}

                  {isAdmin && (
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
                  )}

                  {isAdmin && (
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
                  )}

                  <div className="space-y-2">
                    <Label>Data/Hora *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          ref={dateTimeInputRef}
                          type="datetime-local"
                          className="datetime-local-input pr-11"
                          value={form.purchased_at}
                          onClick={() => dateTimeInputRef.current?.showPicker?.()}
                          onFocus={() => dateTimeInputRef.current?.showPicker?.()}
                          onChange={(e) => setForm((prev) => ({ ...prev, purchased_at: e.target.value }))}
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
                          onClick={() => dateTimeInputRef.current?.showPicker?.()}
                          aria-label="Selecionar data e hora"
                        >
                          <CalendarClock className="h-4 w-4" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 shrink-0"
                        onClick={() => setForm((prev) => ({ ...prev, purchased_at: getNowLocalInput() }))}
                      >
                        Agora
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Combustível *</Label>
                    {isAdmin ? (
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
                    ) : (
                      <Input
                        value={FUEL_TYPES.find((ft) => ft.value === form.fuel_type)?.label || form.fuel_type}
                        disabled
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Litros *</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={form.liters}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        liters: maskDecimalInput(e.target.value, 3)
                      }))}
                      placeholder="0,000"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preço por Litro *</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={form.unit_price}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        unit_price: maskCurrencyInput(e.target.value, 2)
                      }))}
                      placeholder="R$ 0,0000"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Baseado na média nacional. Ajuste se o preço do posto for diferente.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Odômetro (km) *</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={form.odometer_km}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        odometer_km: maskIntegerInput(e.target.value)
                      }))}
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

                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <Label>Comprovante</Label>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      capture="environment"
                      onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
                    />
                    {attachmentPreview && (
                      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <img
                          src={attachmentPreview}
                          alt="Pré-visualização do comprovante"
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{attachmentFile?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachmentFile?.size || 0) / 1024 / 1024 < 1
                              ? `${Math.round((attachmentFile?.size || 0) / 1024)} KB`
                              : `${((attachmentFile?.size || 0) / 1024 / 1024).toFixed(2)} MB`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleAttachmentChange(null)}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: JPG, PNG, WEBP (até 5MB).
                    </p>
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
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants}>
        <Card className="glass-card border-white/10">
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
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : transactionsData?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground">
                      {hasFilters ? 'Nenhum resultado com os filtros aplicados' : 'Nenhum abastecimento registrado'}
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
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingTransaction(tx.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => setDeletingTransaction(tx.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este abastecimento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeletingTransaction(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingTransaction) {
                  deleteMutation.mutate(deletingTransaction)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="glass-card border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Abastecimento</DialogTitle>
            <DialogDescription>
              Altere os dados do abastecimento e clique em salvar.
            </DialogDescription>
          </DialogHeader>
          <EditTransactionForm
            transactionId={editingTransaction}
            onSuccess={() => setEditingTransaction(null)}
            onCancel={() => setEditingTransaction(null)}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// Edit Transaction Form Component
function EditTransactionForm({
  transactionId,
  onSuccess,
  onCancel,
}: {
  transactionId: string | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const [editForm, setEditForm] = useState({
    liters: '',
    unit_price: '',
    odometer_km: '',
    notes: '',
  })

  const { data: transaction, isLoading } = useQuery({
    queryKey: ['fuel-transaction', transactionId],
    queryFn: () => fuelTransactions.get(transactionId!),
    enabled: !!transactionId,
  })

  useEffect(() => {
    if (transaction) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditForm({
        liters: formatCurrencyInput(transaction.liters, 3),
        unit_price: formatCurrencyInput(transaction.unit_price, 2),
        odometer_km: String(transaction.odometer_km),
        notes: transaction.notes || '',
      })
    }
  }, [transaction])

  const updateMutation = useMutation({
    mutationFn: (data: { liters?: number; unit_price?: number; odometer_km?: number; notes?: string }) =>
      fuelTransactions.update(transactionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Abastecimento atualizado com sucesso')
      onSuccess()
    },
    onError: () => {
      toast.error('Erro ao atualizar abastecimento')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      liters: parseDecimalInput(editForm.liters),
      unit_price: parseDecimalInput(editForm.unit_price),
      odometer_km: Number(editForm.odometer_km.replace(/\D/g, '')),
      notes: editForm.notes || undefined,
    })
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Litros</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={editForm.liters}
            onChange={(e) => setEditForm((prev) => ({
              ...prev,
              liters: maskDecimalInput(e.target.value, 3)
            }))}
            placeholder="0,000"
          />
        </div>

        <div className="space-y-2">
          <Label>Preço por Litro</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={editForm.unit_price}
            onChange={(e) => setEditForm((prev) => ({
              ...prev,
              unit_price: maskCurrencyInput(e.target.value, 2)
            }))}
            placeholder="R$ 0,0000"
          />
        </div>

        <div className="space-y-2">
          <Label>Odômetro (km)</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={editForm.odometer_km}
            onChange={(e) => setEditForm((prev) => ({
              ...prev,
              odometer_km: e.target.value.replace(/\D/g, '')
            }))}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Input
            value={editForm.notes}
            onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Observações..."
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
