param(
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

function Show-Help {
  Write-Output 'CHAoS OS backup restore'
  Write-Output ''
  Write-Output 'Run restore-website-backup.cmd, choose a downloaded JSON backup, and confirm the project directory.'
  Write-Output 'The tool validates the backup, publishes it to Supabase after an admin sign-in, updates the Git fallback, commits the content file, and pushes main.'
  Write-Output 'No password or access token is stored by this tool.'
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

function Assert-WebsiteContent {
  param($Content)

  if ($null -eq $Content -or $Content -isnot [pscustomobject]) {
    throw 'The selected file is not a website content backup.'
  }

  foreach ($section in @('desktop', 'about', 'socials', 'applications', 'shell', 'arcade')) {
    $value = $Content.PSObject.Properties[$section].Value
    if ($null -eq $value -or $value -isnot [pscustomobject]) {
      throw "The backup is missing a valid '$section' section."
    }
  }
}

function Invoke-Git {
  param(
    [string]$ProjectDirectory,
    [string[]]$Arguments,
    [string]$FailureMessage
  )

  & git -C $ProjectDirectory @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw $FailureMessage
  }
}

function Publish-ContentToSupabase {
  param(
    [string]$ProjectDirectory,
    $Content
  )

  $envFile = Join-Path $ProjectDirectory '.env.local'
  if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    throw 'Cannot publish live content because .env.local is missing from the selected project directory.'
  }

  $supabaseUrl = (Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_URL').TrimEnd('/')
  $anonKey = Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_ANON_KEY'
  $adminUserId = Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_ADMIN_USER_ID'
  $contentTable = Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_CONTENT_TABLE' -DefaultValue 'website_content'
  $contentId = Get-EnvValue -EnvFile $envFile -Name 'VITE_SUPABASE_CONTENT_ID' -DefaultValue 'main'

  if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($anonKey) -or [string]::IsNullOrWhiteSpace($adminUserId)) {
    throw 'Cannot publish live content because required Supabase values are missing from .env.local.'
  }

  if ($supabaseUrl.EndsWith('/rest/v1')) {
    $supabaseUrl = $supabaseUrl.Substring(0, $supabaseUrl.Length - '/rest/v1'.Length)
  }

  if (-not [Uri]::IsWellFormedUriString($supabaseUrl, [UriKind]::Absolute)) {
    throw 'VITE_SUPABASE_URL in .env.local is not a valid URL.'
  }

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
    $authHeaders = @{ apikey = $anonKey }
    $authBody = @{ email = $email.Trim(); password = $plainPassword } | ConvertTo-Json -Compress
    $authRequest = @{
      Method = 'Post'
      Uri = "$supabaseUrl/auth/v1/token?grant_type=password"
      Headers = $authHeaders
      ContentType = 'application/json'
      Body = $authBody
    }
    $authResponse = Invoke-RestMethod @authRequest
  } finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }

    $plainPassword = $null
    $securePassword.Dispose()
  }

  if ($authResponse.user.id -ne $adminUserId -or [string]::IsNullOrWhiteSpace($authResponse.access_token)) {
    throw 'The signed-in Supabase account is not authorized to publish this website content.'
  }

  $encodedTable = [Uri]::EscapeDataString($contentTable)
  $contentEndpoint = "$supabaseUrl/rest/v1/$encodedTable"
  $publishHeaders = @{
    apikey = $anonKey
    Authorization = "Bearer $($authResponse.access_token)"
    Prefer = 'resolution=merge-duplicates,return=minimal'
  }
  $publishBody = @{
    id = $contentId
    content = $Content
    updated_at = (Get-Date).ToUniversalTime().ToString('o')
  } | ConvertTo-Json -Depth 100 -Compress

  $publishRequest = @{
    Method = 'Post'
    Uri = $contentEndpoint
    Headers = $publishHeaders
    ContentType = 'application/json'
    Body = $publishBody
  }
  Invoke-RestMethod @publishRequest | Out-Null

  Write-Output 'Live Supabase content updated.'
}

