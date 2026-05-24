import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const UnauthorizedPage = () => {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const requiredRoles = location.state?.requiredRoles || []
  const userRole = user?.role || 'unknown'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="text-red-600 text-6xl mb-4">🔒</div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600">
          You don't have permission to access this page.
        </p>
        
        <div className="mt-4 p-4 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-800">
            Your role: <strong>{userRole}</strong>
          </p>
          {requiredRoles.length > 0 && (
            <p className="text-sm text-yellow-800 mt-1">
              Required roles: <strong>{requiredRoles.join(', ')}</strong>
            </p>
          )}
        </div>

        <div className="mt-6 space-x-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => logout()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnauthorizedPage