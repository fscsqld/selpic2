import type { Product } from '@/lib/types'

const seedProducts: Product[] = [
  {
    id: 'sticker-01',
    name: '커스텀 스티커 (라운드)',
    description: '원하는 텍스트로 바로 제작되는 라운드 스티커',
    price: 3900,
    tags: ['베스트', '빠른제작'],
  },
  {
    id: 'sticker-02',
    name: '커스텀 스티커 (사각)',
    description: '가장 무난한 사각 스티커, 다양한 사이즈 지원',
    price: 3500,
    tags: ['가성비'],
  },
  {
    id: 'sticker-03',
    name: '방수 스티커 (프리미엄)',
    description: '물/오염에 강한 프리미엄 코팅 스티커',
    price: 5900,
    tags: ['프리미엄'],
  },
]

export function getProducts(): Product[] {
  return seedProducts
}

