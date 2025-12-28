import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Trees,
  Building,
  Wrench,
  Cable,
  FolderOpen,
  Search,
  Filter
} from 'lucide-react'
import { costCenters } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { CostCenter, CostCenterCategory, CostCenterList } from '@/types'

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

const categoryConfig: Record<CostCenterCategory, {
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
}> = {
  RURAL: {
    label: 'Rural',
    description: 'Operacoes em areas rurais',
    icon: Trees,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  URBAN: {
    label: 'Urbano',
    description: 'Operacoes em areas urbanas',
    icon: Building,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  INSTALLATION: {
    label: 'Instalacao',
    description: 'Servicos de instalacao',
    icon: Cable,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  MAINTENANCE: {
    label: 'Manutencao',
    description: 'Servicos de manutencao',
    icon: Wrench,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  ADMIN: {
    label: 'Administrativo',
    description: 'Despesas administrativas',
    icon: Building2,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
}

export function CostCentersPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null)
  const [deletingCostCenter, setDeletingCostCenter] = useState<CostCenterList | null>(null)
  const [formData, setFormData] = useState<CostCenterFormData>(emptyFormData)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<CostCenterCategory | 'ALL'>('ALL')

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
      toast.error('Erro ao excluir centro de custo. Pode haver abastecimentos vinculados.')
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

  const openDeleteDialog = (costCenter: CostCenterList) => {
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

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // Filter and search
  const filteredCostCenters = data?.results.filter((cc) => {
    const matchesSearch = cc.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'ALL' || cc.category === filterCategory
    return matchesSearch && matchesCategory
  }) || []

  // Group by category for summary
  const categorySummary = data?.results.reduce((acc, cc) => {
    acc[cc.category] = (acc[cc.category] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const totalActive = data?.results.filter(cc => cc.active).length || 0
  const totalInactive = data?.results.filter(cc => !cc.active).length || 0

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Centros de Custo</h1>
          <p className="text-muted-foreground">
            Organize os gastos da frota por categoria de operacao
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Centro de Custo
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                <FolderOpen className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.results.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Centros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActive}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                <div className="h-3 w-3 rounded-full bg-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInactive}</p>
                <p className="text-sm text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                <Filter className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(categorySummary).length}</p>
                <p className="text-sm text-muted-foreground">Categorias em Uso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10"
                />
              </div>
              <Select
                value={filterCategory}
                onValueChange={(value) => setFilterCategory(value as CostCenterCategory | 'ALL')}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-white/5 border-white/10">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Categorias</SelectItem>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className={`h-4 w-4 ${config.color}`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Cost Centers Grid */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-card border-white/10 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-white/5 rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCostCenters.length === 0 ? (
          <Card className="glass-card border-white/10">
            <CardContent className="p-12 text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterCategory !== 'ALL'
                  ? 'Nenhum centro de custo encontrado com os filtros aplicados'
                  : 'Nenhum centro de custo cadastrado'}
              </p>
              {!searchTerm && filterCategory === 'ALL' && (
                <Button
                  onClick={openCreateDialog}
                  variant="outline"
                  className="mt-4 border-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeiro centro de custo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCostCenters.map((costCenter) => {
              const config = categoryConfig[costCenter.category]
              const Icon = config.icon

              return (
                <motion.div
                  key={costCenter.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={`glass-card border-white/10 hover:border-white/20 transition-all ${!costCenter.active ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bgColor}`}>
                            <Icon className={`h-6 w-6 ${config.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{costCenter.name}</CardTitle>
                            <Badge
                              variant="outline"
                              className={`mt-1 ${config.color} border-current/30`}
                            >
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                        <Badge variant={costCenter.active ? 'success' : 'destructive'}>
                          {costCenter.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-4">
                        {config.description}
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => costCenters.get(costCenter.id).then(openEditDialog)}
                          className="hover:bg-blue-500/20 text-blue-400"
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(costCenter)}
                          className="hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
                <FolderOpen className="h-5 w-5 text-white" />
              </div>
              {editingCostCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
            </DialogTitle>
            <DialogDescription>
              {editingCostCenter
                ? 'Atualize os dados do centro de custo'
                : 'Crie um novo centro de custo para organizar os gastos da frota'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Centro de Custo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Instalacoes Zona Norte"
                  className="bg-white/5 border-white/10"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use um nome descritivo para facilitar a identificacao
                </p>
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
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                          <div>
                            <span className="font-medium">{config.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              - {config.description}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  A categoria ajuda a agrupar os gastos nos relatorios
                </p>
              </div>

              {editingCostCenter && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-white/10 bg-white/5"
                  />
                  <div>
                    <Label htmlFor="active" className="cursor-pointer font-medium">
                      Centro de custo ativo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Centros inativos nao aparecem nas opcoes de abastecimento
                    </p>
                  </div>
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
                disabled={isSubmitting || !formData.name.trim()}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400"
              >
                {isSubmitting ? 'Salvando...' : editingCostCenter ? 'Salvar Alteracoes' : 'Criar Centro de Custo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-red-400">
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
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-400">
                Atencao: Se houver abastecimentos vinculados a este centro de custo, a exclusao nao sera permitida.
              </p>
            </div>
          </div>
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
              {deleteMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
