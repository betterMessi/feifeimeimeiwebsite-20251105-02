# Stop processes using port 3000
$port = 3000
try {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

    if ($processes) {
        foreach ($pid in $processes) {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "Stopping process: $($proc.ProcessName) (PID: $pid)"
                Stop-Process -Id $pid -Force
                Write-Host "Process $pid stopped successfully"
            }
        }
        Write-Host "Port $port is now free"
    } else {
        Write-Host "Port $port is not in use"
    }
} catch {
    Write-Host "Error: $_"
    Write-Host "Trying alternative method..."
    
    # Alternative method using netstat
    $netstat = netstat -ano | findstr ":$port"
    if ($netstat) {
        $lines = $netstat -split "`n"
        foreach ($line in $lines) {
            if ($line -match '\s+(\d+)\s*$') {
                $pid = $matches[1]
                Write-Host "Stopping process with PID: $pid"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Host "Port $port should be free now"
    } else {
        Write-Host "Port $port is not in use"
    }
}
