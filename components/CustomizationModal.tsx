'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, Palette, Type, Image as ImageIcon, Tag } from 'lucide-react'
import { Product, CustomizationOption } from '@/lib/store'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/useTranslation'
import { useUserAuth } from '@/lib/userAuth'

interface CustomizationModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export default function CustomizationModal({ product, isOpen, onClose }: CustomizationModalProps) {
  const { addToCart, customizations, updateCustomization } = useStore()
  const { t } = useTranslation()
  const { isLoggedIn } = useUserAuth()
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [customText, setCustomText] = useState('')

  useEffect(() => {
    if (product && customizations[product.id]) {
      setSelectedOptions(customizations[product.id])
    } else {
      setSelectedOptions({})
    }
  }, [product, customizations])

  if (!product || !isOpen) return null

  const handleOptionChange = (optionId: string, value: string) => {
    const newOptions = { ...selectedOptions, [optionId]: value }
    setSelectedOptions(newOptions)
    updateCustomization(product.id, newOptions)
  }

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      alert(t('cart.loginRequired'))
      onClose()
      return
    }
    
    const success = addToCart({
      product,
      quantity,
      customizations: selectedOptions
    }, isLoggedIn)
    
    if (success) {
      alert(t('cart.addedToCart'))
      onClose()
    }
  }

  const getOptionIcon = (type: string) => {
    switch (type) {
      case 'color':
        return <Palette size={16} />
      case 'text':
        return <Type size={16} />
      case 'image':
        return <ImageIcon size={16} />
      case 'size':
        return <Tag size={16} />
      default:
        return null
    }
  }

  const calculateTotalPrice = () => {
    let total = product.price
    product.customizationOptions?.forEach(option => {
      if (selectedOptions[option.id] && option.price) {
        total += option.price
      }
    })
    return total * quantity
  }

  // 미리보기 텍스트 생성
  const getPreviewText = () => {
    const textOption = product.customizationOptions?.find(option => option.id === 'text')
    const fontOption = product.customizationOptions?.find(option => option.id === 'font')
    const colorOption = product.customizationOptions?.find(option => option.id === 'color')
    
    const text = selectedOptions['text'] || '네임 스티커'
    const font = selectedOptions['font'] || '기본체'
    const color = selectedOptions['color'] || '검정색'
    
    return { text, font, color }
  }

  const { text, font, color } = getPreviewText()

  // 폰트 스타일 매핑
  const getFontStyle = (fontName: string) => {
    switch (fontName) {
      case '굵은체':
      case 'Bold':
        return 'font-bold'
      case '이탤릭체':
      case 'Italic':
        return 'italic'
      case '손글씨체':
      case 'Handwritten':
        return 'font-serif'
      default:
        return 'font-normal'
    }
  }

  // 색상 매핑
  const getColorStyle = (colorName: string) => {
    switch (colorName) {
      case '검정색':
      case 'Black':
        return 'text-black'
      case '흰색':
      case 'White':
        return 'text-white'
      case '파란색':
      case 'Blue':
        return 'text-blue-600'
      case '빨간색':
      case 'Red':
        return 'text-red-600'
      case '초록색':
      case 'Green':
        return 'text-green-600'
      case '핑크':
      case 'Pink':
        return 'text-pink-600'
      case '파랑':
        return 'text-blue-600'
      case '노랑':
      case 'Yellow':
        return 'text-yellow-600'
      case '보라':
      case 'Purple':
        return 'text-purple-600'
      case '회색':
      case 'Gray':
        return 'text-gray-600'
      case '주황색':
      case 'Orange':
        return 'text-orange-600'
      default:
        return 'text-black'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {product.name} {t('custom.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* 왼쪽: 커스텀 옵션 */}
            <div className="space-y-6">
              {/* 상품 정보 */}
              <div className="flex space-x-4">
                <div className="w-24 h-24 relative rounded-lg overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-gray-600 text-sm">{product.description}</p>
                  <p className="text-lg font-bold text-pink-600 mt-2">
                    ${product.price.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* 커스터마이징 옵션들 */}
              {product.customizationOptions && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t('custom.options')}</h3>
                  
                  {product.customizationOptions.map((option) => (
                    <div key={option.id} className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                        {getOptionIcon(option.type)}
                        <span>{t(`custom.${option.name}`)}</span>
                        {option.required && <span className="text-red-500">*</span>}
                      </label>

                      {option.type === 'text' && !option.options && (
                        <input
                          type="text"
                          value={selectedOptions[option.id] || ''}
                          onChange={(e) => handleOptionChange(option.id, e.target.value)}
                          placeholder={t('custom.enterText')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      )}

                      {option.type === 'text' && option.options && (
                        <select
                          value={selectedOptions[option.id] || ''}
                          onChange={(e) => handleOptionChange(option.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        >
                          <option value="">{t('custom.selectOption')}</option>
                          {option.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {option.type === 'color' && option.options && (
                        <div className="grid grid-cols-5 gap-2">
                          {option.options.map((color) => (
                            <button
                              key={color}
                              onClick={() => handleOptionChange(option.id, color)}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                selectedOptions[option.id] === color
                                  ? 'border-pink-500 ring-2 ring-pink-200'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="w-full h-6 rounded bg-gray-200 flex items-center justify-center text-xs">
                                {color}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {option.type === 'size' && option.options && (
                        <div className="grid grid-cols-3 gap-2">
                          {option.options.map((size) => (
                            <button
                              key={size}
                              onClick={() => handleOptionChange(option.id, size)}
                              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                selectedOptions[option.id] === size
                                  ? 'border-pink-500 bg-pink-50 text-pink-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      )}

                      {option.type === 'image' && (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <ImageIcon size={24} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">{t('custom.imageUpload')}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {option.price && `${t('custom.additionalCost')}: $${option.price.toFixed(2)}`}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 수량 선택 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('custom.quantity')}</label>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* 총 가격 */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">{t('custom.totalPrice')}</span>
                      <span className="text-2xl font-bold text-pink-600">
                        ${calculateTotalPrice().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex space-x-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {t('custom.cancel')}
                    </button>
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                    >
                      {t('custom.addToCart')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽: 실시간 미리보기 */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">{t('custom.preview')}</h3>
              
              {/* 스티커 미리보기 */}
              <div className="bg-gray-100 rounded-xl p-8 flex items-center justify-center min-h-[200px]">
                <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-dashed border-gray-300">
                  <div className={`text-center ${getFontStyle(font)} ${getColorStyle(color)}`}>
                    <div className="text-2xl font-bold mb-2">{text}</div>
                    <div className="text-sm text-gray-500">
                      {font} • {color}
                    </div>
                  </div>
                </div>
              </div>

              {/* 미리보기 정보 */}
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{t('custom.currentSettings')}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('custom.text')}:</span>
                      <span className="font-medium">{text || t('custom.enterText')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('custom.font')}:</span>
                      <span className="font-medium">{font || '기본체'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('custom.color')}:</span>
                      <span className="font-medium">{color || '검정색'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 