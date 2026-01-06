# SELPIC 홈페이지 자동 실행 스크립트 (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     SELPIC 홈페이지 자동 실행 스크립트" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# [1/4] 기존 프로세스 종료
Write-Host "[1/4] 기존 프로세스 종료 중..." -ForegroundColor Yellow
try {
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($processes) {
        Stop-Process -Name "node" -Force
        Write-Host "✅ 기존 Node.js 프로세스가 종료되었습니다." -ForegroundColor Green
    } else {
        Write-Host "⚠️  실행 중인 Node.js 프로세스가 없습니다." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  프로세스 종료 중 오류가 발생했습니다." -ForegroundColor Yellow
}
Write-Host ""

# [2/4] 캐시 정리
Write-Host "[2/4] 캐시 정리 중..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "✅ Next.js 캐시가 삭제되었습니다." -ForegroundColor Green
} else {
    Write-Host "⚠️  삭제할 캐시가 없습니다." -ForegroundColor Yellow
}
Write-Host ""

# [3/4] 의존성 패키지 확인
Write-Host "[3/4] 의존성 패키지 확인 중..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 패키지 설치가 완료되었습니다." -ForegroundColor Green
} else {
    Write-Host "❌ 패키지 설치에 실패했습니다." -ForegroundColor Red
    Read-Host "아무 키나 누르세요..."
    exit 1
}
Write-Host ""

# [4/4] 개발 서버 시작
Write-Host "[4/4] 개발 서버 시작 중..." -ForegroundColor Yellow
Write-Host "✅ 서버가 시작되었습니다!" -ForegroundColor Green
Write-Host "🌐 브라우저에서 http://localhost:3000 을 확인하세요." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  서버를 중지하려면 Ctrl+C를 누르세요." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 브라우저 자동 열기
Start-Process "http://localhost:3000"

# 개발 서버 실행
npm run dev
