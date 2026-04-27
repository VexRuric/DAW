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
  login: (provider: 'discord' | 'twitch' | 'google') => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>
  logout: () => Promise<void>
  isAdmin: boolean
  isFan: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  loginWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  logout: async () => {},
  isAdmin: false,
  isFan: false,
  loading: true,
})

function mapUser(su: User | undefined): AuthUser | null {
  if (!su) return null
  const isAdmin = su.app_metadata?.role === 'admin'
  const meta = su.user_metadata ?? {}
  const name =
    meta.full_name ||
    meta.name ||
    meta.custom_claims?.global_name ||
    meta.preferred_username ||
    su.email?.split('@')[0] ||
    'Fan'
  return {
    id: su.id,
    role: isAdmin ? 'admin' : 'fan',
    name,
    email: su.email,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Force refresh to pick up latest app_metadata (e.g. admin role set server-side)
        const { data: refreshed } = await supabase.auth.refreshSession()
        setUser(mapUser(refreshed.session?.user ?? session.user))
      } else {
        setUser(null)
      }
      setLoading(false)  // only set here, after refresh completes
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't set loading here — it races with refreshSession() above and
      // can mark loading=false before the admin role is populated.
      setUser(mapUser(session?.user))
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (provider: 'discord' | 'twitch' | 'google') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const loginWithEmail = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
  ): Promise<{ error: string | null; needsConfirmation?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) return { error: error.message }
    // If email confirmation is required, identities array is empty
    const needsConfirmation = !data.session
    return { error: null, needsConfirmation }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginWithEmail,
      signUpWithEmail,
      logout,
      isAdmin: user?.role === 'admin',
      isFan: !!user,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
