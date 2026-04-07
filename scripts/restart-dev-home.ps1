# Stop Next dev listeners on 3000 / 3001, then start dev:home
$ErrorActionPreference = 'SilentlyContinue'
foreach ($port in @(3000, 3001)) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    Write-Host "Stopping PID $procId (port $port)"
    Stop-Process -Id $procId -Force
  }
}
Start-Sleep -Seconds 1
Set-Location $PSScriptRoot\..

# Next.js 16: 기본은 Turbopack인데 next.config.js에 webpack()이 있으면
# --webpack 없이 실행 시 ERROR로 프로세스가 바로 죽을 수 있음.
# package.json과 무관하게 항상 Webpack 모드로 띄움.
Write-Host ""
Write-Host "=== Next dev (webpack) http://localhost:3001 ===" -ForegroundColor Cyan
Write-Host "브라우저 주소: http://localhost:3001  (3000 아님)" -ForegroundColor Yellow
Write-Host ""

npx next dev --webpack --port 3001 --hostname 0.0.0.0
