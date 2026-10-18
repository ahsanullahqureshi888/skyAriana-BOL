$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$logPath = Join-Path $projectRoot "dev-server.log"

Set-Location $projectRoot

while ($true) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $logPath -Value "[$timestamp] Starting Next dev server on 127.0.0.1:3000"
  & "C:\Program Files\nodejs\npm.cmd" run dev -- --hostname 127.0.0.1 --port 3000 2>&1 |
    Tee-Object -FilePath $logPath -Append

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $logPath -Value "[$timestamp] Dev server exited. Restarting in 3 seconds."
  Start-Sleep -Seconds 3
}
