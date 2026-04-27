'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

export type AuthRole = 'fan' | 'admin' | null

export interface AuthUser {
  id: string
  role: AuthRole
  name: string
  email?: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (provider: 'discord' | 'twitch') => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isFan: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
  isAdmin: false,
  isFan: false,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Map Supabase User to our AuthUser
  const mapUser = (su: User | undefined): AuthUser | null => {
    if (!su) return null
    // You can customize this logic, e.g. check an admin email list
    const isAdmin = su.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    
    return {
      id: su.id,
      role: isAdmin ? 'admin' : 'fan',
      name: su.user_metadata?.full_name || su.user_metadata?.custom_claims?.global_name || su.email?.split('@')[0] || 'Fan',
      email: su.email
    }
  }

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(mapUser(session?.user))
      setLoading(false)
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(mapUser(session?.user))
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (provider: 'discord' | 'twitch') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin: user?.role === 'admin',
        isFan: !!user, // Any logged-in user is at least a fan
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
