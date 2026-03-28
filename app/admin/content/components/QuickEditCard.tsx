import { useState, useEffect } from 'react'
import { QuickEditData, findContentByTitle } from '../utils'
import { ContentItem } from '@/lib/contentStore'

interface QuickEditCardProps {
  title: string
  value: string
  placeholder: string
  type: 'text' | 'url' | 'textarea'
  description: string
  section?: string
  label?: string // Display label (can be different from title)
  onSave: (data: QuickEditData) => void
  existingContent?: ContentItem
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void
}

export default function QuickEditCard({
  title,
  value,
  placeholder,
  type,
  description,
  section,
  label,
  onSave,
  existingContent,
  showNotification
}: QuickEditCardProps) {
  const [inputValue, setInputValue] = useState(value)
  const displayLabel = label || title // Use label if available, otherwise use title

  // Sync inputValue when value prop changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleSave = () => {
    if (!inputValue.trim()) {
      showNotification('error', `Please enter ${displayLabel}.`)
      return
    }

    // For textarea, preserve line breaks and only trim leading/trailing spaces from each line
    let processedValue = inputValue
    if (type === 'textarea') {
      processedValue = inputValue.split('\n').map(line => line.trim()).join('\n').trim()
    } else {
      processedValue = inputValue.trim()
    }

    const quickEditData: QuickEditData = {
      title, // Always use original title when saving
      content: type === 'textarea' ? processedValue : (type === 'text' ? processedValue : title),
      linkUrl: type === 'url' ? processedValue : undefined,
      type: type === 'textarea' ? 'text' : (type === 'text' ? 'text' : 'link'),
      section: section || existingContent?.section || 'header',
      order: existingContent?.order || 1
    }

    onSave(quickEditData)
    showNotification('success', `${displayLabel} has been successfully updated!`)
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-indigo-200">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-indigo-900">{displayLabel}</label>
        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Apply Now</span>
      </div>
      <div className="flex gap-2">
        {type === 'textarea' ? (
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="flex-1 px-3 py-2 border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-y"
          />
        ) : (
          <input
            type={type === 'url' ? 'url' : 'text'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        )}
        <button
          onClick={handleSave}
          className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save
        </button>
      </div>
      <p className="text-xs text-indigo-600 mt-2">{description}</p>
    </div>
  )
}
