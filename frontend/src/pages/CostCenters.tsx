import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react'
import { costCenters } from '@/api/client'
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
import type { CostCenter, CostCenterCategory } from '@/types'

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

interface CostCenterFormData {
  name: string
  category: CostCenterCategory
  active: boolean
}

const emptyFormData: CostCenterFormData = {
  name: '',
  category: 'RURAL',
  active: true,
}

const categoryLabels: Record<CostCenterCategory, string> = {
  RURAL: 'Rural',
  URBAN: 'Urbano',
  INSTALLATION: 'Instalacao',
  MAINTENANCE: 'Manutencao',
  ADMIN: 'Administrativo',
}

export function CostCentersPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null)
  const [deletingCostCenter, setDeletingCostCenter] = useState<CostCenter | null>(null)
  const [formData, setFormData] = useState<CostCenterFormData>(emptyFormData)

  const { data, isLoading } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: () => costCenters.list(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<CostCenter>) => costCenters.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] })
      toast.success('Centro de custo criado com sucesso!')
      closeDialog()
    },
    onError: () => {
      toast.error('Erro ao criar centro de custo')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CostCenter> }) =>
      costCenters.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] })
      toast.success('Centro de custo atualizado com sucesso!')
      closeDialog()
    },
    onError: () => {
      toast.error('Erro ao atualizar centro de custo')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => costCenters.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] })
      toast.success('Centro de custo excluido com sucesso!')
      setIsDeleteDialogOpen(false)
      setDeletingCostCenter(null)
    },
    onError: () => {
      toast.error('Erro ao excluir centro de custo')
    },
  })

  const openCreateDialog = () => {
    setEditingCostCenter(null)
    setFormData(emptyFormData)
    setIsDialogOpen(true)
  }

  const openEditDialog = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter)
    setFormData({
      name: costCenter.name,
      category: costCenter.category,
      active: costCenter.active,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (costCenter: CostCenter) => {
    setDeletingCostCenter(costCenter)
    setIsDeleteDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingCostCenter(null)
    setFormData(emptyFormData)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: Partial<CostCenter> = {
      name: formData.name,
      category: formData.category,
      active: formData.active,
    }

    if (editingCostCenter) {
      updateMutation.mutate({ id: editingCostCenter.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = () => {
    if (deletingCostCenter) {
      deleteMutation.mutate(deletingCostCenter.id)
    }
  }

  const getCategoryBadge = (category: CostCenterCategory) => {
    const colors: Record<CostCenterCategory, string> = {
      RURAL: 'bg-green-600',
      URBAN: 'bg-blue-600',
      INSTALLATION: 'bg-purple-600',
      MAINTENANCE: 'bg-orange-600',
      ADMIN: 'bg-gray-600',
    }
    return <Badge className={colors[category]}>{categoryLabels[category]}</Badge>
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
          <h1 className="text-3xl font-bold">Centros de Custo</h1>
          <p className="text-muted-foreground">
            Categorias de custo para abastecimentos
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Centro de Custo
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="glass-card border-white/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum centro de custo cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.results.map((costCenter) => (
                    <TableRow key={costCenter.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
                            <Briefcase className="h-4 w-4 text-violet-400" />
                          </div>
                          {costCenter.name}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(costCenter.category)}</TableCell>
                      <TableCell>
                        <Badge variant={costCenter.active ? 'success' : 'destructive'}>
                          {costCenter.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => costCenters.get(costCenter.id).then(openEditDialog)}
                            className="hover:bg-violet-500/20"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => costCenters.get(costCenter.id).then(openDeleteDialog)}
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
        <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              {editingCostCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
            </DialogTitle>
            <DialogDescription>
              {editingCostCenter
                ? 'Atualize os dados do centro de custo'
                : 'Preencha os dados para cadastrar um novo centro de custo'}
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
                  placeholder="Ex: Operacoes Rurais"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: CostCenterCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RURAL">Rural</SelectItem>
                    <SelectItem value="URBAN">Urbano</SelectItem>
                    <SelectItem value="INSTALLATION">Instalacao</SelectItem>
                    <SelectItem value="MAINTENANCE">Manutencao</SelectItem>
                    <SelectItem value="ADMIN">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingCostCenter && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-white/10 bg-white/5"
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    Centro de custo ativo
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
                {isSubmitting ? 'Salvando...' : editingCostCenter ? 'Atualizar' : 'Criar'}
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
              Excluir Centro de Custo
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o centro de custo{' '}
              <span className="font-semibold text-foreground">
                {deletingCostCenter?.name}
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
