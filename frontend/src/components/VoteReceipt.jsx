import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, Share2, CheckCircle, X } from 'lucide-react';

const VoteReceipt = ({ receipts, election, onClose }) => {
  const receiptRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    pageStyle: `
      @page { 
        size: auto; 
        margin: 0mm; 
      } 
      @media print {
        body { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact;
        }
        .no-print {
          display: none;
        }
      }
    `
  });

  const handleDownload = () => {
    const element = receiptRef.current;
    const htmlContent = element.innerHTML;
    const styles = document.querySelector('style')?.innerHTML || '';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vote Receipt - ICAN Voting System</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              padding: 20px; 
              background: #f3f4f6;
            }
            .receipt-container {
              max-width: 500px;
              margin: 0 auto;
            }
            .receipt {
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
              color: white;
              text-align: center;
              padding: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }
            .header p {
              font-size: 12px;
              opacity: 0.9;
            }
            .success-badge {
              background: #10b981;
              color: white;
              text-align: center;
              padding: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .content {
              padding: 20px;
            }
            .receipt-row {
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .receipt-row:last-child {
              border-bottom: none;
            }
            .label {
              font-size: 11px;
              text-transform: uppercase;
              color: #6b7280;
              font-weight: 600;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .value {
              font-size: 14px;
              color: #1f2937;
              word-break: break-all;
            }
            .value-large {
              font-size: 16px;
              font-weight: 600;
              color: #2563eb;
            }
            .hash {
              font-family: monospace;
              font-size: 11px;
              background: #f3f4f6;
              padding: 8px;
              border-radius: 6px;
            }
            .qr-section {
              text-align: center;
              padding: 16px;
              background: #f9fafb;
              border-radius: 8px;
              margin-top: 16px;
            }
            .footer {
              background: #f9fafb;
              padding: 16px;
              text-align: center;
              font-size: 10px;
              color: #9ca3af;
              border-top: 1px solid #e5e7eb;
            }
            ${styles}
          </style>
        </head>
        <body>
          <div class="receipt-container">${htmlContent}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleShare = async () => {
    const firstReceipt = receipts[0];
    const shareData = {
      title: 'ICAN Voting System - Vote Receipt',
      text: `Vote confirmed for ${election?.title || 'ICAN Election'}\nReceipt Code: ${firstReceipt.receipt_code}\nVerification: ${window.location.origin}/verify/${firstReceipt.receipt_code}`,
      url: window.location.origin + `/verify/${firstReceipt.receipt_code}`
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n\nVerification URL: ${shareData.url}`);
      alert('✅ Receipt details copied to clipboard!');
    }
  };

  const verificationUrl = `${window.location.origin}/verify/${receipts[0]?.receipt_code || ''}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="max-w-md w-full">
        {/* Receipt Content */}
        <div ref={receiptRef} className="receipt">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-600 text-white text-center p-5">
            <h1 className="text-2xl font-bold">ICAN Voting System</h1>
            <p className="text-sm opacity-90 mt-1">Official Vote Receipt</p>
          </div>

          {/* Success Badge */}
          <div className="bg-green-500 text-white text-center py-3 flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Vote Successfully Recorded!</span>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Election Info */}
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Election</div>
              <div className="font-semibold text-gray-800 mt-1">{election?.title || 'ICAN Election'}</div>
            </div>

            {/* Voting Reference */}
            {election?.voting_reference && (
              <div className="mb-4 pb-3 border-b border-gray-200">
                <div className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Voting Reference</div>
                <div className="font-mono text-sm mt-1">{election.voting_reference}</div>
              </div>
            )}

            {/* Date & Time */}
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Date & Time</div>
              <div className="text-gray-700 mt-1">{new Date().toLocaleString()}</div>
            </div>

            {/* Votes Summary */}
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="text-xs uppercase text-gray-500 font-semibold tracking-wide mb-2">Your Votes</div>
              {receipts.map((receipt, idx) => (
                <div key={idx} className="mb-2 p-2 bg-gray-50 rounded">
                  <div className="font-medium text-gray-800">{receipt.position_title}</div>
                  <div className="text-sm text-blue-600">{receipt.candidate_name}</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">Receipt: {receipt.receipt_code}</div>
                </div>
              ))}
            </div>

            {/* Main Receipt Code */}
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Receipt Code</div>
              <div className="font-mono text-sm bg-gray-100 p-2 rounded mt-1 break-all">
                {receipts[0]?.receipt_code}
              </div>
            </div>

            {/* Verification Hash */}
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Verification Hash</div>
              <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                {receipts[0]?.verification_hash}
              </div>
            </div>

            {/* QR Code Section */}
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <QRCodeSVG 
                value={verificationUrl}
                size={140}
                level="H"
                includeMargin={true}
                className="mx-auto"
              />
              <div className="text-xs text-gray-500 mt-2">Scan to verify your vote</div>
            </div>

            {/* Verification URL */}
            <div className="mt-4 text-center">
              <div className="text-xs text-gray-500">Verification URL</div>
              <div className="text-xs font-mono text-blue-600 break-all mt-1">
                {verificationUrl}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-5 py-3 text-center border-t border-gray-200">
            <div className="text-xs text-gray-500">
              This is an electronically generated receipt.
              <br />
              Keep this receipt for verification purposes.
            </div>
          </div>
        </div>

        {/* Action Buttons - No Print */}
        <div className="no-print flex gap-3 mt-4">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
        
        {/* Close Button - No Print */}
        <button
          onClick={onClose}
          className="no-print w-full mt-3 bg-white border border-gray-300 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default VoteReceipt;