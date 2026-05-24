import React, { useState } from 'react'
import { Upload, Download, FileText, CheckCircle, XCircle, Loader, AlertCircle, X } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const BulkUploadAssociationMembers = ({ onComplete, onClose }) => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile)
      setResult(null)
    } else {
      toast.error('Please upload a CSV file')
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setResult(null)
    } else {
      toast.error('Please upload a CSV file')
    }
  }

  const downloadTemplate = () => {
    const template = `association_id,full_name,email,phone,district,chapter,payment_status,payment_reference,amount_paid
ICAN2024001,John Doe,john.doe@example.com,+2348012345678,lagos,Lagos Main,PAID,PAY_ICAN_001,50000
ICAN2024002,Jane Smith,jane.smith@example.com,+2348023456789,abuja,Abuja Central,PAID,PAY_ICAN_002,50000
ICAN2024003,Michael Johnson,michael.johnson@example.com,+2348034567890,lagos,Lagos Ikeja,PENDING,,0`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'association_members_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/admin/association-members/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.success) {
        setResult(response.data.data)
        toast.success(response.data.message)
        if (onComplete) onComplete()
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-800">CSV Template</h3>
            <p className="text-sm text-blue-600 mt-1">
              Download the template to see the required format
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">
          Drag and drop your CSV file here, or click to select
        </p>
        <p className="text-sm text-gray-500 mb-4">
          File must be a CSV with headers: association_id, full_name, email, phone, district, chapter, payment_status, payment_reference, amount_paid
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
        >
          <FileText className="h-4 w-4" />
          Select CSV File
        </label>
      </div>

      {/* Selected File */}
      {file && (
        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        </div>
      )}

      {/* Upload Button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload to Database
            </>
          )}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className="border rounded-lg overflow-hidden">
          <div className={`p-4 ${result.errors?.length > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
            <div className="flex items-center gap-2">
              {result.errors?.length > 0 ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <span className="font-semibold">
                {result.errors?.length > 0 ? 'Completed with warnings' : 'Upload Complete'}
              </span>
            </div>
            <div className="mt-2 text-sm">
              <p>✅ Created: {result.created || 0}</p>
              <p>🔄 Updated: {result.updated || 0}</p>
              {result.errors?.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-red-600">Errors ({result.errors.length}):</p>
                  <ul className="list-disc list-inside text-sm text-red-600 mt-1 max-h-40 overflow-y-auto">
                    {result.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkUploadAssociationMembers