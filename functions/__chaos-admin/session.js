import {
  clearAdminCookie,
  createAdminCookie,
  createAdminSession,
  hasValidAdminCredentials,
  hasValidAdminSession,
  jsonResponse
} from '../../cloudflare/admin.js'

export async function onRequestGet(context) {
  const authenticated = await hasValidAdminSession(context.request, context.env)
  return jsonResponse({ authenticated })
}

export async function onRequestPost(context) {
  let credentials

  try {
    credentials = await context.request.json()
  } catch {
    return jsonResponse({ error: 'Invalid sign-in request.' }, 400)
  }

  const credentialsValid = await hasValidAdminCredentials(
    credentials?.email,
    credentials?.password,
    context.env
  )

  if (!credentialsValid) {
    return jsonResponse({ error: 'Sign-in failed. Check your credentials and try again.' }, 401)
  }

  try {
    const session = await createAdminSession(context.env)

    return jsonResponse(
      { authenticated: true },
      200,
      { 'Set-Cookie': createAdminCookie(session) }
    )
  } catch {
    return jsonResponse({ error: 'Admin service is not configured.' }, 503)
  }
}

export function onRequestDelete() {
  return jsonResponse(
    { authenticated: false },
    200,
    { 'Set-Cookie': clearAdminCookie() }
  )
}
