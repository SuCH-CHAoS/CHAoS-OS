param(
  [ValidateRange(1, 60)]
  [int]$IntervalMinutes = 5
)

$taskName = 'CHAoS OS Live Content Sync'
$launcherPath = Join-Path $PSScriptRoot 'run-live-content-sync.cmd'

if (-not (Test-Path -LiteralPath $launcherPath)) {
  throw 'The live content sync launcher is missing.'
}

# The launcher keeps SchTasks from having to parse the spaced Node.js install path.
$taskAction = "cmd.exe /d /c $launcherPath"
$taskArguments = @(
  '/create',
  '/tn', $taskName,
  '/tr', $taskAction,
  '/sc', 'minute',
  '/mo', $IntervalMinutes.ToString(),
  '/it',
  '/f'
)

& schtasks.exe @taskArguments
if ($LASTEXITCODE -ne 0) {
  throw 'Could not create the live content sync task.'
}

& schtasks.exe /run /tn $taskName
if ($LASTEXITCODE -ne 0) {
  throw 'The live content sync task was created but could not be started.'
}

Write-Output "Created $taskName. It checks Supabase every $IntervalMinutes minute(s) while you are signed in."
