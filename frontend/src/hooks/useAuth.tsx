/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { auth, type UserProfile } from '@/api/client'
import { tokenStore } from '@/lib/tokenStore'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: UserProfile | null
  isAdmin: boolean
  isDriver: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserProfile | null>(null)

  const fetchProfile = async () => {
    try {
      const profile = await auth.profile()
      setUser(profile)
      return profile
    } catch {
      setUser(null)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true
    const bootstrapAuth = async () => {
      try {
        const tokens = await auth.refresh()
        if (!isMounted) {
          return
        }
        tokenStore.setAccess(tokens.access)
        setIsAuthenticated(true)
        // Fetch user profile after successful token refresh
        await fetchProfile()
      } catch {
        if (!isMounted) {
          return
        }
        tokenStore.clear()
        setIsAuthenticated(false)
        setUser(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    bootstrapAuth()
    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await auth.login(username, password)
    tokenStore.setAccess(tokens.access)
    setIsAuthenticated(true)
    // Fetch user profile after successful login
    await fetchProfile()
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    void auth.logout()
    setIsAuthenticated(false)
    setUser(null)
  }, [])

  const isAdmin = user?.is_admin ?? false
  const isDriver = user?.is_driver ?? false

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, isAdmin, isDriver, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
