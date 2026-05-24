import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const FirstLoginReset = () => {
  const navigate = useNavigate();
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    temp_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.new_password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('/auth/force-reset-password', {
        email: formData.email,
        temp_password: formData.temp_password,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password
      });
      
      if (response.data.success) {
        toast.success('Password changed! Please login with your new password.');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">First Time Login</h1>
          <p className="text-gray-600 mt-2">
            Please change your temporary password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@ican.gov.ng"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temporary Password
            </label>
            <div className="relative">
              <input
                type={showTempPassword ? "text" : "password"}
                required
                value={formData.temp_password}
                onChange={(e) => setFormData({...formData, temp_password: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter temporary password"
              />
              <button
                type="button"
                onClick={() => setShowTempPassword(!showTempPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Check admin_credentials.txt file for temporary password
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={formData.new_password}
                onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Processing...' : 'Change Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            After changing your password, you'll be redirected to login.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirstLoginReset;