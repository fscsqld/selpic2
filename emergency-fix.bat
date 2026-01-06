@echo off
echo ========================================
echo SELPIC 웹사이트 긴급 복구 스크립트
echo ========================================
echo.

echo 1. 실행 중인 Node.js 프로세스 종료...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo    ✅ Node.js 프로세스 종료 완료
) else (
    echo    ℹ️  실행 중인 Node.js 프로세스 없음
)

echo.
echo 2. 포트 사용 확인...
netstat -ano | findstr :3000
if %errorlevel% equ 0 (
    echo    ⚠️  포트 3000 사용 중 - 프로세스 ID 확인 필요
) else (
    echo    ✅ 포트 3000 사용 가능
)

echo.
echo 3. 캐시 폴더 정리...
if exist .next (
    rmdir /s /q .next
    echo    ✅ .next 폴더 삭제 완료
) else (
    echo    ℹ️  .next 폴더 없음
)

if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo    ✅ node_modules\.cache 폴더 삭제 완료
) else (
    echo    ℹ️  node_modules\.cache 폴더 없음
)

echo.
echo 4. 의존성 재설치...
npm install
if %errorlevel% equ 0 (
    echo    ✅ 의존성 설치 완료
) else (
    echo    ❌ 의존성 설치 실패
    pause
    exit /b 1
)

echo.
echo 5. 개발 서버 시작...
echo    🚀 http://localhost:3000 에서 확인하세요
echo.
npm run dev

pause
