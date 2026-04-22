'use client'

import { useEffect, useState } from 'react'
import { Search, Copy, Check, Ticket, TrendingUp } from 'lucide-react'
import Header from '@/components/Header'
import { useUserAuth } from '@/lib/userAuth'

interface LocalGamePromoEntry {
  code: string
  date: string
  score?: number
  level?: number
  source?: string
}

export default function PromoCodesPage() {
  const { user } = useUserAuth()
  const [codes, setCodes] = useState<LocalGamePromoEntry[]>([])
  const [filteredCodes, setFilteredCodes] = useState<LocalGamePromoEntry[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    try {
      // 사용자별로 localStorage 키를 분리
      // 로그인한 사용자는 사용자 ID를 키에 포함, 비로그인 사용자는 'guest' 사용
      const storageKey = user?.id 
        ? `selpic-game-completed-${user.id}` 
        : 'selpic-game-completed-guest'
      
      const raw = typeof window !== 'undefined'
        ? window.localStorage.getItem(storageKey)
        : null

      if (!raw) {
        setCodes([])
        setIsLoaded(true)
        return
      }

      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // 최신 것이 위로 오도록 정렬
        const sorted = [...parsed].sort((a, b) => {
          const da = new Date(a.date || 0).getTime()
          const db = new Date(b.date || 0).getTime()
          return db - da
        })
        setCodes(sorted)
      } else {
        setCodes([])
      }
    } catch (e) {
      console.warn('Failed to parse selpic-game-completed from localStorage:', e)
      setCodes([])
    } finally {
      setIsLoaded(true)
    }
  }, [user?.id])

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCodes(codes)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = codes.filter((entry) => {
      return (
        entry.code.toLowerCase().includes(query) ||
        (entry.source && entry.source.toLowerCase().includes(query))
      )
    })
    setFilteredCodes(filtered)
  }, [codes, searchQuery])

  const copyToClipboard = (code: string) => {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code)
        .then(() => {
          setCopiedCode(code)
          setTimeout(() => setCopiedCode(null), 2000)
        })
        .catch((e) => {
          console.warn('Failed to copy promo code:', e)
        })
    }
  }

  // 통계 계산
  const totalCodes = codes.length
  const finalLevelCodes = codes.filter((c) => c.source === 'game_level_5').length
  const displayCodes = searchQuery.trim() ? filteredCodes : codes
  
  // 점수 통계
  const scores = codes.filter((c) => typeof c.score === 'number').map((c) => c.score as number)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0
  
  // 최근 발급일
  const sortedByDate = [...codes].sort((a, b) => {
    const da = new Date(a.date || 0).getTime()
    const db = new Date(b.date || 0).getTime()
    return db - da
  })
  const mostRecentDate = sortedByDate.length > 0 ? sortedByDate[0].date : null

  return (
    <>
      <Header />
      <div className="min-h-screen bg-slate-950 text-slate-50 flex justify-center px-4 py-10">
        <div className="w-full max-w-3xl space-y-6">
        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <Ticket className="w-8 h-8 text-sky-400" />
              Game Promo Code History
            </h1>
            <p className="text-sm md:text-base text-slate-300">
              View all promo codes earned from Selpic TETRIS in one place.
              (Currently stored only in this browser.)
            </p>
          </div>

          {/* 통계 카드 */}
          {codes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Total Codes
                </div>
                <div className="text-2xl font-bold text-sky-300">{totalCodes}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Ticket className="w-4 h-4" />
                  Final Level Rewards
                </div>
                <div className="text-2xl font-bold text-amber-300">{finalLevelCodes}</div>
              </div>
              {maxScore > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Best Score
                  </div>
                  <div className="text-2xl font-bold text-emerald-300">{maxScore.toLocaleString()}</div>
                  {avgScore > 0 && (
                    <div className="text-xs text-slate-500 mt-1">Avg: {avgScore.toLocaleString()}</div>
                  )}
                </div>
              )}
              {mostRecentDate && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Ticket className="w-4 h-4" />
                    Last Issued
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    {new Date(mostRecentDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 검색 바 */}
          {codes.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          )}
        </header>

        {!isLoaded ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            Loading...
          </div>
        ) : codes.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            No promo codes have been issued from the game yet.
            <br />
            Play Selpic TETRIS and complete the final level to view your codes here.
          </div>
        ) : (
          <div className="space-y-4">
            {displayCodes.length === 0 && searchQuery.trim() ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300 text-center">
                No codes found matching "{searchQuery}"
              </div>
            ) : (
              displayCodes.map((entry, idx) => (
              <div
                key={`${entry.code}-${entry.date}-${idx}`}
                className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-900/40 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-sky-500/50 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-xs uppercase text-sky-400 tracking-[0.2em] font-semibold">
                      {entry.source === 'game_level_5' ? '🏆 FINAL LEVEL REWARD' : '🎮 GAME REWARD'}
                    </div>
                    {typeof entry.level === 'number' && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Level {entry.level}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-slate-800 px-3 py-1.5 text-base font-mono font-semibold text-sky-300 shadow-sm border border-sky-500/30">
                      {entry.code}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    {entry.date && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-500">📅</span>
                        {new Date(entry.date).toLocaleString(undefined, {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    {typeof entry.score === 'number' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <span>⭐</span>
                        Score: {entry.score.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-stretch md:self-auto">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(entry.code)}
                    className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-md border border-sky-500/70 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-200 hover:bg-sky-500/20 transition-colors"
                  >
                    {copiedCode === entry.code ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>
              ))
            )}
          </div>
        )}

        <footer className="text-xs text-slate-500 pt-4 border-t border-slate-900">
          * Currently, codes are stored only in this browser (localStorage), not in your login account/server.
          In the future, when integrated with a server, you'll be able to view the same codes across multiple devices.
        </footer>
        </div>
      </div>
    </>
  )
}


