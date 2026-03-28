'use client'

import { useState, useEffect } from 'react'
import { Key, CheckCircle, XCircle, Loader2, User } from 'lucide-react'
import { strings } from '@/lib/i18n/strings'

interface ApiKeyFormProps {
  onApiKeySet?: (apiKey: string) => void
  onDirectorNameSet?: (directorName: string) => void
  onUserApiKeySet?: (userApiKey: string) => void
}

export function ApiKeyForm({ onApiKeySet, onDirectorNameSet, onUserApiKeySet }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState('')
  const [userApiKey, setUserApiKey] = useState('') // User's own API key
  const [directorName, setDirectorName] = useState('')
  const [initialDirectorName, setInitialDirectorName] = useState('') // Track initial value to detect changes
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isUserApiKeyValidating, setIsUserApiKeyValidating] = useState(false)
  const [isUserApiKeyValid, setIsUserApiKeyValid] = useState<boolean | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  // Load API key and Director name from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key')
    if (savedKey) {
      setApiKey(savedKey)
      setIsSaved(true)
    }
    
    const savedUserApiKey = localStorage.getItem('user_openai_api_key')
    if (savedUserApiKey) {
      setUserApiKey(savedUserApiKey)
      setIsSaved(true)
    }
    
    const savedDirectorName = localStorage.getItem('director_name')
    if (savedDirectorName) {
      setDirectorName(savedDirectorName)
      setInitialDirectorName(savedDirectorName)
      onDirectorNameSet?.(savedDirectorName)
    }
  }, [onDirectorNameSet])
  
  // Check if Director Name has changed
  const hasDirectorNameChanged = directorName.trim() !== initialDirectorName.trim()
  
  // Check if there are any changes to save
  // Director Name can be saved independently, or API Key can be saved if valid
  const hasChanges = hasDirectorNameChanged || (apiKey.trim() && (isValid === true || isValid === null)) || (userApiKey.trim() && (isUserApiKeyValid === true || isUserApiKeyValid === null))
  
  // Validate User API Key
  const validateUserApiKey = async () => {
    if (!userApiKey.trim()) {
      setIsUserApiKeyValid(false)
      return
    }

    // Basic format validation
    if (!userApiKey.startsWith('sk-')) {
      setIsUserApiKeyValid(false)
      return
    }

    setIsUserApiKeyValidating(true)
    setIsUserApiKeyValid(null)

    try {
      // Test API key by making a simple request
      const response = await fetch('/api/validate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: userApiKey }),
      })

      const data = await response.json()
      setIsUserApiKeyValid(data.valid)

      if (data.valid) {
        // Save to localStorage
        localStorage.setItem('user_openai_api_key', userApiKey)
        setIsSaved(true)
        onUserApiKeySet?.(userApiKey)
      }
    } catch (error) {
      console.error('User API key validation error:', error)
      setIsUserApiKeyValid(false)
    } finally {
      setIsUserApiKeyValidating(false)
    }
  }

  /**
   * Validate OpenAI API key format and test it
   */
  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setIsValid(false)
      return
    }

    // Basic format validation
    if (!apiKey.startsWith('sk-')) {
      setIsValid(false)
      return
    }

    setIsValidating(true)
    setIsValid(null)

    try {
      // Test API key by making a simple request
      const response = await fetch('/api/validate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      })

      const data = await response.json()
      setIsValid(data.valid)

      if (data.valid) {
        // Save to localStorage
        localStorage.setItem('openai_api_key', apiKey)
        setIsSaved(true)
        onApiKeySet?.(apiKey)
        
        // Also save Director name if provided
        if (directorName.trim()) {
          localStorage.setItem('director_name', directorName.trim())
          onDirectorNameSet?.(directorName.trim())
        }
      }
    } catch (error) {
      console.error('API key validation error:', error)
      setIsValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  /**
   * Save API key and Director name to localStorage
   */
  const handleSave = () => {
    // Save API key if provided and valid
    if (apiKey.trim() && isValid) {
      localStorage.setItem('openai_api_key', apiKey)
      onApiKeySet?.(apiKey)
    }
    
    // Save User API key if provided and valid
    if (userApiKey.trim() && isUserApiKeyValid) {
      localStorage.setItem('user_openai_api_key', userApiKey)
      onUserApiKeySet?.(userApiKey)
    }
    
    // Save Director name (can be saved independently)
    if (directorName.trim()) {
      localStorage.setItem('director_name', directorName.trim())
      setInitialDirectorName(directorName.trim()) // Update initial value
      onDirectorNameSet?.(directorName.trim())
    } else {
      // Remove Director name if empty
      localStorage.removeItem('director_name')
      setInitialDirectorName('') // Update initial value
      onDirectorNameSet?.('')
    }
    
    // Mark as saved if API key is valid or Director name was saved
    if ((apiKey.trim() && isValid) || (userApiKey.trim() && isUserApiKeyValid) || hasDirectorNameChanged) {
      setIsSaved(true)
    }
  }

  /**
   * Remove API key
   */
  const handleRemove = () => {
    localStorage.removeItem('openai_api_key')
    setApiKey('')
    setIsSaved(false)
    setIsValid(null)
    onApiKeySet?.('')
    // Note: Director name is kept even when API key is removed
  }
  
  /**
   * Remove User API key
   */
  const handleRemoveUserApiKey = () => {
    localStorage.removeItem('user_openai_api_key')
    setUserApiKey('')
    setIsSaved(false)
    setIsUserApiKeyValid(null)
    onUserApiKeySet?.('')
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Key className="w-6 h-6" />
        {strings.settings.title}
      </h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">
            {strings.settings.apiKey}
          </label>
          <div className="flex gap-2">
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setIsValid(null)
                setIsSaved(false)
              }}
              placeholder={strings.settings.apiKeyPlaceholder}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={validateApiKey}
              disabled={isValidating || !apiKey.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  {strings.settings.validate}
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {strings.settings.apiKeyDescription}
          </p>
        </div>

        {/* User's Own OpenAI API Key Field */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <label htmlFor="user-api-key" className="block text-sm font-medium text-gray-700 mb-2">
            <Key className="w-4 h-4 inline mr-1" />
            User's Own OpenAI API Key (Optional)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            If provided, your own API key will be used instead of the system default. This helps manage API costs.
          </p>
          <div className="flex gap-2">
            <input
              id="user-api-key"
              type="password"
              value={userApiKey}
              onChange={(e) => {
                setUserApiKey(e.target.value)
                setIsUserApiKeyValid(null)
                setIsSaved(false)
              }}
              placeholder="sk-..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={validateUserApiKey}
              disabled={isUserApiKeyValidating || !userApiKey.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isUserApiKeyValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Validate
                </>
              )}
            </button>
          </div>
          {isUserApiKeyValid !== null && (
            <div
              className={`mt-2 p-2 rounded-md flex items-center gap-2 text-sm ${
                isUserApiKeyValid
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {isUserApiKeyValid ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>User API Key is valid</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Invalid API Key</span>
                </>
              )}
            </div>
          )}
          {userApiKey && isUserApiKeyValid && (
            <button
              onClick={handleRemoveUserApiKey}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Remove User API Key
            </button>
          )}
        </div>

        {/* Director Name Field */}
        <div>
          <label htmlFor="director-name" className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            {strings.settings.directorName}
          </label>
            <input
              id="director-name"
              type="text"
              value={directorName}
              onChange={(e) => {
                setDirectorName(e.target.value)
                setIsSaved(false) // Mark as unsaved when Director name changes
              }}
              placeholder={strings.settings.directorNamePlaceholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          <p className="mt-2 text-sm text-gray-500">
            {strings.settings.directorNameDescription}
          </p>
        </div>

        {/* Validation Status */}
        {isValid !== null && (
          <div
            className={`p-3 rounded-md flex items-center gap-2 ${
              isValid
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {isValid ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>{strings.settings.keyValid}</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                <span>{strings.settings.keyInvalid}</span>
              </>
            )}
          </div>
        )}

        {/* Save Status */}
        {isSaved && (
          <div className="p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>{strings.success.saved}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {strings.settings.save}
          </button>
          {isSaved && (
            <button
              onClick={handleRemove}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Remove Key
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

