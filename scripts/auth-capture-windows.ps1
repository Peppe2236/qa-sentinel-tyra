param(
  [Parameter(Mandatory=$true)][string]$SiteLabel,
  [Parameter(Mandatory=$true)][string]$TargetUrl,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [Parameter(Mandatory=$true)][int]$Port,
  [Parameter(Mandatory=$true)][string]$ProfileName,
  [ValidateRange(1, 1800)][int]$TimeoutSeconds = 600
)
$ErrorActionPreference = 'Stop'

function Find-Chrome {
  $candidates = @()
  foreach ($key in @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe'
  )) {
    try { $candidates += (Get-ItemProperty $key).'(default)' } catch {}
  }
  $candidates += @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }
  throw 'Google Chrome was not found.'
}

# Only the dedicated Tyra profile may be restarted. Never attach to whatever
# happens to listen on 9222/9223, or stop Chrome by process name.
if ($ProfileName -notmatch '^qa-sentinel-[a-z0-9-]+-auth$') {
  throw 'Expected a dedicated qa-sentinel authentication profile name.'
}
$targetUri = [Uri]$TargetUrl
if ($targetUri.Scheme -ne 'https' -or $targetUri.Host -notmatch '(^|\.)nation\.dev$') {
  throw 'Authentication target must be an HTTPS Nation site.'
}
$chrome = Find-Chrome
$profile = Join-Path $env:TEMP $ProfileName
$profilePattern = '(?:^|\s)--user-data-dir=(?:"' + [Regex]::Escape($profile) + '"|' + [Regex]::Escape($profile) + ')(?:\s|$)'
$mutex = New-Object System.Threading.Mutex -ArgumentList @($false, "Local\$ProfileName")
$locked = $false
$socket = $null
$chromeProcess = $null
$script:commandId = 0

function Invoke-Cdp {
  param([string]$Method, [hashtable]$Params = @{}, [string]$SessionId = '')
  $script:commandId += 1
  $id = $script:commandId
  $payload = @{ id = $id; method = $Method; params = $Params }
  if ($SessionId) { $payload.sessionId = $SessionId }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Depth 12 -Compress))
  $cts = New-Object System.Threading.CancellationTokenSource
  $cts.CancelAfter(10000)
  try {
    $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
    $socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).GetAwaiter().GetResult()
    while ($true) {
      $stream = New-Object IO.MemoryStream
      try {
        do {
          $buffer = New-Object byte[] 65536
          $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
          $received = $socket.ReceiveAsync($segment, $cts.Token).GetAwaiter().GetResult()
          if ($received.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
            throw 'Chrome closed the DevTools connection.'
          }
          $stream.Write($buffer, 0, $received.Count)
        } until ($received.EndOfMessage)
        $response = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
      } finally { $stream.Dispose() }
      # Ignore CDP events and other session responses.
      if ($response.id -ne $id) { continue }
      if ($response.error) { throw "Chrome CDP $Method failed (code $($response.error.code))." }
      return $response.result
    }
  } catch {
    throw "Chrome CDP $Method failed or timed out. Check the dedicated QA Chrome window."
  } finally { $cts.Dispose() }
}

function Find-AuthenticatedTarget {
  # Browser-level CDP discovery works without the HTTP /json/list endpoint.
  $targets = (Invoke-Cdp -Method 'Target.getTargets').targetInfos
  foreach ($target in $targets) {
    if ($target.type -ne 'page' -or -not $target.url) { continue }
    try {
      $uri = [Uri]$target.url
      if ($uri.GetLeftPart([UriPartial]::Authority) -ieq $targetUri.GetLeftPart([UriPartial]::Authority) -and
          $uri.AbsolutePath.TrimEnd('/') -ieq $targetUri.AbsolutePath.TrimEnd('/')) {
        return $target
      }
    } catch {}
  }
  return $null
}

