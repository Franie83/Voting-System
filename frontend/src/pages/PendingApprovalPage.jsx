import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const PendingApprovalPage = () => {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const message = location.state?.message || 'Your account is pending approval'
  const userStatus = location.state?.userStatus || user?.status || 'pending'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Account Pending Approval
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {message}
          </p>
        </div>
        
        <div className="rounded-md bg-yellow-50 p-4 mt-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Registration Status: {userStatus.toUpperCase()}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1 text-left">
                  <li>An administrator will review your registration</li>
                  <li>You'll receive an email notification once approved</li>
                  <li>You can then login and access the voting system</li>
                  <li>This process typically takes 24-48 hours</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800">Need assistance?</h4>
          <p className="text-sm text-blue-700 mt-1">
            Contact ICAN support at{' '}
            <a href="mailto:elections@ican.org.ng" className="underline">
              elections@ican.org.ng
            </a>
          </p>
        </div>

        <div className="flex space-x-4 justify-center">
          <button
            onClick={() => logout()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Logout
          </button>
          
          <Link
            to="/contact"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PendingApprovalPage