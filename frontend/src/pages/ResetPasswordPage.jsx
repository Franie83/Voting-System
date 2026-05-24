import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from '../utils/axiosConfig'

const ResetPasswordPage = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const validatePassword = (pass) => {
    const errors = []
    if (pass.length < 8) errors.push('at least 8 characters')
    if (!/[A-Z]/.test(pass)) errors.push('an uppercase letter')
    if (!/[a-z]/.test(pass)) errors.push('a lowercase letter')
    if (!/[0-9]/.test(pass)) errors.push('a number')
    if (!/[!@#$%^&*]/.test(pass)) errors.push('a special character (!@#$%^&*)')
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      setError(`Password must contain: ${passwordErrors.join(', ')}`)
      return
    }

    setIsLoading(true)

    try {
      await axios.post('/auth/reset-password', {
        token,
        password
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Password Reset Successful!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your password has been changed successfully.
            </p>
            <p className="text-center text-sm text-gray-500 mt-1">
              Redirecting you to login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter new password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="show-password"
                name="show-password"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="show-password" className="ml-2 block text-sm text-gray-900">
                Show passwords
              </label>
            </div>
          </div>

          {/* Password strength indicator */}
          {password && (
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
              <ul className="text-xs space-y-1">
                <li className={password.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                  ✓ {password.length >= 8 ? 'At least' : 'At least'} 8 characters
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  ✓ {/[A-Z]/.test(password) ? 'Contains' : 'Contains'} uppercase letter
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  ✓ {/[a-z]/.test(password) ? 'Contains' : 'Contains'} lowercase letter
                </li>
                <li className={/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  ✓ {/[0-9]/.test(password) ? 'Contains' : 'Contains'} number
                </li>
                <li className={/[!@#$%^&*]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  ✓ {/[!@#$%^&*]/.test(password) ? 'Contains' : 'Contains'} special character
                </li>
              </ul>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage