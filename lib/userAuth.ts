import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  address?: string
  password?: string // 비밀번호 필드 추가
  createdAt?: string
  isDemo?: boolean // Add demo flag
  
  // VIP 등급 시스템 필드
  totalSalesAmount?: number      // 누적 총판매금액
  currentGrade?: number          // 현재 등급 코드 (0-4)
  gradeUpdatedAt?: string        // 등급 마지막 업데이트 시점
  manualGradeOverride?: boolean  // 수동 등급 변경 여부
  gradeOverrideReason?: string   // 수동 등급 변경 사유
  
  // 비밀번호 재설정 필드
  resetPasswordToken?: string    // 비밀번호 재설정 토큰
  resetPasswordExpires?: string  // 토큰 만료 시간 (ISO string)
  
  // Community Board 권한 필드
  canPost?: boolean              // 글쓰기 권한 (기본값: true)
  isBanned?: boolean            // 차단 여부 (기본값: false)
  banReason?: string             // 차단 사유
  banExpiresAt?: string          // 차단 만료 시간 (ISO string, null이면 영구 차단)
}

interface UserAuthState {
  isLoggedIn: boolean
  isDemo: boolean // Add demo state
  user: User | null
  keepLoggedIn: boolean
  lastActivity: number
  users: User[]
  login: (email: string, password: string, keepLoggedIn?: boolean) => Promise<boolean>
  register: (userData: { email: string; password: string; name: string; phone?: string; address?: string }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  deleteUser: (userId: string) => void
  updateUser: (userId: string, userData: Partial<User>) => void
  updateActivity: () => void
  checkSessionTimeout: () => boolean
  setKeepLoggedIn: (keepLoggedIn: boolean) => void
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<boolean> // 비밀번호 변경 함수 추가
  initializeDemoUser: () => void // 데모 사용자 초기화 함수 추가
  /** After Supabase Auth sign-in: mirror session into local profile for checkout / VIP features. */
  establishSessionFromSupabaseUser: (sbUser: {
    id: string
    email?: string | null
    user_metadata?: Record<string, unknown>
  }) => void
}

// 기본 데모 사용자 데이터
const DEFAULT_DEMO_USER: User = {
  id: '1',
  email: 'user@example.com',
  name: 'SELPIC',
  phone: '0466894279',
  address: 'Mansfield QLD 4122, AU',
  password: 'password123',
  createdAt: new Date().toISOString(),
  isDemo: true, // Mark as demo user
  canPost: true, // 기본적으로 글쓰기 권한 있음
  isBanned: false
}

// 기본 관리자 계정
const DEFAULT_ADMIN_USER: User = {
  id: 'admin',
  email: 'admin@selpic.com',
  name: 'Administrator',
  phone: '0466894279',
  address: 'Mansfield QLD 4122, AU',
  password: 'admin123',
  createdAt: new Date().toISOString(),
  isDemo: false,
  canPost: true, // 관리자는 항상 글쓰기 권한 있음
  isBanned: false
}

// 강제 사용자 재설정 함수
const resetUsersToDefault = () => {
  console.log('Resetting users to default...')
  return [DEFAULT_DEMO_USER, DEFAULT_ADMIN_USER]
}

export const useUserAuth = create<UserAuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      isDemo: false, // Initialize demo state
      user: null,
      keepLoggedIn: false,
      lastActivity: Date.now(),
      users: resetUsersToDefault(), // 기본 데모 사용자로 초기화

      // 데모 사용자 및 관리자 초기화/보정 함수
      initializeDemoUser: () => {
        try {
          const { users } = get()
          const normalizedDemoEmail = DEFAULT_DEMO_USER.email.trim().toLowerCase()
          const normalizedAdminEmail = DEFAULT_ADMIN_USER.email.trim().toLowerCase()

          console.log('=== INITIALIZING DEFAULT USERS ===')
          console.log('Current users before init:', users.length)
          console.log('Current users:', users.map(u => ({ email: u.email, hasPassword: !!u.password })))

          // 중복된 기본 사용자 제거하고, 항상 최신 기본 정보로 덮어씌움
          // 이메일과 ID 모두로 필터링하여 중복 방지
          const filtered = users.filter(u => {
            const email = (u.email || '').trim().toLowerCase()
            const id = (u.id || '').trim()
            return email !== normalizedDemoEmail && 
                   email !== normalizedAdminEmail &&
                   id !== DEFAULT_DEMO_USER.id &&
                   id !== DEFAULT_ADMIN_USER.id
          })
          const updatedUsers = [...filtered, { ...DEFAULT_DEMO_USER }, { ...DEFAULT_ADMIN_USER }]
          
          console.log('Demo user to add:', DEFAULT_DEMO_USER)
          console.log('Admin user to add:', DEFAULT_ADMIN_USER)
          console.log('Updated users list:', updatedUsers)
          console.log('Updated users count:', updatedUsers.length)
          
          set({ users: updatedUsers })
          
          // 초기화 후 다시 확인
          const { users: afterUsers } = get()
          console.log('Users after set:', afterUsers.length)
          console.log('Users after set:', afterUsers.map(u => ({ email: u.email, hasPassword: !!u.password })))
        } catch (error) {
          console.error('Error initializing users:', error)
        }
      },

      login: async (email: string, password: string, keepLoggedIn: boolean = false) => {
        try {
          console.log('=== LOGIN ATTEMPT START ===')
          console.log('Input email:', email)
          console.log('Input password length:', password?.length)
          
          // 데모 사용자 초기화 확인
          console.log('Initializing demo user before login...')
          get().initializeDemoUser()
          
          // 잠시 대기 후 다시 확인
          await new Promise(resolve => setTimeout(resolve, 100))
          
          const { users } = get()
          const normalizedEmail = String(email || '').trim().toLowerCase()
          const normalizedPassword = String(password || '').trim()
          const demoEmail = DEFAULT_DEMO_USER.email.trim().toLowerCase()
          const demoPassword = String(DEFAULT_DEMO_USER.password || '').trim()
          
          console.log('Total users in store after init:', users.length)
          console.log('All users after init:', users.map(u => ({ 
            email: u.email, 
            hasPassword: !!u.password,
            passwordLength: u.password?.length || 0,
            isDemo: u.isDemo
          })))
          
          // 사용자 찾기
          let user = users.find(u => (u.email || '').trim().toLowerCase() === normalizedEmail)
          
          if (!user) {
            console.log('❌ User not found for email:', email)
            console.log('Available emails:', users.map(u => u.email))
            console.log('Looking for normalized email:', normalizedEmail)
            return false
          }
          
          console.log('✅ Found user:', { 
            email: user.email, 
            hasPassword: !!user.password,
            passwordLength: user.password?.length || 0,
            isDemo: user.isDemo
          })
          
          // 문자열로 변환하여 비교
          const userPassword = String(user.password || '').trim()
          const inputPassword = normalizedPassword
          
          console.log('Password comparison:', {
            userPassword: userPassword,
            inputPassword: inputPassword,
            userPasswordLength: userPassword.length,
            inputPasswordLength: inputPassword.length,
            exactMatch: userPassword === inputPassword
          })
          
          if (userPassword !== inputPassword) {
            console.log('❌ Password mismatch for user:', email)
            console.log('Expected:', userPassword)
            console.log('Received:', inputPassword)
            // Self-heal for demo account: reinitialize and retry once
            if (normalizedEmail === demoEmail && (inputPassword === demoPassword || inputPassword === '')) {
              console.warn('Attempting demo user self-heal...')
              get().initializeDemoUser()
              await new Promise(resolve => setTimeout(resolve, 100))
              const { users: retryUsers } = get()
              user = retryUsers.find(u => (u.email || '').trim().toLowerCase() === demoEmail)
              const retryPass = String(user?.password || '').trim()
              if (user && retryPass === demoPassword) {
                console.log('✅ Demo user self-heal succeeded, proceeding with login')
              } else {
                console.error('❌ Demo user self-heal failed')
                return false
              }
            } else {
              return false
            }
          }
          
          // 로그인 성공
          const isDemoUser = user.isDemo === true
          
          console.log('Setting login state...')
          set({
            isLoggedIn: true,
            isDemo: isDemoUser,
            user: { ...user, password: undefined }, // 비밀번호 제외하고 저장
            keepLoggedIn,
            lastActivity: Date.now()
          })
          
          // 상태 설정 후 확인
          const { isLoggedIn, user: loggedInUser } = get()
          console.log('Login state after set:', { isLoggedIn, user: loggedInUser?.email })
          
          console.log('✅ Login successful for:', email, 'isDemo:', isDemoUser)
          console.log('=== LOGIN ATTEMPT END ===')
          return true
        } catch (error) {
          console.error('❌ Login error:', error)
          return false
        }
      },

      register: async (userData) => {
        try {
          const { users } = get()
          const normalizedEmail = String(userData.email || '').trim().toLowerCase()
          
          // 이메일 중복 확인
          const existingUser = users.find(u => (u.email || '').trim().toLowerCase() === normalizedEmail)
          if (existingUser) {
            return { success: false, error: 'emailExists' }
          }
          
          // 새 사용자 생성 (비밀번호 포함)
          const newUser: User = {
            id: Date.now().toString(),
            email: normalizedEmail,
            name: userData.name,
            phone: userData.phone,
            address: userData.address,
            password: userData.password, // 비밀번호 저장
            createdAt: new Date().toISOString(),
            canPost: true, // 기본적으로 글쓰기 권한 있음
            isBanned: false
          }
          
          const updatedUsers = [...users, newUser]
          
          set({
            isLoggedIn: true,
            user: { ...newUser, password: undefined }, // 반환할 때는 비밀번호 제외
            users: updatedUsers,
            lastActivity: Date.now()
          })
          return { success: true }
        } catch (error) {
          console.error('Registration error:', error)
          return { success: false, error: 'general' }
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
          const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
          if (url && anon) {
            void import('@/lib/supabase/browser').then(({ createSupabaseBrowserClient }) => {
              createSupabaseBrowserClient().auth.signOut().catch(() => {})
            })
          }
        }
        set({
          isLoggedIn: false,
          isDemo: false, // Reset demo state on logout
          user: null,
          keepLoggedIn: false,
          lastActivity: Date.now()
        })
      },

      updateUser: (userId: string, userData: Partial<User>) => {
        const { users } = get()
        const updatedUsers = users.map(user => 
          user.id === userId ? { ...user, ...userData } : user
        )
        
        set({ users: updatedUsers })
        
        // 현재 로그인된 사용자 정보도 업데이트
        const currentUser = get().user
        if (currentUser && currentUser.id === userId) {
          set({ user: { ...currentUser, ...userData } })
        }
        
        // 사용자 정보 업데이트 시 이벤트 발생 (VIP 등급 업데이트 등)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user-updated', {
            detail: { userId, userData }
          }))
        }
      },

      // 비밀번호 변경 함수 추가
      changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
        try {
          const { users } = get()
          
          // 사용자 찾기
          const user = users.find(u => u.id === userId)
          if (!user) {
            return false
          }
          
          // 현재 비밀번호 확인
          if (user.password !== currentPassword) {
            return false
          }
          
          // 새 비밀번호로 업데이트
          const updatedUsers = users.map(u => 
            u.id === userId ? { ...u, password: newPassword } : u
          )
          
          set({ users: updatedUsers })
          
          // 현재 로그인된 사용자 정보도 업데이트
          const currentUser = get().user
          if (currentUser && currentUser.id === userId) {
            set({ user: { ...currentUser, password: newPassword } })
          }
          
          return true
        } catch (error) {
          console.error('Password change error:', error)
          return false
        }
      },

      deleteUser: (userId: string) => {
        const { users } = get()
        const updatedUsers = users.filter(user => user.id !== userId)
        set({ users: updatedUsers })
      },

      updateActivity: () => {
        const { isLoggedIn, keepLoggedIn } = get()
        if (isLoggedIn && !keepLoggedIn) {
          set({ lastActivity: Date.now() })
        }
      },

      checkSessionTimeout: () => {
        const { isLoggedIn, keepLoggedIn, lastActivity } = get()
        
        if (!isLoggedIn || keepLoggedIn) {
          return false
        }
        
        const now = Date.now()
        const timeout = 30 * 60 * 1000 // 30분
        
        if (now - lastActivity > timeout) {
          set({
            isLoggedIn: false,
            isDemo: false, // Reset demo state on timeout
            user: null,
            keepLoggedIn: false,
            lastActivity: Date.now()
          })
          return true
        }
        
        return false
      },

      setKeepLoggedIn: (keepLoggedIn: boolean) => {
        set({ keepLoggedIn })
      },

      establishSessionFromSupabaseUser: (sbUser) => {
        const id = (sbUser.id || '').trim()
        if (!id) return
        const emailRaw = (sbUser.email || '').trim()
        const email = emailRaw
          ? emailRaw.toLowerCase()
          : `user_${id.replace(/-/g, '').slice(0, 20)}@session.local`
        get().initializeDemoUser()
        const { users } = get()
        let local = users.find((u) => (u.email || '').trim().toLowerCase() === email)
        const metaName =
          (typeof sbUser.user_metadata?.name === 'string' && sbUser.user_metadata.name) ||
          (typeof sbUser.user_metadata?.full_name === 'string' && sbUser.user_metadata.full_name) ||
          email.split('@')[0] ||
          'Customer'
        if (!local) {
          const newLocal: User = {
            id: sbUser.id,
            email,
            name: metaName,
            phone: '',
            createdAt: new Date().toISOString(),
            canPost: true,
            isBanned: false,
          }
          set({
            users: [...users, newLocal],
            isLoggedIn: true,
            isDemo: false,
            user: { ...newLocal },
            keepLoggedIn: true,
            lastActivity: Date.now(),
          })
          return
        }
        set({
          isLoggedIn: true,
          isDemo: false,
          user: { ...local, password: undefined, name: local.name || metaName },
          keepLoggedIn: true,
          lastActivity: Date.now(),
        })
      },
    }),
    {
      name: 'user-auth-store',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        isDemo: state.isDemo, // Persist demo state
        user: state.user,
        keepLoggedIn: state.keepLoggedIn,
        lastActivity: state.lastActivity,
        users: state.users
      }),
      onRehydrateStorage: () => (state) => {
        // 스토어가 재수화될 때 데모 사용자 초기화
        if (state) {
          state.initializeDemoUser()
        }
      }
    }
  )
) 