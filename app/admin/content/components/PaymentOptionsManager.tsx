'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, CreditCard, X, Eye, EyeOff, DollarSign, Percent, Building2, Wallet } from 'lucide-react'
import { useContentStore, PaymentOption, BankAccount } from '@/lib/contentStore'

export default function PaymentOptionsManager() {
  const {
    paymentOptions,
    addPaymentOption,
    updatePaymentOption,
    deletePaymentOption,
    togglePaymentOptionActive
  } = useContentStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<PaymentOption | null>(null)

  const openModal = (option?: PaymentOption) => {
    if (option) {
      setEditingOption(option)
    } else {
      setEditingOption(null)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingOption(null)
  }

  const handleSave = (formData: any) => {
    if (editingOption) {
      updatePaymentOption(editingOption.id, formData)
    } else {
      addPaymentOption({
        ...formData,
        order: paymentOptions.length + 1
      })
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this payment option?')) {
      deletePaymentOption(id)
    }
  }

  const activeOptions = paymentOptions.filter(opt => opt.isActive)
  const inactiveOptions = paymentOptions.filter(opt => !opt.isActive)

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'card':
        return CreditCard
      case 'paypal':
        return Wallet
      case 'bank':
        return Building2
      case 'cash':
        return DollarSign
      default:
        return CreditCard
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Options Management</h2>
          <p className="text-gray-600 mt-1">Manage payment methods and their fees</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Payment Option
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm">Total Options</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{paymentOptions.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Active</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{activeOptions.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <EyeOff className="w-4 h-4" />
            <span className="text-sm">Inactive</span>
          </div>
          <div className="text-2xl font-bold text-gray-400">{inactiveOptions.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">With Fees</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {paymentOptions.filter(opt => opt.fee > 0).length}
          </div>
        </div>
      </div>

      {/* Payment Options List */}
      <div className="space-y-4">
        {paymentOptions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payment options added yet.</p>
            <button
              onClick={() => openModal()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Payment Option
            </button>
          </div>
        ) : (
          paymentOptions.map((option) => {
            const Icon = getPaymentIcon(option.type)
            return (
              <div
                key={option.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  option.isActive
                    ? 'border-green-200'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        option.type === 'card' ? 'bg-blue-100' :
                        option.type === 'paypal' ? 'bg-yellow-100' :
                        option.type === 'bank' ? 'bg-green-100' :
                        'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          option.type === 'card' ? 'text-blue-600' :
                          option.type === 'paypal' ? 'text-yellow-600' :
                          option.type === 'bank' ? 'text-green-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">{option.name}</h3>
                      {option.isDefault && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Default
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          option.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {option.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3">{option.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 font-medium capitalize">{option.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fee:</span>
                        <span className="ml-2 font-medium">
                          {option.feeType === 'percentage' && option.feePercentage
                            ? `${option.feePercentage}%`
                            : `$${option.fee.toFixed(2)}`}
                        </span>
                      </div>
                      {option.minOrderAmount && (
                        <div>
                          <span className="text-gray-500">Min. Order:</span>
                          <span className="ml-2 font-medium">${option.minOrderAmount}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Auth Required:</span>
                        <span className="ml-2 font-medium">
                          {option.requiresAuth ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openModal(option)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => togglePaymentOptionActive(option.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        option.isActive
                          ? 'text-gray-600 hover:bg-gray-100'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={option.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {option.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {!option.isDefault && (
                      <button
                        onClick={() => handleDelete(option.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <PaymentOptionModal
          option={editingOption}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

function PaymentOptionModal({
  option,
  onSave,
  onClose
}: {
  option: PaymentOption | null
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: option?.name || '',
    type: option?.type || 'card',
    description: option?.description || '',
    fee: option?.fee || 0,
    feeType: option?.feeType || 'fixed',
    feePercentage: option?.feePercentage || 0,
    minOrderAmount: option?.minOrderAmount || 0,
    maxOrderAmount: option?.maxOrderAmount || 0,
    requiresAuth: option?.requiresAuth ?? true,
    isDefault: option?.isDefault || false,
    isActive: option?.isActive ?? true,
    bankAccounts: option?.bankAccounts || []
  })

  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null)
  const [isBankAccountModalOpen, setIsBankAccountModalOpen] = useState(false)
  const [bankAccountForm, setBankAccountForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    bsb: '',
    swiftCode: '',
    accountType: '',
    branchAddress: '',
    isActive: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.description) {
      alert('Please fill in all required fields.')
      return
    }

    onSave({
      ...formData,
      minOrderAmount: formData.minOrderAmount || undefined,
      maxOrderAmount: formData.maxOrderAmount || undefined,
      feePercentage: formData.feeType === 'percentage' ? formData.feePercentage : undefined,
      bankAccounts: formData.type === 'bank' ? formData.bankAccounts : undefined
    })
  }

  const handleAddBankAccount = () => {
    setEditingBankAccount(null)
    setBankAccountForm({
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      bsb: '',
      swiftCode: '',
      accountType: '',
      branchAddress: '',
      isActive: true
    })
    setIsBankAccountModalOpen(true)
  }

  const handleEditBankAccount = (account: BankAccount) => {
    setEditingBankAccount(account)
    setBankAccountForm({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolder: account.accountHolder,
      bsb: account.bsb || '',
      swiftCode: account.swiftCode || '',
      accountType: account.accountType || '',
      branchAddress: account.branchAddress || '',
      isActive: account.isActive
    })
    setIsBankAccountModalOpen(true)
  }

  const handleSaveBankAccount = () => {
    if (!bankAccountForm.bankName || !bankAccountForm.accountNumber || !bankAccountForm.accountHolder) {
      alert('Please fill in Bank Name, Account Number, and Account Holder.')
      return
    }

    const updatedAccounts = [...(formData.bankAccounts || [])]
    if (editingBankAccount) {
      // Update existing account
      const index = updatedAccounts.findIndex(acc => acc.id === editingBankAccount.id)
      if (index !== -1) {
        updatedAccounts[index] = {
          ...editingBankAccount,
          ...bankAccountForm,
          updatedAt: new Date()
        }
      }
    } else {
      // Add new account
      const newAccount: BankAccount = {
        id: `bank-account-${Date.now()}`,
        ...bankAccountForm,
        order: updatedAccounts.length + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      updatedAccounts.push(newAccount)
    }

    setFormData(prev => ({ ...prev, bankAccounts: updatedAccounts }))
    setIsBankAccountModalOpen(false)
    setEditingBankAccount(null)
  }

  const handleDeleteBankAccount = (accountId: string) => {
    if (confirm('Are you sure you want to delete this bank account?')) {
      const updatedAccounts = (formData.bankAccounts || []).filter(acc => acc.id !== accountId)
      setFormData(prev => ({ ...prev, bankAccounts: updatedAccounts }))
    }
  }

  const handleToggleBankAccountActive = (accountId: string) => {
    const updatedAccounts = (formData.bankAccounts || []).map(acc =>
      acc.id === accountId ? { ...acc, isActive: !acc.isActive, updatedAt: new Date() } : acc
    )
    setFormData(prev => ({ ...prev, bankAccounts: updatedAccounts }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            {option ? 'Edit Payment Option' : 'Add Payment Option'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Credit/Debit Card"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="card">Credit/Debit Card</option>
                <option value="paypal">PayPal</option>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash on Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Pay securely with your credit or debit card"
                required
              />
            </div>
          </div>

          {/* Fee Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Fee Settings</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fee Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.feeType}
                  onChange={(e) => setFormData(prev => ({ ...prev, feeType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              {formData.feeType === 'fixed' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fee Amount ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.fee}
                    onChange={(e) => setFormData(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fee Percentage (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.feePercentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, feePercentage: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Order Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Order Limits (Optional)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Order Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, minOrderAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for no minimum"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum order amount required (leave empty for no minimum)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Order Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxOrderAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxOrderAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for no maximum"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum order amount (leave empty for no maximum)</p>
              </div>
            </div>
          </div>

          {/* Bank Accounts Management (only for Bank Transfer) */}
          {formData.type === 'bank' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Bank Accounts</h3>
                <button
                  type="button"
                  onClick={handleAddBankAccount}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Account
                </button>
              </div>
              {formData.bankAccounts && formData.bankAccounts.length > 0 ? (
                <div className="space-y-2">
                  {formData.bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`p-3 border rounded-lg ${
                        account.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-gray-900">{account.bankName}</span>
                            {!account.isActive && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">Inactive</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <div>Account: {account.accountNumber}</div>
                            <div>Holder: {account.accountHolder}</div>
                            {account.bsb && <div>BSB: {account.bsb}</div>}
                            {account.accountType && <div>Type: {account.accountType}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditBankAccount(account)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBankAccountActive(account.id)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            title={account.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {account.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBankAccount(account.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 border border-gray-200 rounded-lg">
                  <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-3">No bank accounts added yet.</p>
                  <button
                    type="button"
                    onClick={handleAddBankAccount}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    Add First Account
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requiresAuth}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiresAuth: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Requires Authentication</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Set as default payment option</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {option ? 'Update' : 'Create'} Payment Option
            </button>
          </div>
        </form>
      </div>

      {/* Bank Account Modal */}
      {isBankAccountModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBankAccount ? 'Edit Bank Account' : 'Add Bank Account'}
              </h2>
              <button
                onClick={() => {
                  setIsBankAccountModalOpen(false)
                  setEditingBankAccount(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankAccountForm.bankName}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, bankName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="NAB Bank"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankAccountForm.accountNumber}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankAccountForm.accountHolder}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, accountHolder: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Selpic Pty Ltd"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BSB
                  </label>
                  <input
                    type="text"
                    value={bankAccountForm.bsb}
                    onChange={(e) => setBankAccountForm(prev => ({ ...prev, bsb: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="123-456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type
                  </label>
                  <input
                    type="text"
                    value={bankAccountForm.accountType}
                    onChange={(e) => setBankAccountForm(prev => ({ ...prev, accountType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Business Account"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SWIFT Code
                </label>
                <input
                  type="text"
                  value={bankAccountForm.swiftCode}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, swiftCode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="NATAAU3303M"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Address
                </label>
                <textarea
                  value={bankAccountForm.branchAddress}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, branchAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="123 Main Street, City, State, ZIP"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bankAccountForm.isActive}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsBankAccountModalOpen(false)
                    setEditingBankAccount(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBankAccount}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingBankAccount ? 'Update' : 'Add'} Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

