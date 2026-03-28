# SELPIC-X 구현 가이드

> ⚠️ **중요**: 이 문서는 **SELPIC-X 구상 단계의 구현 가이드**입니다.
> - 현재 홈페이지 개발과 **완전히 별개**로 관리됩니다
> - 아직 구현 단계가 아닙니다
> - 기존 홈페이지 개발에 **전혀 영향을 주지 않습니다**
> - 나중에 통합 예정이므로 현재는 **학습 및 구상만** 진행합니다
> - 아래 코드는 **참고용 예제**이며, 실제 구현은 나중에 진행됩니다

## 🚀 빠른 시작 (참고용)

### 1. 데이터베이스 스키마 생성

```sql
-- 디자인 테이블
CREATE TABLE designs (
  id VARCHAR(255) PRIMARY KEY,
  designer_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(100),
  
  -- 디자인 파일 (JSON)
  design_files JSONB NOT NULL,
  
  -- 커스터마이징 옵션 (JSON)
  customization_options JSONB,
  
  -- 가격 정보 (JSON)
  pricing JSONB NOT NULL,
  
  -- 상태
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT,
  
  -- 통계 (JSON)
  stats JSONB DEFAULT '{"views": 0, "likes": 0, "sales": 0, "revenue": 0}',
  
  -- 메타데이터
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  published_at TIMESTAMP,
  
  FOREIGN KEY (designer_id) REFERENCES designer_profiles(designer_id)
);

-- 디자이너 프로필 테이블
CREATE TABLE designer_profiles (
  designer_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  
  display_name VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar VARCHAR(500),
  portfolio JSONB,
  
  tier VARCHAR(50) DEFAULT 'new',
  revenue_rate DECIMAL(5,4) DEFAULT 0.25,
  
  -- 통계 (JSON)
  stats JSONB DEFAULT '{"totalDesigns": 0, "activeDesigns": 0, "totalSales": 0, "totalRevenue": 0, "averageRating": 0, "totalRatings": 0}',
  
  -- 결제 정보 (JSON)
  payout_settings JSONB,
  
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 마켓플레이스 상품 테이블
CREATE TABLE marketplace_products (
  id VARCHAR(255) PRIMARY KEY,
  design_id VARCHAR(255) NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  images JSONB NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount DECIMAL(10,2),
  
  in_stock BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER,
  
  -- 통계 (JSON)
  stats JSONB DEFAULT '{"sales": 0, "views": 0, "rating": 0, "reviews": 0}',
  
  status VARCHAR(50) DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (design_id) REFERENCES designs(id)
);

-- 커스텀 주문 테이블
CREATE TABLE custom_orders (
  id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  
  design_id VARCHAR(255) NOT NULL,
  designer_id VARCHAR(255) NOT NULL,
  
  -- 커스터마이징 데이터 (JSON)
  customization JSONB,
  
  -- 제작 정보 (JSON)
  production JSONB DEFAULT '{"status": "pending"}',
  
  -- 수익 배분 (JSON)
  revenue JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (design_id) REFERENCES designs(id),
  FOREIGN KEY (designer_id) REFERENCES designer_profiles(designer_id)
);

-- 수익 배분 기록 테이블
CREATE TABLE revenue_shares (
  id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  custom_order_id VARCHAR(255) NOT NULL,
  design_id VARCHAR(255) NOT NULL,
  designer_id VARCHAR(255) NOT NULL,
  
  total_revenue DECIMAL(10,2) NOT NULL,
  production_cost DECIMAL(10,2) NOT NULL,
  platform_revenue DECIMAL(10,2) NOT NULL,
  designer_revenue DECIMAL(10,2) NOT NULL,
  
  status VARCHAR(50) DEFAULT 'pending',
  
  -- 지급 정보 (JSON)
  payout JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  
  FOREIGN KEY (design_id) REFERENCES designs(id),
  FOREIGN KEY (designer_id) REFERENCES designer_profiles(designer_id)
);

-- 인덱스 생성
CREATE INDEX idx_designs_designer_id ON designs(designer_id);
CREATE INDEX idx_designs_status ON designs(status);
CREATE INDEX idx_designs_category ON designs(category);
CREATE INDEX idx_marketplace_products_design_id ON marketplace_products(design_id);
CREATE INDEX idx_custom_orders_order_id ON custom_orders(order_id);
CREATE INDEX idx_revenue_shares_designer_id ON revenue_shares(designer_id);
CREATE INDEX idx_revenue_shares_status ON revenue_shares(status);
```

### 2. TypeScript 타입 정의

`lib/types/production-platform.ts` 파일 생성:

```typescript
export interface Design {
  id: string
  designerId: string
  title: string
  description: string
  category: 'sticker' | 'stamp' | 'bundle'
  subcategory?: string
  
  designFiles: {
    original: string
    preview: string
    thumbnail: string
    formats?: {
      png?: string
      svg?: string
      pdf?: string
    }
  }
  
  customizationOptions: {
    allowTextEdit: boolean
    allowColorChange: boolean
    allowSizeChange: boolean
    editableFields: string[]
  }
  
  pricing: {
    basePrice: number
    designerRevenueRate: number
    platformRevenueRate: number
    productionCost: number
  }
  
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'
  rejectionReason?: string
  
  stats: {
    views: number
    likes: number
    sales: number
    revenue: number
  }
  
  tags: string[]
  createdAt: Date
  updatedAt: Date
  approvedAt?: Date
  publishedAt?: Date
}

export interface DesignerProfile {
  userId: string
  designerId: string
  displayName: string
  bio?: string
  avatar?: string
  portfolio?: string[]
  tier: 'new' | 'popular' | 'vip'
  revenueRate: number
  stats: {
    totalDesigns: number
    activeDesigns: number
    totalSales: number
    totalRevenue: number
    averageRating: number
    totalRatings: number
  }
  payoutSettings: {
    method: 'bank' | 'paypal' | 'stripe'
    accountInfo: Record<string, any>
    minimumPayout: number
  }
  isVerified: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MarketplaceProduct {
  id: string
  designId: string
  name: string
  description: string
  images: string[]
  category: string
  subcategory?: string
  price: number
  originalPrice?: number
  discount?: number
  inStock: boolean
  stockQuantity?: number
  stats: {
    sales: number
    views: number
    rating: number
    reviews: number
  }
  status: 'active' | 'inactive' | 'out_of_stock'
  createdAt: Date
  updatedAt: Date
}

export interface CustomOrder {
  id: string
  orderId: string
  designId: string
  designerId: string
  customization: {
    text?: string
    color?: string
    font?: string
    size?: string
    position?: { x: number; y: number }
    customImage?: string
  }
  production: {
    status: 'pending' | 'approved' | 'in_production' | 'completed' | 'shipped' | 'delivered' | 'cancelled'
    manufacturerId?: string
    estimatedCompletion?: Date
    actualCompletion?: Date
    trackingNumber?: string
  }
  revenue: {
    totalPrice: number
    productionCost: number
    platformRevenue: number
    designerRevenue: number
    payoutStatus: 'pending' | 'processing' | 'paid' | 'failed'
    payoutDate?: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface RevenueShare {
  id: string
  orderId: string
  customOrderId: string
  designId: string
  designerId: string
  totalRevenue: number
  productionCost: number
  platformRevenue: number
  designerRevenue: number
  status: 'pending' | 'calculated' | 'paid' | 'failed'
  payout: {
    method: 'bank' | 'paypal' | 'stripe'
    transactionId?: string
    paidAt?: Date
    failureReason?: string
  }
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
}
```

### 3. Zustand Store 생성

`lib/productionPlatformStore.ts` 파일 생성:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Design, DesignerProfile, MarketplaceProduct, CustomOrder, RevenueShare } from './types/production-platform'

interface ProductionPlatformStore {
  // 디자인
  designs: Design[]
  addDesign: (design: Design) => void
  updateDesign: (id: string, updates: Partial<Design>) => void
  deleteDesign: (id: string) => void
  getDesignsByDesigner: (designerId: string) => Design[]
  
  // 디자이너 프로필
  designerProfiles: DesignerProfile[]
  getDesignerProfile: (userId: string) => DesignerProfile | undefined
  updateDesignerProfile: (userId: string, updates: Partial<DesignerProfile>) => void
  
  // 마켓플레이스 상품
  marketplaceProducts: MarketplaceProduct[]
  getMarketplaceProducts: (filters?: {
    category?: string
    status?: string
    sort?: string
  }) => MarketplaceProduct[]
  
