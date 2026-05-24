import React from 'react'
import { Settings, Shield, Bell, Database, Image } from 'lucide-react'
import IconUpload from '../components/IconUpload'

const SystemSettings = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Manage system configuration and appearance</p>
      </div>

      <div className="space-y-6">
        {/* Icon Upload Section */}
        <IconUpload />

        {/* Other settings can be added here */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            System Configuration
          </h3>
          <p className="text-gray-500">Additional system settings coming soon...</p>
        </div>
      </div>
    </div>
  )
}

export default SystemSettings