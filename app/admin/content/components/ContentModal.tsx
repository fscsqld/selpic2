'use client'

import { useState, useEffect } from 'react'
import { X, Save, Image as ImageIcon, Video, Type, Link, MousePointer } from 'lucide-react'
import { ContentItem } from '@/lib/contentStore'
import MediaUpload from '@/components/MediaUpload'

interface ContentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ContentItem) => void
  content?: ContentItem | null
  section: string
}

function normalizeOrder(order: unknown): number {
  const n = typeof order === 'number' ? order : Number(order)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

export default function ContentModal({ isOpen, onClose, onSave, content, section }: ContentModalProps) {
  const [formData, setFormData] = useState<Partial<ContentItem>>({
    type: 'text',
    section: section as any,
    title: '',
    content: '',
    mediaUrl: '',
    linkUrl: '',
    order: 1,
    isActive: true,
    buttonStyle: 'primary',
    target: '_self',
    categoryType: 'stickers',
    gradientFrom: '#3B82F6',
    gradientTo: '#8B5CF6',
    emoji: '🏷️'
  })

  useEffect(() => {
    if (content) {
      setFormData({
        ...content,
        order: normalizeOrder(content.order),
      })
    } else {
      setFormData({
        type: 'text',
        section: section as any,
        title: '',
        content: '',
        mediaUrl: '',
        linkUrl: '',
        order: 1,
        isActive: true,
        buttonStyle: 'primary',
        target: '_self',
        categoryType: 'stickers',
        gradientFrom: '#3B82F6',
        gradientTo: '#8B5CF6',
        emoji: '🏷️'
      })
    }
  }, [content, section])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.content) {
      alert('Please enter title and content.')
      return
    }

    const contentData: ContentItem = {
      id: content?.id || `content-${Date.now()}`,
      type: formData.type || 'text',
      section: formData.section || section as any,
      title: formData.title,
      content: formData.content,
      mediaUrl: formData.mediaUrl,
      linkUrl: formData.linkUrl,
      order: normalizeOrder(formData.order),
      isActive: formData.isActive ?? true,
      buttonStyle: formData.buttonStyle,
      target: formData.target,
      categoryType: formData.categoryType,
      gradientFrom: formData.gradientFrom,
      gradientTo: formData.gradientTo,
      emoji: formData.emoji,
      createdAt: content?.createdAt || new Date(),
      updatedAt: new Date()
    }

    onSave(contentData)
    onClose()
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {content ? 'Edit Content' : 'Add New Content'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="button">Button</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order
              </label>
              <input
                type="number"
                value={
                  formData.order != null && Number.isFinite(Number(formData.order))
                    ? formData.order
                    : ''
                }
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    handleInputChange('order', 1)
                    return
                  }
                  const n = parseInt(raw, 10)
                  handleInputChange('order', Number.isFinite(n) ? n : 1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>

          {/* Title and Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter content title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter content"
              required
            />
          </div>

          {/* Media URL (for image/video types) */}
          {(formData.type === 'image' || formData.type === 'video') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Media URL
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={formData.mediaUrl}
                  onChange={(e) => handleInputChange('mediaUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter image or video URL"
                />
                <MediaUpload
                  type={formData.type === 'image' ? 'image' : 'video'}
                  currentUrl={formData.mediaUrl}
                  usage="general-content"
                  onUpload={(file, url) => handleInputChange('mediaUrl', url)}
                  onRemove={() => handleInputChange('mediaUrl', '')}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Link URL (for link/button types) */}
          {(formData.type === 'link' || formData.type === 'button') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link URL
              </label>
              <input
                type="url"
                value={formData.linkUrl}
                onChange={(e) => handleInputChange('linkUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter link URL"
              />
            </div>
          )}

          {/* Button Style (for button type) */}
          {formData.type === 'button' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Style
                </label>
                <select
                  value={formData.buttonStyle}
                  onChange={(e) => handleInputChange('buttonStyle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link Target
                </label>
                <select
                  value={formData.target}
                  onChange={(e) => handleInputChange('target', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="_self">Same Window</option>
                  <option value="_blank">New Window</option>
                </select>
              </div>
            </div>
          )}

          {/* Category-specific fields */}
          {section === 'categories' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Category Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Type
                  </label>
                  <select
                    value={formData.categoryType}
                    onChange={(e) => handleInputChange('categoryType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="stickers">Stickers</option>
                    <option value="stamps">Stamps</option>
                    <option value="phone-cases">Phone Cases</option>
                    <option value="hot-goods">Market S</option>
                    <option value="others">Others</option>
                    <option value="custom-design">Custom Design</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => handleInputChange('emoji', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="🏷️"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gradient Start Color
                  </label>
                  <input
                    type="color"
                    value={formData.gradientFrom}
                    onChange={(e) => handleInputChange('gradientFrom', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gradient End Color
                  </label>
                  <input
                    type="color"
                    value={formData.gradientTo}
                    onChange={(e) => handleInputChange('gradientTo', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {content ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
