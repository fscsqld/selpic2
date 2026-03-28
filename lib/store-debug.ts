/**
 * Store 디버깅 유틸리티
 * 브라우저 콘솔에서 사용할 수 있는 디버깅 함수들
 */

/**
 * localStorage에서 현재 products 상태 확인
 */
export function checkProductsInLocalStorage() {
  if (typeof window === 'undefined') {
    console.log('❌ 브라우저 환경이 아닙니다.')
    return null
  }

  try {
    const storeData = localStorage.getItem('selpic-store')
    if (!storeData) {
      console.log('⚠️ localStorage에 selpic-store 데이터가 없습니다.')
      return null
    }

    const parsed = JSON.parse(storeData)
    const products = parsed?.state?.products || []

    console.log('📦 localStorage Products 상태:')
    console.log(`- 총 상품 개수: ${products.length}`)
    console.log('- 상품 목록:', products.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category
    })))

    return products
  } catch (error) {
    console.error('❌ localStorage 확인 중 오류:', error)
    return null
  }
}

/**
 * Zustand store에서 현재 products 상태 확인
 */
export function checkProductsInStore() {
  if (typeof window === 'undefined') {
    console.log('❌ 브라우저 환경이 아닙니다.')
    return null
  }

  try {
    // 동적 import로 순환 참조 방지
    import('./store').then(({ useStore }) => {
      const state = useStore.getState()
      const products = state.products || []

      console.log('🏪 Zustand Store Products 상태:')
      console.log(`- 총 상품 개수: ${products.length}`)
      console.log('- 상품 목록:', products.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category
      })))
    })
  } catch (error) {
    console.error('❌ Store 확인 중 오류:', error)
    return null
  }
}

/**
 * localStorage와 Store의 products 동기화 확인
 */
export function checkProductsSync() {
  if (typeof window === 'undefined') {
    console.log('❌ 브라우저 환경이 아닙니다.')
    return
  }

  const localStorageProducts = checkProductsInLocalStorage()
  
  import('./store').then(({ useStore }) => {
    const storeProducts = useStore.getState().products || []
    
    console.log('\n🔄 동기화 상태:')
    console.log(`- localStorage: ${localStorageProducts?.length || 0}개`)
    console.log(`- Store: ${storeProducts.length}개`)
    
    if (localStorageProducts?.length !== storeProducts.length) {
      console.warn('⚠️ localStorage와 Store의 products 개수가 일치하지 않습니다!')
      
      const localStorageIds = localStorageProducts?.map((p: any) => p.id) || []
      const storeIds = storeProducts.map(p => p.id)
      
      const onlyInLocalStorage = localStorageIds.filter((id: string) => !storeIds.includes(id))
      const onlyInStore = storeIds.filter(id => !localStorageIds.includes(id))
      
      if (onlyInLocalStorage.length > 0) {
        console.log('📦 localStorage에만 있는 상품:', onlyInLocalStorage)
      }
      if (onlyInStore.length > 0) {
        console.log('🏪 Store에만 있는 상품:', onlyInStore)
      }
    } else {
      console.log('✅ localStorage와 Store가 동기화되어 있습니다.')
    }
  })
}

/**
 * localStorage의 products를 Store에 강제로 동기화
 */
export function syncProductsToStore() {
  if (typeof window === 'undefined') {
    console.log('❌ 브라우저 환경이 아닙니다.')
    return
  }

  const localStorageProducts = checkProductsInLocalStorage()
  
  if (!localStorageProducts) {
    console.log('⚠️ localStorage에 products가 없습니다.')
    return
  }

  import('./store').then(({ useStore }) => {
    useStore.setState({ products: localStorageProducts })
    console.log('✅ localStorage의 products를 Store에 동기화했습니다.')
    checkProductsSync()
  })
}

// 전역 객체에 함수들을 추가 (브라우저 콘솔에서 사용 가능)
if (typeof window !== 'undefined') {
  (window as any).checkProductsInLocalStorage = checkProductsInLocalStorage
  ;(window as any).checkProductsInStore = checkProductsInStore
  ;(window as any).checkProductsSync = checkProductsSync
  ;(window as any).syncProductsToStore = syncProductsToStore
  
  console.log('🔧 Store 디버깅 함수가 로드되었습니다:')
  console.log('- checkProductsInLocalStorage() - localStorage의 products 확인')
  console.log('- checkProductsInStore() - Zustand store의 products 확인')
  console.log('- checkProductsSync() - localStorage와 Store 동기화 상태 확인')
  console.log('- syncProductsToStore() - localStorage의 products를 Store에 동기화')
}
