import React, { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { User, Mail, Phone, MapPin, Shield, Camera, Loader2, Key, Smartphone, CheckCircle, XCircle } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('')
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || ''
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await api.put('/users/profile', formData)
      if (response.data.success) {
        updateUser(formData)
        toast.success('Profile updated successfully')
        setIsEditing(false)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    
    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    
    setIsLoading(true)
    try {
      const response = await api.post('/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password
      })
      
      if (response.data.success) {
        toast.success('Password changed successfully! Please login again.')
        setShowChangePassword(false)
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
        
        // Auto logout after 2 seconds
        setTimeout(() => {
          const { logout } = useAuthStore.getState()
          logout()
          window.location.href = '/login'
        }, 2000)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnable2FA = async () => {
    try {
      const response = await api.post('/auth/enable-2fa')
      if (response.data.success) {
        setTwoFactorSecret(response.data.data.secret)
        setTwoFactorQrCode(response.data.data.qr_code)
        setShow2FAModal(true)
      }
    } catch (error) {
      toast.error('Failed to enable 2FA')
    }
  }

  const handleVerify2FA = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }
    
    try {
      const response = await api.post('/auth/verify-2fa', { code: twoFactorCode })
      if (response.data.success) {
        setTwoFactorEnabled(true)
        setShow2FAModal(false)
        setTwoFactorCode('')
        toast.success('Two-factor authentication enabled successfully!')
      }
    } catch (error) {
      toast.error('Invalid verification code')
    }
  }

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }
    
    try {
      const response = await api.post('/auth/disable-2fa')
      if (response.data.success) {
        setTwoFactorEnabled(false)
        toast.success('Two-factor authentication disabled')
      }
    } catch (error) {
      toast.error('Failed to disable 2FA')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">My Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.full_name}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.membership_number}</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-center text-gray-600 dark:text-gray-300">
                <Mail className="h-4 w-4 mr-2" />
                {user?.email}
              </div>
              <div className="flex items-center justify-center text-gray-600 dark:text-gray-300">
                <Phone className="h-4 w-4 mr-2" />
                {user?.phone}
              </div>
              <div className="flex items-center justify-center text-gray-600 dark:text-gray-300">
                <MapPin className="h-4 w-4 mr-2" />
                {user?.district?.toUpperCase()}
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                user?.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              } capitalize`}>
                {user?.status}
              </span>
              {twoFactorEnabled && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  2FA Enabled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Profile Information</h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">{user?.full_name}</p>
                </div>
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-gray-900 dark:text-white">{user?.email}</p>
                </div>
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="text-gray-900 dark:text-white">{user?.phone}</p>
                </div>
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">District</p>
                  <p className="text-gray-900 dark:text-white capitalize">{user?.district}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                  <p className="text-gray-900 dark:text-white">{new Date(user?.created_at).toLocaleDateString()}</p>
                </div>
                {user?.bio && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Bio</p>
                    <p className="text-gray-900 dark:text-white">{user?.bio}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Security Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security Settings
            </h3>
            <div className="space-y-4">
              {/* Change Password Section */}
              {!showChangePassword ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Change Password</p>
                    <p className="text-sm text-gray-500">Update your password regularly</p>
                  </div>
                  <button 
                    onClick={() => setShowChangePassword(true)} 
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                      <input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLoading ? 'Changing...' : 'Update Password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePassword(false)
                          setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
                        }}
                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                  </div>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  {twoFactorEnabled && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Your account is protected by 2FA</p>
                  )}
                </div>
                <button 
                  onClick={twoFactorEnabled ? handleDisable2FA : handleEnable2FA}
                  className={`px-4 py-2 rounded-lg transition ${
                    twoFactorEnabled 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                  }`}
                >
                  {twoFactorEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Enable Two-Factor Authentication</h2>
              <button onClick={() => setShow2FAModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                {twoFactorQrCode && (
                  <img src={twoFactorQrCode} alt="QR Code" className="mx-auto w-48 h-48" />
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
                </p>
                {twoFactorSecret && (
                  <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Or enter this code manually:</p>
                    <code className="text-sm font-mono">{twoFactorSecret}</code>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verification Code</label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 text-center text-2xl font-mono tracking-widest"
                />
              </div>
              
              <button
                onClick={handleVerify2FA}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Verify & Enable
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                Save your backup codes in a safe place. You'll need them if you lose access to your authenticator app.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage