import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Shield, CheckCircle, XCircle, Loader } from 'lucide-react'
import api from '../utils/api'

const RegisterPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState('validation')
  const [validatedData, setValidatedData] = useState(null)
  const [associationId, setAssociationId] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    membership_number: '',
    full_name: '',
    email: '',
    phone: '',
    district: 'lagos',
    chapter: '',
    password: '',
    confirm_password: ''
  })

  const districts = [
    'lagos', 'abuja', 'port_harcourt', 'kano', 'ibadan', 'enugu', 
    'benin', 'kaduna', 'jos', 'sokoto', 'calabar', 'maiduguri'
  ]

  const handleValidation = async () => {
    if (!associationId.trim()) {
      setValidationError('Please enter your Association ID')
      return
    }

    setValidating(true)
    setValidationError('')

    try {
      const response = await api.post('/auth/validate-association', {
        association_id: associationId
      })

      console.log('Validation response:', response.data)

      if (response.data.success && response.data.valid) {
        setValidatedData(response.data.data)
        setFormData({
          ...formData,
          full_name: response.data.data.full_name || '',
          email: response.data.data.email || '',
          phone: response.data.data.phone || '',
          district: response.data.data.district || 'lagos',
          chapter: response.data.data.chapter || '',
          membership_number: response.data.data.association_id || ''
        })
        setStep('registration')
        toast.success('Association ID verified! Please complete your registration.')
      } else {
        setValidationError(response.data.message || 'Invalid Association ID')
      }
    } catch (error) {
      console.error('Validation error:', error)
      const message = error.response?.data?.message || 'Invalid Association ID. Please check and try again.'
      setValidationError(message)
      toast.error(message)
    } finally {
      setValidating(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/register', {
        association_id: validatedData?.association_id,
        membership_number: formData.membership_number,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        district: formData.district,
        chapter: formData.chapter,
        password: formData.password
      })

      if (response.data.success) {
        toast.success('Registration successful! Please wait for admin approval.')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // Rest of the component remains the same...
  if (step === 'validation') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-blue-600">
              <Shield className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">ICAN Voting System</h2>
            <p className="mt-2 text-sm text-gray-600">
              Verify your Association ID to begin registration
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Association ID / Membership Number *
                </label>
                <input
                  type="text"
                  value={associationId}
                  onChange={(e) => setAssociationId(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleValidation()}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="e.g., ICAN2024001"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter your ICAN membership number as provided during payment
                </p>
              </div>

              {validationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{validationError}</p>
                </div>
              )}

              <button
                onClick={handleValidation}
                disabled={validating}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {validating ? (
                  <>
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify Association ID'
                )}
              </button>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Don't have an Association ID?{' '}
                  <a href="/contact" className="text-blue-600 hover:underline">
                    Contact ICAN Secretariat
                  </a>
                </p>
                <Link to="/login" className="text-sm text-blue-600 hover:text-blue-500 mt-2 inline-block">
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Registration Step
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-green-600">
            <CheckCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Complete Registration</h2>
          <p className="mt-2 text-sm text-gray-600">
            Verified Association ID: <span className="font-mono font-semibold">{validatedData?.association_id}</span>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <button
            onClick={() => {
              setStep('validation')
              setValidatedData(null)
              setAssociationId('')
            }}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Back to verification
          </button>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Pre-filled from your association record</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Pre-filled from your association record</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Pre-filled from your association record</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                District *
              </label>
              <select
                name="district"
                required
                value={formData.district}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {districts.map(district => (
                  <option key={district} value={district}>
                    {district.charAt(0).toUpperCase() + district.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Chapter (Optional)
              </label>
              <input
                type="text"
                name="chapter"
                value={formData.chapter}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your ICAN chapter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Create Password *
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirm_password"
                required
                value={formData.confirm_password}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your password"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Complete Registration'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-500">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage