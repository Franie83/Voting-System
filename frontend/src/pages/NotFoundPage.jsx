import React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NotFoundPage = () => {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="text-9xl font-bold text-indigo-600">404</div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Page Not Found</h1>
        <p className="mt-2 text-gray-600">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="mt-6 space-y-4">
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {isAuthenticated ? "Go to Dashboard" : "Go to Homepage"}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage