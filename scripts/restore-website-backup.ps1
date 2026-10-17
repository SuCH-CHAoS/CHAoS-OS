param(
  [switch]$Help,
  [switch]$Compare
)

$ErrorActionPreference = 'Stop'
$contentRelativePath = 'src/data/websiteContent.json'

function Show-Help {
  Write-Output 'CHAoS OS content transfer console'
  Write-Output ''
  Write-Output 'Run restore-website-backup.cmd to choose one explicit content direction:'
  Write-Output '  1. Live Supabase to local fallback and GitHub'
  Write-Output '  2. Local fallback to live Supabase and GitHub'
  Write-Output '  3. Downloaded backup to live Supabase, local fallback, and GitHub'
  Write-Output '  4. Compare local fallback with live Supabase without changing anything'
  Write-Output ''
  Write-Output 'Live writes require an interactive Supabase Auth administrator sign-in. Passwords and access tokens are not stored.'
}

function Write-Banner {
  Clear-Host
  Write-Host @'
   ______ _    _           ____   _____
  / ____| |  | |   /\     / __ \ / ____|
 | |    | |__| |  /  \   | |  | | (___
 | |    |  __  | / /\ \  | |  | |\___ \
 | |____| |  | |/ ____ \ | |__| |____) |
  \_____|_|  |_/_/    \_\ \____/|_____/
'@ -ForegroundColor Cyan
  Write-Host '       CONTENT TRANSFER CONSOLE // SUPABASE + GITHUB' -ForegroundColor White -BackgroundColor DarkBlue
  Write-Host ''
}

function Write-Menu {
  param([pscustomobject]$Project)

  Write-Banner
  Write-Host " PROJECT: $($Project.Directory)" -ForegroundColor DarkCyan
  Write-Host " CONTENT: $($Project.ContentPath)" -ForegroundColor DarkCyan
  Write-Host ''
  Write-Host ' [1] LIVE   -> LOCAL + GITHUB' -ForegroundColor Green
  Write-Host '     Use Supabase content as the source of truth.' -ForegroundColor Gray
  Write-Host ''
  Write-Host ' [2] LOCAL  -> LIVE + GITHUB' -ForegroundColor Yellow
  Write-Host '     Publish the current local content file to Supabase.' -ForegroundColor Gray
  Write-Host ''
  Write-Host ' [3] BACKUP -> LIVE + LOCAL + GITHUB' -ForegroundColor Yellow
  Write-Host '     Restore a downloaded Control Desk backup everywhere.' -ForegroundColor Gray
  Write-Host ''
  Write-Host ' [4] COMPARE LIVE AND LOCAL' -ForegroundColor Cyan
  Write-Host '     Check content and timestamps without writing anything.' -ForegroundColor Gray
  Write-Host ''
  Write-Host ' [P] CHANGE PROJECT DIRECTORY' -ForegroundColor White
  Write-Host ' [Q] QUIT' -ForegroundColor White
  Write-Host ''
}

function Read-RequiredPath {
  param(
    [string]$Prompt,
    [string]$DefaultValue,
    [string]$PathType
  )

  $promptText = if ([string]::IsNullOrWhiteSpace($DefaultValue)) {
    $Prompt
  } else {
    "$Prompt [$DefaultValue]"
  }
  $inputValue = Read-Host $promptText
  $candidatePath = if ([string]::IsNullOrWhiteSpace($inputValue)) {
    $DefaultValue
  } else {
    $inputValue.Trim().Trim('"')
  }

  if ([string]::IsNullOrWhiteSpace($candidatePath)) {
    throw 'A path is required.'
  }

  if (-not (Test-Path -LiteralPath $candidatePath -PathType $PathType)) {
    throw "Path does not exist: $candidatePath"
  }

  return (Resolve-Path -LiteralPath $candidatePath).Path
}

function Get-ProjectContext {
  param([string]$DefaultDirectory)

  $projectDirectory = Read-RequiredPath -Prompt 'Project directory' -DefaultValue $DefaultDirectory -PathType Container
  $contentPath = Join-Path $projectDirectory $contentRelativePath

  if (-not (Test-Path -LiteralPath $contentPath -PathType Leaf)) {
    throw "The selected directory does not contain $contentRelativePath."
  }

  return [pscustomobject]@{
    Directory = $projectDirectory
    ContentPath = $contentPath
  }
}

