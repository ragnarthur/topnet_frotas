import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ArrowRight, Droplets, Fuel, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const highlights = [
  {
    title: 'Alertas automáticos',
    description: 'Consistência de odômetro, consumo e tanque.',
    icon: AlertTriangle,
  },
  {
    title: 'Preço atualizado',
    description: 'Snapshot baseado no último abastecimento.',
    icon: Droplets,
  },
  {
    title: 'Indicadores claros',
    description: 'Custo total, km/L e R$/km por veículo.',
    icon: TrendingUp,
  },
]

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate({ to: '/' })
    } catch {
      setError('Usuário ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 gradient-bg" />
      <div className="absolute -top-40 -left-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="absolute top-10 right-0 h-96 w-96 rounded-full bg-violet-500/20 blur-[140px]" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-[140px]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12"
      >
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Monitoramento em tempo real
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Controle de frota com <span className="gradient-text">custo previsível</span>
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Dashboard claro, alertas automáticos e preço de combustível sempre atualizado.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <motion.div
                  key={item.title}
                  variants={itemVariants}
                  className="glass-card rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                      <item.icon className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="glass-card rounded-2xl border border-white/10 p-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg">
                <Fuel className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bem-vindo</p>
                <h2 className="text-2xl font-bold">TopNet Frotas</h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Acesse com suas credenciais para continuar.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-white/5 border-white/10"
                />
              </div>
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="login-error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:from-violet-400 hover:to-cyan-400"
                disabled={loading}
              >
                {loading ? (
                  'Entrando...'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Entrar
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
