import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Vote, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier || !password) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.post('/auth/login', {
        email: identifier,
        password: password
      })

      if (response.data.success) {
        // Store tokens
        const { access_token, refresh_token, user } = response.data.data
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        
        // Update auth store
        setToken(access_token)
        setUser(user)
        
        toast.success('Login successful!')
        
        // Redirect based on user role
        if (user.role === 'super_admin' || user.role === 'election_admin') {
          navigate('/admin')
        } else if (user.role === 'auditor' || user.role === 'observer') {
          navigate('/observer')
        } else {
          navigate('/dashboard')
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Vote className="h-16 w-16 text-ican-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-ican-primary dark:text-white">Welcome Back</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Sign in to access the voting portal</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email / Membership Number / Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input-field"
                placeholder="Enter your email, membership number, or phone"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="text-ican-primary hover:text-ican-secondary">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-ican-primary hover:text-ican-secondary font-medium">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage