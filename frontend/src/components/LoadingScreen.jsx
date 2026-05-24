import React from 'react'

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{message}</h2>
        <p className="text-sm text-gray-500">Please wait while we prepare everything for you</p>
      </div>
    </div>
  )
}

export default LoadingScreen