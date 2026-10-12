import { Buffer } from 'node:buffer'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const ADMIN_CONTENT_API_PATH = '/__chaos-admin/content'
const ADMIN_SESSION_API_PATH = '/__chaos-admin/session'
const ADMIN_SESSION_TTL_MS = 30 * 60 * 1000

const websiteContentPath = fileURLToPath(
  new URL('./src/data/websiteContent.json', import.meta.url)
)

async function readRequestBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function safeCompareText(input, expected) {
  if (!input || !expected) return false

  const inputBuffer = Buffer.from(input)
  const expectedBuffer = Buffer.from(expected)

  if (inputBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(inputBuffer, expectedBuffer)
}

function getAdminToken(request) {
  const authorization = request.headers.authorization

  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length)
  }

  const headerToken = request.headers['x-chaos-admin-token']
  return Array.isArray(headerToken) ? headerToken[0] : headerToken
}

function isLocalRequest(request) {
  const address = request.socket.remoteAddress

  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1'
  )
}

function chaosAdminContentApi(adminPassphrase) {
  const adminSessions = new Map()

  const createAdminSession = () => {
    const token = randomUUID()
    adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS)
    return token
  }

  const hasActiveAdminSession = (token) => {
    const expiresAt = adminSessions.get(token)

    if (!expiresAt) {
      return false
    }

    if (expiresAt < Date.now()) {
      adminSessions.delete(token)
      return false
    }

    return true
  }

  return {
    name: 'chaos-admin-content-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(ADMIN_SESSION_API_PATH, async (request, response, next) => {
        if (request.method !== 'POST') {
          next()
          return
        }

        try {
          if (!isLocalRequest(request)) {
            sendJson(response, 403, { ok: false })
            return
          }

          if (!adminPassphrase) {
            sendJson(response, 404, { ok: false })
            return
          }

          const requestBody = await readRequestBody(request)
          const parsedBody = JSON.parse(requestBody)

          if (!safeCompareText(parsedBody?.passphrase, adminPassphrase)) {
            sendJson(response, 403, { ok: false })
            return
          }

          const token = createAdminSession()
          sendJson(response, 200, { ok: true, token })
        } catch (error) {
          sendJson(response, 500, {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown admin session error.'
          })
        }
      })

      server.middlewares.use(ADMIN_CONTENT_API_PATH, async (request, response, next) => {
        if (request.method !== 'GET' && request.method !== 'POST') {
          next()
          return
        }

        try {
          if (!isLocalRequest(request) || !hasActiveAdminSession(getAdminToken(request))) {
            sendJson(response, 401, {
              ok: false,
              error: 'Admin session required.'
            })
            return
          }

          if (request.method === 'GET') {
            const fileContent = await readFile(websiteContentPath, 'utf8')
            response.setHeader('Cache-Control', 'no-store')
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(fileContent)
            return
          }

          const requestBody = await readRequestBody(request)
          const parsedContent = JSON.parse(requestBody)
          const nextFileContent = `${JSON.stringify(parsedContent, null, 2)}\n`

          await writeFile(websiteContentPath, nextFileContent, 'utf8')
          server.watcher.emit('change', websiteContentPath)

          sendJson(response, 200, { ok: true })
        } catch (error) {
          sendJson(response, 500, {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown admin save error.'
          })
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      chaosAdminContentApi(env.CHAOS_ADMIN_PASSPHRASE)
    ]
  }
})
