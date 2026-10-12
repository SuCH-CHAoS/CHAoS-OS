export const ADMIN_CONTENT_API_PATH = '/__chaos-admin/content'
export const ADMIN_SESSION_API_PATH = '/__chaos-admin/session'

const CLIENT_UNLOCK_PHRASE = import.meta.env.VITE_CHAOS_ADMIN_UNLOCK_PHRASE

export function createAdminRequestHeaders(adminToken, headers = {}) {
  if (!adminToken) {
    return headers
  }

  return {
    ...headers,
    Authorization: `Bearer ${adminToken}`
  }
}

export async function requestLocalAdminSession(passphrase) {
  if (!passphrase) {
    return { ok: false, ignored: true }
  }

  if (import.meta.env.DEV) {
    try {
      const response = await fetch(ADMIN_SESSION_API_PATH, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ passphrase })
      })

      if (![401, 403, 404, 503].includes(response.status)) {
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          return {
            ok: false,
            terminalHandled: true,
            error: payload?.error ?? `Admin session failed with status ${response.status}.`
          }
        }

        if (!payload?.token) {
          return {
            ok: false,
            terminalHandled: true,
            error: 'Admin session did not return a token.'
          }
        }

        return {
          ok: true,
          token: payload.token
        }
      }
    } catch (error) {
      return {
        ok: false,
        terminalHandled: true,
        error: error instanceof Error ? error.message : 'Admin session request failed.'
      }
    }
  }

  if (passphrase === CLIENT_UNLOCK_PHRASE) {
    return {
      ok: true,
      token: 'supabase-control-desk'
    }
  }

  return { ok: false, ignored: true }
}
