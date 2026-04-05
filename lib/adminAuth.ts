import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAdminActivityLog } from './adminActivityLog'
import { useAdminSession } from './adminSession'
import { useAdminIPControl } from './adminIPControl'
import { useAdminPasswordPolicy } from './adminPasswordPolicy'

export interface AdminUser {
  username: string
  role: 'admin' | 'super_admin'
  permissions: string[]
  isActive: boolean
  createdAt: string
  lastLogin?: string
  lastModified?: string
  // Extended Profile Fields
  email?: string
  phone?: string
  department?: string
  notes?: string
  avatar?: string // URL or base64 image
}

interface AdminAuthState {
  isLoggedIn: boolean
  adminUser: AdminUser | null
  adminUsers: AdminUser[]
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => boolean
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  changeAdminPassword: (adminUsername: string, newPassword: string) => Promise<boolean>
  updateAdminPermissions: (adminUsername: string, permissions: string[]) => Promise<boolean>
  toggleAdminStatus: (adminUsername: string) => Promise<boolean>
  createAdmin: (username: string, password: string, role: 'admin' | 'super_admin', permissions: string[]) => Promise<boolean>
  deleteAdmin: (adminUsername: string) => Promise<boolean>
  updateMyUsername: (newUsername: string) => Promise<boolean>
  updateAdminProfile: (adminUsername: string, profileData: Partial<Pick<AdminUser, 'email' | 'phone' | 'department' | 'notes' | 'avatar'>>) => Promise<boolean>
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      adminUser: null,
      adminUsers: [
        {
          username: 'admin',
          role: 'admin',
          permissions: [
            'dashboard:read',
            'products:read',
            'products:write',
            'content:read',
            'content:write',
            'users:read',
            'analytics:read',
            'orders:read',
            'messages:read',
            'community:read',
            'images:read',
            'images:write',
            'invoices:read',
            'invoices:write',
            'system:admin',
          ],
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
          username: 'superadmin',
          role: 'super_admin',
          permissions: [
            'dashboard:read',
            'products:read',
            'products:write',
            'content:read',
            'content:write',
            'users:read',
            'users:write',
            'analytics:read',
            'orders:read',
            'orders:write',
            'messages:read',
            'messages:write',
            'community:read',
            'community:write',
            'community:moderate',
            'images:read',
            'images:write',
            'invoices:read',
            'invoices:write',
            'system:admin',
            'admin:manage',
          ],
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      ],

      login: async (username: string, password: string) => {
        // 실제 환경에서는 서버에서 인증을 처리해야 합니다
        // 여기서는 간단한 예시로 구현
        try {
          const { adminUsers } = get()
          const now = new Date().toISOString()
          
          // Trim username and password to remove whitespace
          const trimmedUsername = username.trim()
          const trimmedPassword = password.trim()
          
          console.log(`=== LOGIN ATTEMPT START ===`)
          console.log(`Username: "${trimmedUsername}"`)
          console.log(`Password length: ${trimmedPassword.length}`)
          console.log(`Total adminUsers: ${adminUsers.length}`)
          console.log(`AdminUsers:`, adminUsers.map(u => ({ username: u.username, isActive: u.isActive, role: u.role })))
          
          // Get client IP and check IP restrictions
          const { getClientIP, getUserAgent } = useAdminActivityLog.getState()
          const { isIPAllowed } = useAdminIPControl.getState()
          const clientIP = await getClientIP()
          
          // Check IP restrictions (only if IP is known)
          if (clientIP !== 'Unknown') {
            const ipAllowed = isIPAllowed(clientIP, trimmedUsername)
            if (!ipAllowed) {
              console.log(`❌ IP ${clientIP} is not allowed for ${trimmedUsername}`)
              console.log(`=== LOGIN ATTEMPT END (FAILED - IP not allowed) ===`)
              return false
            }
          }
          
          // First, try to find the admin in adminUsers array (works for all admins including renamed ones)
          const targetAdmin = adminUsers.find(u => u.username === trimmedUsername && u.isActive)
          const storedPassword = localStorage.getItem(`admin-password-${trimmedUsername}`)
          
          console.log(`Target admin found:`, targetAdmin ? { username: targetAdmin.username, role: targetAdmin.role, isActive: targetAdmin.isActive } : 'NOT FOUND')
          console.log(`Stored password exists: ${!!storedPassword}`)
          
          // Check default passwords for original admin/superadmin FIRST (even if not in adminUsers array)
          // This ensures default accounts always work
          if (trimmedUsername === 'admin' && trimmedPassword === 'selpic2024') {
            // Check if stored password exists and is different from default
            if (storedPassword && storedPassword !== 'selpic2024') {
              console.log(`⚠️ Stored password exists but doesn't match. Using default password for admin.`)
            }
            
            // Use permissions from adminUsers array if admin exists, otherwise use default
            let adminUserData
            let updatedAdminUsers = adminUsers
            
            if (targetAdmin) {
              // Use existing admin's permissions from adminUsers array
              adminUserData = {
                ...targetAdmin,
                lastLogin: now
              }
              updatedAdminUsers = adminUsers.map(u => 
                u.username === 'admin' ? { ...u, lastLogin: now } : u
              )
              console.log(`✅ Using existing admin permissions from adminUsers array`)
            } else {
              // Admin not found, create with default permissions
              console.log(`⚠️ Admin 'admin' not found in adminUsers array. Adding it now.`)
              adminUserData = {
                username: 'admin',
                role: 'admin' as const,
                permissions: [
                  'dashboard:read',
                  'products:read',
                  'products:write',
                  'content:read',
                  'content:write',
                  'users:read',
                  'analytics:read',
                  'orders:read',
                  'messages:read',
                  'community:read'
                ],
                isActive: true,
                createdAt: '2024-01-01T00:00:00.000Z',
                lastLogin: now
              }
              updatedAdminUsers = [
                ...adminUsers,
                adminUserData
              ]
            }
            
            set({
              isLoggedIn: true,
              adminUser: adminUserData,
              adminUsers: updatedAdminUsers
            })
            
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('admin-auth-updated'))
              
              // Create session
              const { createSession } = useAdminSession.getState()
              const { getUserAgent } = useAdminActivityLog.getState()
              const clientIP = await useAdminActivityLog.getState().getClientIP()
              createSession('admin', 'admin', clientIP, getUserAgent())
              
              // Log activity
              const { addLog } = useAdminActivityLog.getState()
              addLog({
                action: 'login',
                performedBy: 'admin',
                ipAddress: clientIP,
                userAgent: getUserAgent()
              })
            }
            
            console.log(`✅ Login successful for admin (using default password)`)
            console.log(`Admin permissions:`, adminUserData.permissions)
            console.log(`=== LOGIN ATTEMPT END (SUCCESS) ===`)
            return true
          }
          
          if (trimmedUsername === 'superadmin' && trimmedPassword === 'selpic2024super') {
            // Check if stored password exists and is different from default
            if (storedPassword && storedPassword !== 'selpic2024super') {
              console.log(`⚠️ Stored password exists but doesn't match. Using default password for superadmin.`)
            }
            
            // Use permissions from adminUsers array if superadmin exists, otherwise use default
            let adminUserData
            let updatedAdminUsers = adminUsers
            
            if (targetAdmin) {
              // Use existing superadmin's permissions from adminUsers array
              adminUserData = {
                ...targetAdmin,
                lastLogin: now
              }
              updatedAdminUsers = adminUsers.map(u => 
                u.username === 'superadmin' ? { ...u, lastLogin: now } : u
              )
              console.log(`✅ Using existing superadmin permissions from adminUsers array`)
            } else {
              // Superadmin not found, create with default permissions
              console.log(`⚠️ Admin 'superadmin' not found in adminUsers array. Adding it now.`)
              adminUserData = {
                username: 'superadmin',
                role: 'super_admin' as const,
                permissions: [
                  'dashboard:read',
                  'products:read',
                  'products:write',
                  'content:read',
                  'content:write',
                  'users:read',
                  'users:write',
                  'analytics:read',
                  'system:admin',
                  'admin:manage'
                ],
                isActive: true,
                createdAt: '2024-01-01T00:00:00.000Z',
                lastLogin: now
              }
              updatedAdminUsers = [
                ...adminUsers,
                adminUserData
              ]
            }
            
            set({
              isLoggedIn: true,
              adminUser: adminUserData,
              adminUsers: updatedAdminUsers
            })
            
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('admin-auth-updated'))
              
              // Create session
              const { createSession } = useAdminSession.getState()
              const { getUserAgent } = useAdminActivityLog.getState()
              const clientIP = await useAdminActivityLog.getState().getClientIP()
              createSession('superadmin', 'super_admin', clientIP, getUserAgent())
              
              // Log activity
              const { addLog } = useAdminActivityLog.getState()
              addLog({
                action: 'login',
                performedBy: 'superadmin',
                ipAddress: clientIP,
                userAgent: getUserAgent()
              })
            }
            
