param(
  [ValidateRange(0, 600)]
  [int] $WaitSeconds = 0
)

$ErrorActionPreference = 'Stop'
$package = Get-AppxPackage -Name 'OpenAI.Codex'
if (-not $package) {
  throw 'OpenAI.Codex Store package not found.'
}

$codexExe = Join-Path $package.InstallLocation 'app\Codex.exe'
$appAsar = Join-Path $package.InstallLocation 'app\resources\app.asar'
$deadline = [DateTime]::UtcNow.AddSeconds($WaitSeconds)

do {
  $failedCallback = Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq 'Codex.exe' -and
      $_.CommandLine -match 'codex://connector/oauth_callback\?'
    } |
    Sort-Object CreationDate -Descending |
    Select-Object -First 1

  if ($failedCallback -or [DateTime]::UtcNow -ge $deadline) {
    break
  }

  Start-Sleep -Milliseconds 250
} while ($true)

if (-not $failedCallback) {
  throw 'No failed Codex OAuth callback process found. Leave the error dialog open and run this script again.'
}

$callbackMatch = [regex]::Match(
  $failedCallback.CommandLine,
  '(codex://connector/oauth_callback\?\S+)'
)
if (-not $callbackMatch.Success) {
  throw 'Could not extract the OAuth callback URL.'
}

$relay = Start-Process -FilePath $codexExe -ArgumentList @(
  '"' + $appAsar + '"',
  '"' + $callbackMatch.Groups[1].Value + '"'
) -PassThru

Start-Sleep -Milliseconds 1200
Stop-Process -Id $failedCallback.ProcessId -Force -ErrorAction SilentlyContinue

Write-Output "Relayed OAuth callback to Codex process $($relay.Id)."
