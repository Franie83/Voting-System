import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  Vote, Menu, X, User, LogOut, Shield, 
  BarChart3, Bell, Moon, Sun, Receipt, Settings
} from 'lucide-react'

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      return saved === 'true'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [appIcon, setAppIcon] = useState(null)
  const [iconLoaded, setIconLoaded] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  // Fetch the uploaded app icon
  useEffect(() => {
    const fetchAppIcon = async () => {
      try {
        const response = await fetch('/api/admin/system-icon')
        const data = await response.json()
        if (data.success && data.data?.icon_url) {
          // Add cache-busting parameter to force reload
          const iconUrl = data.data.icon_url + '?v=' + Date.now()
          setAppIcon(iconUrl)
        }
      } catch (error) {
        console.error('Failed to fetch app icon:', error)
      }
    }
    fetchAppIcon()
  }, [])

  // Apply dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', isDark)
  }, [isDark])

  const toggleDark = () => {
    setIsDark(!isDark)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = isAuthenticated ? [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/elections', label: 'Elections', icon: Vote },
    { path: '/my-receipts', label: 'My Receipts', icon: Receipt },
    ...(user?.role === 'super_admin' || user?.role === 'election_admin' 
      ? [{ path: '/admin/dashboard', label: 'Admin', icon: Shield }] : []),
    ...(user?.role === 'auditor' || user?.role === 'observer' 
      ? [{ path: '/monitoring/audit', label: 'Audit', icon: Shield }] : []),
  ] : [
    { path: '/', label: 'Home' },
    { path: '/login', label: 'Login' },
    { path: '/register', label: 'Register' },
  ]

  const getRoleBadgeColor = () => {
    const role = user?.role?.toLowerCase()
    if (role === 'super_admin') return 'bg-purple-600'
    if (role === 'election_admin') return 'bg-blue-600'
    if (role === 'auditor') return 'bg-green-600'
    if (role === 'observer') return 'bg-yellow-600'
    return 'bg-gray-600'
  }

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              {/* Custom App Icon - Show if available */}
              {appIcon && (
                <img 
                  src={appIcon} 
                  alt="App Icon" 
                  className="h-8 w-8 rounded-lg object-cover"
                  onLoad={() => setIconLoaded(true)}
                  onError={(e) => {
                    console.error('Icon failed to load:', appIcon);
                    setAppIcon(null);
                  }}
                />
              )}
              {/* Fallback to default Vote icon if no custom icon */}
              {!appIcon && (
                <div className="bg-blue-600 rounded-lg p-1.5">
                  <Vote className="h-6 w-6 text-white" />
                </div>
              )}
              <span className="font-bold text-xl text-gray-900 dark:text-white hidden sm:block">
                ICAN Voting
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - keep the rest of your code exactly the same */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.path || location.pathname.startsWith(link.path + '/')
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <button
              onClick={toggleDark}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isAuthenticated && (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                <div className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${getRoleBadgeColor()}`}>
                  {user?.role?.replace('_', ' ').toUpperCase()}
                </div>
                
                <Link 
                  to="/profile" 
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-medium hidden lg:block">
                    {user?.full_name?.split(' ')[0]}
                  </span>
                </Link>
                
                <Link 
                  to="/profile" 
                  className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleDark}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === link.path
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  {link.icon && <link.icon className="h-5 w-5" />}
                  {link.label}
                </div>
              </Link>
            ))}
            
            {isAuthenticated && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Signed in as <span className="font-medium text-gray-900 dark:text-white">{user?.email}</span>
                  </div>
                  <div className={`mx-3 my-2 px-2 py-1 rounded-full text-xs font-semibold text-white inline-block ${getRoleBadgeColor()}`}>
                    {user?.role?.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout()
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="h-5 w-5" />
                    Logout
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar