// For development - get OTP from localStorage or URL
useEffect(() => {
  // Check if OTP was stored during login
  const storedOTP = localStorage.getItem('dev_otp')
  if (storedOTP) {
    setOtp(storedOTP)
    localStorage.removeItem('dev_otp')
  }
}, [])