if ($Help) {
  Show-Help
  exit 0
}

try {
  $defaultProjectDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $projectDirectory = Read-RequiredPath -Prompt 'Project directory' -DefaultValue $defaultProjectDirectory -PathType Container
  $backupPath = Read-RequiredPath -Prompt 'Downloaded backup JSON file' -DefaultValue '' -PathType Leaf
  $contentPath = Join-Path $projectDirectory 'src\data\websiteContent.json'

  if (-not (Test-Path -LiteralPath $contentPath -PathType Leaf)) {
    throw 'The selected project directory does not contain src\\data\\websiteContent.json.'
  }

  $backupContent = Get-Content -LiteralPath $backupPath -Raw | ConvertFrom-Json
  Assert-WebsiteContent -Content $backupContent

  & git -C $projectDirectory rev-parse --is-inside-work-tree | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'The selected project directory is not a Git repository.'
  }

  $currentBranch = (& git -C $projectDirectory branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or $currentBranch -ne 'main') {
    throw 'The selected project must be on the main branch.'
  }

  $contentStatus = & git -C $projectDirectory status --porcelain -- 'src/data/websiteContent.json'
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not check the fallback content file status.'
  }

  if ($contentStatus) {
    throw 'src\\data\\websiteContent.json already has uncommitted changes. Commit or revert that file before restoring a backup.'
  }

  Invoke-Git -ProjectDirectory $projectDirectory -Arguments @('fetch', 'origin', 'main') -FailureMessage 'Could not fetch the current main branch from GitHub.'
  $behindCount = [int]((& git -C $projectDirectory rev-list --count 'HEAD..origin/main').Trim())
  $aheadCount = [int]((& git -C $projectDirectory rev-list --count 'origin/main..HEAD').Trim())

  if ($behindCount -gt 0) {
    throw 'GitHub has newer main commits. Pull them before restoring a backup so this tool cannot overwrite newer work.'
  }

  if ($aheadCount -gt 0) {
    throw 'This project has unpushed commits. Push or resolve them before restoring a backup so this tool only publishes its own content commit.'
  }

  $publishChoice = (Read-Host 'Publish this backup to live Supabase too? [Y/n]').Trim().ToLowerInvariant()
  if ($publishChoice -eq '' -or $publishChoice -eq 'y' -or $publishChoice -eq 'yes') {
    Publish-ContentToSupabase -ProjectDirectory $projectDirectory -Content $backupContent
  } elseif ($publishChoice -ne 'n' -and $publishChoice -ne 'no') {
    throw 'Choose Y or N for the Supabase publish prompt.'
  } else {
    Write-Output 'Supabase publish skipped. Only the Git fallback will be updated.'
  }

  $jsonOutput = $backupContent | ConvertTo-Json -Depth 100
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($contentPath, "$jsonOutput$([Environment]::NewLine)", $utf8NoBom)

  & git -C $projectDirectory diff --quiet -- 'src/data/websiteContent.json'
  if ($LASTEXITCODE -eq 0) {
    Write-Output 'The Git fallback already matches this backup. No content commit was needed.'
  } elseif ($LASTEXITCODE -eq 1) {
    Invoke-Git -ProjectDirectory $projectDirectory -Arguments @('add', '--', 'src/data/websiteContent.json') -FailureMessage 'Could not stage the restored fallback content.'
    Invoke-Git -ProjectDirectory $projectDirectory -Arguments @('commit', '-m', 'Restore website content backup') -FailureMessage 'Could not create the content restore commit.'
    Write-Output 'Local content restore commit created.'
  } else {
    throw 'Could not compare the restored fallback content.'
  }

  Invoke-Git -ProjectDirectory $projectDirectory -Arguments @('push', 'origin', 'main') -FailureMessage 'GitHub push failed. The local content update remains available to push after the issue is resolved.'
  Write-Output 'GitHub main is updated. Cloudflare Pages will deploy the new fallback automatically.'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
