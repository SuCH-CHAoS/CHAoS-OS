const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export const ADMIN_COOKIE_NAME = 'chaos_admin'
const ADMIN_SESSION_TTL_SECONDS = 30 * 60

export function jsonResponse(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers
    }
  })
}

export function getContentDatabase(env) {
  return env.CHAOS_CONTENT_DB ?? null
}

export function getAssetBucket(env) {
  return env.CHAOS_ASSETS ?? null
}

export function hasWebsiteContentShape(content) {
  return Boolean(content) &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    ['desktop', 'about', 'socials', 'applications', 'shell', 'arcade']
      .every((key) => Boolean(content[key]) && typeof content[key] === 'object' && !Array.isArray(content[key]))
}

export function getAdminSessionCookie(request) {
  const cookieHeader = request.headers.get('Cookie') ?? ''
  const cookie = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${ADMIN_COOKIE_NAME}=`))

  return cookie ? cookie.slice(ADMIN_COOKIE_NAME.length + 1) : ''
}

export async function createAdminSession(env) {
  const secret = getSecret(env, 'CHAOS_ADMIN_SESSION_SECRET')

  if (!secret) {
    throw new Error('Admin session service is not configured.')
  }

  const payload = {
    sub: 'chaos-admin',
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS
  }
  const encodedPayload = toBase64Url(textEncoder.encode(JSON.stringify(payload)))
  const signature = await signText(encodedPayload, secret)

  return `${encodedPayload}.${signature}`
}

export async function hasValidAdminSession(request, env) {
  const secret = getSecret(env, 'CHAOS_ADMIN_SESSION_SECRET')
  const token = getAdminSessionCookie(request)

  if (!secret || !token) {
    return false
  }

  const [encodedPayload, signature, extra] = token.split('.')
  if (!encodedPayload || !signature || extra) {
    return false
  }

  const signatureValid = await verifySignature(encodedPayload, signature, secret)
  if (!signatureValid) {
    return false
  }

  try {
    const payload = JSON.parse(textDecoder.decode(fromBase64Url(encodedPayload)))

    return payload?.sub === 'chaos-admin' &&
      Number.isFinite(payload.exp) &&
      payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export async function hasValidAdminCredentials(email, password, env) {
  const expectedEmail = getSecret(env, 'CHAOS_ADMIN_EMAIL')
  const expectedPassword = getSecret(env, 'CHAOS_ADMIN_PASSWORD')

  if (!expectedEmail || !expectedPassword || !email || !password) {
    return false
  }

  const [emailMatches, passwordMatches] = await Promise.all([
    safelyMatches(String(email).trim().toLowerCase(), expectedEmail.trim().toLowerCase()),
    safelyMatches(String(password), expectedPassword)
  ])

  return emailMatches && passwordMatches
}

export function createAdminCookie(token) {
  return `${ADMIN_COOKIE_NAME}=${token}; Path=/__chaos-admin; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`
}

export function clearAdminCookie() {
  return `${ADMIN_COOKIE_NAME}=; Path=/__chaos-admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
}

export function safeAssetFolder(value) {
  return String(value ?? 'website')
    .replace(/[^a-z0-9/_-]/gi, '-')
    .replace(/\.+/g, '-')
    .replace(/^\/+|\/+$/g, '') || 'website'
}

export function safeAssetName(value) {
  return String(value ?? 'upload')
    .replace(/[^a-z0-9._-]/gi, '-')
    .replace(/-+/g, '-') || 'upload'
}

export function createAssetPublicUrl(request, objectPath) {
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/')
  return new URL(`/content-assets/${encodedPath}`, request.url).toString()
}

function getSecret(env, name) {
  const value = env[name]
  return typeof value === 'string' && value.trim() ? value : ''
}

async function safelyMatches(value, expectedValue) {
  const [valueHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', textEncoder.encode(value)),
    crypto.subtle.digest('SHA-256', textEncoder.encode(expectedValue))
  ])
  const valueBytes = new Uint8Array(valueHash)
  const expectedBytes = new Uint8Array(expectedHash)
  let difference = 0

  for (let index = 0; index < valueBytes.length; index += 1) {
    difference |= valueBytes[index] ^ expectedBytes[index]
  }

  return difference === 0
}

async function signText(text, secret) {
  const key = await getHmacKey(secret, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(text))
  return toBase64Url(new Uint8Array(signature))
}

async function verifySignature(text, encodedSignature, secret) {
  try {
    const key = await getHmacKey(secret, ['verify'])
    return crypto.subtle.verify('HMAC', key, fromBase64Url(encodedSignature), textEncoder.encode(text))
  } catch {
    return false
  }
}

function getHmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  )
}

function toBase64Url(bytes) {
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}
