'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Copy, Check, Ticket, TrendingUp, ShoppingCart } from 'lucide-react'
import Header from '@/components/Header'
import GamePromoRewardTerms from '@/components/GamePromoRewardTerms'
import { useUserAuth } from '@/lib/userAuth'
import { addMonthsToIsoDate, GAME_LEVEL_5_REWARD } from '@/lib/game-promo-constants'
import {
  getFinalLevelRewardEntries,
  loadGamePromoEntries,
  type GamePromoEntry,
} from '@/lib/game-promo-storage'

export default function PromoCodesPage() {
  const { user } = useUserAuth()
  const [codes, setCodes] = useState<GamePromoEntry[]>([])
  const [filteredCodes, setFilteredCodes] = useState<GamePromoEntry[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const entries = loadGamePromoEntries(user?.id)
    setCodes(entries)
    setIsLoaded(true)
  }, [user?.id])

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
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopiedCode(code)
          setTimeout(() => setCopiedCode(null), 2000)
        })
        .catch((e) => {
          console.warn('Failed to copy promo code:', e)
        })
    }
  }

  const totalCodes = codes.length
  const finalLevelCodes = getFinalLevelRewardEntries(codes)
  const displayCodes = searchQuery.trim() ? filteredCodes : codes

  const scores = codes.filter((c) => typeof c.score === 'number').map((c) => c.score as number)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0

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
                Game Promo Codes
              </h1>
              <p className="text-sm md:text-base text-slate-300">
                Your Tetris final-level reward codes for checkout. Saved in this browser; signing in
                on the same device merges guest rewards into your account view.
              </p>
            </div>

            <GamePromoRewardTerms />

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
                  <div className="text-2xl font-bold text-amber-300">{finalLevelCodes.length}</div>
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
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300 space-y-3">
              <p>No promo codes from the game yet.</p>
              <p>
                Play Selpic TETRIS, complete all 5 levels, then return here to copy your code for
                checkout.
              </p>
              <Link
                href="/custom-design"
                className="inline-flex items-center gap-2 text-sky-300 hover:text-sky-200 font-medium"
              >
                Go to Custom Design to play
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {displayCodes.length === 0 && searchQuery.trim() ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300 text-center">
                  No codes found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                displayCodes.map((entry, idx) => {
                  const expiresAt =
                    entry.date && entry.source === GAME_LEVEL_5_REWARD.source
                      ? addMonthsToIsoDate(entry.date, GAME_LEVEL_5_REWARD.validityMonths)
                      : null

                  return (
                    <div
                      key={`${entry.code}-${entry.date}-${idx}`}
                      className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-900/40 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-sky-500/50 transition-colors"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-xs uppercase text-sky-400 tracking-[0.2em] font-semibold">
                            {entry.source === GAME_LEVEL_5_REWARD.source
                              ? '🏆 FINAL LEVEL REWARD'
                              : '🎮 GAME REWARD'}
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
                              Issued:{' '}
                              {new Date(entry.date).toLocaleString(undefined, {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          {expiresAt && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-200 border border-amber-500/20">
                              Valid until{' '}
                              {new Date(expiresAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
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
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-stretch md:self-auto">
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
                        <Link
                          href="/checkout"
                          className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 transition-colors"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Checkout
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          <footer className="text-xs text-slate-500 pt-4 border-t border-slate-900 space-y-1">
            <p>
              Codes are stored in this browser. Use the same device and browser at checkout, or copy
              the code before switching devices.
            </p>
            {!user?.id && (
              <p>
                <Link href="/login" className="text-sky-400 hover:text-sky-300 underline">
                  Sign in
                </Link>{' '}
                after completing the game to keep guest rewards visible on this page.
              </p>
            )}
          </footer>
        </div>
      </div>
    </>
  )
}
