import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Fuel } from 'lucide-react'
import { fuelStations } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { FuelStation } from '@/types'

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

interface StationFormData {
  name: string
  city: string
  address: string
  active: boolean
}

const emptyFormData: StationFormData = {
  name: '',
  city: '',
  address: '',
  active: true,
}

export function StationsPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<FuelStation | null>(null)
  const [deletingStation, setDeletingStation] = useState<FuelStation | null>(null)
  const [formData, setFormData] = useState<StationFormData>(emptyFormData)

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-stations'],
    queryFn: () => fuelStations.list(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<FuelStation>) => fuelStations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-stations'] })
      toast.success('Posto criado com sucesso!')
      closeDialog()
    },
    onError: () => {
      toast.error('Erro ao criar posto')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FuelStation> }) =>
      fuelStations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-stations'] })
      toast.success('Posto atualizado com sucesso!')
      closeDialog()
    },
    onError: () => {
      toast.error('Erro ao atualizar posto')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fuelStations.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-stations'] })
      toast.success('Posto excluido com sucesso!')
      setIsDeleteDialogOpen(false)
      setDeletingStation(null)
    },
    onError: () => {
      toast.error('Erro ao excluir posto')
    },
  })

  const openCreateDialog = () => {
    setEditingStation(null)
    setFormData(emptyFormData)
    setIsDialogOpen(true)
  }

  const openEditDialog = (station: FuelStation) => {
    setEditingStation(station)
    setFormData({
      name: station.name,
      city: station.city || '',
      address: station.address || '',
      active: station.active,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (station: FuelStation) => {
    setDeletingStation(station)
    setIsDeleteDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingStation(null)
    setFormData(emptyFormData)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: Partial<FuelStation> = {
      name: formData.name,
      city: formData.city,
      address: formData.address,
      active: formData.active,
    }

    if (editingStation) {
      updateMutation.mutate({ id: editingStation.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = () => {
    if (deletingStation) {
      deleteMutation.mutate(deletingStation.id)
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
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Postos</h1>
          <p className="text-muted-foreground">
            Cadastro de postos de combustivel
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-400 hover:to-sky-400"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Posto
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="glass-card border-white/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Endereco</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum posto cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.results.map((station) => (
                    <TableRow key={station.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-sky-500/20">
                            <Fuel className="h-4 w-4 text-blue-400" />
                          </div>
                          {station.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {station.city || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {station.address || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={station.active ? 'success' : 'destructive'}>
                          {station.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fuelStations.get(station.id).then(openEditDialog)}
                            className="hover:bg-blue-500/20"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fuelStations.get(station.id).then(openDeleteDialog)}
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
        <DialogContent className="glass-card border-white/10 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500">
                <Fuel className="h-5 w-5 text-white" />
              </div>
              {editingStation ? 'Editar Posto' : 'Novo Posto'}
            </DialogTitle>
            <DialogDescription>
              {editingStation
                ? 'Atualize os dados do posto'
                : 'Preencha os dados para cadastrar um novo posto'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Posto Shell Centro"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ex: Sao Paulo"
                  className="bg-white/5 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereco</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Av. Paulista, 1000"
                  className="bg-white/5 border-white/10"
                />
              </div>

              {editingStation && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-white/10 bg-white/5"
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    Posto ativo
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
                className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-400 hover:to-sky-400"
              >
                {isSubmitting ? 'Salvando...' : editingStation ? 'Atualizar' : 'Criar'}
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
              Excluir Posto
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o posto{' '}
              <span className="font-semibold text-foreground">
                {deletingStation?.name}
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