  // 커스텀 주문
  customOrders: CustomOrder[]
  addCustomOrder: (order: CustomOrder) => void
  updateCustomOrder: (id: string, updates: Partial<CustomOrder>) => void
  
  // 수익 배분
  revenueShares: RevenueShare[]
  calculateRevenueShare: (orderId: string, customOrderId: string) => RevenueShare
  getRevenueByDesigner: (designerId: string) => number
}

export const useProductionPlatformStore = create<ProductionPlatformStore>()(
  persist(
    (set, get) => ({
      designs: [],
      designerProfiles: [],
      marketplaceProducts: [],
      customOrders: [],
      revenueShares: [],
      
      addDesign: (design) => set((state) => ({
        designs: [...state.designs, design]
      })),
      
      updateDesign: (id, updates) => set((state) => ({
        designs: state.designs.map(d => d.id === id ? { ...d, ...updates } : d)
      })),
      
      deleteDesign: (id) => set((state) => ({
        designs: state.designs.filter(d => d.id !== id)
      })),
      
      getDesignsByDesigner: (designerId) => {
        return get().designs.filter(d => d.designerId === designerId)
      },
      
      getDesignerProfile: (userId) => {
        return get().designerProfiles.find(p => p.userId === userId)
      },
      
      updateDesignerProfile: (userId, updates) => set((state) => ({
        designerProfiles: state.designerProfiles.map(p => 
          p.userId === userId ? { ...p, ...updates } : p
        )
      })),
      
      getMarketplaceProducts: (filters = {}) => {
        let products = [...get().marketplaceProducts]
        
        if (filters.category) {
          products = products.filter(p => p.category === filters.category)
        }
        
        if (filters.status) {
          products = products.filter(p => p.status === filters.status)
        }
        
        if (filters.sort === 'popular') {
          products.sort((a, b) => b.stats.sales - a.stats.sales)
        } else if (filters.sort === 'newest') {
          products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        }
        
        return products
      },
      
      addCustomOrder: (order) => set((state) => ({
        customOrders: [...state.customOrders, order]
      })),
      
      updateCustomOrder: (id, updates) => set((state) => ({
        customOrders: state.customOrders.map(o => o.id === id ? { ...o, ...updates } : o)
      })),
      
      calculateRevenueShare: (orderId, customOrderId) => {
        const customOrder = get().customOrders.find(o => o.id === customOrderId)
        if (!customOrder) throw new Error('Custom order not found')
        
        const design = get().designs.find(d => d.id === customOrder.designId)
        if (!design) throw new Error('Design not found')
        
        const totalPrice = customOrder.revenue.totalPrice
        const productionCost = design.pricing.productionCost
        const designerRevenueRate = design.pricing.designerRevenueRate
        
        const designerRevenue = totalPrice * designerRevenueRate
        const platformRevenue = totalPrice - productionCost - designerRevenue
        
        const revenueShare: RevenueShare = {
          id: `revenue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          customOrderId,
          designId: design.id,
          designerId: customOrder.designerId,
          totalRevenue: totalPrice,
          productionCost,
          platformRevenue,
          designerRevenue,
          status: 'calculated',
          payout: {
            method: 'bank'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        set((state) => ({
          revenueShares: [...state.revenueShares, revenueShare]
        }))
        
        return revenueShare
      },
      
      getRevenueByDesigner: (designerId) => {
        return get().revenueShares
          .filter(r => r.designerId === designerId && r.status === 'paid')
          .reduce((sum, r) => sum + r.designerRevenue, 0)
      }
    }),
    {
      name: 'production-platform-store'
    }
  )
)
```

### 4. API Routes 예제

`app/api/designs/route.ts` 파일 생성:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Design } from '@/lib/types/production-platform'

// 디자인 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const designerId = searchParams.get('designerId')
    
    // 데이터베이스에서 조회 (예시)
    // const designs = await db.query('SELECT * FROM designs WHERE ...')
    
    // 임시 데이터
    const designs: Design[] = []
    
    return NextResponse.json({ designs })
  } catch (error) {
    console.error('Error fetching designs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch designs' },
      { status: 500 }
    )
  }
}

// 디자인 업로드
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const files = formData.getAll('files') as File[]
    
    // 파일 업로드 처리 (S3 등)
    // const uploadedFiles = await uploadToS3(files)
    
    // 디자인 생성
    const design: Design = {
      id: `design-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      designerId: 'designer-123', // 실제로는 인증된 사용자 ID
      title,
      description,
      category: category as 'sticker' | 'stamp' | 'bundle',
      designFiles: {
        original: '', // 업로드된 파일 URL
        preview: '',
        thumbnail: ''
      },
      customizationOptions: {
        allowTextEdit: true,
        allowColorChange: true,
        allowSizeChange: true,
        editableFields: ['text', 'color', 'font']
      },
      pricing: {
        basePrice: 20.00,
        designerRevenueRate: 0.25,
        platformRevenueRate: 0.35,
        productionCost: 8.00
      },
      status: 'pending',
      stats: {
        views: 0,
        likes: 0,
        sales: 0,
        revenue: 0
      },
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 데이터베이스에 저장
    // await db.query('INSERT INTO designs ...', [design])
    
    return NextResponse.json({ design }, { status: 201 })
  } catch (error) {
    console.error('Error creating design:', error)
    return NextResponse.json(
      { error: 'Failed to create design' },
      { status: 500 }
    )
  }
}
```

### 5. 디자이너 대시보드 페이지

`app/designer/dashboard/page.tsx` 파일 생성:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useProductionPlatformStore } from '@/lib/productionPlatformStore'
import { Design } from '@/lib/types/production-platform'
import { Plus, Upload, Eye, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function DesignerDashboard() {
  const { designs, getDesignsByDesigner } = useProductionPlatformStore()
  const [myDesigns, setMyDesigns] = useState<Design[]>([])
  const [stats, setStats] = useState({
    totalDesigns: 0,
    activeDesigns: 0,
    totalSales: 0,
    totalRevenue: 0
  })
  
  useEffect(() => {
    // 실제로는 인증된 사용자 ID 사용
    const designerId = 'designer-123'
    const designs = getDesignsByDesigner(designerId)
    setMyDesigns(designs)
    
    setStats({
      totalDesigns: designs.length,
      activeDesigns: designs.filter(d => d.status === 'active').length,
      totalSales: designs.reduce((sum, d) => sum + d.stats.sales, 0),
      totalRevenue: designs.reduce((sum, d) => sum + d.stats.revenue, 0)
    })
  }, [designs, getDesignsByDesigner])
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">디자이너 대시보드</h1>
          <p className="text-gray-600 mt-2">내 디자인을 관리하고 수익을 확인하세요</p>
        </div>
        
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 디자인</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDesigns}</p>
              </div>
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 디자인</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeDesigns}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 판매</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalSales}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 수익</p>
                <p className="text-2xl font-bold text-indigo-600">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>
        
        {/* 액션 버튼 */}
        <div className="mb-6">
          <Link
            href="/designer/upload"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            새 디자인 업로드
          </Link>
        </div>
        
        {/* 디자인 목록 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">내 디자인</h2>
          </div>
          
          {myDesigns.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">아직 업로드한 디자인이 없습니다.</p>
              <Link
                href="/designer/upload"
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                첫 디자인 업로드하기 →
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myDesigns.map((design) => (
                  <div key={design.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-gray-100 relative">
                      <img
                        src={design.designFiles.thumbnail || design.designFiles.preview}
                        alt={design.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          design.status === 'active' ? 'bg-green-100 text-green-800' :
                          design.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          design.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {design.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{design.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{design.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">판매: {design.stats.sales}</span>
                        <span className="font-semibold text-blue-600">${design.stats.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 📝 다음 단계

1. **데이터베이스 연결 설정**
   - PostgreSQL 클라이언트 설정
   - 연결 풀 구성

2. **파일 업로드 시스템 구축**
   - AWS S3 또는 Cloudflare R2 설정
   - 이미지 최적화 및 썸네일 생성

3. **인증 시스템 연동**
   - 기존 사용자 시스템과 연동
   - 디자이너 등록 프로세스

4. **주문 시스템 통합**
   - 기존 주문 시스템과 커스텀 주문 연결
   - 수익 배분 자동 계산

5. **제작 업체 연동**
   - API 연동 또는 Webhook 설정
   - 주문 전송 및 상태 동기화

---

**작성일**: 2024년
**버전**: 1.0

