'use client'

import { useState, useEffect, useRef } from 'react'
import { Lock, Eye, EyeOff, AlertCircle, Trash2, KeyRound, RefreshCw } from 'lucide-react'
import { SystemReset } from './SystemReset'

interface PINLockProps {
  onUnlock: () => void
  onSystemResetComplete?: () => void
}

const PIN_STORAGE_KEY = 'selpic_a_pin'
const RECOVERY_CODE_KEY = 'selpic_a_recovery_code'
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Generate a random 8-digit recovery code
function generateRecoveryCode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString()
}

export function PINLock({ onUnlock, onSystemResetComplete }: PINLockProps) {
  const [pin, setPin] = useState<string[]>(['', '', '', ''])
  const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', ''])
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false)
  const [showPin, setShowPin] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [attempts, setAttempts] = useState<number>(0)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [currentInputIndex, setCurrentInputIndex] = useState<number>(0)
  const [showRecovery, setShowRecovery] = useState<boolean>(false)
  const [recoveryCode, setRecoveryCode] = useState<string>('')
  const [recoveryError, setRecoveryError] = useState<string>('')
  const [showRecoveryCode, setShowRecoveryCode] = useState<boolean>(false)
  const [newRecoveryCode, setNewRecoveryCode] = useState<string>('')
  const [customRecoveryCode, setCustomRecoveryCode] = useState<string>('')
  const [useCustomCode, setUseCustomCode] = useState<boolean>(false)
  const [showSystemReset, setShowSystemReset] = useState<boolean>(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Check if PIN is already set
  useEffect(() => {
    const savedPin = localStorage.getItem(PIN_STORAGE_KEY)
    if (!savedPin) {
      setIsSettingUp(true)
    } else {
      // Check if locked out
      const lockoutTime = localStorage.getItem('selpic_a_lockout_until')
      if (lockoutTime) {
        const lockoutTimestamp = parseInt(lockoutTime, 10)
        if (Date.now() < lockoutTimestamp) {
          setIsLocked(true)
          setLockoutUntil(lockoutTimestamp)
        } else {
          // Lockout expired, clear it
          localStorage.removeItem('selpic_a_lockout_until')
        }
      }
      
      // Load attempts
      const savedAttempts = localStorage.getItem('selpic_a_attempts')
      if (savedAttempts) {
        setAttempts(parseInt(savedAttempts, 10))
      }
    }
  }, [])

  // Auto-focus first input on mount
  useEffect(() => {
    if (isSettingUp) {
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    } else if (!isLocked) {
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    }
  }, [isSettingUp, isLocked])

  // Update lockout countdown
  useEffect(() => {
    if (lockoutUntil) {
      const interval = setInterval(() => {
        const remaining = lockoutUntil - Date.now()
        if (remaining <= 0) {
          setIsLocked(false)
          setLockoutUntil(null)
          localStorage.removeItem('selpic_a_lockout_until')
          clearInterval(interval)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [lockoutUntil])

  const handlePinChange = (value: string, index: number, isConfirm: boolean = false) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '')
    if (numericValue.length > 1) {
      // Handle paste or multiple characters - take only the first digit
      const firstDigit = numericValue[0]
      if (isSettingUp && isConfirm) {
        const newConfirmPin = [...confirmPin]
        newConfirmPin[index] = firstDigit
        setConfirmPin(newConfirmPin)
        setError('')
        
        // Auto-focus next input
        if (index < 3) {
          confirmInputRefs.current[index + 1]?.focus()
        } else if (index === 3 && newConfirmPin.every(d => d !== '')) {
          // All 4 digits entered, auto-validate
          setTimeout(() => handleSetup(), 100)
        }
      } else if (isSettingUp && !isConfirm) {
        const newPin = [...pin]
        newPin[index] = firstDigit
        setPin(newPin)
        setError('')
        
        // Auto-focus next input
        if (index < 3) {
          inputRefs.current[index + 1]?.focus()
        } else if (index === 3) {
          // Move to confirm PIN
          confirmInputRefs.current[0]?.focus()
        }
      } else {
        // Login mode
        const newPin = [...pin]
        newPin[index] = firstDigit
        setPin(newPin)
        setError('')
        
        // Auto-focus next input
        if (index < 3) {
          inputRefs.current[index + 1]?.focus()
        } else if (index === 3 && newPin.every(d => d !== '')) {
          // All 4 digits entered, auto-validate
          setTimeout(() => handleUnlock(), 100)
        }
      }
    } else if (numericValue.length === 1) {
      // Single digit input
      if (isSettingUp && isConfirm) {
        const newConfirmPin = [...confirmPin]
        newConfirmPin[index] = numericValue
        setConfirmPin(newConfirmPin)
        setError('')
        
        // Auto-focus next input
        if (index < 3) {
          confirmInputRefs.current[index + 1]?.focus()
        } else if (index === 3) {
          // All 4 digits entered, auto-validate
          setTimeout(() => {
            const finalConfirmPin = [...newConfirmPin]
            finalConfirmPin[index] = numericValue
            setConfirmPin(finalConfirmPin)
            handleSetup()
          }, 100)
        }
      } else if (isSettingUp && !isConfirm) {
        const newPin = [...pin]
        newPin[index] = numericValue
        setPin(newPin)
        setError('')
        
        // Auto-focus next input
        if (index < 3) {
          inputRefs.current[index + 1]?.focus()
        } else if (index === 3) {
          // Move to confirm PIN
          setTimeout(() => confirmInputRefs.current[0]?.focus(), 50)
        }
      } else {
        // Login mode
        const newPin = [...pin]
        newPin[index] = numericValue
        setPin(newPin)
        setError('')
        
        // Auto-focus next input
        if (index < 3) {
          inputRefs.current[index + 1]?.focus()
        } else if (index === 3) {
          // All 4 digits entered, auto-validate
          setTimeout(() => {
            const finalPin = [...newPin]
            finalPin[index] = numericValue
            setPin(finalPin)
            handleUnlock()
          }, 100)
        }
      }
    } else if (numericValue.length === 0) {
      // Backspace - clear current and move to previous
      if (isSettingUp && isConfirm) {
        const newConfirmPin = [...confirmPin]
        newConfirmPin[index] = ''
        setConfirmPin(newConfirmPin)
        if (index > 0) {
          confirmInputRefs.current[index - 1]?.focus()
        }
      } else if (isSettingUp && !isConfirm) {
        const newPin = [...pin]
        newPin[index] = ''
        setPin(newPin)
        if (index > 0) {
          inputRefs.current[index - 1]?.focus()
        }
      } else {
        const newPin = [...pin]
        newPin[index] = ''
        setPin(newPin)
        if (index > 0) {
          inputRefs.current[index - 1]?.focus()
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, isConfirm: boolean = false) => {
    if (e.key === 'Backspace') {
      const currentPin = isConfirm ? confirmPin : pin
      if (!currentPin[index] && index > 0) {
        // Move to previous input
        if (isConfirm) {
          confirmInputRefs.current[index - 1]?.focus()
        } else {
          inputRefs.current[index - 1]?.focus()
        }
      } else if (currentPin[index]) {
        // Clear current input
        handlePinChange('', index, isConfirm)
      }
    } else if (e.key === 'Enter') {
      // Manual trigger validation
      if (isSettingUp && isConfirm && confirmPin.every(d => d !== '')) {
        handleSetup()
      } else if (!isSettingUp && pin.every(d => d !== '')) {
        handleUnlock()
      }
    }
  }

  const handleSetup = () => {
    const pinString = pin.join('')
    const confirmPinString = confirmPin.join('')
    
    if (pinString.length !== 4 || confirmPinString.length !== 4) {
      setError('Please enter a 4-digit PIN')
      return
    }
    
    if (pinString !== confirmPinString) {
      setError('PINs do not match. Please try again.')
      setPin(['', '', '', ''])
      setConfirmPin(['', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }
    
    // Determine recovery code: use custom if provided, otherwise generate
    let code: string
    if (useCustomCode && customRecoveryCode.length === 8) {
      // Validate custom code is numeric
      if (!/^\d{8}$/.test(customRecoveryCode)) {
        setError('Recovery code must be 8 digits (numbers only)')
        return
      }
      code = customRecoveryCode
    } else {
      // Generate random recovery code
      code = generateRecoveryCode()
    }
    
    // Save recovery code
    localStorage.setItem(RECOVERY_CODE_KEY, code)
    setNewRecoveryCode(code)
    
    // Save PIN (in production, this should be hashed)
    localStorage.setItem(PIN_STORAGE_KEY, pinString)
    console.log('[PIN] PIN saved successfully')
    console.log('[PIN] Recovery code:', code)
    
    // Show recovery code to user
    setShowRecoveryCode(true)
  }

  const handleRecoveryCodeAcknowledged = () => {
    setShowRecoveryCode(false)
    setIsSettingUp(false)
    setPin(['', '', '', ''])
    setConfirmPin(['', '', '', ''])
    setError('')
    setNewRecoveryCode('')
    onUnlock()
  }

  const handleUnlock = () => {
    const savedPin = localStorage.getItem(PIN_STORAGE_KEY)
    const pinString = pin.join('')
    
    if (!savedPin) {
      setError('No PIN set. Please refresh the page.')
      return
    }
    
    if (pinString.length !== 4) {
      setError('Please enter a 4-digit PIN')
      return
    }
    
    if (pinString === savedPin) {
      // Successful unlock
      console.log('[PIN] Unlock successful')
      setAttempts(0)
      localStorage.removeItem('selpic_a_attempts')
      setPin(['', '', '', ''])
      setError('')
      onUnlock()
    } else {
      // Failed attempt
      console.log('[PIN] Unlock failed')
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      localStorage.setItem('selpic_a_attempts', newAttempts.toString())
      
      if (newAttempts >= MAX_ATTEMPTS) {
        // Lock out
        const lockoutTime = Date.now() + LOCKOUT_DURATION
        setIsLocked(true)
        setLockoutUntil(lockoutTime)
        localStorage.setItem('selpic_a_lockout_until', lockoutTime.toString())
        setError(`Too many failed attempts. Locked out for 5 minutes.`)
      } else {
        setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`)
      }
      
      setPin(['', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  const handleClearPIN = () => {
    if (confirm('Are you sure you want to clear the PIN? This will reset the security lock.')) {
      localStorage.removeItem(PIN_STORAGE_KEY)
      localStorage.removeItem(RECOVERY_CODE_KEY)
      localStorage.removeItem('selpic_a_attempts')
      localStorage.removeItem('selpic_a_lockout_until')
      setIsSettingUp(true)
      setPin(['', '', '', ''])
      setConfirmPin(['', '', '', ''])
      setError('')
      setAttempts(0)
      setIsLocked(false)
      setLockoutUntil(null)
      setShowRecovery(false)
      setRecoveryCode('')
      setRecoveryError('')
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  const handleRecoveryCodeSubmit = () => {
    const savedCode = localStorage.getItem(RECOVERY_CODE_KEY)
    
    if (!savedCode) {
      setRecoveryError('No recovery code found. Please contact support.')
      return
    }
    
    if (recoveryCode.trim() !== savedCode) {
      setRecoveryError('Invalid recovery code. Please try again.')
      setRecoveryCode('')
      return
    }
    
    // Valid recovery code - reset PIN
    localStorage.removeItem(PIN_STORAGE_KEY)
    localStorage.removeItem('selpic_a_attempts')
    localStorage.removeItem('selpic_a_lockout_until')
    setIsSettingUp(true)
    setShowRecovery(false)
    setRecoveryCode('')
    setRecoveryError('')
    setAttempts(0)
    setIsLocked(false)
    setLockoutUntil(null)
    setPin(['', '', '', ''])
    setConfirmPin(['', '', '', ''])
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  const getRemainingTime = () => {
    if (!lockoutUntil) return ''
    const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000)
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (isLocked && lockoutUntil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Locked</h2>
            <p className="text-gray-600 mb-4">
              Too many failed attempts. Please try again in:
            </p>
            <p className="text-3xl font-bold text-red-600 mb-6">
              {getRemainingTime()}
            </p>
            <p className="text-sm text-gray-500">
              For security reasons, your account has been temporarily locked.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show recovery code after PIN setup
  if (showRecoveryCode && newRecoveryCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Recovery Code Generated</h2>
            <p className="text-gray-600 mb-4">
              Please save this recovery code in a safe place. You will need it if you forget your PIN.
            </p>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2 text-center">Your Recovery Code:</p>
            <p className="text-3xl font-bold text-center text-gray-900 tracking-wider font-mono">
              {newRecoveryCode.match(/.{1,4}/g)?.join(' ') || newRecoveryCode}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> This code will only be shown once. If you lose it, you will need to reset your PIN through the recovery process.
            </p>
          </div>

          <button
            onClick={handleRecoveryCodeAcknowledged}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            I've Saved My Recovery Code
          </button>
        </div>
      </div>
    )
  }

  // Show System Reset screen
  if (showSystemReset) {
    return (
      <SystemReset
        onResetComplete={() => {
          // Clear PIN and setup flags
          localStorage.removeItem(PIN_STORAGE_KEY)
          localStorage.removeItem(RECOVERY_CODE_KEY)
          localStorage.removeItem('selpic_a_attempts')
          localStorage.removeItem('selpic_a_lockout_until')
          localStorage.removeItem('selpic_setup_complete')
          
          // Reset state
          setIsSettingUp(true)
          setShowSystemReset(false)
          setPin(['', '', '', ''])
          setConfirmPin(['', '', '', ''])
          setError('')
          setAttempts(0)
          setIsLocked(false)
          setLockoutUntil(null)
          
          // Call completion callback to trigger Setup Wizard
          if (onSystemResetComplete) {
            onSystemResetComplete()
          }
        }}
        onCancel={() => {
          setShowSystemReset(false)
          setTimeout(() => inputRefs.current[0]?.focus(), 100)
        }}
      />
    )
  }

  // Show recovery code input screen (deprecated, but kept for backward compatibility)
  if (showRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset PIN</h2>
            <p className="text-gray-600">
              Enter your 8-digit recovery code to reset your PIN
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recovery Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={recoveryCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                  setRecoveryCode(value)
                  setRecoveryError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && recoveryCode.length === 8) {
                    handleRecoveryCodeSubmit()
                  }
                }}
                className="w-full px-4 py-3 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors font-mono tracking-wider"
                placeholder="00000000"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter the 8-digit code you received when setting up your PIN
              </p>
            </div>

            {recoveryError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {recoveryError}
              </div>
            )}

            <button
              onClick={handleRecoveryCodeSubmit}
              disabled={recoveryCode.length !== 8}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Reset PIN
            </button>

            <button
              onClick={() => {
                setShowRecovery(false)
                setRecoveryCode('')
                setRecoveryError('')
              }}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isSettingUp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Up PIN</h2>
            <p className="text-gray-600">
              Create a 4-digit PIN to secure your accounting data
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter PIN
              </label>
              <div className="flex gap-2 justify-center">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={pin[index] || ''}
                    onChange={(e) => handlePinChange(e.target.value, index, false)}
                    onKeyDown={(e) => handleKeyDown(e, index, false)}
                    onPaste={(e) => {
                      e.preventDefault()
                      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
                      if (pastedData.length > 0) {
                        const newPin = [...pin]
                        for (let i = 0; i < Math.min(pastedData.length, 4); i++) {
                          newPin[i] = pastedData[i]
                        }
                        setPin(newPin)
                        if (pastedData.length === 4) {
                          setTimeout(() => confirmInputRefs.current[0]?.focus(), 50)
                        } else {
                          inputRefs.current[Math.min(pastedData.length, 3)]?.focus()
                        }
                      }
                    }}
                    className="w-14 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm PIN
              </label>
              <div className="flex gap-2 justify-center">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (confirmInputRefs.current[index] = el)}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={confirmPin[index] || ''}
                    onChange={(e) => handlePinChange(e.target.value, index, true)}
                    onKeyDown={(e) => handleKeyDown(e, index, true)}
                    onPaste={(e) => {
                      e.preventDefault()
                      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
                      if (pastedData.length > 0) {
                        const newConfirmPin = [...confirmPin]
                        for (let i = 0; i < Math.min(pastedData.length, 4); i++) {
                          newConfirmPin[i] = pastedData[i]
                        }
                        setConfirmPin(newConfirmPin)
                        if (pastedData.length === 4) {
                          setTimeout(() => handleSetup(), 100)
                        } else {
                          confirmInputRefs.current[Math.min(pastedData.length, 3)]?.focus()
                        }
                      }
                    }}
                    className="w-14 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Recovery Code Options */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Recovery Code Options
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomCode(!useCustomCode)
                    setCustomRecoveryCode('')
                    setError('')
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {useCustomCode ? 'Use Auto-Generated' : 'Set Custom Code'}
                </button>
              </div>

              {useCustomCode ? (
                <div>
                  <label className="block text-xs text-gray-600 mb-2">
                    Enter your own 8-digit recovery code (numbers only)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={customRecoveryCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                      setCustomRecoveryCode(value)
                      setError('')
                    }}
                    placeholder="00000000"
                    className="w-full px-3 py-2 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors font-mono tracking-wider"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Choose a memorable 8-digit code. You'll need this if you forget your PIN.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Auto-Generated:</strong> A random 8-digit recovery code will be created automatically. 
                    You'll see it after setting your PIN.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                {showPin ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide PIN
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show PIN
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleSetup}
              disabled={
                pin.join('').length !== 4 || 
                confirmPin.join('').length !== 4 ||
                (useCustomCode && customRecoveryCode.length !== 8)
              }
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Set PIN & Continue
            </button>

            {/* Emergency Clear PIN Button (Dev Only) */}
            <button
              onClick={handleClearPIN}
              className="w-full py-2 mt-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear PIN Storage (Dev Only)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter PIN</h2>
          <p className="text-gray-600">
            Enter your 4-digit PIN to access SELPIC A
          </p>
        </div>

          <div className="space-y-6">
            <div>
              <div className="flex gap-2 justify-center">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={pin[index] || ''}
                    onChange={(e) => handlePinChange(e.target.value, index, false)}
                    onKeyDown={(e) => handleKeyDown(e, index, false)}
                    onPaste={(e) => {
                      e.preventDefault()
                      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
                      if (pastedData.length > 0) {
                        const newPin = [...pin]
                        for (let i = 0; i < Math.min(pastedData.length, 4); i++) {
                          newPin[i] = pastedData[i]
                        }
                        setPin(newPin)
                        if (pastedData.length === 4) {
                          setTimeout(() => handleUnlock(), 100)
                        } else {
                          inputRefs.current[Math.min(pastedData.length, 3)]?.focus()
                        }
                      }
                    }}
                    className="w-14 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {attempts > 0 && attempts < MAX_ATTEMPTS && (
            <div className="text-center text-sm text-yellow-600">
              {MAX_ATTEMPTS - attempts} attempts remaining
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              {showPin ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide PIN
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show PIN
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleUnlock}
            disabled={pin.join('').length !== 4}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Unlock
          </button>

          {/* Forgot PIN Button - Now goes to System Reset */}
          <button
            onClick={() => {
              setShowSystemReset(true)
              setPin(['', '', '', ''])
              setError('')
            }}
            className="w-full py-2 mt-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Forgot PIN? System Reset
          </button>

          {/* Emergency Clear PIN Button (Dev Only) */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={handleClearPIN}
              className="w-full py-2 mt-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear PIN Storage (Dev Only)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
