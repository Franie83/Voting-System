import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Receipt, Copy, CheckCircle, ExternalLink, Clock, Download, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MyReceipts = () => {
  const { user } = useAuthStore();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchMyReceipts();
  }, []);

  const fetchMyReceipts = async () => {
    try {
      const response = await api.get('/voting/my-receipts');
      if (response.data.success) {
        setReceipts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Receipt code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generatePDF = async () => {
    if (receipts.length === 0) {
      toast.error('No receipts to download');
      return;
    }

    setGeneratingPDF(true);
    toast.loading('Generating PDF...', { id: 'pdf-generate' });

    try {
      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a temporary div for the PDF content
      const pdfContent = document.createElement('div');
      pdfContent.style.padding = '20px';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
      pdfContent.style.backgroundColor = 'white';
      
      // Build PDF content
      pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
          <h1 style="color: #1e3a8a; margin-bottom: 5px;">ICAN Voting System</h1>
          <h2 style="color: #4b5563; font-size: 18px;">Official Voting Receipts</h2>
          <p style="color: #6b7280; font-size: 12px;">Generated on: ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
          <h3 style="margin-bottom: 10px; color: #1f2937;">Voter Information</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="padding: 4px 0;"><strong>Name:</strong></td><td>${user?.full_name || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Membership Number:</strong></td><td>${user?.membership_number || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>District:</strong></td><td>${user?.district || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Email:</strong></td><td>${user?.email || 'N/A'}</td></tr>
          </table>
        </div>
        
        <h3 style="margin-bottom: 15px; color: #1f2937;">Voting Receipts (${receipts.length} total)</h3>
        
        ${receipts.map((receipt, index) => `
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid;">
            <div style="border-bottom: 1px solid #d1d5db; padding-bottom: 8px; margin-bottom: 10px;">
              <span style="font-weight: bold; color: #2563eb;">Receipt #${index + 1}</span>
              <span style="float: right; font-family: monospace; color: #059669;">${receipt.receipt_code}</span>
            </div>
            <table style="width: 100%; font-size: 13px;">
              <tr><td style="padding: 5px 0;"><strong>Election:</strong></td><td>${receipt.election_title}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Vote Cast:</strong></td><td>${new Date(receipt.voted_at).toLocaleString()}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Verification URL:</strong></td><td><a href="${window.location.origin}/verify/${receipt.receipt_code}" style="color: #2563eb;">${window.location.origin}/verify/${receipt.receipt_code}</a></td></tr>
            </table>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
              This is an electronically generated receipt. Verify authenticity at the official ICAN Voting System portal.
            </div>
          </div>
        `).join('')}
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af;">
          <p>© ICAN Voting System - All rights reserved.</p>
          <p>This document serves as official proof of voting. Store it securely for verification purposes.</p>
        </div>
      `;
      
      document.body.appendChild(pdfContent);
      
      // Generate PDF
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `voting_receipts_${user?.membership_number || 'user'}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(pdfContent).save();
      document.body.removeChild(pdfContent);
      
      toast.success('PDF downloaded successfully!', { id: 'pdf-generate' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: 'pdf-generate' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading your receipts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Voting Receipts</h1>
          <p className="text-gray-600 mt-2">View and verify your voting history</p>
          {receipts.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">Total receipts: {receipts.length}</p>
          )}
        </div>
        
        {receipts.length > 0 && (
          <button
            onClick={generatePDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            {generatingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download All as PDF
              </>
            )}
          </button>
        )}
      </div>

      {receipts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts yet</h3>
          <p className="text-gray-500">You haven't voted in any elections yet.</p>
          <a 
            href="/elections" 
            className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            View Active Elections
          </a>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {receipts.map((receipt, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="border-l-4 border-green-500 p-5">
                  <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{receipt.election_title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Clock className="h-4 w-4" />
                        <span>Voted on: {new Date(receipt.voted_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(receipt.receipt_code)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        {copiedCode === receipt.receipt_code ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedCode === receipt.receipt_code ? 'Copied!' : 'Copy Code'}
                      </button>
                      <a
                        href={`/verify/${receipt.receipt_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Verify
                      </a>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Receipt Code</div>
                    <div className="font-mono text-sm break-all">{receipt.receipt_code}</div>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-500">
                    <a 
                      href={`/verify/${receipt.receipt_code}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Verification URL: /verify/{receipt.receipt_code}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <FileText className="h-4 w-4 inline mr-1" />
            Click "Download All as PDF" to save all receipts as a single PDF file
          </div>
        </>
      )}
    </div>
  );
};

export default MyReceipts;