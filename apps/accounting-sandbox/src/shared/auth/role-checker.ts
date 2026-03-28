/**
 * Role Checker - API 요청에서 역할 검증
 * 
 * 홈페이지의 useAdminAuth와 연동하여 역할 정보를 검증
 */

import { NextRequest } from 'next/server'
import { UserRole, hasPermission, hasAnyPermission, hasAllPermissions } from './permissions'

/**
 * Extract user role from request headers
 * 홈페이지에서 전송된 역할 정보를 추출
 */
export function getUserRoleFromRequest(request: NextRequest): UserRole | null {
  // Option 1: From custom header (recommended)
  const roleHeader = request.headers.get('x-user-role')
  if (roleHeader && ['super_admin', 'admin', 'staff'].includes(roleHeader)) {
    return roleHeader as UserRole
  }
  
  // Option 2: From authorization token (if using JWT)
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // TODO: Decode JWT and extract role
    // For now, return null
  }
  
  return null
}

/**
 * Check if request has required permission
 */
export function checkPermission(
  request: NextRequest,
  requiredPermission: string
): { allowed: boolean; role: UserRole | null } {
  const role = getUserRoleFromRequest(request)
  if (!role) {
    return { allowed: false, role: null }
  }
  
  const allowed = hasPermission(role, requiredPermission)
  return { allowed, role }
}

/**
 * Check if request has any of the required permissions
 */
export function checkAnyPermission(
  request: NextRequest,
  requiredPermissions: string[]
): { allowed: boolean; role: UserRole | null } {
  const role = getUserRoleFromRequest(request)
  if (!role) {
    return { allowed: false, role: null }
  }
  
  const allowed = hasAnyPermission(role, requiredPermissions)
  return { allowed, role }
}

/**
 * Check if request has all required permissions
 */
export function checkAllPermissions(
  request: NextRequest,
  requiredPermissions: string[]
): { allowed: boolean; role: UserRole | null } {
  const role = getUserRoleFromRequest(request)
  if (!role) {
    return { allowed: false, role: null }
  }
  
  const allowed = hasAllPermissions(role, requiredPermissions)
  return { allowed, role }
}

/**
 * Require Super Admin role
 */
export function requireSuperAdmin(request: NextRequest): { allowed: boolean; role: UserRole | null } {
  const role = getUserRoleFromRequest(request)
  if (role !== 'super_admin') {
    return { allowed: false, role }
  }
  return { allowed: true, role }
}

/**
 * Require Admin or Super Admin role
 */
export function requireAdmin(request: NextRequest): { allowed: boolean; role: UserRole | null } {
  const role = getUserRoleFromRequest(request)
  if (role !== 'admin' && role !== 'super_admin') {
    return { allowed: false, role }
  }
  return { allowed: true, role }
}
