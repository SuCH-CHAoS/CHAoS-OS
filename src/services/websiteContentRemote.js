import { supabase, supabaseConfig, isSupabaseConfigured } from './supabaseClient'

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
    configured: isSupabaseConfigured,
    table: supabaseConfig.contentTable,
    id: supabaseConfig.contentId
  }
}

export async function loadRemoteWebsiteContent() {
  if (!supabase) {
    return {
      ok: false,
      reason: 'Supabase is not configured.'
    }
  }

  const { data, error } = await supabase
    .from(supabaseConfig.contentTable)
    .select('content, updated_at')
    .eq('id', supabaseConfig.contentId)
    .maybeSingle()

  if (error) {
    return {
      ok: false,
      reason: error.message
    }
  }

  if (!data || !hasWebsiteContentShape(data.content)) {
    return {
      ok: false,
      reason: 'Remote content is empty or incomplete.'
    }
  }

  return {
    ok: true,
    content: data.content,
    updatedAt: data.updated_at
  }
}

export async function saveRemoteWebsiteContent(content) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  await requireAuthorizedAdminSession()

  if (!hasWebsiteContentShape(content)) {
    throw new Error('Website content is incomplete.')
  }

  const { data, error } = await supabase
    .from(supabaseConfig.contentTable)
    .update({
      content,
      updated_at: new Date().toISOString()
    })
    .eq('id', supabaseConfig.contentId)
    .select('content')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data.content
}

export async function uploadWebsiteAsset(file, folder = 'website') {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  await requireAuthorizedAdminSession()

  if (!file) {
    throw new Error('Choose a file to upload.')
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Files must be 12 MB or smaller.')
  }

  const safeFolder = folder
    .replace(/[^a-z0-9/_-]/gi, '-')
    .replace(/\.+/g, '-')
    .replace(/^\/+|\/+$/g, '') || 'website'
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-')
  const objectPath = `${safeFolder}/${crypto.randomUUID()}-${safeName}`
  const { data, error } = await supabase.storage
    .from(supabaseConfig.assetBucket)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data: publicUrl } = supabase.storage
    .from(supabaseConfig.assetBucket)
    .getPublicUrl(data.path)

  return publicUrl.publicUrl
}

export async function getSupabaseSession() {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

export async function signInAdmin(email, password) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  })

  if (error) {
    throw new Error(error.message)
  }

  return data.session
}

export async function signOutAdmin() {
  if (!supabase) return
  await supabase.auth.signOut({ scope: 'local' })
}

export function isAllowedAdminSession(session) {
  if (!session?.user || !session.access_token) return false

  const expiresAt = Number(session.expires_at)
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
    return false
  }

  if (!supabaseConfig.adminUserId) {
    return false
  }

  return session.user.id === supabaseConfig.adminUserId
}

async function requireAuthorizedAdminSession() {
  const session = await getSupabaseSession()

  if (!isAllowedAdminSession(session)) {
    throw new Error('Admin authentication is required.')
  }

  return session
}
