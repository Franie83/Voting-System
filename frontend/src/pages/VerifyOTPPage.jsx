// frontend/src/pages/VerifyOTPPage.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const VerifyOTPPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false)

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true)
      return
    }
    
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [timeLeft])

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      toast.error('Please login first')
      navigate('/login')
    }
  }, [email, navigate])

  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value.slice(0, 1)
    setOtp(newOtp)
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace to go to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/verify-otp', {
        email,
        otp: otpCode
      })
      
      if (response.data.success) {
        toast.success('Email verified successfully!')
        
        // Store token if returned
        if (response.data.access_token) {
          localStorage.setItem('access_token', response.data.access_token)
        }
        
        setTimeout(() => {
          navigate('/login')
        }, 1500)
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid or expired OTP'
      toast.error(message)
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!canResend) return
    
    setResendLoading(true)
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/resend-otp', {
        email
      })
      
      if (response.data.success) {
        toast.success('New OTP sent to your email')
        setTimeLeft(300)
        setCanResend(false)
        setOtp(['', '', '', '', '', ''])
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend OTP'
      toast.error(message)
    } finally {
      setResendLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Verify Your Email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a verification code to
          </p>
          <p className="text-sm font-medium text-blue-600">{email}</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* OTP Input Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 text-center mb-4">
                Enter 6-Digit Verification Code
              </label>
              <div className="flex justify-center space-x-2 sm:space-x-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>

            {/* Resend Section */}
            <div className="text-center">
              {!canResend ? (
                <p className="text-sm text-gray-600">
                  Resend code in <span className="font-medium text-blue-600">{formatTime(timeLeft)}</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendLoading}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50"
                >
                  {resendLoading ? 'Sending...' : 'Resend Verification Code'}
                </button>
              )}
            </div>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-500">
              ← Back to Login
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-500 text-center">
              Didn't receive the code? Check your spam folder or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyOTPPage