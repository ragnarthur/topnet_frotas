import { useCallback, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  FileText,
} from 'lucide-react'
import { imports, type ImportResult, type CSVFormatSpec } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from 'sonner'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function Import() {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Fetch format specification
  const { data: formatSpec, isLoading: formatLoading } = useQuery<CSVFormatSpec>({
    queryKey: ['import-format'],
    queryFn: imports.getFormat,
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: imports.uploadCSV,
    onSuccess: (result) => {
      setImportResult(result)
      if (result.success) {
        toast.success(`${result.summary.imported} abastecimentos importados com sucesso!`)
      } else {
        toast.error(`Importacao falhou. ${result.summary.errors} erros encontrados.`)
      }
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Erro ao importar arquivo')
    },
  })

  // Template download mutation
  const templateMutation = useMutation({
    mutationFn: imports.downloadTemplate,
    onSuccess: ({ blob, filename }) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Modelo baixado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao baixar modelo')
    },
  })

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files?.[0]) {
      const file = files[0]
      if (file.name.toLowerCase().endsWith('.csv')) {
        setSelectedFile(file)
        setImportResult(null)
      } else {
        toast.error('Selecione um arquivo CSV')
      }
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.[0]) {
      setSelectedFile(files[0])
      setImportResult(null)
    }
  }, [])

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setImportResult(null)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Abastecimentos</h1>
          <p className="text-muted-foreground">
            Importe abastecimentos em lote a partir de arquivo CSV
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => templateMutation.mutate()}
          disabled={templateMutation.isPending}
        >
          {templateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Baixar Modelo CSV
        </Button>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Area */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Arquivo
              </CardTitle>
              <CardDescription>
                Arraste um arquivo CSV ou clique para selecionar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`
                  relative rounded-lg border-2 border-dashed p-8 text-center transition-colors
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                  ${selectedFile ? 'border-green-500 bg-green-500/5' : ''}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />

                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <FileSpreadsheet className="h-12 w-12 text-green-500" />
                      <div className="text-left">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Importar
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleReset}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">
                      Arraste seu arquivo CSV aqui
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ou clique para selecionar
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Format Specification */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Formato do Arquivo
              </CardTitle>
              <CardDescription>
                Especificacao do formato CSV esperado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formatLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : formatSpec ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Encoding</p>
                      <p className="text-muted-foreground">{formatSpec.encoding}</p>
                    </div>
                    <div>
                      <p className="font-medium">Delimitador</p>
                      <p className="text-muted-foreground">{formatSpec.delimiter}</p>
                    </div>
                    <div>
                      <p className="font-medium">Separador Decimal</p>
                      <p className="text-muted-foreground">{formatSpec.decimal_separator}</p>
                    </div>
                    <div>
                      <p className="font-medium">Formatos de Data</p>
                      <p className="text-muted-foreground">{formatSpec.date_formats[0]}</p>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="columns">
                      <AccordionTrigger>Colunas do CSV</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {formatSpec.columns.map((col) => (
                            <div
                              key={col.name}
                              className="flex items-start gap-2 rounded-md border p-2 text-sm"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                    {col.name}
                                  </code>
                                  {col.required ? (
                                    <Badge variant="destructive" className="text-xs">
                                      Obrigatorio
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      Opcional
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-muted-foreground">{col.description}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Ex: {col.example}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="notes">
                      <AccordionTrigger>Observacoes</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {formatSpec.notes.map((note, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Import Results */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.success ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Importacao Concluida
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      Importacao com Erros
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  Resultado do processamento do arquivo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border bg-muted/50 p-4 text-center">
                    <p className="text-2xl font-bold">{importResult.summary.total_rows}</p>
                    <p className="text-sm text-muted-foreground">Total de Linhas</p>
                  </div>
                  <div className="rounded-lg border bg-green-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {importResult.summary.imported}
                    </p>
                    <p className="text-sm text-muted-foreground">Importados</p>
                  </div>
                  <div className="rounded-lg border bg-yellow-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {importResult.summary.skipped}
                    </p>
                    <p className="text-sm text-muted-foreground">Ignorados (Duplicados)</p>
                  </div>
                  <div className="rounded-lg border bg-red-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {importResult.summary.errors}
                    </p>
                    <p className="text-sm text-muted-foreground">Erros</p>
                  </div>
                </div>

                {/* Errors Table */}
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 font-semibold text-red-600">
                      <XCircle className="h-4 w-4" />
                      Erros Encontrados ({importResult.errors.length})
                    </h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Linha</TableHead>
                            <TableHead className="w-32">Coluna</TableHead>
                            <TableHead className="w-40">Valor</TableHead>
                            <TableHead>Mensagem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.errors.map((error, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{error.row}</TableCell>
                              <TableCell>
                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                  {error.column}
                                </code>
                              </TableCell>
                              <TableCell className="max-w-[160px] truncate text-muted-foreground">
                                {error.value || '-'}
                              </TableCell>
                              <TableCell className="text-red-600">{error.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Skipped Table */}
                {importResult.skipped.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 font-semibold text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      Registros Ignorados ({importResult.skipped.length})
                    </h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Linha</TableHead>
                            <TableHead>Motivo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.skipped.map((skip, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{skip.row}</TableCell>
                              <TableCell className="text-muted-foreground">{skip.reason}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Imported Table */}
                {importResult.imported.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 font-semibold text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Registros Importados ({importResult.imported.length})
                    </h3>
                    <div className="max-h-[300px] overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Linha</TableHead>
                            <TableHead>Placa</TableHead>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead className="text-right">Litros</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.imported.map((tx) => (
                            <TableRow key={tx.transaction_id}>
                              <TableCell className="font-mono">{tx.row}</TableCell>
                              <TableCell className="font-medium">{tx.vehicle_plate}</TableCell>
                              <TableCell>{tx.purchased_at}</TableCell>
                              <TableCell className="text-right">{tx.liters} L</TableCell>
                              <TableCell className="text-right">
                                R$ {parseFloat(tx.total_cost).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={handleReset}>
                    Nova Importacao
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