function Get-EnvValue {
  param(
    [string]$EnvFile,
    [string]$Name,
    [string]$DefaultValue = ''
  )

  $pattern = '^\s*' + [regex]::Escape($Name) + '\s*=\s*(?<value>.*)\s*$'

  foreach ($line in Get-Content -LiteralPath $EnvFile) {
    if ($line -notmatch $pattern) {
      continue
    }

    $value = $Matches.value.Trim()
    if ($value.Length -ge 2 -and (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    )) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    return $value
  }

  return $DefaultValue
}

function Get-SupabaseConfig {
  param([pscustomobject]$Project)

  $envFile = Join-Path $Project.Directory '.env.local'
  if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    throw 'Cannot connect to Supabase because .env.local is missing from the selected project directory.'
  }

  $url = (Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_URL').TrimEnd('/')
  $anonKey = Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_ANON_KEY'
  $adminUserId = Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_ADMIN_USER_ID'
  $contentTable = Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_CONTENT_TABLE' -DefaultValue 'website_content'
  $contentId = Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_CONTENT_ID' -DefaultValue 'main'

  if ([string]::IsNullOrWhiteSpace($url) -or [string]::IsNullOrWhiteSpace($anonKey) -or [string]::IsNullOrWhiteSpace($adminUserId)) {
    throw 'Required Supabase values are missing from .env.local.'
  }

  if ($url.EndsWith('/rest/v1')) {
    $url = $url.Substring(0, $url.Length - '/rest/v1'.Length)
  }

  if (-not [Uri]::IsWellFormedUriString($url, [UriKind]::Absolute)) {
    throw 'VITE_SUPABASE_URL in .env.local is not a valid URL.'
  }

  return [pscustomobject]@{
    Url = $url
    AnonKey = $anonKey
    AdminUserId = $adminUserId
    ContentTable = $contentTable
    ContentId = $contentId
  }
}

function Assert-WebsiteContent {
  param($Content)

  if ($null -eq $Content -or $Content -isnot [pscustomobject]) {
    throw 'The selected content is not a valid CHAoS OS website backup.'
  }

  foreach ($section in @('desktop', 'about', 'socials', 'applications', 'shell', 'arcade')) {
    $property = $Content.PSObject.Properties[$section]
    if ($null -eq $property -or $property.Value -isnot [pscustomobject]) {
      throw "The content is missing a valid '$section' section."
    }
  }
}

function Test-ContentEqual {
  param($Left, $Right)

  return (($Left | ConvertTo-Json -Depth 100 -Compress) -eq ($Right | ConvertTo-Json -Depth 100 -Compress))
}

function Get-ContentFromFile {
  param([string]$Path)

  $content = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  Assert-WebsiteContent -Content $content
  return $content
}

function Get-LocalContent {
  param([pscustomobject]$Project)

  return Get-ContentFromFile -Path $Project.ContentPath
}

function Get-BackupContent {
  $backupPath = Read-RequiredPath -Prompt 'Downloaded backup JSON file' -DefaultValue '' -PathType Leaf
  return Get-ContentFromFile -Path $backupPath
}

function Get-LiveContent {
  param([pscustomobject]$Project)

  $config = Get-SupabaseConfig -Project $Project
  $table = [Uri]::EscapeDataString($config.ContentTable)
  $recordId = [Uri]::EscapeDataString($config.ContentId)
  $requestUri = '{0}/rest/v1/{1}?id=eq.{2}&select=content,updated_at' -f $config.Url, $table, $recordId
  $headers = @{ apikey = $config.AnonKey; Authorization = "Bearer $($config.AnonKey)" }
  $records = @(Invoke-RestMethod -Method Get -Uri $requestUri -Headers $headers)

  if ($records.Count -ne 1 -or $null -eq $records[0].content) {
    throw 'Supabase website_content.main is empty or incomplete. Local content was not changed.'
  }

  Assert-WebsiteContent -Content $records[0].content
  return [pscustomobject]@{
    Content = $records[0].content
    UpdatedAt = $records[0].updated_at
  }
}

