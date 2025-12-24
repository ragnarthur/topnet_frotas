import { useQuery } from '@tanstack/react-query'
import { vehicles } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function VehiclesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicles.list(),
  })

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Veículos</h1>
        <p className="text-muted-foreground">
          Cadastro de veículos da frota
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Combustível</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
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
                    Nenhum veículo cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                data?.results.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.name}</TableCell>
                    <TableCell>{vehicle.plate}</TableCell>
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
