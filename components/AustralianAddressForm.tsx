'use client'

import { useState } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/lib/useTranslation'

// 호주 주/지역 데이터
const AUSTRALIAN_STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' }
]

// 주요 국가 목록 (호주 우선)
const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'KR', name: 'South Korea' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'SG', name: 'Singapore' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' }
]

// 호주 주요 도시별 우편번호 힌트
const POSTCODE_HINTS: { [key: string]: string[] } = {
  'NSW': ['2000 (Sydney CBD)', '2010 (Surry Hills)', '2060 (North Sydney)', '2150 (Parramatta)'],
  'VIC': ['3000 (Melbourne CBD)', '3121 (Richmond)', '3181 (Prahran)', '3141 (South Yarra)'],
  'QLD': ['4000 (Brisbane CBD)', '4006 (Fortitude Valley)', '4217 (Surfers Paradise)', '4870 (Cairns)'],
  'WA': ['6000 (Perth CBD)', '6050 (Mount Lawley)', '6160 (Fremantle)', '6230 (Bunbury)'],
  'SA': ['5000 (Adelaide CBD)', '5006 (North Adelaide)', '5067 (Norwood)', '5108 (Salisbury)'],
  'TAS': ['7000 (Hobart CBD)', '7250 (Launceston)', '7310 (Devonport)', '7320 (Burnie)'],
  'ACT': ['2600 (Canberra)', '2601 (Acton)', '2605 (Deakin)', '2615 (Belconnen)'],
  'NT': ['0800 (Darwin CBD)', '0870 (Alice Springs)', '0810 (Parap)', '0820 (Katherine)']
}

export interface AddressData {
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  country: string
}

interface AustralianAddressFormProps {
  addressData: AddressData
  onAddressChange: (data: AddressData) => void
  required?: boolean
  showCountry?: boolean
}

export default function AustralianAddressForm({ 
  addressData, 
  onAddressChange, 
  required = false,
  showCountry = true 
}: AustralianAddressFormProps) {
  const { t } = useTranslation()
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [postcodeHints, setPostcodeHints] = useState<string[]>([])

  const handleInputChange = (field: keyof AddressData, value: string) => {
    const newData = { ...addressData, [field]: value }
    
    // 주가 변경될 때 우편번호 힌트 업데이트
    if (field === 'state' && POSTCODE_HINTS[value]) {
      setPostcodeHints(POSTCODE_HINTS[value])
    }
    
    onAddressChange(newData)
  }

  const handleStateSelect = (stateCode: string) => {
    handleInputChange('state', stateCode)
    setShowStateDropdown(false)
  }

  const handleCountrySelect = (countryCode: string) => {
    handleInputChange('country', countryCode)
    setShowCountryDropdown(false)
    
    // 호주가 아닌 국가 선택 시 주 선택 초기화
    if (countryCode !== 'AU') {
      handleInputChange('state', '')
      setPostcodeHints([])
    }
  }

  const selectedState = AUSTRALIAN_STATES.find(state => state.code === addressData.state)
  const selectedCountry = COUNTRIES.find(country => country.code === addressData.country)

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <MapPin className="text-purple-600" size={20} />
        <h3 className="text-lg font-medium text-slate-900">
          {t('register.address')} {required && <span className="text-purple-600">*</span>}
        </h3>
      </div>

      {/* 도로명 주소 */}
      <div className="group">
        <label className="block text-sm font-medium text-slate-700 mb-2 group-focus-within:text-purple-600 transition-colors">
          {t('register.streetAddress')} {required && <span className="text-purple-600">*</span>}
        </label>
        <input
          type="text"
          value={addressData.streetAddress}
          onChange={(e) => handleInputChange('streetAddress', e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
          placeholder={t('register.streetAddressPlaceholder')}
          required={required}
        />
      </div>

      {/* 도시/지역과 주 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="group">
          <label className="block text-sm font-medium text-slate-700 mb-2 group-focus-within:text-purple-600 transition-colors">
            {t('register.suburb')} {required && <span className="text-purple-600">*</span>}
          </label>
          <input
            type="text"
            value={addressData.suburb}
            onChange={(e) => handleInputChange('suburb', e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
            placeholder={t('register.suburbPlaceholder')}
            required={required}
          />
        </div>

        {/* 주/지역 드롭다운 (호주만) */}
        {(!showCountry || addressData.country === 'AU' || !addressData.country) && (
          <div className="group relative">
            <label className="block text-sm font-medium text-slate-700 mb-2 group-focus-within:text-purple-600 transition-colors">
              {t('register.state')} {required && <span className="text-purple-600">*</span>}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStateDropdown(!showStateDropdown)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 text-left flex items-center justify-between"
              >
                <span className={selectedState ? 'text-slate-900' : 'text-slate-400'}>
                  {selectedState ? `${selectedState.code} - ${selectedState.name}` : t('register.statePlaceholder')}
                </span>
                <ChevronDown className={`transition-transform duration-200 ${showStateDropdown ? 'rotate-180' : ''}`} size={20} />
              </button>
              
              {showStateDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  {AUSTRALIAN_STATES.map((state) => (
                    <button
                      key={state.code}
                      type="button"
                      onClick={() => handleStateSelect(state.code)}
                      className="w-full px-4 py-3 text-left hover:bg-purple-50 hover:text-purple-700 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <div className="font-medium">{state.code}</div>
                      <div className="text-sm text-slate-500">{state.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 우편번호와 국가 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="group">
          <label className="block text-sm font-medium text-slate-700 mb-2 group-focus-within:text-purple-600 transition-colors">
            {t('register.postcode')} {required && <span className="text-purple-600">*</span>}
          </label>
          <input
            type="text"
            value={addressData.postcode}
            onChange={(e) => handleInputChange('postcode', e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
            placeholder={t('register.postcodePlaceholder')}
            required={required}
          />
          
          {/* 우편번호 힌트 */}
          {postcodeHints.length > 0 && (
            <div className="mt-2 p-3 bg-purple-50 rounded-lg">
              <div className="text-xs font-medium text-purple-700 mb-1">Common postcodes:</div>
              <div className="flex flex-wrap gap-1">
                {postcodeHints.map((hint, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleInputChange('postcode', hint.split(' ')[0])}
                    className="text-xs bg-white text-purple-600 px-2 py-1 rounded hover:bg-purple-100 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 국가 드롭다운 */}
        {showCountry && (
          <div className="group relative">
            <label className="block text-sm font-medium text-slate-700 mb-2 group-focus-within:text-purple-600 transition-colors">
              {t('register.country')} {required && <span className="text-purple-600">*</span>}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 text-left flex items-center justify-between"
              >
                <span className={selectedCountry ? 'text-slate-900' : 'text-slate-400'}>
                  {selectedCountry ? selectedCountry.name : t('register.countryPlaceholder')}
                </span>
                <ChevronDown className={`transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} size={20} />
              </button>
              
              {showCountryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country.code)}
                      className={`w-full px-4 py-3 text-left hover:bg-purple-50 hover:text-purple-700 transition-colors border-b border-slate-100 last:border-b-0 ${
                        country.code === 'AU' ? 'bg-purple-50 font-medium' : ''
                      }`}
                    >
                      {country.name}
                      {country.code === 'AU' && <span className="text-purple-600 text-sm ml-2">(권장)</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 클릭 외부 영역 처리 */}
      {(showStateDropdown || showCountryDropdown) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowStateDropdown(false)
            setShowCountryDropdown(false)
          }}
        />
      )}
    </div>
  )
}
