'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, FolderOpen } from 'lucide-react'
import MediaLibraryModal from './MediaLibraryModal'

interface ProductImageUploadProps {
  currentImage: string
  onImageChange: (imageUrl: string) => void
  className?: string
}

export default function ProductImageUpload({ currentImage, onImageChange, className = '' }: ProductImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Only image files can be uploaded.')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB 제한
      alert('File size must be 5MB or less.')
      return
    }

    setUploading(true)

    try {
      // 실제 프로덕션에서는 이미지 업로드 서비스(예: Cloudinary, AWS S3)를 사용해야 합니다
      // 여기서는 간단한 예시로 FileReader를 사용합니다
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onImageChange(result)
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Image upload failed:', error)
      alert('Failed to upload image.')
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    onImageChange('')
  }

  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Product Image *
      </label>
      
      {/* 이미지 업로드 영역 */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-emerald-400 bg-emerald-50'
            : currentImage
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {currentImage ? (
          <div className="relative">
            <img
              src={currentImage}
              alt="Product image"
              className="mx-auto h-32 w-32 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MCA2NEg4OE02NCA0MFY4OCIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K'
              }}
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Drag and drop an image here or click to select
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF up to 5MB
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={handleClickUpload}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Select Image'}
              </button>
              <button
                type="button"
                onClick={() => setIsMediaLibraryOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Media Library
              </button>
            </div>
          </div>
        )}
      </div>

      {/* URL 입력 필드 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Or enter image URL
        </label>
        <div className="flex space-x-2">
          <input
            type="url"
            value={currentImage}
            onChange={(e) => onImageChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {currentImage && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 미디어 라이브러리 모달 */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={onImageChange}
        type="image"
        usage="product-media" // 🆕 Product_Media 태그가 달린 사진들이 먼저 보이도록
      />
    </div>
  )
}
