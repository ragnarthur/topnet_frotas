import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, User } from 'lucide-react'
import { drivers, vehicles } from '@/api/client'
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
import type { Driver } from '@/types'

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

interface DriverFormData {
  name: string
  doc_id: string
  phone: string
  current_vehicle: string
  active: boolean
}

const emptyFormData: DriverFormData = {
  name: '',
  doc_id: '',
  phone: '',
  current_vehicle: '',
  active: true,
}

export function DriversPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null)
  const [formData, setFormData] = useState<DriverFormData>(emptyFormData)

  const { data, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => drivers.list(),
  })

  const { data: vehiclesList } = useQuery({
    queryKey: ['vehicles-active'],
    queryFn: () => vehicles.listActive(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Driver>) => drivers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      toast.success('Motorista criado com sucesso!')
      closeDialog()
    },
    onError: () => {
      toast.error('Erro ao criar motorista')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Driver> }) =>
      drivers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      toast.success('Motorista atualizado com sucesso!')
      closeDialog()
    },
    onError: () => {
      toast.error('Erro ao atualizar motorista')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => drivers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      toast.success('Motorista excluido com sucesso!')
      setIsDeleteDialogOpen(false)
      setDeletingDriver(null)
    },
    onError: () => {
      toast.error('Erro ao excluir motorista')
    },
  })

  const openCreateDialog = () => {
    setEditingDriver(null)
    setFormData(emptyFormData)
    setIsDialogOpen(true)
  }

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      doc_id: driver.doc_id || '',
      phone: driver.phone || '',
      current_vehicle: driver.current_vehicle || '',
      active: driver.active,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (driver: Driver) => {
    setDeletingDriver(driver)
    setIsDeleteDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingDriver(null)
    setFormData(emptyFormData)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: Partial<Driver> = {
      name: formData.name,
      doc_id: formData.doc_id || '',
      phone: formData.phone || '',
      current_vehicle: formData.current_vehicle || null,
      active: formData.active,
    }

    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = () => {
    if (deletingDriver) {
      deleteMutation.mutate(deletingDriver.id)
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
          <h1 className="text-3xl font-bold">Motoristas</h1>
          <p className="text-muted-foreground">
            Cadastro de motoristas da frota
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-400 hover:to-sky-400"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Motorista
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="glass-card border-white/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Veículo Atual</TableHead>
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
                      Nenhum motorista cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.results.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-sky-500/20">
                            <User className="h-4 w-4 text-blue-400" />
                          </div>
                          {driver.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {driver.doc_id || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {driver.phone || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {driver.current_vehicle_detail
                          ? `${driver.current_vehicle_detail.name} (${driver.current_vehicle_detail.plate})`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={driver.active ? 'success' : 'destructive'}>
                          {driver.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => drivers.get(driver.id).then(openEditDialog)}
                            className="hover:bg-blue-500/20"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => drivers.get(driver.id).then(openDeleteDialog)}
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
                <User className="h-5 w-5 text-white" />
              </div>
              {editingDriver ? 'Editar Motorista' : 'Novo Motorista'}
            </DialogTitle>
            <DialogDescription>
              {editingDriver
                ? 'Atualize os dados do motorista'
                : 'Preencha os dados para cadastrar um novo motorista'}
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
                  placeholder="Nome completo"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc_id">CPF / Documento</Label>
                  <Input
                    id="doc_id"
                    value={formData.doc_id}
                    onChange={(e) => setFormData({ ...formData, doc_id: e.target.value })}
                    placeholder="000.000.000-00"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Veículo Atual</Label>
                <Select
                  value={formData.current_vehicle}
                  onValueChange={(value) => setFormData({ ...formData, current_vehicle: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiclesList?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} ({vehicle.plate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingDriver && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-white/10 bg-white/5"
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    Motorista ativo
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
                {isSubmitting ? 'Salvando...' : editingDriver ? 'Atualizar' : 'Criar'}
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
              Excluir Motorista
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o motorista{' '}
              <span className="font-semibold text-foreground">
                {deletingDriver?.name}
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
