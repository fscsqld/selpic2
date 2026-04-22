'use client'

import { Suspense, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Home } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

function TetrisGameContent() {
  const searchParams = useSearchParams()
  const promoBannerRef = useRef<HTMLDivElement>(null)
  
  // URL 파라미터를 iframe src에 전달
  const en = searchParams.get('en') || ''
  const ko = searchParams.get('ko') || ''
  const mat = searchParams.get('mat') || ''
  const userId = searchParams.get('userId') || 'guest'
  
  // iframe src에 파라미터 추가
  let iframeSrc = '/custom-game/index.html'
  const params = new URLSearchParams()
  if (en) params.set('en', en)
  if (ko) params.set('ko', ko)
  if (mat) params.set('mat', mat)
  params.set('userId', userId) // 사용자 ID는 항상 전달
  
  if (params.toString()) {
    iframeSrc += '?' + params.toString()
  }

  // 배너 애니메이션 로직
  useEffect(() => {
    const banner = promoBannerRef.current
    if (!banner) return

    const company = banner.querySelector('.promo-company') as HTMLElement | null
    if (!company) return
    
    function startAnimation() {
      if (!banner) return
      const words = banner.querySelectorAll('.promo-word')
      const sequence = banner.querySelector('.promo-sequence') as HTMLElement
      
      if (words.length === 0 || !sequence) return
      
      // 안전장치: 배너 너비가 0이면 재시도
      const bannerWidth = banner.offsetWidth
      const sequenceWidth = sequence.offsetWidth
      
      if (bannerWidth === 0 || sequenceWidth === 0) {
        // 너비가 아직 계산되지 않았으면 다음 프레임에서 재시도
        requestAnimationFrame(() => {
          setTimeout(() => {
            startAnimation()
          }, 50)
        })
        return
      }
      
      // 모든 단어 표시 (개별 애니메이션 없이)
      words.forEach((word) => {
        const el = word as HTMLElement
        el.style.opacity = '1'
        el.style.transition = 'none'
        el.style.animation = 'none'
        el.style.transform = 'none'
        el.classList.remove('active')
      })
      
      // 시퀀스 초기화 (헤더 오른쪽에서 시작)
      // 배너 컨테이너의 너비를 기준으로 헤더 오른쪽 끝에서 시작
      // 헤더 오른쪽 끝에서 시작 (배너 너비 - 시퀀스 너비)
      const startX = bannerWidth - sequenceWidth
      // 헤더 왼쪽 끝까지 이동 (0으로 이동)
      const endX = 0
      
      // 절대 위치에서 translateY와 translateX를 함께 사용
      sequence.style.transform = `translateY(-50%) translateX(${startX}px)` // 헤더 오른쪽 끝에서 시작
      sequence.style.opacity = '1'
      sequence.style.justifyContent = 'flex-start'
      sequence.classList.remove('active')
      
      if (company) {
        company.style.opacity = '0'
        company.style.transform = 'translate(-50%, -50%) scale(0)'
        company.style.animation = 'none'
        company.classList.remove('stamp-in')
      }
      
      // 전체 문구를 천천히 오른쪽에서 왼쪽으로 슬라이딩
      // CSS 변수를 사용하여 동적으로 애니메이션 설정
      sequence.style.setProperty('--start-x', `${startX}px`)
      sequence.style.setProperty('--mid-x', `${startX / 2}px`)
      sequence.style.setProperty('--end-x', `${endX}px`)
      
      setTimeout(() => {
        sequence.classList.add('active')
      }, 100)
      
      // 왼쪽에 도착한 후 (약 8초, 천천히 이동) 정지
      setTimeout(() => {
        sequence.classList.remove('active')
        // 사라지지 않고 정지 상태 유지
      }, 8000) // 8초 이동 완료
      
      // 정지 후 0.5초 후 SELPIC 등장
      setTimeout(() => {
        if (company) {
          company.style.opacity = '0'
          company.style.transform = 'translate(-50%, -50%) scale(0)'
          company.style.animation = 'none'
          
          setTimeout(() => {
            company.style.animation = ''
            company.classList.add('stamp-in')
            company.style.opacity = '1'
          }, 10)
        }
      }, 8500) // 8초 + 0.5초
      
      // SELPIC 등장 후 텍스트와 함께 깜빡이는 효과 시작
      setTimeout(() => {
        sequence.classList.add('paused') // 텍스트 깜빡임 시작
        if (company) {
          company.classList.add('paused') // SELPIC 깜빡임 시작
        }
      }, 8500) // SELPIC 등장과 동시에
      
      // 5초 후 함께 사라짐 (약 13.5초)
      setTimeout(() => {
        sequence.classList.remove('paused')
        sequence.style.transition = 'opacity 0.5s ease-out'
        sequence.style.opacity = '0'
        
        if (company) {
          company.classList.remove('paused')
          company.style.transition = 'opacity 0.5s ease-out'
          company.style.opacity = '0'
        }
        
        // 모든 요소 리셋 후 재시작
        setTimeout(() => {
          words.forEach((word) => {
            const el = word as HTMLElement
            el.style.opacity = '1'
            el.style.transition = 'none'
            el.style.animation = 'none'
            el.style.transform = 'none'
            el.classList.remove('active')
          })
          if (company) {
            company.classList.remove('stamp-in')
            company.classList.remove('paused')
            company.style.opacity = '0'
            company.style.transition = 'none'
            company.style.animation = 'none'
          }
          sequence.style.transition = 'none'
          sequence.style.opacity = '0'
          sequence.classList.remove('paused')
          
          // 안전장치: 재시작 시에도 너비 확인
          const bannerWidth = banner.offsetWidth
          const sequenceWidth = sequence.offsetWidth
          
          if (bannerWidth === 0 || sequenceWidth === 0) {
            // 너비가 아직 계산되지 않았으면 재시도
            requestAnimationFrame(() => {
              setTimeout(() => {
                startAnimation()
              }, 50)
            })
            return
          }
          
          const startX = bannerWidth - sequenceWidth
          const endX = 0
          sequence.style.transform = `translateY(-50%) translateX(${startX}px)` // 헤더 오른쪽 끝에서 시작
          sequence.style.setProperty('--start-x', `${startX}px`)
          sequence.style.setProperty('--mid-x', `${startX / 2}px`)
          sequence.style.setProperty('--end-x', `${endX}px`)
          sequence.classList.remove('active')
          
          // 애니메이션 재시작
          setTimeout(() => {
            startAnimation()
          }, 100)
        }, 500)
      }, 13500) // 8.5초 + 5초
    }
    
    // 애니메이션 시작
    startAnimation()
  }, [])
  
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Compact header for game page only */}
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-30 h-[30px]">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-3 h-full">
          {/* Promo Banner */}
          <div ref={promoBannerRef} className="flex-1 flex items-center justify-end relative h-full overflow-visible">
            <div className="promo-sequence flex items-center justify-end gap-2">
              <span className="promo-word roll-in">Stick</span>
              <span className="promo-word roll-in">it</span>
              <span className="promo-word roll-in">stamp</span>
              <span className="promo-word roll-in">it</span>
              <span className="promo-word roll-in highlight-text">you little ripper!</span>
            </div>
            <div className="promo-company absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="promo-text">Selpic</span>
            </div>
          </div>
          
          <Link 
            href="/" 
            className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-xs flex-shrink-0"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </header>
      <div className="w-full" style={{ height: 'calc(100vh - 40px)' }}>
        <iframe
          src={iframeSrc}
          className="w-full h-full border-0"
          title="Selpic TETRIS"
          allow="autoplay"
          style={{ display: 'block' }}
        />
      </div>
      {/* Bottom section - minimal height to maximize game area */}
      <div className="bg-slate-900 border-t border-slate-700 h-[10px]">
        {/* Empty space for future content */}
      </div>
    </div>
  )
}

export default function TetrisGamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading game...</div>}>
      <TetrisGameContent />
    </Suspense>
  )
}

