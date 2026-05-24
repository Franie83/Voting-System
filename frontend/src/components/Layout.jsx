// frontend/src/components/Layout.jsx
import React, { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  Home, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Vote,
  BarChart3
} from 'lucide-react'

const Layout = ({ children, isAdminLayout = false }) => {
  const { isAuthenticated, user, logout, isLoading } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [appIcon, setAppIcon] = useState(null)
  const [iconLoadError, setIconLoadError] = useState(false)

  // Fetch the uploaded app icon
  useEffect(() => {
    const fetchAppIcon = async () => {
      try {
        const response = await fetch('/api/admin/system-icon')
        const data = await response.json()
        if (data.success && data.data?.icon_url) {
          console.log('✅ Layout icon loaded:', data.data.icon_url);
          setAppIcon(data.data.icon_url)
        }
      } catch (error) {
        console.error('Failed to fetch app icon:', error)
      }
    }
    fetchAppIcon()
  }, [])

  // Handle redirects in useEffect
  useEffect(() => {
    const publicRoutes = ['/', '/login', '/register', '/verify-otp', '/forgot-password', '/pending-approval', '/unauthorized']
    const isPublicRoute = publicRoutes.includes(location.pathname) || 
                          location.pathname.startsWith('/reset-password/') ||
                          location.pathname === '/about' ||
                          location.pathname === '/contact' ||
                          location.pathname === '/faq'
    
    if (isLoading) return
    
    if (!isAuthenticated && !isPublicRoute) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const publicRoutes = ['/', '/login', '/register', '/verify-otp', '/forgot-password', '/pending-approval', '/unauthorized']
  const isPublicRoute = publicRoutes.includes(location.pathname) || 
                        location.pathname.startsWith('/reset-password/') ||
                        location.pathname === '/about' ||
                        location.pathname === '/contact' ||
                        location.pathname === '/faq'
  
  if (isPublicRoute && !isAuthenticated) {
    return <main className="min-h-screen">{children || <Outlet />}</main>
  }

  if (!isAuthenticated) {
    return null
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home, roles: ['member', 'super_admin', 'election_admin', 'auditor', 'observer'] },
    { path: '/elections', label: 'Elections', icon: Vote, roles: ['member', 'super_admin', 'election_admin', 'auditor', 'observer'] },
    { path: '/profile', label: 'Profile', icon: User, roles: ['member', 'super_admin', 'election_admin', 'auditor', 'observer'] },
  ]

  if (user?.role === 'super_admin' || user?.role === 'election_admin') {
    navItems.push({ path: '/admin/dashboard', label: 'Admin', icon: Shield, roles: ['super_admin', 'election_admin'] })
  }

  if (user?.role === 'super_admin') {
    navItems.push({ path: '/system/overview', label: 'System', icon: Settings, roles: ['super_admin'] })
  }

  if (['super_admin', 'election_admin', 'auditor', 'observer'].includes(user?.role)) {
    navItems.push({ path: '/monitoring/audit', label: 'Monitoring', icon: BarChart3, roles: ['super_admin', 'election_admin', 'auditor', 'observer'] })
  }

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || 'member')
  )

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Section - REDUCED AREA */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Link to="/dashboard" className="flex flex-col items-center space-y-2">
              {appIcon && !iconLoadError ? (
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-md bg-white p-1">
                  <img 
                    src={appIcon} 
                    alt="ICAN Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.error('Icon failed to load:', appIcon);
                      setIconLoadError(true);
                    }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-md">
                  <Vote className="h-12 w-12 text-white" />
                </div>
              )}
              <div className="text-center">
                <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">ICAN</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Voting System</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.full_name || user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role?.replace('_', ' ') || 'Member'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-2 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-72 min-h-screen">
        <div className="p-6">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  )
}

export default Layout