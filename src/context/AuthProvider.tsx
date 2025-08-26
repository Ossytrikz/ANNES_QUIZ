import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

type AuthContextShape = {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextShape>({ user: null, session: null, loading: true })

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = supabase()

    client.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null)
      setUser(data?.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({ user, session, loading }), [user, session, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)