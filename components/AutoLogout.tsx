'use client'

import { useEffect, useRef } from 'react'
import { useUserAuth } from '@/lib/userAuth'

export default function AutoLogout() {
  const { isLoggedIn, keepLoggedIn, checkSessionTimeout, updateActivity } = useUserAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 로그인 상태가 아니면 타이머 정리
    if (!isLoggedIn) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // 로그인 유지 설정이 있으면 자동 로그아웃 비활성화
    if (keepLoggedIn) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // 1분마다 세션 타임아웃 확인
    intervalRef.current = setInterval(() => {
      const wasLoggedOut = checkSessionTimeout()
      if (wasLoggedOut) {
        // 자동 로그아웃 시 사용자에게 알림
        alert('30분 동안 활동이 없어 자동으로 로그아웃되었습니다.')
      }
    }, 60000) // 1분마다 체크

    // 사용자 활동 감지 이벤트 리스너
    const handleUserActivity = () => {
      updateActivity()
    }

    // 다양한 사용자 활동 이벤트 리스너 추가
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true)
    })

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true)
      })
    }
  }, [isLoggedIn, keepLoggedIn, checkSessionTimeout, updateActivity])

  // 페이지가 보이지 않을 때(탭 전환, 브라우저 최소화 등) 처리
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isLoggedIn && !keepLoggedIn) {
        // 페이지가 숨겨질 때 마지막 활동 시간 업데이트
        updateActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLoggedIn, keepLoggedIn, updateActivity])

  // 페이지를 떠날 때 처리
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLoggedIn && !keepLoggedIn) {
        // 페이지를 떠날 때 마지막 활동 시간 업데이트
        updateActivity()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isLoggedIn, keepLoggedIn, updateActivity])

  return null // 이 컴포넌트는 UI를 렌더링하지 않음
} 