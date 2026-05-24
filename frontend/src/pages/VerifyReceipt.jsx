import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Shield, Calendar, User, Award, ExternalLink } from 'lucide-react';
import api from '../utils/api';

const VerifyReceipt = () => {
  const { receiptCode: urlReceiptCode } = useParams();
  const [receiptCode, setReceiptCode] = useState(urlReceiptCode || '');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const verifyReceipt = async () => {
    if (!receiptCode || receiptCode.length < 10) {
      alert('Please enter a valid receipt code');
      return;
    }

    setLoading(true);
    setVerificationResult(null);
    setVerified(false);
    
    try {
      const response = await api.get(`/voting/verify/${receiptCode.toUpperCase()}`);
      if (response.data.success) {
        setVerificationResult(response.data.data);
        setVerified(true);
      }
    } catch (error) {
      setVerified(false);
      setVerificationResult({
        error: true,
        message: error.response?.data?.message || 'Invalid receipt code or vote not found'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      verifyReceipt();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verify Your Vote</h1>
          <p className="text-gray-600 mt-2">
            Enter your receipt code to verify your vote was recorded correctly
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt Code
              </label>
          <input
            type="text"
            value={receiptCode}
            onChange={(e) => setReceiptCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Enter receipt code (e.g., ABC123DEF...)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
            </div>
          <button
            onClick={verifyReceipt}
            disabled={loading || !receiptCode}
            className="self-end bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Verifying...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Verify
              </>
            )}
          </button>
        </div>
          <p className="text-xs text-gray-500 mt-2">
            Receipt code is located on your vote receipt. It's a 16-character code.
          </p>
        </div>

        {/* Verification Result */}
        {verificationResult && !verificationResult.error && verified && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Success Header */}
            <div className="bg-green-50 p-4 border-b border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <h2 className="text-lg font-semibold text-green-800">Vote Verified Successfully</h2>
                  <p className="text-sm text-green-600">This vote is authentic and recorded in the system</p>
                </div>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="p-6 space-y-4">
              {/* Receipt Code */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs uppercase text-gray-500 font-semibold mb-1">Receipt Code</div>
                <div className="font-mono text-lg font-bold text-blue-600 break-all">
                  {verificationResult.receipt_code}
                </div>
              </div>

              {/* Vote Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-gray-400" />
                    <div className="text-xs uppercase text-gray-500 font-semibold">Election</div>
                  </div>
                  <div className="font-medium text-gray-900">
                    {verificationResult.election?.title || 'ICAN Election'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div className="text-xs uppercase text-gray-500 font-semibold">Position</div>
                  </div>
                  <div className="font-medium text-gray-900">
                    {verificationResult.position?.title || 'Unknown'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-gray-400" />
                    <div className="text-xs uppercase text-gray-500 font-semibold">Voted For</div>
                  </div>
                  <div className="font-medium text-blue-600">
                    {verificationResult.candidate?.name || 'Unknown'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div className="text-xs uppercase text-gray-500 font-semibold">Vote Cast</div>
                  </div>
                  <div className="font-medium text-gray-900">
                    {verificationResult.vote?.created_at 
                      ? new Date(verificationResult.vote.created_at).toLocaleString()
                      : 'Date not available'}
                  </div>
                </div>
              </div>

              {/* Verification Hash */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs uppercase text-gray-500 font-semibold mb-1">Verification Hash</div>
                <div className="font-mono text-xs text-gray-600 break-all">
                  {verificationResult.verification_hash}
                </div>
              </div>

              {/* Verification Badge */}
              <div className="flex justify-center pt-4">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-semibold">Verified ✓</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Result */}
        {verificationResult && verificationResult.error && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-red-50 p-4 border-b border-red-200">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h2 className="text-lg font-semibold text-red-800">Verification Failed</h2>
                  <p className="text-sm text-red-600">{verificationResult.message}</p>
                </div>
              </div>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-600 mb-4">
                The receipt code you entered could not be verified. Possible reasons:
              </p>
              <ul className="text-left text-sm text-gray-500 space-y-2 max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  The receipt code was entered incorrectly
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  The vote was not found in the system
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  The receipt code may have expired or been invalidated
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">Why verify your vote?</h3>
              <p className="text-sm text-blue-700">
                Vote verification ensures that your vote was recorded correctly in our secure blockchain-verified system. 
                Each vote is cryptographically hashed and stored with a unique receipt code for transparency.
              </p>
            </div>
          </div>
        </div>

        {/* Need Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Lost your receipt? Contact the election administrator for assistance.
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
          >
            Need help? Contact support
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default VerifyReceipt;