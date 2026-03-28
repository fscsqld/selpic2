'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function TestSidebarPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative z-30">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="메뉴 열기/닫기"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">사이드바 테스트</h1>
          </div>
          
          {/* 상태 표시 */}
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded">
            Sidebar: {sidebarOpen ? 'OPEN' : 'CLOSED'}
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* 테스트 사이드바 */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r-2 border-blue-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out flex flex-col`}>
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-gray-900">테스트 메뉴</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* 메뉴 항목들 */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="p-3 bg-green-100 text-green-800 rounded">
              ✅ 사이드바가 작동합니다!
            </div>
            <a href="/admin/dashboard" className="block p-3 text-gray-700 hover:bg-gray-100 rounded">
              대시보드로 돌아가기
            </a>
            <div className="p-3 text-gray-600">
              메뉴 버튼을 클릭해서 이 사이드바가 열리고 닫히는지 확인하세요.
            </div>
          </nav>
        </aside>

        {/* 오버레이 */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
            aria-label="사이드바 닫기"
          />
        )}

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">사이드바 테스트 페이지</h2>
            <p className="mb-4">이 페이지는 사이드바 기능을 테스트하기 위한 페이지입니다.</p>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
                <h3 className="font-bold">테스트 항목:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>왼쪽 상단의 햄버거 메뉴 버튼 클릭</li>
                  <li>사이드바가 왼쪽에서 슬라이드 인되는지 확인</li>
                  <li>오버레이 클릭으로 사이드바 닫기</li>
                  <li>X 버튼으로 사이드바 닫기</li>
                </ul>
              </div>
              
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                사이드바 토글
              </button>
              
              <div className="text-sm text-gray-600">
                현재 상태: <span className="font-mono">{sidebarOpen ? 'true' : 'false'}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
