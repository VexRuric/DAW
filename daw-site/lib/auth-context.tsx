'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

export type AuthRole = 'admin' | 'creative' | 'writer' | 'fan' | null

export interface AuthUser {
  id: string
  role: AuthRole
  name: string
  nickname: string | null
  email?: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (provider: 'discord' | 'twitch' | 'google') => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>
  logout: () => Promise<void>
  refreshNickname: () => Promise<void>
  isAdmin: boolean
  isCreative: boolean
  isWriter: boolean
  isFan: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  loginWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  logout: async () => {},
  refreshNickname: async () => {},
  isAdmin: false,
  isCreative: false,
  isWriter: false,
  isFan: false,
  loading: true,
})

function mapUser(su: User | undefined): AuthUser | null {
  if (!su) return null
  const raw = su.app_metadata?.role
  const role: AuthRole =
    raw === 'admin' ? 'admin' :
    raw === 'creative' ? 'creative' :
    raw === 'writer' ? 'writer' : 'fan'
  const meta = su.user_metadata ?? {}
  const name =
    meta.full_name ||
    meta.name ||
    meta.custom_claims?.global_name ||
    meta.preferred_username ||
    su.email?.split('@')[0] ||
    'Fan'
  return { id: su.id, role, name, nickname: null, email: su.email }
}

async function fetchNickname(userId: string): Promise<string | null> {
  const { data } = await supabase.from('user_profiles').select('nickname').eq('id', userId).single()
  return data?.nickname ?? null
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
      // Keep synchronous — async callbacks here race with refreshSession() above
      // and can overwrite the correctly-refreshed role with stale data.
      setUser(mapUser(session?.user))
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch nickname separately so it never races with role resolution
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchNickname(userId).then(nickname => {
      if (!cancelled) setUser(prev => prev?.id === userId ? { ...prev, nickname } : prev)
    }).catch(() => { /* nickname is optional — silently ignore network/table errors */ })
    return () => { cancelled = true }
  }, [userId])

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

  const refreshNickname = async () => {
    const id = user?.id
    if (!id) return
    const nickname = await fetchNickname(id).catch(() => null)
    setUser(prev => prev?.id === id ? { ...prev, nickname: nickname ?? null } : prev)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginWithEmail,
      signUpWithEmail,
      logout,
      refreshNickname,
      isAdmin: user?.role === 'admin',
      isCreative: user?.role === 'creative',
      isWriter: user?.role === 'writer',
      isFan: !!user,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