try {
  try { $locked = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $locked = $true }
  if (-not $locked) { throw "Another $SiteLabel authentication capture is already running." }
  $owned = @(Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object {
    $_.CommandLine -and $_.CommandLine -match $profilePattern
  })
  foreach ($process in $owned) {
    Write-Host "Restarting stale Tyra auth Chrome (PID $($process.ProcessId))."
    Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
  }
  New-Item -ItemType Directory -Force -Path $profile | Out-Null
  $portFile = Join-Path $profile 'DevToolsActivePort'
  Remove-Item -LiteralPath $portFile -Force -ErrorAction SilentlyContinue

  # Let Chrome choose a free loopback port. The legacy Port argument remains
  # accepted for callers, but occupied fixed ports are never reused.
  Write-Host "Opening dedicated $SiteLabel Chrome (automatic port; legacy preference $Port)."
  $chromeProcess = Start-Process -FilePath $chrome -PassThru -ArgumentList @(
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    "--user-data-dir=`"$profile`"",
    '--no-first-run', '--no-default-browser-check', '--new-window', $TargetUrl
  )
  $lines = @()
  $startupDeadline = [DateTime]::UtcNow.AddSeconds(30)
  while ([DateTime]::UtcNow -lt $startupDeadline) {
    if (Test-Path $portFile) {
      $lines = @(Get-Content -LiteralPath $portFile)
      if ($lines.Count -ge 2 -and $lines[0] -match '^\d+$' -and $lines[1] -match '^/devtools/browser/') { break }
    }
    if ($chromeProcess.HasExited) { throw 'Dedicated Chrome exited before DevTools became ready.' }
    Start-Sleep -Milliseconds 250
  }
  if (-not $lines -or $lines.Count -lt 2) { throw 'Chrome DevTools did not become ready within 30 seconds.' }
  $activePort = [int]$lines[0]
  $socket = New-Object System.Net.WebSockets.ClientWebSocket
  $connectCts = New-Object System.Threading.CancellationTokenSource
  $connectCts.CancelAfter(10000)
  try {
    $socket.ConnectAsync([Uri]"ws://127.0.0.1:$activePort$($lines[1])", $connectCts.Token).GetAwaiter().GetResult()
  } finally { $connectCts.Dispose() }
  Write-Host 'Chrome connected. Sign in normally; keep this QA window open.'
  Write-Host "Waiting for protected page (maximum $TimeoutSeconds seconds)..."
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  $nextProgress = [DateTime]::UtcNow
  $matchedPage = $null
  while ([DateTime]::UtcNow -lt $deadline) {
    $candidate = Find-AuthenticatedTarget
    if ($candidate) {
      Start-Sleep -Seconds 2
      $confirmed = Find-AuthenticatedTarget
      if ($confirmed -and $confirmed.targetId -eq $candidate.targetId) { $matchedPage = $confirmed; break }
    }
    if ([DateTime]::UtcNow -ge $nextProgress) {
      Write-Host "Waiting for $($targetUri.Host)$($targetUri.AbsolutePath). Finish sign-in in the QA window."
      $nextProgress = [DateTime]::UtcNow.AddSeconds(15)
    }
    Start-Sleep -Seconds 1
  }
  if (-not $matchedPage) {
    throw "Timed out: no stable protected $SiteLabel page was discovered via Target.getTargets. Finish sign-in, then retry."
  }
  Write-Host 'Protected page detected. Exporting candidate session for live verification...'
  $attached = Invoke-Cdp -Method 'Target.attachToTarget' -Params @{ targetId = $matchedPage.targetId; flatten = $true }
  $sessionId = $attached.sessionId
  $storage = Invoke-Cdp -Method 'Runtime.evaluate' -SessionId $sessionId -Params @{
    expression = '({origin: location.origin, localStorage: Object.entries(localStorage).map(([name,value]) => ({name,value}))})';
    returnByValue = $true
  }
  if ($storage.exceptionDetails -or -not $storage.result.value -or
      $storage.result.value.origin -ine $targetUri.GetLeftPart([UriPartial]::Authority)) {
    throw 'Protected page changed or local storage could not be captured.'
  }
  $cookieParams = @{}
  if ($matchedPage.browserContextId) { $cookieParams.browserContextId = $matchedPage.browserContextId }
  $cookies = (Invoke-Cdp -Method 'Storage.getCookies' -Params $cookieParams).cookies
  $playwrightCookies = @(
    foreach ($cookie in $cookies) {
      $domain = $cookie.domain.TrimStart('.').ToLowerInvariant()
      if ($targetUri.Host -ine $domain -and -not $targetUri.Host.EndsWith(".$domain")) { continue }
      $sameSite = switch ([string]$cookie.sameSite) {
        'Strict' { 'Strict' }; 'None' { 'None' }; default { 'Lax' }
      }
      [ordered]@{
        name = $cookie.name; value = $cookie.value; domain = $cookie.domain; path = $cookie.path;
        expires = if ($cookie.session -or [double]$cookie.expires -le 0) { -1 } else { [double]$cookie.expires };
        httpOnly = [bool]$cookie.httpOnly; secure = [bool]$cookie.secure; sameSite = $sameSite
      }
    }
  )
  $localStorage = @($storage.result.value.localStorage)
  if ($playwrightCookies.Count -eq 0 -and $localStorage.Count -eq 0) { throw 'No reusable cookies or local storage were captured.' }
  $state = [ordered]@{
    cookies = $playwrightCookies;
    origins = @([ordered]@{ origin = $storage.result.value.origin; localStorage = $localStorage })
  }
  $directory = Split-Path -Parent $OutputPath
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($OutputPath, ($state | ConvertTo-Json -Depth 12), $utf8)
  Write-Host 'Candidate exported. Tyra will verify reuse before replacing the saved session.'
} finally {
  if ($socket) {
    if ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
      try { Invoke-Cdp -Method 'Browser.close' | Out-Null } catch {}
    }
    $socket.Dispose()
  }
  if ($locked) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
