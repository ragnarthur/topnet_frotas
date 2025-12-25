import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Car } from 'lucide-react'
import { vehicles } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { Vehicle, FuelType, UsageCategory } from '@/types'

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

interface VehicleFormData {
  plate: string
  name: string
  model: string
  fuel_type: FuelType
  tank_capacity_liters: string
  usage_category: UsageCategory
  min_expected_km_per_liter: string
  max_expected_km_per_liter: string
  active: boolean
}

const emptyFormData: VehicleFormData = {
  plate: '',
  name: '',
  model: '',
  fuel_type: 'GASOLINE',
  tank_capacity_liters: '',
  usage_category: 'OPERATIONAL',
  min_expected_km_per_liter: '',
  max_expected_km_per_liter: '',
  active: true,
}

export function VehiclesPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null)
  const [formData, setFormData] = useState<VehicleFormData>(emptyFormData)

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicles.list(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => vehicles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veiculo criado com sucesso!')
      closeDialog()
    },
    onError: () => {
      toast.error('Erro ao criar veiculo')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) =>
      vehicles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veiculo atualizado com sucesso!')
      closeDialog()
    },
    onError: () => {
      toast.error('Erro ao atualizar veiculo')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehicles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veiculo excluido com sucesso!')
      setIsDeleteDialogOpen(false)
      setDeletingVehicle(null)
    },
    onError: () => {
      toast.error('Erro ao excluir veiculo')
    },
  })

  const openCreateDialog = () => {
    setEditingVehicle(null)
    setFormData(emptyFormData)
    setIsDialogOpen(true)
  }

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      plate: vehicle.plate,
      name: vehicle.name,
      model: vehicle.model,
      fuel_type: vehicle.fuel_type,
      tank_capacity_liters: vehicle.tank_capacity_liters?.toString() || '',
      usage_category: vehicle.usage_category,
      min_expected_km_per_liter: vehicle.min_expected_km_per_liter?.toString() || '',
      max_expected_km_per_liter: vehicle.max_expected_km_per_liter?.toString() || '',
      active: vehicle.active,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (vehicle: Vehicle) => {
    setDeletingVehicle(vehicle)
    setIsDeleteDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingVehicle(null)
    setFormData(emptyFormData)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: Partial<Vehicle> = {
      plate: formData.plate,
      name: formData.name,
      model: formData.model,
      fuel_type: formData.fuel_type,
      usage_category: formData.usage_category,
      active: formData.active,
      tank_capacity_liters: formData.tank_capacity_liters
        ? parseFloat(formData.tank_capacity_liters)
        : null,
      min_expected_km_per_liter: formData.min_expected_km_per_liter
        ? parseFloat(formData.min_expected_km_per_liter)
        : null,
      max_expected_km_per_liter: formData.max_expected_km_per_liter
        ? parseFloat(formData.max_expected_km_per_liter)
        : null,
    }

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = () => {
    if (deletingVehicle) {
      deleteMutation.mutate(deletingVehicle.id)
    }
  }

  const getFuelTypeBadge = (fuelType: string) => {
    switch (fuelType) {
      case 'GASOLINE':
        return <Badge variant="default">Gasolina</Badge>
      case 'ETHANOL':
        return <Badge variant="secondary">Etanol</Badge>
      case 'DIESEL':
        return <Badge className="bg-yellow-600">Diesel</Badge>
      default:
        return <Badge variant="outline">{fuelType}</Badge>
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Veiculos</h1>
          <p className="text-muted-foreground">
            Cadastro de veiculos da frota
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Veiculo
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="glass-card border-white/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Combustivel</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum veiculo cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.results.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
                            <Car className="h-4 w-4 text-violet-400" />
                          </div>
                          {vehicle.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{vehicle.plate}</TableCell>
                      <TableCell>{getFuelTypeBadge(vehicle.fuel_type)}</TableCell>
                      <TableCell>
                        <Badge variant={vehicle.usage_category === 'PERSONAL' ? 'outline' : 'secondary'}>
                          {vehicle.usage_category_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={vehicle.active ? 'success' : 'destructive'}>
                          {vehicle.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => vehicles.get(vehicle.id).then(openEditDialog)}
                            className="hover:bg-violet-500/20"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => vehicles.get(vehicle.id).then(openDeleteDialog)}
                            className="hover:bg-red-500/20 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500">
                <Car className="h-5 w-5 text-white" />
              </div>
              {editingVehicle ? 'Editar Veiculo' : 'Novo Veiculo'}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? 'Atualize os dados do veiculo'
                : 'Preencha os dados para cadastrar um novo veiculo'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Troller"
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate">Placa</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    placeholder="ABC-1234"
                    className="bg-white/5 border-white/10 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: Ford Ranger 2020"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel_type">Combustivel</Label>
                  <Select
                    value={formData.fuel_type}
                    onValueChange={(value: FuelType) => setFormData({ ...formData, fuel_type: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GASOLINE">Gasolina</SelectItem>
                      <SelectItem value="ETHANOL">Etanol</SelectItem>
                      <SelectItem value="DIESEL">Diesel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usage_category">Categoria</Label>
                  <Select
                    value={formData.usage_category}
                    onValueChange={(value: UsageCategory) => setFormData({ ...formData, usage_category: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATIONAL">Operacional</SelectItem>
                      <SelectItem value="PERSONAL">Pessoal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tank_capacity_liters">Tanque (L)</Label>
                  <Input
                    id="tank_capacity_liters"
                    type="number"
                    step="0.1"
                    value={formData.tank_capacity_liters}
                    onChange={(e) => setFormData({ ...formData, tank_capacity_liters: e.target.value })}
                    placeholder="55"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_expected_km_per_liter">km/L Min</Label>
                  <Input
                    id="min_expected_km_per_liter"
                    type="number"
                    step="0.1"
                    value={formData.min_expected_km_per_liter}
                    onChange={(e) => setFormData({ ...formData, min_expected_km_per_liter: e.target.value })}
                    placeholder="8"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_expected_km_per_liter">km/L Max</Label>
                  <Input
                    id="max_expected_km_per_liter"
                    type="number"
                    step="0.1"
                    value={formData.max_expected_km_per_liter}
                    onChange={(e) => setFormData({ ...formData, max_expected_km_per_liter: e.target.value })}
                    placeholder="14"
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>

              {editingVehicle && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-white/10 bg-white/5"
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    Veiculo ativo
                  </Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                className="border-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400"
              >
                {isSubmitting ? 'Salvando...' : editingVehicle ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              Excluir Veiculo
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o veiculo{' '}
              <span className="font-semibold text-foreground">
                {deletingVehicle?.name}
              </span>
              ? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
