// Permission Presets (권한 프리셋)
export interface PermissionPreset {
  id: string
  name: string
  description: string
  permissions: string[]
  category: 'read-only' | 'content' | 'order' | 'customer-service' | 'marketing' | 'custom'
}

export const permissionPresets: PermissionPreset[] = [
  {
    id: 'read-only',
    name: '읽기 전용 관리자',
    description: '모든 데이터를 조회만 할 수 있는 권한',
    category: 'read-only',
    permissions: [
      'dashboard:read',
      'products:read',
      'orders:read',
      'users:read',
      'messages:read',
      'analytics:read',
      'community:read',
      'images:read',
      'invoices:read'
    ]
  },
  {
    id: 'content-manager',
    name: '콘텐츠 관리자',
    description: '상품 및 콘텐츠를 관리할 수 있는 권한',
    category: 'content',
    permissions: [
      'dashboard:read',
      'products:read',
      'products:write',
      'content:read',
      'content:write',
      'images:read',
      'images:write'
    ]
  },
  {
    id: 'order-manager',
    name: '주문 처리 관리자',
    description: '주문 처리 및 고객 서비스를 담당하는 권한',
    category: 'order',
    permissions: [
      'dashboard:read',
      'orders:read',
      'orders:write',
      'users:read',
      'messages:read',
      'messages:write',
      'invoices:read',
      'invoices:write'
    ]
  },
  {
    id: 'customer-service',
    name: '고객 서비스 관리자',
    description: '고객 문의 및 커뮤니티를 관리하는 권한',
    category: 'customer-service',
    permissions: [
      'dashboard:read',
      'users:read',
      'messages:read',
      'messages:write',
      'orders:read',
      'community:read',
      'community:moderate'
    ]
  },
  {
    id: 'marketing-manager',
    name: '마케팅 관리자',
    description: '마케팅 및 분석을 담당하는 권한',
    category: 'marketing',
    permissions: [
      'dashboard:read',
      'analytics:read',
      'community:read',
      'community:write',
      'users:read'
    ]
  }
]

// Permission Descriptions (권한 설명)
export interface PermissionDescription {
  permission: string
  name: string
  description: string
  category: string
  accessiblePages: string[]
  requires?: string[] // 의존성 권한
}

export const permissionDescriptions: Record<string, PermissionDescription> = {
  'dashboard:read': {
    permission: 'dashboard:read',
    name: '대시보드 조회',
    description: '대시보드 통계 및 요약 정보를 조회할 수 있습니다.',
    category: '대시보드',
    accessiblePages: ['/admin/dashboard']
  },
  'products:read': {
    permission: 'products:read',
    name: '상품 조회',
    description: '상품 목록 및 상세 정보를 조회할 수 있습니다.',
    category: '상품 관리',
    accessiblePages: ['/admin/products']
  },
  'products:write': {
    permission: 'products:write',
    name: '상품 관리',
    description: '상품을 생성, 수정, 삭제할 수 있습니다.',
    category: '상품 관리',
    accessiblePages: ['/admin/products (편집 기능)'],
    requires: ['products:read']
  },
  'content:read': {
    permission: 'content:read',
    name: '콘텐츠 조회',
    description: '콘텐츠 목록 및 상세 정보를 조회할 수 있습니다.',
    category: '콘텐츠 관리',
    accessiblePages: ['/admin/content']
  },
  'content:write': {
    permission: 'content:write',
    name: '콘텐츠 관리',
    description: '콘텐츠를 생성, 수정, 삭제할 수 있습니다.',
    category: '콘텐츠 관리',
    accessiblePages: ['/admin/content (편집 기능)'],
    requires: ['content:read']
  },
  'users:read': {
    permission: 'users:read',
    name: '사용자 조회',
    description: '사용자 목록 및 상세 정보를 조회할 수 있습니다.',
    category: '사용자 관리',
    accessiblePages: ['/admin/users', '/admin/users/grades', '/admin/newsletter']
  },
  'users:write': {
    permission: 'users:write',
    name: '사용자 관리',
    description: '사용자를 생성, 수정, 삭제하고 VIP 등급을 수정할 수 있습니다.',
    category: '사용자 관리',
    accessiblePages: ['/admin/users (편집 기능)', '/admin/users/grades (편집 기능)'],
    requires: ['users:read']
  },
  'orders:read': {
    permission: 'orders:read',
    name: '주문 조회',
    description: '주문 목록 및 상세 정보를 조회하고 패킹 슬립을 인쇄할 수 있습니다.',
    category: '주문 관리',
    accessiblePages: ['/admin/orders']
  },
  'orders:write': {
    permission: 'orders:write',
    name: '주문 관리',
    description: '주문 상태를 변경하고 주문 정보를 수정할 수 있습니다.',
    category: '주문 관리',
    accessiblePages: ['/admin/orders (상태 변경, 수정 기능)'],
    requires: ['orders:read']
  },
  'messages:read': {
    permission: 'messages:read',
    name: '메시지 조회',
    description: '고객 메시지를 조회할 수 있습니다.',
    category: '메시지 관리',
    accessiblePages: ['/admin/messages']
  },
  'messages:write': {
    permission: 'messages:write',
    name: '메시지 관리',
    description: '고객 메시지에 답변하고 상태를 변경할 수 있습니다.',
    category: '메시지 관리',
    accessiblePages: ['/admin/messages (답변 기능)'],
    requires: ['messages:read']
  },
  'analytics:read': {
    permission: 'analytics:read',
    name: '분석 조회',
    description: '매출 분석 및 리포트를 조회하고 데이터를 내보낼 수 있습니다.',
    category: '분석/리포트',
    accessiblePages: ['/admin/sales-overview']
  },
  'community:read': {
    permission: 'community:read',
    name: '커뮤니티 조회',
    description: '커뮤니티 게시글을 조회할 수 있습니다.',
    category: '커뮤니티 관리',
    accessiblePages: ['/admin/community']
  },
  'community:write': {
    permission: 'community:write',
    name: '커뮤니티 작성',
    description: '커뮤니티에 게시글을 작성하고 수정할 수 있습니다.',
    category: '커뮤니티 관리',
    accessiblePages: ['/admin/community (작성 기능)'],
    requires: ['community:read']
  },
  'community:moderate': {
    permission: 'community:moderate',
    name: '커뮤니티 관리',
    description: '커뮤니티 게시글을 삭제, 숨김 처리하고 카테고리를 관리할 수 있습니다.',
    category: '커뮤니티 관리',
    accessiblePages: ['/admin/community (관리 기능)'],
    requires: ['community:read']
  },
  'images:read': {
    permission: 'images:read',
    name: '이미지 조회',
    description: '이미지 목록을 조회할 수 있습니다.',
    category: '이미지 관리',
    accessiblePages: ['/admin/images']
  },
  'images:write': {
    permission: 'images:write',
    name: '이미지 관리',
    description: '이미지를 업로드하고 삭제할 수 있습니다.',
    category: '이미지 관리',
    accessiblePages: ['/admin/images (업로드 기능)'],
    requires: ['images:read']
  },
  'invoices:read': {
    permission: 'invoices:read',
    name: '인보이스 조회',
    description: '인보이스를 조회하고 미리볼 수 있습니다.',
    category: '인보이스 관리',
    accessiblePages: ['/admin/invoices/preview']
  },
  'invoices:write': {
    permission: 'invoices:write',
    name: '인보이스 관리',
    description: '인보이스를 생성, 수정, 삭제할 수 있습니다.',
    category: '인보이스 관리',
    accessiblePages: ['/admin/invoices/preview (편집 기능)'],
    requires: ['invoices:read']
  },
  'system:admin': {
    permission: 'system:admin',
    name: '시스템 관리',
    description: '시스템 설정에 접근할 수 있습니다. (General Settings, Security, Notifications)',
    category: '시스템 관리',
    accessiblePages: ['/admin/settings']
  },
  'admin:manage': {
    permission: 'admin:manage',
    name: '관리자 계정 관리',
    description: '다른 관리자 계정을 생성, 수정, 삭제할 수 있습니다. (슈퍼 관리자 전용)',
    category: '시스템 관리',
    accessiblePages: ['/admin/settings (Admin Management 탭)']
  }
}

// Permission Dependencies (권한 의존성)
export const permissionDependencies: Record<string, string[]> = {
  'products:write': ['products:read'],
  'orders:write': ['orders:read'],
  'users:write': ['users:read'],
  'content:write': ['content:read'],
  'messages:write': ['messages:read'],
  'community:write': ['community:read'],
  'community:moderate': ['community:read'],
  'images:write': ['images:read'],
  'invoices:write': ['invoices:read']
}

// Helper Functions
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
    .filter(desc => desc.category === category)
    .map(desc => desc.permission)
}

export function validatePermissionDependencies(selectedPermissions: string[]): {
  isValid: boolean
  missing: Array<{ permission: string; requires: string[] }>
} {
  const missing: Array<{ permission: string; requires: string[] }> = []
  
  if (!selectedPermissions || selectedPermissions.length === 0) {
    return {
      isValid: true,
      missing: []
    }
  }
  
  selectedPermissions.forEach(permission => {
    const required = getRequiredPermissions(permission)
    required.forEach(req => {
      if (!selectedPermissions.includes(req)) {
        missing.push({ permission, requires: [req] })
      }
    })
  })
  
  return {
    isValid: missing.length === 0,
    missing
  }
}

export function autoIncludeDependencies(permissions: string[]): string[] {
  if (!permissions || permissions.length === 0) {
    return []
  }
  
  const result = new Set(permissions)
  
  permissions.forEach(permission => {
    const required = getRequiredPermissions(permission)
    required.forEach(req => result.add(req))
  })
  
  return Array.from(result)
}

// Permission Categories for Filtering
export const permissionCategories = [
  'All',
  'Dashboard',
  'Product Management',
  'Order Management',
  'User Management',
  'Message Management',
  'Community Management',
  'Image Management',
  'Invoice Management',
  'Analytics/Reports',
  'System Management'
]

