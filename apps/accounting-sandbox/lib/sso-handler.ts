/**
 * SSO Handler - 홈페이지에서 회계 프로그램으로 세션 전달
 * 
 * 홈페이지 관리자 로그인 상태를 회계 프로그램으로 전달하여
 * 별도의 재로그인 없이 접근 가능하도록 함
 */

interface SSOToken {
  username: string
  role: 'admin' | 'super_admin' | 'staff'
  permissions: string[]
  timestamp: number
  accessType?: 'admin' | 'staff' // 진입 타입 (관리자/직원)
}

/**
 * URL에서 SSO 토큰 추출
 */
export function extractSSOToken(): SSOToken | null {
  if (typeof window === 'undefined') return null

  const urlParams = new URLSearchParams(window.location.search)
  const tokenParam = urlParams.get('token')

  if (!tokenParam) return null

  try {
    // Base64 디코딩
    const decoded = atob(tokenParam)
    const token: SSOToken = JSON.parse(decoded)

    // 토큰 유효성 검증 (5분 이내)
    const now = Date.now()
    const tokenAge = now - token.timestamp
    const maxAge = 5 * 60 * 1000 // 5분

    if (tokenAge > maxAge) {
      console.warn('SSO token expired')
      return null
    }

    return token
  } catch (error) {
    console.error('Failed to parse SSO token:', error)
    return null
  }
}

/**
 * SSO 토큰을 localStorage에 저장
 */
export function saveSSOToken(token: SSOToken): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem('selpic_sso_token', JSON.stringify({
      ...token,
      savedAt: Date.now()
    }))
  } catch (error) {
    console.error('Failed to save SSO token:', error)
  }
}

/**
 * 쿠키에서 SSO 토큰 읽기
 */
function getCookieToken(): SSOToken | null {
  if (typeof window === 'undefined') return null

  try {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'selpic_sso_token') {
        const decoded = decodeURIComponent(value)
        const token = JSON.parse(decoded) as SSOToken & { savedAt?: number }
        
        // 토큰 유효성 검증 (1시간 이내)
        if (token.savedAt) {
          const now = Date.now()
          const tokenAge = now - token.savedAt
          const maxAge = 60 * 60 * 1000 // 1시간

          if (tokenAge > maxAge) {
            return null
          }
        }

        return {
          username: token.username,
          role: token.role,
          permissions: token.permissions,
          timestamp: token.timestamp,
          accessType: token.accessType
        }
      }
    }
    return null
  } catch (error) {
    console.error('Failed to get cookie SSO token:', error)
    return null
  }
}

/**
 * 저장된 SSO 토큰 가져오기 (localStorage, 쿠키, URL 순서로 확인)
 */
export function getSSOToken(): SSOToken | null {
  if (typeof window === 'undefined') return null

  // 1. URL 파라미터에서 토큰 확인 (최우선)
  const urlToken = extractSSOToken()
  if (urlToken) {
    // URL 토큰을 저장
    saveSSOToken(urlToken)
    return urlToken
  }

  // 2. 쿠키에서 토큰 확인 (middleware에서 저장한 경우)
  const cookieToken = getCookieToken()
  if (cookieToken) {
    // 쿠키 토큰을 localStorage에도 저장
    saveSSOToken(cookieToken)
    return cookieToken
  }

  // 3. localStorage에서 토큰 확인
  try {
    const stored = localStorage.getItem('selpic_sso_token')
    if (!stored) return null

    const token = JSON.parse(stored) as SSOToken & { savedAt: number }
    
    // 토큰 유효성 검증 (1시간 이내)
    const now = Date.now()
    const tokenAge = now - token.savedAt
    const maxAge = 60 * 60 * 1000 // 1시간

    if (tokenAge > maxAge) {
      localStorage.removeItem('selpic_sso_token')
      return null
    }

    return {
      username: token.username,
      role: token.role,
      permissions: token.permissions,
      timestamp: token.timestamp,
      accessType: token.accessType
    }
  } catch (error) {
    console.error('Failed to get SSO token:', error)
    return null
  }
}

/**
 * SSO 토큰 삭제
 */
export function clearSSOToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('selpic_sso_token')
}
