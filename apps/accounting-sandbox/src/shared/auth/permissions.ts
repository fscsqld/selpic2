/**
 * Role-Based Permissions System
 * 
 * 홈페이지의 기존 계정 시스템(Super Admin / Admin / Staff)과 연동
 */

export type UserRole = 'super_admin' | 'admin' | 'staff'

export interface Permission {
  resource: string
  action: string
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    // Accounting
    'accounting:read',
    'accounting:write',
    'accounting:delete',
    
    // Payroll
    'payroll:read',
    'payroll:write',
    'payroll:approve',
    'payroll:delete',
    
    // Orders
    'orders:read',
    'orders:write',
    'orders:approve',
    'orders:delete',
    
    // Transactions
    'transactions:view_all',
    'transactions:edit_all',
    'transactions:delete',
    
    // Reports
    'reports:view_all',
    'reports:export',
    
    // System
    'system:admin',
    'admin:manage',
  ],
  
  admin: [
    // Accounting
    'accounting:read',
    'accounting:write',
    
    // Orders
    'orders:read',
    'orders:write',
    'orders:approve',
    
    // Transactions
    'transactions:view_limited',
    'transactions:edit_limited',
    
    // Reports
    'reports:view_limited',
    'reports:export',
  ],
  
  staff: [
    // Personal
    'timesheet:view_own',
    'timesheet:edit_own',
    'payslip:view_own',
  ],
}

/**
 * Check if user has permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || []
  return permissions.includes(permission)
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(userRole: UserRole, requiredPermissions: string[]): boolean {
  return requiredPermissions.some(permission => hasPermission(userRole, permission))
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(userRole: UserRole, requiredPermissions: string[]): boolean {
  return requiredPermissions.every(permission => hasPermission(userRole, permission))
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || []
}
