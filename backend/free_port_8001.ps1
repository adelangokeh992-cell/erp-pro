# Free port 8001 (stop any process using it)
Write-Host "Checking port 8001..."
try {
  $conn = Get-NetTCPConnection -LocalPort 8001 -ErrorAction Stop
  if ($conn) {
    $conn | ForEach-Object { 
      $pid = $_.OwningProcess
      Write-Host "Stopping process PID: $pid"
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Port 8001 is free. You can start the backend now."
  } else {
    Write-Host "No process is using port 8001."
  }
} catch {
  Write-Host "Using netstat method..."
  $line = netstat -ano | findstr ":8001"
  if ($line) {
    $parts = $line -split '\s+'
    $procId = $parts[-1]
    if ($procId -match '^\d+$') {
      Write-Host "Stopping process PID: $procId"
      taskkill /PID $procId /F
      Write-Host "Port 8001 is free."
    }
  } else {
    Write-Host "No process found on port 8001."
  }
}
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
