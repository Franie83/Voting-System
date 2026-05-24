import React, { useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Shield, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const OTPPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef([])
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const userId = location.state?.userId

  const handleChange = (index, value) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.post('/auth/verify-otp', {
        user_id: userId,
        otp: otpString
      })

      if (response.data.success) {
        login(response.data.data)
        toast.success('Login successful!')
        navigate('/dashboard')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-ican-accent mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-ican-primary dark:text-white">Verify OTP</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Enter the 6-digit code sent to your email and phone
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit}>
            <div className="flex justify-center space-x-3 mb-8">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg 
                           focus:border-ican-primary focus:ring-2 focus:ring-ican-primary 
                           dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span>Verify & Continue</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Didn't receive the code?{' '}
              <button className="text-ican-primary hover:text-ican-secondary font-medium">
                Resend OTP
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OTPPage
