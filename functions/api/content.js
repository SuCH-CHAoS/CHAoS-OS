import {
  getContentDatabase,
  hasWebsiteContentShape,
  jsonResponse
} from '../../cloudflare/admin.js'

const CONTENT_ID = 'main'

export async function onRequestGet(context) {
  const database = getContentDatabase(context.env)

  if (!database) {
    return jsonResponse({ error: 'Content service is not configured.' }, 503)
  }

  try {
    const record = await database
      .prepare('SELECT content, updated_at FROM website_content WHERE id = ? LIMIT 1')
      .bind(CONTENT_ID)
      .first()

    if (!record) {
      return jsonResponse({ content: null, updatedAt: null })
    }

    const content = JSON.parse(record.content)

    if (!hasWebsiteContentShape(content)) {
      return jsonResponse({ error: 'Saved content is incomplete.' }, 500)
    }

    return jsonResponse({
      content,
      updatedAt: record.updated_at
    })
  } catch {
    return jsonResponse({ error: 'Content service is unavailable.' }, 503)
  }
}
