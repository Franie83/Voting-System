// frontend/src/utils/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  withCredentials: false,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Skip auth for audit endpoints
    if (config.url && config.url.includes('/audit/')) {
      console.log(`API Request (no auth): ${config.method?.toUpperCase()} ${config.url}`)
      return config
    }
    
    // Get token from localStorage
    const token = localStorage.getItem('access_token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, { 
      hasToken: !!token
    })
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.config.url}`, { 
      status: response.status,
      success: response.data?.success
    })
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle Network errors
    if (error.message === 'Network Error' && !originalRequest._retry) {
      console.error('Network Error - Backend may not be running on port 8080')
      return Promise.reject(error)
    }

    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }
        
        const response = await axios.post('http://127.0.0.1:8080/api/auth/refresh', {}, {
          headers: { 
            Authorization: `Bearer ${refreshToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        })

        if (response.data.success) {
          const newAccessToken = response.data.data.access_token
          
          localStorage.setItem('access_token', newAccessToken)
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api(originalRequest)
        } else {
          throw new Error('Refresh failed')
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }

    if (error.response) {
      console.error(`API Error (${error.response.status}): ${error.config?.url}`, {
        status: error.response.status,
        message: error.response.data?.message || error.response.data?.error
      })
    } else if (error.request) {
      console.error('API No Response:', {
        url: error.config?.url,
        message: error.message
      })
    } else {
      console.error('API Error:', error.message)
    }

    return Promise.reject(error)
  }
)

// Helper to check if backend is reachable
export const checkBackendHealth = async () => {
  try {
    const response = await api.get('/health', { timeout: 5000 })
    return response.data?.status === 'healthy'
  } catch (error) {
    console.error('Backend health check failed:', error.message)
    return false
  }
}

export default api