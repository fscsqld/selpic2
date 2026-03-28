/**
 * Employee Basic Information - 기본 정보 탭
 */

'use client'

import { useState, useEffect } from 'react'
import { Save, User, Mail, Phone, MapPin, Calendar, DollarSign, Lock, Building2, CreditCard } from 'lucide-react'
import { Employee, EmployeeType, PayFrequency } from '@/src/shared/types/employee'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { EmployeePasswordManagement } from './EmployeePasswordManagement'
import { getBankCodeFromBSB, formatBSB, isValidBSB } from '@/lib/utils/bsb-bank-matcher'

interface EmployeeBasicInfoProps {
  employee: Employee
  onUpdate: () => void
}

export function EmployeeBasicInfo({ employee, onUpdate }: EmployeeBasicInfoProps) {
  const [formData, setFormData] = useState<Partial<Employee>>(employee)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Employee Type 변경 시 자동 처리
  useEffect(() => {
    if (formData.type === 'contractor') {
      // Contractor인 경우: ID를 SP-CO로 시작하도록 설정, Superannuation Rate 0, TFN 제거
      if (!formData.employeeId || !formData.employeeId.startsWith('SP-CO')) {
        setFormData(prev => ({ 
          ...prev, 
          employeeId: 'SP-CO', // SP-CO로 시작, 나머지는 관리자가 입력
          superannuationRate: 0, 
          taxFileNumber: undefined 
        }))
      } else if (formData.superannuationRate !== 0) {
        setFormData(prev => ({ ...prev, superannuationRate: 0, taxFileNumber: undefined }))
      }
    } else {
      // Employee인 경우: Superannuation Rate 기본값 복원
      if (formData.superannuationRate === 0) {
        setFormData(prev => ({ ...prev, superannuationRate: 0.11 }))
      }
    }
  }, [formData.type])

  // Full Name 변경 시 Account Name 자동 채우기
  useEffect(() => {
    if (formData.name && !formData.bankAccount?.accountName) {
      // Account Name이 비어있을 때만 자동 채우기
      setFormData(prev => ({
        ...prev,
        bankAccount: { ...prev.bankAccount, accountName: prev.name || '' }
      }))
    }
  }, [formData.name])

  // BSB 변경 시 Bank Name 자동 채우기
  useEffect(() => {
    if (formData.bankAccount?.bsb) {
      const bankCode = getBankCodeFromBSB(formData.bankAccount.bsb)
      if (bankCode && (!formData.bankAccount.bankName || formData.bankAccount.bankName === '')) {
        // Bank Name이 비어있거나 없을 때만 자동 채우기
        setFormData(prev => ({
          ...prev,
          bankAccount: { ...prev.bankAccount, bankName: bankCode }
        }))
      }
    }
  }, [formData.bankAccount?.bsb])

  const handleSave = async () => {
    if (!formData.name || !formData.employeeId) {
      alert('Name and Employee ID are required')
      return
    }

    setIsSaving(true)
    try {
      const updatedEmployee: Employee = {
        ...employee,
        ...formData,
        // Contractor인 경우 TFN 제거, Superannuation Rate 0
        taxFileNumber: formData.type === 'contractor' ? undefined : formData.taxFileNumber,
        superannuationRate: formData.type === 'contractor' ? 0 : (formData.superannuationRate || 0.11),
        updatedAt: new Date().toISOString(),
      }

      await indexedDBStorage.saveEmployee(updatedEmployee)
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onUpdate()
    } catch (err) {
      console.error('Failed to save employee:', err)
      alert('Failed to save employee information')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Basic Information</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
          Employee information saved successfully!
        </div>
      )}

      <div className="space-y-6">
        {/* Personal Information */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.type === 'contractor' ? 'Contractor ID *' : 'Employee ID *'}
              </label>
              <div className="flex items-center gap-2">
                {formData.type === 'contractor' && (
                  <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-medium">
                    SP-CO
                  </span>
                )}
                <input
                  type="text"
                  value={formData.type === 'contractor' 
                    ? (formData.employeeId?.replace('SP-CO', '') || '') 
                    : (formData.employeeId || '')}
                  onChange={(e) => {
                    if (formData.type === 'contractor') {
                      // Contractor인 경우 SP-CO로 시작하도록 강제
                      const inputValue = e.target.value.replace(/[^0-9]/g, '') // 숫자만 허용
                      setFormData({ ...formData, employeeId: `SP-CO${inputValue}` })
                    } else {
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                  }}
                  className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  required
                  placeholder={formData.type === 'contractor' ? 'Enter numbers (e.g., 001, 123)' : 'Enter Employee ID'}
                />
              </div>
              {formData.type === 'contractor' && (
                <p className="text-xs text-gray-500 mt-1">Format: SP-CO + numbers (e.g., SP-CO001, SP-CO123)</p>
              )}
            </div>
            {formData.type === 'contractor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter company name"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Employment Details
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Type
              </label>
              <select
                value={formData.type || 'employee'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as EmployeeType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="employee">Employee</option>
                <option value="director">Director</option>
                <option value="contractor">Contractor</option>
                <option value="partner">Partner</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pay Frequency
              </label>
              <select
                value={formData.payFrequency || 'monthly'}
                onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value as PayFrequency })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Rate ($)
              </label>
              <input
                type="number"
                value={formData.hourlyRate || ''}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Superannuation Rate (%)
                {formData.type === 'contractor' && (
                  <span className="ml-2 text-xs text-gray-500">(Not applicable for contractors)</span>
                )}
              </label>
              <input
                type="number"
                value={(formData.superannuationRate || (formData.type === 'contractor' ? 0 : 0.11)) * 100}
                onChange={(e) => setFormData({ ...formData, superannuationRate: parseFloat(e.target.value) / 100 || 0.11 })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formData.type === 'contractor' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                step="0.1"
                min="0"
                max="20"
                disabled={formData.type === 'contractor'}
              />
              {formData.type === 'contractor' && (
                <p className="text-xs text-gray-500 mt-1">Contractors are not eligible for superannuation</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-4">Tax Information</h4>
          <div className="grid grid-cols-2 gap-4">
            {formData.type === 'contractor' ? (
              // Contractor: ABN 및 GST 정보
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ABN (Australian Business Number) *
                  </label>
                  <input
                    type="text"
                    value={formData.abn || ''}
                    onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 12 345 678 901"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Registration
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={formData.isGSTRegistered || false}
                      onChange={(e) => setFormData({ ...formData, isGSTRegistered: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">GST Registered</span>
                  </div>
                  {formData.isGSTRegistered && (
                    <p className="text-xs text-blue-600 mt-1">GST will be included in payments</p>
                  )}
                </div>
              </>
            ) : (
              // Employee: TFN
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax File Number (TFN)
                </label>
                <input
                  type="text"
                  value={formData.taxFileNumber || ''}
                  onChange={(e) => setFormData({ ...formData, taxFileNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 123 456 789"
                />
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Address
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address?.street || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.address?.city || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, city: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.address?.state || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, state: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postcode
              </label>
              <input
                type="text"
                value={formData.address?.postcode || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, postcode: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Payment Bank Account */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Bank Account
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Bank account details for payroll payments. This will be used to automatically match transactions in bank statements.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <select
                value={formData.bankAccount?.bankName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankAccount: { ...formData.bankAccount, bankName: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Bank</option>
                <option value="CBA">Commonwealth Bank (CBA)</option>
                <option value="NAB">National Australia Bank (NAB)</option>
                <option value="ANZ">ANZ Bank</option>
                <option value="Westpac">Westpac</option>
                <option value="Other">Other</option>
              </select>
              {formData.bankAccount?.bsb && getBankCodeFromBSB(formData.bankAccount.bsb) && (
                <p className="text-xs text-blue-600 mt-1">
                  ✓ Auto-detected from BSB
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={formData.bankAccount?.accountName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankAccount: { ...formData.bankAccount, accountName: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Account holder name"
              />
              {formData.name && formData.bankAccount?.accountName === formData.name && (
                <p className="text-xs text-blue-600 mt-1">
                  ✓ Auto-filled from Full Name
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BSB
              </label>
              <input
                type="text"
                value={formData.bankAccount?.bsb || ''}
                onChange={(e) => {
                  let inputValue = e.target.value
                  // 숫자와 하이픈만 허용
                  inputValue = inputValue.replace(/[^\d-]/g, '')
                  // 자동 포맷팅 (123-456 형식)
                  if (inputValue.length > 3 && !inputValue.includes('-')) {
                    inputValue = `${inputValue.substring(0, 3)}-${inputValue.substring(3, 6)}`
                  }
                  setFormData({
                    ...formData,
                    bankAccount: { ...formData.bankAccount, bsb: inputValue }
                  })
                }}
                onBlur={(e) => {
                  // 포커스 해제 시 포맷팅
                  const formatted = formatBSB(e.target.value)
                  if (formatted && formatted !== e.target.value) {
                    setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount, bsb: formatted }
                    })
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 123-456"
                maxLength={7}
              />
              {formData.bankAccount?.bsb && isValidBSB(formData.bankAccount.bsb) && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Valid BSB format
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.bankAccount?.accountNumber || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankAccount: { ...formData.bankAccount, accountNumber: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Account number"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive ?? true}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Active Employee</span>
          </label>
        </div>

        {/* Password Management */}
        <div className="pt-6 border-t border-gray-200">
          <EmployeePasswordManagement
            employeeId={employee.employeeId}
            employeeName={employee.name}
            isSelfChange={false}
            onPasswordChanged={onUpdate}
          />
        </div>
      </div>
    </div>
  )
}
