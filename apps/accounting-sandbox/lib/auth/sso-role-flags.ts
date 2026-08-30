import { getSSOToken, type SSOToken } from '@/lib/sso-handler'

export interface SsoRoleFlags {
  ssoToken: SSOToken | null
  isAccountingManager: boolean
  isPayrollOnly: boolean
}

export function getSsoRoleFlags(): SsoRoleFlags {
  const ssoToken = getSSOToken()
  const isAccountingManager = !!(
    ssoToken &&
    (ssoToken.role === 'super_admin' ||
      ssoToken.permissions.includes('accounting:admin') ||
      ssoToken.permissions.includes('accounting:full'))
  )
  const isPayrollOnly = !!(
    ssoToken &&
    !isAccountingManager &&
    (ssoToken.permissions.includes('payroll:read') ||
      ssoToken.permissions.includes('payroll:access'))
  )
  return { ssoToken, isAccountingManager, isPayrollOnly }
}
