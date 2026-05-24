import React, { useState } from 'react';
import { Shield, CheckCircle, XCircle, Loader, CreditCard } from 'lucide-react';
import api from '../utils/api';

const AssociationValidation = ({ onValidated, onBack }) => {
  const [associationId, setAssociationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validatedMember, setValidatedMember] = useState(null);

  const handleValidate = async () => {
    if (!associationId.trim()) {
      setError('Please enter your Association ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/auth/validate-association', {
        association_id: associationId
      });
      
      if (response.data.success && response.data.valid) {
        setValidatedMember(response.data.data);
        onValidated(response.data.data);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid Association ID. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validatedMember) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">Association ID Verified!</h3>
        </div>
        <div className="space-y-2 text-sm text-green-700 mb-4">
          <p><strong>Name:</strong> {validatedMember.full_name}</p>
          <p><strong>Email:</strong> {validatedMember.email}</p>
          <p><strong>Phone:</strong> {validatedMember.phone}</p>
          <p><strong>District:</strong> {validatedMember.district}</p>
        </div>
        <button
          onClick={() => onValidated(validatedMember)}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
        >
          Continue to Registration
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Verify Your Association ID</h2>
        <p className="text-gray-600 mt-1">
          Enter your ICAN Association ID to begin registration
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Association ID / Membership Number
          </label>
          <input
            type="text"
            value={associationId}
            onChange={(e) => setAssociationId(e.target.value.toUpperCase())}
            placeholder="e.g., ICAN2024001234"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter your ICAN membership number as provided during payment
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleValidate}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Verify Association ID
            </>
          )}
        </button>

        <div className="text-center pt-4 border-t">
          <p className="text-sm text-gray-500">
            Don't have an Association ID?{' '}
            <a href="/contact" className="text-blue-600 hover:underline">
              Contact ICAN Secretariat
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssociationValidation;