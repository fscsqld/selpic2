import { ADMIN_PERMISSION_CATALOG, STANDARD_STAFF_PERMISSIONS } from '@/lib/adminPermissionCatalog'

export interface PermissionPreset {
  id: string
  name: string
  description: string
  permissions: string[]
  category:
    | 'read-only'
    | 'content'
    | 'order'
    | 'customer-service'
    | 'marketing'
    | 'fundraising'
    | 'accounting'
    | 'system'
    | 'custom'
  /** Highlight in PermissionManager for one-click staff onboarding. */
  recommended?: boolean
}

export const permissionPresets: PermissionPreset[] = [
  {
    id: 'standard-staff',
    name: 'Standard staff',
    description:
      'Recommended for role admin — catalog, orders, messages, documents, personal Admin Settings, and reports. No System Management or Administrator registry.',
    category: 'custom',
    recommended: true,
    permissions: [...STANDARD_STAFF_PERMISSIONS],
  },
  {
    id: 'read-only',
    name: 'Read-only admin',
    description: 'View dashboard, catalog, orders, reports, and most modules without edit access.',
    category: 'read-only',
    permissions: [
      'dashboard:read',
      'products:read',
      'orders:read',
      'users:read',
      'messages:read',
      'analytics:read',
      'traffic:read',
      'community:read',
      'images:read',
      'invoices:read',
      'integrations:read',
      'documents:read',
      'newsletter:read',
      'bespoke:read',
      'fundraising:read',
    ],
  },
  {
    id: 'content-manager',
    name: 'Content manager',
    description: 'Manage products, CMS content, and media library.',
    category: 'content',
    permissions: [
      'dashboard:read',
      'products:read',
      'products:write',
      'content:read',
      'content:write',
      'images:read',
      'images:write',
    ],
  },
  {
    id: 'order-manager',
    name: 'Order operations',
    description: 'Process orders, integrations, invoices, and customer documents.',
    category: 'order',
    permissions: [
      'dashboard:read',
      'orders:read',
      'orders:write',
      'integrations:read',
      'integrations:write',
      'users:read',
      'messages:read',
      'messages:write',
      'invoices:read',
      'invoices:write',
      'documents:read',
      'documents:write',
    ],
  },
  {
    id: 'customer-service',
    name: 'Customer service',
    description: 'Handle messages, bespoke requests, and community moderation.',
    category: 'customer-service',
    permissions: [
      'dashboard:read',
      'users:read',
      'messages:read',
      'messages:write',
      'bespoke:read',
      'bespoke:write',
      'orders:read',
      'community:read',
      'community:moderate',
    ],
  },
  {
    id: 'user-manager',
    name: 'Customer accounts',
    description: 'View and edit registered customers and VIP grades.',
    category: 'customer-service',
    permissions: ['dashboard:read', 'users:read', 'users:write'],
  },
  {
    id: 'marketing-manager',
    name: 'Marketing & analytics',
    description: 'Sales overview, traffic, newsletter, and community publishing.',
    category: 'marketing',
    permissions: [
      'dashboard:read',
      'analytics:read',
      'traffic:read',
      'newsletter:read',
      'newsletter:write',
      'community:read',
      'community:write',
      'users:read',
    ],
  },
  {
    id: 'documents-sender',
    name: 'Document sender',
    description: 'Invoice & document sender workspace — view and email PDFs.',
    category: 'order',
    permissions: [
      'dashboard:read',
      'documents:read',
      'documents:write',
      'invoices:read',
      'invoices:write',
    ],
  },
  {
    id: 'fundraising-manager',
    name: 'Fundraising operations',
    description: 'Partner registry, change requests, documents, and settings (not payout).',
    category: 'fundraising',
    permissions: ['dashboard:read', 'fundraising:read', 'fundraising:write'],
  },
  {
    id: 'fundraising-finance',
    name: 'Fundraising finance',
    description: 'View partners plus settlement and Mark Paid on payout.',
    category: 'fundraising',
    permissions: ['dashboard:read', 'fundraising:read', 'fundraising:finance'],
  },
  {
    id: 'accounting-manager',
    name: 'Selpic A (full ledger)',
    description: 'Open Selpic A with Admin Access — full accounting, BAS, and HR & Payroll.',
    category: 'accounting',
    permissions: ['dashboard:read', 'accounting:read', 'accounting:admin'],
  },
  {
    id: 'payroll-only',
    name: 'Selpic A (payroll only)',
    description: 'See Selpic A and use Staff Access (employee login) for payslips/timesheets.',
    category: 'accounting',
    permissions: ['dashboard:read', 'payroll:access'],
  },
  {
    id: 'system-settings',
    name: 'System Management',
    description: 'Admin Settings — general, security, notifications, media, activity log, sessions.',
    category: 'system',
    permissions: ['dashboard:read', 'system:admin'],
  },
  {
    id: 'admin-registry',
    name: 'Administrator registry',
    description:
      'Administrator settings — add/remove staff emails and permissions. Prefer with role super_admin.',
    category: 'system',
    permissions: ['dashboard:read', 'admin:manage'],
  },
]

export interface PermissionDescription {
  permission: string
  name: string
  description: string
  category: string
  accessiblePages: string[]
  requires?: string[]
}

export const permissionDescriptions: Record<string, PermissionDescription> = {
  'dashboard:read': {
    permission: 'dashboard:read',
    name: 'Dashboard',
    description: 'View admin dashboard stats and quick actions.',
    category: 'Dashboard',
    accessiblePages: ['/admin/dashboard'],
  },
  'products:read': {
    permission: 'products:read',
    name: 'Products (view)',
    description: 'View product catalog and subcategory pages.',
    category: 'Product Management',
    accessiblePages: ['/admin/products'],
  },
  'products:write': {
    permission: 'products:write',
    name: 'Products (edit)',
    description: 'Create, update, and delete products.',
    category: 'Product Management',
    accessiblePages: ['/admin/products'],
    requires: ['products:read'],
  },
  'content:read': {
    permission: 'content:read',
    name: 'CMS (view)',
    description: 'View storefront CMS sections and configuration.',
    category: 'Content Management',
    accessiblePages: ['/admin/content'],
  },
  'content:write': {
    permission: 'content:write',
    name: 'CMS (edit)',
    description: 'Edit CMS content, promos, and navigation.',
    category: 'Content Management',
    accessiblePages: ['/admin/content'],
    requires: ['content:read'],
  },
  'users:read': {
    permission: 'users:read',
    name: 'Customers (view)',
    description: 'View registered customers and VIP grades.',
    category: 'User Management',
    accessiblePages: ['/admin/users', '/admin/users/grades'],
  },
  'users:write': {
    permission: 'users:write',
    name: 'Customers (edit)',
    description: 'Edit customer records and VIP grade settings.',
    category: 'User Management',
    accessiblePages: ['/admin/users', '/admin/users/grades'],
    requires: ['users:read'],
  },
  'orders:read': {
    permission: 'orders:read',
    name: 'Orders (view)',
    description: 'View orders, packing slips, and order detail.',
    category: 'Order Management',
    accessiblePages: ['/admin/orders'],
  },
  'orders:write': {
    permission: 'orders:write',
    name: 'Orders (edit)',
    description: 'Approve, update status, and edit order records.',
    category: 'Order Management',
    accessiblePages: ['/admin/orders'],
    requires: ['orders:read'],
  },
  'messages:read': {
    permission: 'messages:read',
    name: 'Messages (view)',
    description: 'View customer contact messages.',
    category: 'Message Management',
    accessiblePages: ['/admin/messages'],
  },
  'messages:write': {
    permission: 'messages:write',
    name: 'Messages (reply)',
    description: 'Reply to and resolve customer messages.',
    category: 'Message Management',
    accessiblePages: ['/admin/messages'],
    requires: ['messages:read'],
  },
  'analytics:read': {
    permission: 'analytics:read',
    name: 'Sales analytics',
    description: 'Sales overview, goals, and exports.',
    category: 'Analytics & Reports',
    accessiblePages: ['/admin/sales-overview'],
  },
  'traffic:read': {
    permission: 'traffic:read',
    name: 'Traffic & conversion',
    description: 'Marketing traffic vs orders report.',
    category: 'Analytics & Reports',
    accessiblePages: ['/admin/traffic'],
  },
  'community:read': {
    permission: 'community:read',
    name: 'Community (view)',
    description: 'View community board posts.',
    category: 'Community Management',
    accessiblePages: ['/admin/community'],
  },
  'community:write': {
    permission: 'community:write',
    name: 'Community (post)',
    description: 'Create and edit community posts.',
    category: 'Community Management',
    accessiblePages: ['/admin/community'],
    requires: ['community:read'],
  },
  'community:moderate': {
    permission: 'community:moderate',
    name: 'Community (moderate)',
    description: 'Hide, delete posts, and manage categories.',
    category: 'Community Management',
    accessiblePages: ['/admin/community'],
    requires: ['community:read'],
  },
  'images:read': {
    permission: 'images:read',
    name: 'Media library (view)',
    description: 'Browse uploaded images.',
    category: 'Image Management',
    accessiblePages: ['/admin/images'],
  },
  'images:write': {
    permission: 'images:write',
    name: 'Media library (edit)',
    description: 'Upload and delete media assets.',
    category: 'Image Management',
    accessiblePages: ['/admin/images'],
    requires: ['images:read'],
  },
  'invoices:read': {
    permission: 'invoices:read',
    name: 'Invoices (view)',
    description: 'Preview tax invoices and quotes.',
    category: 'Invoice Management',
    accessiblePages: ['/admin/invoices/preview'],
  },
  'invoices:write': {
    permission: 'invoices:write',
    name: 'Invoices (edit)',
    description: 'Edit invoice templates and send flows.',
    category: 'Invoice Management',
    accessiblePages: ['/admin/invoices/preview', '/admin/invoices/edit'],
    requires: ['invoices:read'],
  },
  'integrations:read': {
    permission: 'integrations:read',
    name: 'Integrations (view)',
    description: 'View Etsy and channel integration status.',
    category: 'Integrations',
    accessiblePages: ['/admin/integrations'],
  },
  'integrations:write': {
    permission: 'integrations:write',
    name: 'Integrations (manage)',
    description: 'Connect OAuth and run order sync.',
    category: 'Integrations',
    accessiblePages: ['/admin/integrations'],
    requires: ['integrations:read'],
  },
  'documents:read': {
    permission: 'documents:read',
    name: 'Document sender (view)',
    description: 'Open invoice & document sender workspace.',
    category: 'Documents',
    accessiblePages: ['/admin/documents'],
  },
  'documents:write': {
    permission: 'documents:write',
    name: 'Document sender (send)',
    description: 'Email PDFs and record send history.',
    category: 'Documents',
    accessiblePages: ['/admin/documents'],
    requires: ['documents:read'],
  },
  'newsletter:read': {
    permission: 'newsletter:read',
    name: 'Newsletter (view)',
    description: 'View subscribers and campaigns.',
    category: 'Newsletter',
    accessiblePages: ['/admin/newsletter'],
  },
  'newsletter:write': {
    permission: 'newsletter:write',
    name: 'Newsletter (manage)',
    description: 'Edit subscribers and send campaigns.',
    category: 'Newsletter',
    accessiblePages: ['/admin/newsletter'],
    requires: ['newsletter:read'],
  },
  'bespoke:read': {
    permission: 'bespoke:read',
    name: 'Bespoke requests (view)',
    description: 'View custom label / logo upload requests.',
    category: 'Bespoke',
    accessiblePages: ['/admin/bespoke-requests'],
  },
  'bespoke:write': {
    permission: 'bespoke:write',
    name: 'Bespoke requests (manage)',
    description: 'Update status and respond to bespoke requests.',
    category: 'Bespoke',
    accessiblePages: ['/admin/bespoke-requests'],
    requires: ['bespoke:read'],
  },
  'fundraising:read': {
    permission: 'fundraising:read',
    name: 'Fundraising (view)',
    description: 'View partner registry, reports, and documents.',
    category: 'Fundraising',
    accessiblePages: [
      '/admin/fundraising/partners',
      '/admin/fundraising/report',
      '/admin/fundraising/documents',
      '/admin/fundraising/settings',
    ],
  },
  'fundraising:write': {
    permission: 'fundraising:write',
    name: 'Fundraising (operate)',
    description: 'Approve partners, change requests, settings, and document sends.',
    category: 'Fundraising',
    accessiblePages: ['/admin/fundraising/partners', '/admin/fundraising/settings'],
    requires: ['fundraising:read'],
  },
  'fundraising:finance': {
    permission: 'fundraising:finance',
    name: 'Fundraising (payout)',
    description: 'Settlement and Mark Paid on payout.',
    category: 'Fundraising',
    accessiblePages: ['/admin/fundraising/payout'],
    requires: ['fundraising:read'],
  },
  'accounting:read': {
    permission: 'accounting:read',
    name: 'Selpic A (entry)',
    description: 'See Selpic A quick action and open the accounting app (SSO).',
    category: 'Accounting (Selpic A)',
    accessiblePages: ['Selpic A (external)'],
  },
  'accounting:admin': {
    permission: 'accounting:admin',
    name: 'Selpic A (full admin)',
    description: 'Full ledger, BAS, compliance, and HR & Payroll in Selpic A.',
    category: 'Accounting (Selpic A)',
    accessiblePages: ['Selpic A — full dashboard'],
    requires: ['accounting:read'],
  },
  'payroll:access': {
    permission: 'payroll:access',
    name: 'Selpic A (payroll only)',
    description: 'See Selpic A and open Staff Access (employee login) for payslips/timesheets — no Admin Access SSO.',
    category: 'Accounting (Selpic A)',
    accessiblePages: ['Selpic A — Staff Access (employee login)'],
  },
  'settings:personal': {
    permission: 'settings:personal',
    name: 'Admin Settings (personal)',
    description:
      'Open Admin Settings for your password, profile, notifications, and UI preferences — not store-wide system or activity log.',
    category: 'Admin Settings',
    accessiblePages: ['/admin/settings'],
  },
  'agent:read': {
    permission: 'agent:read',
    name: 'AI Agent hub',
    description:
      'Open the AI Agent hub (/admin/agent) and view sector summaries. Domain sends still need fundraising/messages/bespoke write permissions.',
    category: 'AI Agent',
    accessiblePages: ['/admin/agent'],
  },
  'agent:run': {
    permission: 'agent:run',
    name: 'AI Agent run',
    description:
      'Run cross-sector agent actions that are not covered by a domain write permission (future). Implies agent:read.',
    category: 'AI Agent',
    accessiblePages: ['/admin/agent'],
    requires: ['agent:read'],
  },
  'system:admin': {
    permission: 'system:admin',
    name: 'System Management',
    description: 'Full Admin Settings — store currency/timezone, media watermark, activity log, and sessions.',
    category: 'System Management',
    accessiblePages: ['/admin/settings'],
  },
  'admin:manage': {
    permission: 'admin:manage',
    name: 'Administrator registry',
    description: 'Manage admin emails, roles, and permissions (Administrator settings).',
    category: 'System Management',
    accessiblePages: ['/admin/administrator-settings'],
  },
}

export const permissionDependencies: Record<string, string[]> = {
  'products:write': ['products:read'],
  'orders:write': ['orders:read'],
  'users:write': ['users:read'],
  'content:write': ['content:read'],
  'messages:write': ['messages:read'],
  'community:write': ['community:read'],
  'community:moderate': ['community:read'],
  'images:write': ['images:read'],
  'invoices:write': ['invoices:read'],
  'integrations:write': ['integrations:read'],
  'documents:write': ['documents:read'],
  'newsletter:write': ['newsletter:read'],
  'bespoke:write': ['bespoke:read'],
  'fundraising:write': ['fundraising:read'],
  'fundraising:finance': ['fundraising:read'],
  'accounting:admin': ['accounting:read'],
  'agent:run': ['agent:read'],
}

export function getPermissionDescription(permission: string): PermissionDescription | undefined {
  return permissionDescriptions[permission]
}

export function getPermissionCategory(permission: string): string {
  return permissionDescriptions[permission]?.category || 'Other'
}

export function getRequiredPermissions(permission: string): string[] {
  return permissionDependencies[permission] || []
}

export function getPermissionsByCategory(category: string): string[] {
  return Object.values(permissionDescriptions)
    .filter((desc) => desc.category === category)
    .map((desc) => desc.permission)
}

export function validatePermissionDependencies(selectedPermissions: string[]): {
  isValid: boolean
  missing: Array<{ permission: string; requires: string[] }>
} {
  const missing: Array<{ permission: string; requires: string[] }> = []

  if (!selectedPermissions?.length) {
    return { isValid: true, missing: [] }
  }

  selectedPermissions.forEach((permission) => {
    getRequiredPermissions(permission).forEach((req) => {
      if (!selectedPermissions.includes(req)) {
        missing.push({ permission, requires: [req] })
      }
    })
  })

  return { isValid: missing.length === 0, missing }
}

export function autoIncludeDependencies(permissions: string[]): string[] {
  if (!permissions?.length) return []

  const result = new Set(permissions)
  permissions.forEach((permission) => {
    getRequiredPermissions(permission).forEach((req) => result.add(req))
  })
  return Array.from(result)
}

/** Re-export catalog for PermissionManager consumers. */
export { ADMIN_PERMISSION_CATALOG as availableAdminPermissions }

export const permissionCategories = [
  'All',
  'Dashboard',
  'Product Management',
  'Content Management',
  'Order Management',
  'User Management',
  'Message Management',
  'Community Management',
  'Image Management',
  'Invoice Management',
  'Analytics & Reports',
  'Integrations',
  'Documents',
  'Newsletter',
  'Bespoke',
  'Fundraising',
  'Accounting (Selpic A)',
  'Admin Settings',
  'System Management',
]
