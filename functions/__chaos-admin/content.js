import {
  getContentDatabase,
  hasValidAdminSession,
  hasWebsiteContentShape,
  jsonResponse
} from '../../cloudflare/admin.js'

const CONTENT_ID = 'main'

export async function onRequestGet(context) {
  if (!(await hasValidAdminSession(context.request, context.env))) {
    return jsonResponse({ error: 'Admin authentication is required.' }, 401)
  }

  const database = getContentDatabase(context.env)
  if (!database) {
    return jsonResponse({ error: 'Content service is not configured.' }, 503)
  }

  try {
    const record = await database
      .prepare('SELECT content, updated_at FROM website_content WHERE id = ? LIMIT 1')
      .bind(CONTENT_ID)
      .first()

    return jsonResponse({
      content: record ? JSON.parse(record.content) : null,
      updatedAt: record?.updated_at ?? null
    })
  } catch {
    return jsonResponse({ error: 'Content service is unavailable.' }, 503)
  }
}

export async function onRequestPut(context) {
  if (!(await hasValidAdminSession(context.request, context.env))) {
    return jsonResponse({ error: 'Admin authentication is required.' }, 401)
  }

  const database = getContentDatabase(context.env)
  if (!database) {
    return jsonResponse({ error: 'Content service is not configured.' }, 503)
  }

  let content

  try {
    content = await context.request.json()
  } catch {
    return jsonResponse({ error: 'Content must be valid JSON.' }, 400)
  }

  if (!hasWebsiteContentShape(content)) {
    return jsonResponse({ error: 'Website content is incomplete.' }, 400)
  }

  const updatedAt = new Date().toISOString()

  try {
    await database
      .prepare(
        `INSERT INTO website_content (id, content, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
      )
      .bind(CONTENT_ID, JSON.stringify(content), updatedAt)
      .run()

    return jsonResponse({ content, updatedAt })
  } catch {
    return jsonResponse({ error: 'Content could not be saved.' }, 503)
  }
}
