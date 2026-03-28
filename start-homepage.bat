@echo off
echo ========================================
echo      SELPIC 홈페이지 자동 실행 스크립트
echo ========================================
echo.

echo [1/4] 기존 프로세스 종료 중...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ 기존 Node.js 프로세스가 종료되었습니다.
) else (
    echo ⚠️  실행 중인 Node.js 프로세스가 없습니다.
)
echo.

echo [2/4] 캐시 정리 중...
if exist ".next" (
    rmdir /s /q ".next"
    echo ✅ Next.js 캐시가 삭제되었습니다.
) else (
    echo ⚠️  삭제할 캐시가 없습니다.
)
echo.

echo [3/4] 의존성 패키지 확인 중...
npm install
if %errorlevel% equ 0 (
    echo ✅ 패키지 설치가 완료되었습니다.
) else (
    echo ❌ 패키지 설치에 실패했습니다.
    pause
    exit /b 1
)
echo.

echo [4/4] 개발 서버 시작 중...
echo ✅ 서버가 시작되었습니다!
echo 🌐 브라우저에서 http://localhost:3000 을 확인하세요.
echo.
echo ⚠️  서버를 중지하려면 Ctrl+C를 누르세요.
echo ========================================
echo.

start http://localhost:3000
npm run dev
