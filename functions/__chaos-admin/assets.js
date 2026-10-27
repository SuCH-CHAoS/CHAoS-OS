import {
  createAssetPublicUrl,
  getAssetBucket,
  hasValidAdminSession,
  jsonResponse,
  safeAssetFolder,
  safeAssetName
} from '../../cloudflare/admin.js'

const MAX_FILE_SIZE = 12 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = new Set([
  'application/msword',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/x-icon'
])

export async function onRequestPost(context) {
  if (!(await hasValidAdminSession(context.request, context.env))) {
    return jsonResponse({ error: 'Admin authentication is required.' }, 401)
  }

  const bucket = getAssetBucket(context.env)
  if (!bucket) {
    return jsonResponse({ error: 'Asset service is not configured.' }, 503)
  }

  let formData

  try {
    formData = await context.request.formData()
  } catch {
    return jsonResponse({ error: 'Upload request is invalid.' }, 400)
  }

  const file = formData.get('file')
  const folder = safeAssetFolder(formData.get('folder'))

  if (!(file instanceof File)) {
    return jsonResponse({ error: 'Choose a file to upload.' }, 400)
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonResponse({ error: 'Files must be 12 MB or smaller.' }, 400)
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return jsonResponse({ error: 'This file type is not supported.' }, 400)
  }

  const objectPath = `${folder}/${crypto.randomUUID()}-${safeAssetName(file.name)}`

  try {
    await bucket.put(objectPath, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream'
      }
    })

    return jsonResponse({
      publicUrl: createAssetPublicUrl(context.request, objectPath)
    })
  } catch {
    return jsonResponse({ error: 'Asset upload failed.' }, 503)
  }
}