function Publish-ContentToSupabase {
  param(
    [pscustomobject]$Project,
    $Content
  )

  Assert-WebsiteContent -Content $Content
  $config = Get-SupabaseConfig -Project $Project
  $email = Read-Host 'Supabase Auth admin email'
  if ([string]::IsNullOrWhiteSpace($email)) {
    throw 'An admin email is required to publish live content.'
  }

  $securePassword = Read-Host 'Supabase Auth admin password' -AsSecureString
  if ($securePassword.Length -eq 0) {
    throw 'An admin password is required to publish live content.'
  }

  $passwordPointer = [IntPtr]::Zero
  $plainPassword = $null

  try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $authRequest = @{
      Method = 'Post'
      Uri = "$($config.Url)/auth/v1/token?grant_type=password"
      Headers = @{ apikey = $config.AnonKey }
      ContentType = 'application/json'
      Body = (@{ email = $email.Trim(); password = $plainPassword } | ConvertTo-Json -Compress)
    }
    $authResponse = Invoke-RestMethod @authRequest
  } finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }

    $plainPassword = $null
    $securePassword.Dispose()
  }

  if ($authResponse.user.id -ne $config.AdminUserId -or [string]::IsNullOrWhiteSpace($authResponse.access_token)) {
    throw 'The signed-in Supabase account is not authorized to publish this website content.'
  }

  $publishRequest = @{
    Method = 'Post'
    Uri = "$($config.Url)/rest/v1/$([Uri]::EscapeDataString($config.ContentTable))"
    Headers = @{
      apikey = $config.AnonKey
      Authorization = "Bearer $($authResponse.access_token)"
      Prefer = 'resolution=merge-duplicates,return=minimal'
    }
    ContentType = 'application/json'
    Body = (@{
      id = $config.ContentId
      content = $Content
      updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Depth 100 -Compress)
  }
  Invoke-RestMethod @publishRequest | Out-Null
  Write-Host ' LIVE SUPABASE CONTENT UPDATED.' -ForegroundColor Green
}

function Invoke-Git {
  param(
    [pscustomobject]$Project,
    [string[]]$Arguments,
    [string]$FailureMessage
  )

  & git -C $Project.Directory @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw $FailureMessage
  }
}

function Assert-GitReady {
  param([pscustomobject]$Project)

  & git -C $Project.Directory rev-parse --is-inside-work-tree | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'The selected project directory is not a Git repository.'
  }

  $branch = (& git -C $Project.Directory branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') {
    throw 'The selected project must be on the main branch.'
  }

  Invoke-Git -Project $Project -Arguments @('fetch', 'origin', 'main') -FailureMessage 'Could not fetch the current main branch from GitHub.'
  $behindCount = [int]((& git -C $Project.Directory rev-list --count 'HEAD..origin/main').Trim())
  $aheadCount = [int]((& git -C $Project.Directory rev-list --count 'origin/main..HEAD').Trim())

  if ($behindCount -gt 0) {
    throw 'GitHub has newer main commits. Pull them before starting a transfer.'
  }

  if ($aheadCount -gt 0) {
    throw 'This project has unpushed commits. Push or resolve them before starting a transfer.'
  }

  & git -C $Project.Directory diff --cached --quiet
  if ($LASTEXITCODE -eq 1) {
    throw 'The Git staging area contains changes. Unstage or commit them before starting a transfer.'
  }

  if ($LASTEXITCODE -ne 0) {
    throw 'Could not check the Git staging area.'
  }
}

function Assert-LocalContentCanBeOverwritten {
  param([pscustomobject]$Project)

  $status = & git -C $Project.Directory status --porcelain -- $contentRelativePath
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not check the local content file status.'
  }

  if ($status) {
    throw 'The local content file has uncommitted changes. Commit it first or use LOCAL -> LIVE instead of overwriting it.'
  }
}

function Write-LocalContent {
  param(
    [pscustomobject]$Project,
    $Content
  )

  $currentContent = Get-LocalContent -Project $Project
  if (Test-ContentEqual -Left $currentContent -Right $Content) {
    Write-Host ' LOCAL FALLBACK ALREADY MATCHES THE SELECTED CONTENT.' -ForegroundColor DarkYellow
    return $false
  }

  $json = $Content | ConvertTo-Json -Depth 100
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($Project.ContentPath, "$json$([Environment]::NewLine)", $utf8NoBom)
  Write-Host ' LOCAL FALLBACK UPDATED.' -ForegroundColor Green
  return $true
}

