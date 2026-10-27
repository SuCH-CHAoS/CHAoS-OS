const CONTENT_API_PATH = '/api/content'
const ADMIN_CONTENT_API_PATH = '/__chaos-admin/content'
const ADMIN_ASSET_API_PATH = '/__chaos-admin/assets'
const ADMIN_SESSION_API_PATH = '/__chaos-admin/session'

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function hasWebsiteContentShape(content) {
  return (
    isPlainObject(content) &&
    isPlainObject(content.desktop) &&
    isPlainObject(content.about) &&
    isPlainObject(content.socials) &&
    isPlainObject(content.applications) &&
    isPlainObject(content.shell) &&
    isPlainObject(content.arcade)
  )
}

export function getRemoteContentStatus() {
  return {
    configured: !import.meta.env.DEV,
    provider: 'Cloudflare D1'
  }
}

export async function loadRemoteWebsiteContent() {
  if (import.meta.env.DEV) {
    return {
      ok: false,
      reason: 'Cloudflare content service is only used by hosted builds.'
    }
  }

  let response

  try {
    response = await fetch(CONTENT_API_PATH, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    })
  } catch {
    return {
      ok: false,
      reason: 'Cloudflare content service is unavailable.'
    }
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    return {
      ok: false,
      reason: payload?.error ?? 'Cloudflare content service is unavailable.'
    }
  }

  if (!payload?.content || !hasWebsiteContentShape(payload.content)) {
    return {
      ok: false,
      reason: 'Remote content is empty or incomplete.'
    }
  }

  return {
    ok: true,
    content: payload.content,
    updatedAt: payload.updatedAt
  }
}

export async function saveRemoteWebsiteContent(content) {
  if (!hasWebsiteContentShape(content)) {
    throw new Error('Website content is incomplete.')
  }

  const response = await fetch(ADMIN_CONTENT_API_PATH, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify(content)
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok || !hasWebsiteContentShape(payload?.content)) {
    throw new Error(payload?.error ?? 'Content could not be saved.')
  }

  return payload.content
}

export async function uploadWebsiteAsset(file, folder = 'website') {
  if (!file) {
    throw new Error('Choose a file to upload.')
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Files must be 12 MB or smaller.')
  }

  const formData = new FormData()
  formData.set('file', file)
  formData.set('folder', folder)
  const response = await fetch(ADMIN_ASSET_API_PATH, {
    method: 'POST',
    credentials: 'same-origin',
    body: formData
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.publicUrl) {
    throw new Error(payload?.error ?? 'Asset upload failed.')
  }

  return payload.publicUrl
}

export async function getCloudflareSession() {
  if (import.meta.env.DEV) {
    return null
  }

  const response = await fetch(ADMIN_SESSION_API_PATH, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin'
  })

  if (!response.ok) {
    throw new Error('Admin session could not be verified.')
  }

  const payload = await response.json().catch(() => null)
  return payload?.authenticated ? payload : null
}

export async function signInAdmin(email, password) {
  const response = await fetch(ADMIN_SESSION_API_PATH, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      email: email.trim(),
      password
    })
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.authenticated) {
    throw new Error(payload?.error ?? 'Sign-in failed. Check your credentials and try again.')
  }

  return payload
}

export async function signOutAdmin() {
  if (import.meta.env.DEV) return

  const response = await fetch(ADMIN_SESSION_API_PATH, {
    method: 'DELETE',
    credentials: 'same-origin'
  })

  if (!response.ok) {
    throw new Error('Sign-out failed.')
  }
}

export function isAllowedAdminSession(session) {
  return session?.authenticated === true
}
