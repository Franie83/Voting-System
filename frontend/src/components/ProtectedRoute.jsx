// frontend/src/components/ProtectedRoute.jsx
import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore()
  const location = useLocation()

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role || 'member'
    const isSuperAdmin = userRole === 'super_admin'
    
    if (!allowedRoles.includes(userRole) && !isSuperAdmin) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  // Check if account is active
  if (user?.status !== 'active') {
    return <Navigate to="/pending-approval" replace />
  }

  return <Outlet />
}

export default ProtectedRoute