            console.log(`✅ Login successful for superadmin (using default password)`)
            console.log(`Superadmin permissions:`, adminUserData.permissions)
            console.log(`=== LOGIN ATTEMPT END (SUCCESS) ===`)
            return true
          }
          
          // If targetAdmin exists, check stored password
          if (targetAdmin) {
            // Check stored password
            if (storedPassword && storedPassword === trimmedPassword) {
              const adminUser = {
                username: targetAdmin.username,
                role: targetAdmin.role,
                permissions: targetAdmin.permissions,
                isActive: targetAdmin.isActive,
                createdAt: targetAdmin.createdAt,
                lastLogin: now
              }
              
              // Update lastLogin in adminUsers array
              set({
                isLoggedIn: true,
                adminUser,
                adminUsers: adminUsers.map(u => 
                  u.username === trimmedUsername ? { ...u, lastLogin: now } : u
                )
              })
              
              // Dispatch custom event to notify other components
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('admin-auth-updated'))
                
                // Create session
                const { createSession } = useAdminSession.getState()
                const { getUserAgent } = useAdminActivityLog.getState()
                const clientIP = await useAdminActivityLog.getState().getClientIP()
                createSession(trimmedUsername, targetAdmin.role, clientIP, getUserAgent())
                
                // Log activity
                const { addLog } = useAdminActivityLog.getState()
                addLog({
                  action: 'login',
                  performedBy: trimmedUsername,
                  ipAddress: clientIP,
                  userAgent: getUserAgent()
                })
              }
              
              console.log(`✅ Login successful for ${trimmedUsername} (using stored password)`)
              console.log(`=== LOGIN ATTEMPT END (SUCCESS) ===`)
              return true
            }
            
            // Admin found but password doesn't match stored or default
            console.log(`❌ Password mismatch for ${trimmedUsername}`)
            console.log(`Stored password exists: ${!!storedPassword}`)
            if (storedPassword) {
              console.log(`Stored password length: ${storedPassword.length}, Input length: ${trimmedPassword.length}`)
              console.log(`Stored password matches: ${storedPassword === trimmedPassword}`)
            }
            console.log(`Expected default password for admin: selpic2024`)
            console.log(`Expected default password for superadmin: selpic2024super`)
            console.log(`=== LOGIN ATTEMPT END (FAILED - Password mismatch) ===`)
            return false
          }
        
        // Admin not found in adminUsers array
        console.log(`❌ Admin ${trimmedUsername} not found in adminUsers array`)
        console.log(`Available admins:`, adminUsers.map(u => ({ username: u.username, isActive: u.isActive, role: u.role })))
        console.log(`=== LOGIN ATTEMPT END (FAILED - Admin not found) ===`)
        return false
        } catch (error) {
          console.error(`❌ Login error:`, error)
          console.log(`=== LOGIN ATTEMPT END (FAILED - Error) ===`)
          return false
        }
      },

      logout: () => {
        const { adminUser } = get()

        if (typeof window !== 'undefined') {
          try {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
            const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
            if (url && anon) {
              import('@/lib/supabase/browser').then(({ createSupabaseBrowserClient }) => {
                createSupabaseBrowserClient().auth.signOut().catch(() => {})
              })
            }
          } catch {
            /* ignore */
          }
        }

        // End session and log activity
        if (adminUser && typeof window !== 'undefined') {
          const { currentSessionId, endSession } = useAdminSession.getState()
          if (currentSessionId) {
            endSession(currentSessionId)
          }

          const { addLog, getClientIP, getUserAgent } = useAdminActivityLog.getState()
          getClientIP().then((ip) => {
            addLog({
              action: 'logout',
              performedBy: adminUser.username,
              ipAddress: ip,
              userAgent: getUserAgent(),
            })
          })
        }

        set({
          isLoggedIn: false,
          adminUser: null,
        })
      },

      checkAuth: () => {
        return get().isLoggedIn
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        const { adminUser } = get()
        
        if (!adminUser) {
          console.log('No admin user logged in')
          return false
        }

        console.log(`Attempting to change password for: ${adminUser.username}`)

        // Validate password against policy
        const { validatePassword, addPasswordToHistory } = useAdminPasswordPolicy.getState()
        const validation = validatePassword(newPassword, adminUser.username)
        if (!validation.valid) {
          console.log('Password does not meet policy requirements:', validation.errors)
          throw new Error(`Password does not meet requirements: ${validation.errors.join(', ')}`)
        }

        const cur = currentPassword.trim()
        const next = newPassword.trim()

        /**
         * Staff signed in via Supabase Auth: password lives in Auth, not in `admin-password-*` localStorage.
         * Match session email to `adminUser.email` (set in mapSupabaseUserToAdminUser) before using this path.
         */
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
        const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
        const profileEmail = adminUser.email?.trim()
        if (typeof window !== 'undefined' && supabaseUrl && supabaseAnon && profileEmail) {
          try {
            const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
            const supabase = createSupabaseBrowserClient()
            const {
              data: { session },
            } = await supabase.auth.getSession()
            const sessionEmail = session?.user?.email?.trim().toLowerCase()
            if (sessionEmail && sessionEmail === profileEmail.toLowerCase()) {
              const { error: signErr } = await supabase.auth.signInWithPassword({
                email: profileEmail,
                password: cur,
              })
              if (signErr) {
                console.log(`[changePassword] Supabase current password check failed: ${signErr.message}`)
                return false
              }
              const { error: upErr } = await supabase.auth.updateUser({ password: next })
              if (upErr) {
                console.error('[changePassword] Supabase updateUser failed', upErr.message)
                return false
              }
              localStorage.removeItem(`admin-password-${adminUser.username}`)
              localStorage.removeItem(`admin-password-changed-${adminUser.username}`)
              addPasswordToHistory(adminUser.username, next)
              const { adminUsers: sbAdmins } = get()
              const updatedFromSb = sbAdmins.map((u) =>
                u.username === adminUser.username ? { ...u, lastModified: new Date().toISOString() } : u
              )
              set({ adminUsers: updatedFromSb })
              window.dispatchEvent(new Event('admin-auth-updated'))
              console.log(`Password changed successfully (Supabase Auth) for ${adminUser.username}`)
              return true
            }
          } catch (e) {
            console.error('[changePassword] Supabase branch error', e)
          }
        }

        // Legacy demo / local-only admin: localStorage + default passwords
        let isValidCurrentPassword = false

        const storedPassword = localStorage.getItem(`admin-password-${adminUser.username}`)
        console.log(`Stored password exists for ${adminUser.username}: ${!!storedPassword}`)

        if (storedPassword && storedPassword === cur) {
          isValidCurrentPassword = true
          console.log(`Current password verified using stored password`)
        } else {
          if (adminUser.username === 'admin' && cur === 'selpic2024') {
            isValidCurrentPassword = true
            console.log(`Current password verified using default password for admin`)
          } else if (adminUser.username === 'superadmin' && cur === 'selpic2024super') {
            isValidCurrentPassword = true
            console.log(`Current password verified using default password for superadmin`)
          } else {
            console.log(`Current password does not match stored or default password`)
          }
        }

        if (!isValidCurrentPassword) {
          console.log(`Invalid current password for ${adminUser.username}`)
          console.log(`Stored password exists: ${!!storedPassword}`)
          if (storedPassword) {
            console.log(`Stored password length: ${storedPassword.length}, Input length: ${cur.length}`)
          }
          return false
        }

        localStorage.setItem(`admin-password-${adminUser.username}`, next)
        localStorage.setItem(`admin-password-changed-${adminUser.username}`, new Date().toISOString())
        
        addPasswordToHistory(adminUser.username, next)

        const { adminUsers } = get()
        const updatedAdminUsers = adminUsers.map((u) =>
          u.username === adminUser.username ? { ...u, lastModified: new Date().toISOString() } : u
        )

        set({
          adminUsers: updatedAdminUsers,
        })

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-auth-updated'))
        }

        console.log(`Password changed successfully for ${adminUser.username}`)
        console.log(`New password stored in localStorage key: admin-password-${adminUser.username}`)
        console.log(`You can now login with: ${adminUser.username} / ${next}`)
        
        return true
      },

      // Super Admin Functions - Only accessible by super_admin
      changeAdminPassword: async (adminUsername: string, newPassword: string) => {
        const { adminUser, adminUsers } = get()
        
        // Only super_admin can change other admin passwords
        if (!adminUser || adminUser.role !== 'super_admin') {
          console.log('Access denied: Only super_admin can change admin passwords')
          return false
        }

        // Validate password against policy
        const { validatePassword, addPasswordToHistory } = useAdminPasswordPolicy.getState()
        const validation = validatePassword(newPassword, adminUsername)
        if (!validation.valid) {
          console.log('Password does not meet policy requirements:', validation.errors)
          throw new Error(`Password does not meet requirements: ${validation.errors.join(', ')}`)
        }

        // Find the admin to change password for
        const targetAdmin = adminUsers.find(u => u.username === adminUsername)
        if (!targetAdmin) {
          console.log(`Admin ${adminUsername} not found`)
          return false
        }

        // Warning: If super admin is changing their own password via Admin Management,
        // they should use Security tab instead for better security (current password verification)
        if (adminUser.username === adminUsername) {
          console.warn(`⚠️ Super admin is changing their own password via Admin Management.`)
          console.warn(`⚠️ For better security, use Security tab which requires current password verification.`)
        }

        // Update password in localStorage for demo purposes
        // This uses the same key format as changePassword for consistency
        localStorage.setItem(`admin-password-${adminUsername}`, newPassword)
        localStorage.setItem(`admin-password-changed-${adminUsername}`, new Date().toISOString())
        console.log(`Password stored in localStorage key: admin-password-${adminUsername}`)
        
        // Add to password history
        addPasswordToHistory(adminUsername, newPassword)
        
        // Update last modified timestamp
        const updatedAdminUsers = adminUsers.map(u => 
          u.username === adminUsername 
            ? { ...u, lastModified: new Date().toISOString() }
            : u
        )
        
        // Update state
        set({
          adminUsers: updatedAdminUsers
        })

        // Ensure Zustand persist saves to localStorage immediately
        // Force persist to save by manually updating localStorage
        if (typeof window !== 'undefined') {
          try {
            // Get current persisted state
            const currentData = JSON.parse(localStorage.getItem('admin-auth-store') || '{}')
            const currentState = get()
            const updatedData = {
              ...currentData,
              state: {
                ...currentData.state,
                isLoggedIn: currentState.isLoggedIn,
                adminUser: currentState.adminUser,
                adminUsers: updatedAdminUsers
              },
              version: currentData.version || 0
            }
            localStorage.setItem('admin-auth-store', JSON.stringify(updatedData))
            
            // Verify the save was successful
            const verifyData = JSON.parse(localStorage.getItem('admin-auth-store') || '{}')
            const savedAdmin = verifyData.state?.adminUsers?.find((u: AdminUser) => u.username === adminUsername)
            if (savedAdmin?.lastModified) {
              console.log('✅ Password change saved successfully:', savedAdmin.lastModified)
            } else {
              console.warn('⚠️ Password change may not have saved correctly')
            }
            
            // Dispatch custom event to notify other components
            window.dispatchEvent(new Event('admin-auth-updated'))
          } catch (error) {
            console.error('Error saving admin auth state:', error)
          }
        }

        console.log(`Password changed for admin ${adminUsername} by super_admin ${adminUser.username}`)
        console.log('Updated adminUsers:', updatedAdminUsers.find(u => u.username === adminUsername))
        return true
      },

      updateAdminPermissions: async (adminUsername: string, permissions: string[]) => {
        const { adminUser, adminUsers } = get()
        
        // Only super_admin can update permissions
        if (!adminUser || adminUser.role !== 'super_admin') {
          console.log('Access denied: Only super_admin can update admin permissions')
          return false
        }

        // Find the admin to update
        const targetAdmin = adminUsers.find(u => u.username === adminUsername)
        if (!targetAdmin) {
          console.log(`Admin ${adminUsername} not found`)
          return false
        }

        // Update adminUsers array
        const updatedAdminUsers = adminUsers.map(u => 
          u.username === adminUsername 
            ? { ...u, permissions, lastModified: new Date().toISOString() }
            : u
        )

        // If the updated admin is the currently logged in user, update adminUser as well
        const isCurrentUser = adminUser.username === adminUsername
        const updatedAdminUser = isCurrentUser 
          ? { ...adminUser, permissions, lastModified: new Date().toISOString() }
          : adminUser

        // Update state
        set({
          adminUsers: updatedAdminUsers,
          adminUser: updatedAdminUser
        })

        // Ensure Zustand persist saves to localStorage immediately
        if (typeof window !== 'undefined') {
          try {
            // Get current persisted state
            const currentData = JSON.parse(localStorage.getItem('admin-auth-store') || '{}')
            const currentState = get()
            const updatedData = {
              ...currentData,
              state: {
                ...currentData.state,
                isLoggedIn: currentState.isLoggedIn,
                adminUser: currentState.adminUser,
                adminUsers: currentState.adminUsers
              },
              version: currentData.version || 0
            }
            localStorage.setItem('admin-auth-store', JSON.stringify(updatedData))
            console.log('✅ Permissions updated and saved to localStorage')
          } catch (error) {
            console.error('Error saving admin auth state:', error)
          }
        }

        // Dispatch custom event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-auth-updated'))
          
          // Log activity
          const { addLog, getClientIP, getUserAgent } = useAdminActivityLog.getState()
          getClientIP().then(ip => {
            addLog({
              action: 'permissions_updated',
              performedBy: adminUser.username,
              targetAdmin: adminUsername,
              ipAddress: ip,
              userAgent: getUserAgent(),
              details: {
                description: `Permissions updated for ${adminUsername}`,
                newValue: permissions
              }
            })
          })
        }

        console.log(`Permissions updated for admin ${adminUsername} by super_admin ${adminUser.username}`)
        if (isCurrentUser) {
          console.log('✅ Current logged-in admin permissions updated')
        }
        return true
      },

      toggleAdminStatus: async (adminUsername: string) => {
        const { adminUser, adminUsers } = get()
        
        // Only super_admin can toggle admin status
        if (!adminUser || adminUser.role !== 'super_admin') {
          console.log('Access denied: Only super_admin can toggle admin status')
          return false
        }

        // Prevent super_admin from deactivating themselves
        if (adminUsername === adminUser.username) {
          console.log('Super admin cannot deactivate themselves')
          return false
        }

        // Find the admin to toggle
        const targetAdmin = adminUsers.find(u => u.username === adminUsername)
        if (!targetAdmin) {
          console.log(`Admin ${adminUsername} not found`)
          return false
        }

        // Toggle status
        const updatedAdminUsers = adminUsers.map(u => 
          u.username === adminUsername 
            ? { ...u, isActive: !u.isActive, lastModified: new Date().toISOString() }
            : u
        )
        
        set({
          adminUsers: updatedAdminUsers
        })

        // Dispatch custom event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-auth-updated'))
          
          // Log activity
          const { addLog, getClientIP, getUserAgent } = useAdminActivityLog.getState()
          const newStatus = !targetAdmin.isActive
          getClientIP().then(ip => {
            addLog({
              action: 'status_toggled',
              performedBy: adminUser.username,
              targetAdmin: adminUsername,
              ipAddress: ip,
              userAgent: getUserAgent(),
              details: {
                field: 'isActive',
                oldValue: targetAdmin.isActive,
                newValue: newStatus,
                description: `Status changed to ${newStatus ? 'Active' : 'Inactive'}`
              }
            })
          })
        }

        console.log(`Status toggled for admin ${adminUsername} by super_admin ${adminUser.username}`)
        return true
      },

      createAdmin: async (username: string, password: string, role: 'admin' | 'super_admin', permissions: string[]) => {
        const { adminUser, adminUsers } = get()
        
        // Only super_admin can create new admins
        if (!adminUser || adminUser.role !== 'super_admin') {
          console.log('Access denied: Only super_admin can create new admins')
          return false
        }

        // Check if username already exists
        if (adminUsers.find(u => u.username === username)) {
          console.log(`Admin username ${username} already exists`)
          return false
        }

        // Create new admin
        const newAdmin: AdminUser = {
          username,
          role,
          permissions,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }

        // Store password in localStorage for demo purposes
        localStorage.setItem(`admin-password-${username}`, password)

        set({
          adminUsers: [...adminUsers, newAdmin]
        })

        // Dispatch custom event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-auth-updated'))
          
          // Log activity
          const { addLog, getClientIP, getUserAgent } = useAdminActivityLog.getState()
          getClientIP().then(ip => {
            addLog({
              action: 'admin_created',
              performedBy: adminUser.username,
              targetAdmin: username,
              ipAddress: ip,
              userAgent: getUserAgent(),
              details: {
                description: `New admin ${username} created with role ${role}`,
                newValue: { role, permissions }
              }
            })
          })
        }

        console.log(`New admin ${username} created by super_admin ${adminUser.username}`)
        return true
      },

      deleteAdmin: async (adminUsername: string) => {
        const { adminUser, adminUsers } = get()
        
        // Only super_admin can delete admins
        if (!adminUser || adminUser.role !== 'super_admin') {
          console.log('Access denied: Only super_admin can delete admins')
          return false
        }

        // Prevent super_admin from deleting themselves
        if (adminUsername === adminUser.username) {
          console.log('Super admin cannot delete themselves')
          return false
        }

        // Find the admin to delete
        const targetAdmin = adminUsers.find(u => u.username === adminUsername)
        if (!targetAdmin) {
          console.log(`Admin ${adminUsername} not found`)
          return false
        }

        // Remove admin
        set({
          adminUsers: adminUsers.filter(u => u.username !== adminUsername)
        })

        // Remove password from localStorage
        localStorage.removeItem(`admin-password-${adminUsername}`)

        // Dispatch custom event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-auth-updated'))
          
          // Log activity
          const { addLog, getClientIP, getUserAgent } = useAdminActivityLog.getState()
          getClientIP().then(ip => {
            addLog({
              action: 'admin_deleted',
              performedBy: adminUser.username,
              targetAdmin: adminUsername,
              ipAddress: ip,
              userAgent: getUserAgent(),
              details: {
                description: `Admin ${adminUsername} deleted`
              }
            })
          })
        }

        console.log(`Admin ${adminUsername} deleted by super_admin ${adminUser.username}`)
        return true
      },

      updateMyUsername: async (newUsername: string) => {
        const { adminUser, adminUsers } = get()
        
        if (!adminUser) {
          console.log('No admin user logged in')
          return false
        }

        const trimmed = newUsername.trim()

        // Check if new username already exists
        if (adminUsers.find(u => u.username === trimmed)) {
          console.log(`Username ${trimmed} already exists`)
          return false
        }

        // Validate username (basic validation)
        if (!trimmed || trimmed.length < 3) {
          console.log('Username must be at least 3 characters')
          return false
        }

        const oldUsername = adminUser.username

        // Supabase admin: persist display name on the auth user (re-login reads user_metadata in mapSupabaseUserToAdminUser).
        // Login is still email + password; this field is not the sign-in identifier.
        if (typeof window !== 'undefined') {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
          const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
          if (supabaseUrl && supabaseAnon) {
            try {
              const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
              const supabase = createSupabaseBrowserClient()
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user) {
                const { error } = await supabase.auth.updateUser({
                  data: {
                    display_name: trimmed,
                    username: trimmed,
                  },
                })
                if (error) {
                  console.error('[updateMyUsername] Supabase updateUser failed', error)
                  return false
                }

                const updatedAdminUser = {
                  ...adminUser,
                  username: trimmed,
                  lastModified: new Date().toISOString(),
                }
                const updatedAdminUsers = adminUsers.map(u =>
                  u.username === oldUsername
                    ? { ...u, username: trimmed, lastModified: new Date().toISOString() }
                    : u
                )

                set({
                  adminUser: updatedAdminUser,
                  adminUsers: updatedAdminUsers,
                })

                window.dispatchEvent(new Event('admin-auth-updated'))
                const { addLog, getClientIP, getUserAgent } = useAdminActivityLog.getState()
                getClientIP().then(ip => {
                  addLog({
                    action: 'username_changed',
                    performedBy: oldUsername,
                    targetAdmin: trimmed,
                    ipAddress: ip,
                    userAgent: getUserAgent(),
                    details: {
                      field: 'username',
                      oldValue: oldUsername,
                      newValue: trimmed,
                      description: `Username changed from ${oldUsername} to ${trimmed} (Supabase user_metadata)`,
                    },
                  })
                })

                console.log(`Username changed (Supabase): ${oldUsername} → ${trimmed}`)
                return true
              }
            } catch (e) {
              console.error('[updateMyUsername] Supabase error', e)
              return false
            }
          }
        }

        const oldPassword = localStorage.getItem(`admin-password-${oldUsername}`)
        
        // Determine the password to use for the new username
        // Priority: 1) stored password, 2) default password based on old username
        let passwordToStore = oldPassword
        if (!passwordToStore) {
          // If no stored password, use default password based on old username
          if (oldUsername === 'admin') {
            passwordToStore = 'selpic2024'
          } else if (oldUsername === 'superadmin') {
            passwordToStore = 'selpic2024super'
          }
        }

        // Update username in adminUsers array
        const updatedAdminUsers = adminUsers.map(u => 
          u.username === oldUsername 
            ? { ...u, username: trimmed, lastModified: new Date().toISOString() }
            : u
        )

        // Update current adminUser
        const updatedAdminUser = {
          ...adminUser,
          username: trimmed,
          lastModified: new Date().toISOString()
        }

        // Update password key in localStorage with the determined password
        if (passwordToStore) {
          localStorage.setItem(`admin-password-${trimmed}`, passwordToStore)
          console.log(`Password stored for new username: ${trimmed}`)
          // Remove old password key if it existed
          if (oldPassword) {
            localStorage.removeItem(`admin-password-${oldUsername}`)
            console.log(`Old password key removed for: ${oldUsername}`)
          } else {
            console.log(`No old password key to remove (was using default password)`)
          }
        } else {
          console.warn(`Warning: No password to store for new username ${trimmed}`)
        }

        set({
          adminUser: updatedAdminUser,
          adminUsers: updatedAdminUsers
        })

        // Dispatch custom event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-auth-updated'))
          
          // Log activity
          const { addLog, getClientIP, getUserAgent } = useAdminActivityLog.getState()
          getClientIP().then(ip => {
            addLog({
              action: 'username_changed',
              performedBy: oldUsername,
              targetAdmin: trimmed,
              ipAddress: ip,
              userAgent: getUserAgent(),
              details: {
                field: 'username',
                oldValue: oldUsername,
                newValue: trimmed,
                description: `Username changed from ${oldUsername} to ${trimmed}`
              }
            })
          })
        }

        console.log(`Username changed from ${oldUsername} to ${trimmed}`)
        console.log(`Password migrated to new username key: admin-password-${trimmed}`)
        console.log(`Local admin login uses username + password: ${trimmed}`)
        return true
      },

      updateAdminProfile: async (adminUsername: string, profileData: Partial<Pick<AdminUser, 'email' | 'phone' | 'department' | 'notes' | 'avatar'>>) => {
        const { adminUser, adminUsers } = get()
        
        // Only super_admin can update admin profiles (or admin can update their own)
        if (!adminUser) {
          console.log('Access denied: No admin user logged in')
          return false
        }

        // Admin can only update their own profile, super_admin can update any profile
        if (adminUser.role !== 'super_admin' && adminUsername !== adminUser.username) {
          console.log('Access denied: Admin can only update their own profile')
          return false
        }

        // Find the admin to update
        const targetAdmin = adminUsers.find(u => u.username === adminUsername)
        if (!targetAdmin) {
          console.log(`Admin ${adminUsername} not found`)
          return false
        }

        // Update profile data
        const updatedAdminUsers = adminUsers.map(u => 
          u.username === adminUsername 
            ? { ...u, ...profileData, lastModified: new Date().toISOString() }
            : u
        )

        // If updating current user's profile, also update adminUser
        let updatedAdminUser = adminUser
        if (adminUsername === adminUser.username) {
          updatedAdminUser = {
            ...adminUser,
            ...profileData,
            lastModified: new Date().toISOString()
          }
        }

        set({
          adminUser: updatedAdminUser,
          adminUsers: updatedAdminUsers
        })

        // Dispatch custom event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-auth-updated'))
          
          // Log activity
          const { addLog, getClientIP, getUserAgent } = useAdminActivityLog.getState()
          getClientIP().then(ip => {
            addLog({
              action: 'profile_updated',
              performedBy: adminUser.username,
              targetAdmin: adminUsername,
              ipAddress: ip,
              userAgent: getUserAgent(),
              details: {
                description: `Profile updated for ${adminUsername}`,
                newValue: profileData
              }
            })
          })
        }

        console.log(`Profile updated for admin ${adminUsername} by ${adminUser.username}`)
        return true
      }
    }),
    {
      name: 'admin-auth-store',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        adminUser: state.adminUser,
        adminUsers: state.adminUsers
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 AdminAuth rehydration complete:', {
          isLoggedIn: !!state?.isLoggedIn,
          adminUser: state?.adminUser?.username,
          adminUsersCount: state?.adminUsers?.length || 0,
          adminUsers: state?.adminUsers?.map(a => ({ username: a.username, role: a.role, isActive: a.isActive })) || []
        })
        
        // Ensure adminUsers has at least default admins if empty
        if (state && (!state.adminUsers || state.adminUsers.length === 0)) {
          console.log('⚠️ adminUsers is empty, restoring defaults')
          state.adminUsers = [
            {
              username: 'admin',
              role: 'admin',
              permissions: [
                'dashboard:read',
                'products:read',
                'products:write',
                'content:read',
                'content:write',
                'users:read',
                'analytics:read'
              ],
              isActive: true,
              createdAt: '2024-01-01T00:00:00.000Z'
            },
            {
              username: 'superadmin',
              role: 'super_admin',
              permissions: [
                'dashboard:read',
                'products:read',
                'products:write',
                'content:read',
                'content:write',
                'users:read',
                'users:write',
                'analytics:read',
                'system:admin',
                'admin:manage'
              ],
              isActive: true,
              createdAt: '2024-01-01T00:00:00.000Z'
            }
          ]
        }
      }
    }
  )
) 