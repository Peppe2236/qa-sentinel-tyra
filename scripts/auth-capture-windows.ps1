param(
  [Parameter(Mandatory=$true)]
  [string]$SiteLabel,

  [Parameter(Mandatory=$true)]
  [string]$TargetUrl,

  [Parameter(Mandatory=$true)]
  [string]$OutputPath,

  [Parameter(Mandatory=$true)]
  [int]$Port,

  [Parameter(Mandatory=$true)]
  [string]$ProfileName,

  [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = 'Stop'

Write-Host
Write-Host "=============================================="
Write-Host " QA SENTINEL TYRA - AUTHENTICATION"
Write-Host "=============================================="
Write-Host "Site:" $SiteLabel

function Find-Chrome {
  $candidates = @()

  try {
    $candidates += (
      Get-ItemProperty `
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
    )."(default)"
  } catch {}

  try {
    $candidates += (
      Get-ItemProperty `
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
    )."(default)"
  } catch {}

  $candidates += @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )

  foreach ($candidate in $candidates) {
    if (
      $candidate -and
      (Test-Path $candidate)
    ) {
      return $candidate
    }
  }

  throw "Google Chrome was not found."
}

function Port-Is-Listening {
  return [bool](
    Get-NetTCPConnection `
      -LocalPort $Port `
      -State Listen `
      -ErrorAction SilentlyContinue
  )
}

$chrome = Find-Chrome

$profile =
  Join-Path `
    $env:TEMP `
    $ProfileName

New-Item `
  -ItemType Directory `
  -Force `
  -Path $profile |
Out-Null

if (-not (Port-Is-Listening)) {
  Start-Process `
    -FilePath $chrome `
    -ArgumentList @(
      "--remote-debugging-port=$Port",
      "--remote-debugging-address=127.0.0.1",
      "--user-data-dir=$profile",
      "--no-first-run",
      "--no-default-browser-check",
      "--new-window",
      $TargetUrl
    ) |
  Out-Null
}

Write-Host
Write-Host "Chrome opened."
Write-Host "If required, sign in normally."
Write-Host "Do not close Chrome yet."
Write-Host
Write-Host "Waiting for authenticated page..."

$targetUri = [Uri]$TargetUrl

function Find-AuthenticatedTarget {
  try {
    $pages = @(
      Invoke-RestMethod `
        "http://127.0.0.1:$Port/json"
    )

    foreach ($page in $pages) {
      try {
        $uri = [Uri]$page.url

        if (
          $uri.Host -eq $targetUri.Host -and
          $uri.AbsolutePath -eq
            $targetUri.AbsolutePath
        ) {
          return $page
        }
      } catch {}
    }
  } catch {}

  return $null
}

$deadline =
  [DateTime]::UtcNow.AddSeconds(
    $TimeoutSeconds
  )

$matchedPage = $null

while (
  [DateTime]::UtcNow -lt
  $deadline
) {
  $matchedPage =
    Find-AuthenticatedTarget

  if ($matchedPage) {
    Start-Sleep -Seconds 2

    $confirmed =
      Find-AuthenticatedTarget

    if ($confirmed) {
      $matchedPage =
        $confirmed
      break
    }
  }

  Start-Sleep -Seconds 1
}

if (-not $matchedPage) {
  throw (
    "Timed out waiting for authenticated " +
    "$SiteLabel page."
  )
}

Write-Host "Authenticated page detected."
Write-Host "Capturing session..."

$version =
  Invoke-RestMethod `
    "http://127.0.0.1:$Port/json/version"

$wsUrl =
  $version.webSocketDebuggerUrl

if (-not $wsUrl) {
  throw (
    "Chrome DevTools websocket URL " +
    "was not found."
  )
}

$socket =
  New-Object `
    System.Net.WebSockets.ClientWebSocket

$tokenSource =
  New-Object `
    System.Threading.CancellationTokenSource

$token =
  $tokenSource.Token

$socket.ConnectAsync(
  [Uri]$wsUrl,
  $token
).GetAwaiter().GetResult()

function Send-CdpCommand {
  param(
    [int]$Id,
    [string]$Method
  )

  $payload = @{
    id = $Id
    method = $Method
  } |
  ConvertTo-Json -Compress

  $bytes =
    [Text.Encoding]::UTF8.GetBytes(
      $payload
    )

  $segment =
    New-Object `
      System.ArraySegment[byte] `
      -ArgumentList @(,$bytes)

  $socket.SendAsync(
    $segment,
    [System.Net.WebSockets.WebSocketMessageType]::Text,
    $true,
    $token
  ).GetAwaiter().GetResult()
}

function Receive-CdpMessage {
  $buffer =
    New-Object byte[] 65536

  $stream =
    New-Object IO.MemoryStream

  do {
    $segment =
      New-Object `
        System.ArraySegment[byte] `
        -ArgumentList @(,$buffer)

    $result =
      $socket.ReceiveAsync(
        $segment,
        $token
      ).GetAwaiter().GetResult()

    if (
      $result.MessageType -eq
      [System.Net.WebSockets.WebSocketMessageType]::Close
    ) {
      throw (
        "Chrome closed the DevTools connection."
      )
    }

    $stream.Write(
      $buffer,
      0,
      $result.Count
    )
  }
  until ($result.EndOfMessage)

  $text =
    [Text.Encoding]::UTF8.GetString(
      $stream.ToArray()
    )

  $stream.Dispose()

  return (
    $text |
    ConvertFrom-Json
  )
}

Send-CdpCommand `
  -Id 1 `
  -Method "Storage.getCookies"

do {
  $response =
    Receive-CdpMessage
}
until ($response.id -eq 1)

if ($response.error) {
  throw (
    "Chrome CDP error: " +
    (
      $response.error |
      ConvertTo-Json -Compress
    )
  )
}

$nationCookies = @(
  $response.result.cookies |
  Where-Object {
    $domain =
      $_.domain
        .TrimStart('.')
        .ToLowerInvariant()

    $domain -eq 'nation.dev' -or
    $domain.EndsWith('.nation.dev')
  }
)

if ($nationCookies.Count -eq 0) {
  throw (
    "No Nation/AI Skills session cookies " +
    "were found."
  )
}

$playwrightCookies = @(
  foreach ($cookie in $nationCookies) {
    $sameSite = switch (
      [string]$cookie.sameSite
    ) {
      'Strict' { 'Strict' }
      'None'   { 'None' }
      default  { 'Lax' }
    }

    [ordered]@{
      name     = $cookie.name
      value    = $cookie.value
      domain   = $cookie.domain
      path     = $cookie.path
      expires  = if ($cookie.session) {
        -1
      } elseif (
        [double]$cookie.expires -gt 0
      ) {
        [double]$cookie.expires
      } else {
        -1
      }
      httpOnly = [bool]$cookie.httpOnly
      secure   = [bool]$cookie.secure
      sameSite = $sameSite
    }
  }
)

$state = [ordered]@{
  cookies = $playwrightCookies
  origins = @()
}

$directory =
  Split-Path `
    -Parent `
    $OutputPath

New-Item `
  -ItemType Directory `
  -Force `
  -Path $directory |
Out-Null

$json =
  $state |
  ConvertTo-Json -Depth 8

$utf8 =
  New-Object `
    System.Text.UTF8Encoding($false)

[IO.File]::WriteAllText(
  $OutputPath,
  $json,
  $utf8
)

$socket.Dispose()
$tokenSource.Dispose()

Write-Host
Write-Host "Session captured."
Write-Host "Cookies:" $playwrightCookies.Count
Write-Host "Tyra will now verify the session."
