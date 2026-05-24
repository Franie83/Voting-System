// frontend/src/store/authStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_URL = 'http://127.0.0.1:8080/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      initializeAuth: async () => {
        console.log('initializeAuth called')
        set({ isLoading: true })
        
        const token = localStorage.getItem('access_token')
        const userStr = localStorage.getItem('user')
        
        console.log('Auth check:', { hasToken: !!token, hasUser: !!userStr })
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr)
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            set({
              token,
              user,
              isAuthenticated: true,
              isLoading: false
            })
            console.log('Auth initialized: User is authenticated', user?.email)
            return true
          } catch (e) {
            console.error('Failed to parse user', e)
            localStorage.removeItem('access_token')
            localStorage.removeItem('user')
            set({
              token: null,
              user: null,
              isAuthenticated: false,
              isLoading: false
            })
            return false
          }
        } else {
          console.log('Auth initialized: No token found')
          set({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false
          })
          return false
        }
      },

      setUser: (user) => {
        console.log('setUser called:', user)
        localStorage.setItem('user', JSON.stringify(user))
        set({ 
          user: user, 
          isAuthenticated: true 
        })
      },

      setToken: (token) => {
        console.log('setToken called:', token)
        localStorage.setItem('access_token', token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        set({ token: token })
      },

      login: async (email, password) => {
        console.log('Login called for:', email)
        set({ isLoading: true, error: null })
        
        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            email: email,
            password: password
          })
          
          console.log('Login response:', response.data)
          
          if (response.data.success) {
            const { access_token, refresh_token, user } = response.data.data
            
            localStorage.setItem('access_token', access_token)
            localStorage.setItem('refresh_token', refresh_token)
            localStorage.setItem('user', JSON.stringify(user))
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
            
            set({
              user: user,
              token: access_token,
              refreshToken: refresh_token,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            
            return { success: true, user: user }
          } else {
            set({ error: response.data?.message || 'Login failed', isLoading: false })
            return { success: false, error: response.data?.message }
          }
        } catch (error) {
          console.error('Login error:', error)
          const message = error.response?.data?.message || error.message || 'Login failed'
          set({ error: message, isLoading: false })
          return { success: false, error: message }
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await axios.post(`${API_URL}/auth/register`, userData)
          
          if (response.data.success) {
            set({ isLoading: false })
            return { success: true, data: response.data.data }
          } else {
            set({ error: response.data?.message || 'Registration failed', isLoading: false })
            return { success: false, error: response.data?.message }
          }
        } catch (error) {
          const message = error.response?.data?.message || error.message || 'Registration failed'
          set({ error: message, isLoading: false })
          return { success: false, error: message }
        }
      },

      logout: () => {
        console.log('Logging out...')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
        
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        })
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
        }))
        const currentUser = get().user
        if (currentUser) {
          localStorage.setItem('user', JSON.stringify(currentUser))
        }
      },

      hasRole: (roles) => {
        const { user } = get()
        if (!user) return false
        const rolesArray = Array.isArray(roles) ? roles : [roles]
        return rolesArray.includes(user.role) || user.role === 'super_admin'
      },

      isAdmin: () => {
        const { user } = get()
        return user?.role === 'super_admin' || user?.role === 'election_admin'
      }
    }),
    {
      name: 'ican-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export default useAuthStore
export { useAuthStore }