function Commit-ContentAndPush {
  param([pscustomobject]$Project)

  & git -C $Project.Directory diff --quiet HEAD -- $contentRelativePath
  if ($LASTEXITCODE -eq 0) {
    Write-Host ' GITHUB FALLBACK ALREADY MATCHES. NO CONTENT COMMIT NEEDED.' -ForegroundColor DarkYellow
    return
  }

  if ($LASTEXITCODE -ne 1) {
    throw 'Could not compare the local content file with Git.'
  }

  Invoke-Git -Project $Project -Arguments @('add', '--', $contentRelativePath) -FailureMessage 'Could not stage the content file.'
  Invoke-Git -Project $Project -Arguments @('commit', '-m', 'Sync website content') -FailureMessage 'Could not create the website content commit.'
  Invoke-Git -Project $Project -Arguments @('push', 'origin', 'main') -FailureMessage 'GitHub push failed. The local content commit remains available to push after the issue is resolved.'
  Write-Host ' GITHUB MAIN UPDATED. CLOUDFLARE PAGES WILL DEPLOY THE FALLBACK.' -ForegroundColor Green
}

function Invoke-LiveToLocal {
  param([pscustomobject]$Project)

  Assert-GitReady -Project $Project
  Assert-LocalContentCanBeOverwritten -Project $Project
  $live = Get-LiveContent -Project $Project
  Write-Host " LIVE RECORD TIMESTAMP: $($live.UpdatedAt)" -ForegroundColor Cyan
  Write-LocalContent -Project $Project -Content $live.Content | Out-Null
  Commit-ContentAndPush -Project $Project
}

function Invoke-LocalToLive {
  param([pscustomobject]$Project)

  Assert-GitReady -Project $Project
  $localContent = Get-LocalContent -Project $Project
  Publish-ContentToSupabase -Project $Project -Content $localContent
  Commit-ContentAndPush -Project $Project
}

function Invoke-BackupToBoth {
  param([pscustomobject]$Project)

  Assert-GitReady -Project $Project
  Assert-LocalContentCanBeOverwritten -Project $Project
  $backupContent = Get-BackupContent
  Publish-ContentToSupabase -Project $Project -Content $backupContent
  Write-LocalContent -Project $Project -Content $backupContent | Out-Null
  Commit-ContentAndPush -Project $Project
}

function Show-Comparison {
  param([pscustomobject]$Project)

  $localContent = Get-LocalContent -Project $Project
  $live = Get-LiveContent -Project $Project
  $matches = Test-ContentEqual -Left $localContent -Right $live.Content

  Write-Host ''
  Write-Host ' CONTENT STATUS' -ForegroundColor White -BackgroundColor DarkBlue
  Write-Host " LIVE UPDATED:  $($live.UpdatedAt)" -ForegroundColor Cyan
  Write-Host " LOCAL PATH:    $($Project.ContentPath)" -ForegroundColor Cyan
  Write-Host " MATCH:         $matches" -ForegroundColor $(if ($matches) { 'Green' } else { 'Yellow' })
}

if ($Help) {
  Show-Help
  exit 0
}

try {
  $defaultProjectDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $project = if ($Compare) {
    [pscustomobject]@{
      Directory = $defaultProjectDirectory
      ContentPath = Join-Path $defaultProjectDirectory $contentRelativePath
    }
  } else {
    Get-ProjectContext -DefaultDirectory $defaultProjectDirectory
  }

  if ($Compare) {
    Show-Comparison -Project $project
    exit 0
  }

  $running = $true
  while ($running) {
    Write-Menu -Project $project
    $choice = (Read-Host 'SELECT OPTION').Trim().ToUpperInvariant()

    try {
      switch ($choice) {
        '1' { Invoke-LiveToLocal -Project $project }
        '2' { Invoke-LocalToLive -Project $project }
        '3' { Invoke-BackupToBoth -Project $project }
        '4' { Show-Comparison -Project $project }
        'P' { $project = Get-ProjectContext -DefaultDirectory $project.Directory }
        'Q' { $running = $false; continue }
        default { throw 'Choose 1, 2, 3, 4, P, or Q.' }
      }
    } catch {
      Write-Host " ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }

    if ($running) {
      Write-Host ''
      Read-Host 'Press Enter to return to the menu' | Out-Null
    }
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
