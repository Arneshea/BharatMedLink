import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

export type UserRole = 'PATIENT' | 'HOSPITAL_STAFF' | 'NETWORK_ADMIN'

export interface UserProfile {
  id?: string
  email: string
  role: UserRole
  display_name: string
  designation?: string
  hospital_id?: string
  hospital_name?: string
  organization?: string
  details?: Record<string, any>
}

interface AuthContextType {
  user: UserProfile | null
  setUser: (u: UserProfile | null) => void
  personas: UserProfile[]
  switchPersona: (p: UserProfile) => void
  login: (email: string, role?: UserRole) => Promise<UserProfile>
  register: (data: any) => Promise<UserProfile>
  logout: () => void
}

export const DEFAULT_PERSONAS: UserProfile[] = []


const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('bharatmedlink_user')
    if (!saved) return null
    try {
      return JSON.parse(saved)
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('bharatmedlink_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('bharatmedlink_user')
    }
  }, [user])

  const switchPersona = (p: UserProfile) => {
    setUser(p)
  }

  const login = async (email: string, role?: UserRole): Promise<UserProfile> => {
    try {
      const res = await api.authLogin({ email, role })
      if (res.user) {
        const u: UserProfile = {
          id: res.user.id,
          email: res.user.email,
          role: res.user.role,
          display_name: res.user.display_name,
          hospital_id: res.user.hospital_id,
          hospital_name: res.user.hospital_name || res.user.details?.hospital_name,
          details: res.user.details,
        }
        setUser(u)
        return u
      }
    } catch {
      // Fallback local match
      const matched = DEFAULT_PERSONAS.find((p) => p.email.toLowerCase() === email.toLowerCase())
      if (matched) {
        setUser(matched)
        return matched
      }
    }
    const fallbackUser: UserProfile = {
      email,
      display_name: email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
      role: role || 'HOSPITAL_STAFF',
    }
    setUser(fallbackUser)
    return fallbackUser
  }

  const register = async (data: any): Promise<UserProfile> => {
    try {
      const res = await api.authRegister(data)
      if (res.user) {
        const u: UserProfile = {
          id: res.user.id,
          email: res.user.email,
          role: res.user.role,
          display_name: res.user.display_name,
          hospital_id: res.user.hospital_id,
          hospital_name: res.user.hospital_name || data.hospital_name,
          details: res.user.details,
        }
        setUser(u)
        return u
      }
    } catch (err) {
      throw err
    }
    const fallbackUser: UserProfile = {
      email: data.email,
      display_name: data.name || data.display_name || data.email.split('@')[0],
      role: data.role || 'PATIENT',
      hospital_name: data.hospital_name,
      hospital_id: data.hospital_id,
      details: data,
    }
    setUser(fallbackUser)
    return fallbackUser
  }

  const logout = () => {
    localStorage.removeItem('bharatmedlink_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        personas: DEFAULT_PERSONAS,
        switchPersona,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
