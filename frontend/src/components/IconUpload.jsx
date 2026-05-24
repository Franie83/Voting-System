import React, { useState, useEffect } from 'react'
import { Upload, Image, X, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const IconUpload = () => {
  const [currentIcon, setCurrentIcon] = useState('/vite.svg')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    fetchCurrentIcon()
  }, [])

  const fetchCurrentIcon = async () => {
    try {
      const response = await api.get('/admin/system-icon')
      if (response.data.success && response.data.data?.icon_url) {
        setCurrentIcon(response.data.data.icon_url)
      }
    } catch (error) {
      console.error('Failed to fetch current icon:', error)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/x-icon', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPG, GIF, WEBP, ICO, or SVG)')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('icon', selectedFile)

    try {
      const response = await api.post('/admin/upload-icon', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.success) {
        toast.success(response.data.message)
        setCurrentIcon(response.data.data.url)
        setSelectedFile(null)
        setPreview(null)
        
        // Force reload the page to update favicon
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        toast.error(response.data.message || 'Upload failed')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload icon')
    } finally {
      setUploading(false)
    }
  }

  const cancelUpload = () => {
    setSelectedFile(null)
    setPreview(null)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Image className="h-5 w-5 text-blue-600" />
        Application Icon / Favicon
      </h3>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Current Icon Preview */}
        <div className="flex-1 text-center">
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Icon</label>
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center">
            <img 
              src={currentIcon} 
              alt="Current App Icon" 
              className="w-32 h-32 object-contain mb-2"
              onError={(e) => { e.target.src = '/vite.svg' }}
            />
            <p className="text-xs text-gray-500 mt-2">Browser tab icon</p>
          </div>
        </div>

        {/* Upload New Icon */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Icon</label>
          <div className="bg-gray-50 rounded-lg p-4">
            {!preview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="icon-upload"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/x-icon,image/svg+xml"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label 
                  htmlFor="icon-upload" 
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Click to select image</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WEBP, ICO, SVG (max 5MB)</span>
                </label>
              </div>
            ) : (
              <div className="text-center">
                <div className="relative inline-block">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-32 h-32 object-contain mx-auto mb-2"
                  />
                  <button
                    onClick={cancelUpload}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">{selectedFile?.name}</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Upload
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelUpload}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Recommended size: 512x512 pixels. The icon will appear in browser tabs and as the app icon.</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Upload a square image for best results</li>
          <li>• Recommended formats: PNG (transparent background) or SVG</li>
          <li>• For favicon, ICO format works well across all browsers</li>
          <li>• After upload, refresh the page to see the new icon in the browser tab</li>
        </ul>
      </div>
    </div>
  )
}

export default IconUpload