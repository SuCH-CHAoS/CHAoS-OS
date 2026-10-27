import { getAssetBucket } from '../../cloudflare/admin.js'

export async function onRequestGet(context) {
  const bucket = getAssetBucket(context.env)
  const pathSegments = context.params.path

  if (!bucket || !Array.isArray(pathSegments) || pathSegments.length === 0) {
    return new Response('Not found.', { status: 404 })
  }

  const objectPath = pathSegments.join('/')
  const object = await bucket.get(objectPath)

  if (!object) {
    return new Response('Not found.', { status: 404 })
  }

  const headers = new Headers()
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream')
  headers.set('X-Content-Type-Options', 'nosniff')

  if (object.httpEtag) {
    headers.set('ETag', object.httpEtag)
  }

  return new Response(object.body, { headers })
}
