from pathlib import Path

path = Path('app/checkout/page.tsx')
text = path.read_text(encoding='utf-8')
start = text.index('{/* 배송 옵션 */')
end = text.index('{/* 결제 방법 */')

new_block = """{/* 배송 옵션 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <h2 className="text-2xl font-light text-slate-800 tracking-wide">{t('checkout.shippingOptions')}</h2>
              </div>

              <div className="space-y-3">
                {shippingOptions.map((option) => {
                  const isCashOnDelivery = option.id === 'cash-on-delivery'
                  const canShowCash = isCashOnDelivery &&
                    calculateSubtotal() >= 50 &&
                    isMansfieldArea(addressData) &&
                    paymentMethod === 'cash'

                  if (isCashOnDelivery && !canShowCash) {
                    return null
                  }

                  const isSelected = selectedShipping.id === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedShipping(option)}
                      className={`w-full text-left border rounded-xl p-4 transition-all duration-200 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/60 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 text-sm">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-gray-900">
                            <span className="font-semibold">{getOptionName(option.id)}</span>
                            <span className="font-semibold text-primary-600">${getShippingPrice(option).toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-gray-500 leading-snug">
                            {getOptionDescription(option.id)}
                          </p>
                          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                            <span>{t('checkout.shippingOptionsDetails.deliveryTime')}: {getOptionDeliveryTime(option.id)}</span>
                            <span>{t('checkout.shippingOptionsDetails.tracking')}: {option.tracking ? t('checkout.shippingOptionsDetails.included') : t('checkout.shippingOptionsDetails.notIncluded')}</span>
                            <span>{t('checkout.shippingOptionsDetails.insurance')}: {option.insurance ? t('checkout.shippingOptionsDetails.included') : t('checkout.shippingOptionsDetails.notIncluded')}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-600 mt-1" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

"""

text = text[:start] + new_block + text[end:]
path.write_text(text, encoding='utf-8')

