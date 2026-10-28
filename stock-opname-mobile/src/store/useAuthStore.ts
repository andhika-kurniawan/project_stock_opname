import { create } from 'zustand'
import { authService, LoginParams } from '../services/auth'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialLoading: boolean
  error: string | null
  
  initAuth: () => Promise<void>
  login: (params: LoginParams) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialLoading: true,
  error: null,

  initAuth: async () => {
    try {
      set({ isInitialLoading: true })
      const savedUser = await authService.getSavedSession()
      if (savedUser) {
        set({ user: savedUser, isAuthenticated: true })
      }
    } catch (err) {
      console.warn('Failed to restore session:', err)
    } finally {
      set({ isInitialLoading: false })
    }
  },

  login: async (params: LoginParams) => {
    try {
      set({ isLoading: true, error: null })
      const user = await authService.signIn(params)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (err: any) {
      set({ 
        error: err.message || 'Gagal masuk. Periksa kembali username atau email Anda.', 
        isLoading: false 
      })
      throw err
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true })
      await authService.signOut()
      set({ user: null, isAuthenticated: false, isLoading: false, error: null })
    } catch (err) {
      console.error('Logout error:', err)
      set({ isLoading: false })
    }
  },

  clearError: () => set({ error: null })
}))
