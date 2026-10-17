import { createClient } from '@supabase/supabase-js'
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = loadEnv('development', rootDirectory, '')
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
const contentTable = env.VITE_SUPABASE_CONTENT_TABLE || 'website_content'
const contentId = env.VITE_SUPABASE_CONTENT_ID || 'main'
const contentFile = join(rootDirectory, 'src', 'data', 'websiteContent.json')
const backupDirectory = join(rootDirectory, '.chaos-backups', 'website-content')
const backupRetentionMs = 30 * 24 * 60 * 60 * 1000

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env.local.')
}

function hasWebsiteContentShape(content) {
  return Boolean(
    content
    && typeof content === 'object'
    && !Array.isArray(content)
    && content.desktop
    && content.about
    && content.socials
    && content.applications
    && content.shell
    && content.arcade
  )
}

async function getBackups() {
  const entries = await readdir(backupDirectory, { withFileTypes: true })
  const backups = await Promise.all(entries
    .filter((entry) => entry.isFile() && /^backup-\d+-.*\.json$/.test(entry.name))
    .map(async (entry) => ({
      name: entry.name,
      path: join(backupDirectory, entry.name),
      modifiedAt: (await stat(join(backupDirectory, entry.name))).mtimeMs
    })))

  return backups.sort((left, right) => left.modifiedAt - right.modifiedAt)
}

async function removeExpiredBackups() {
  const backups = await getBackups()
  const newestBackup = backups.at(-1)
  const cutoff = Date.now() - backupRetentionMs
  const expiredBackups = backups.filter((backup) => (
    backup.path !== newestBackup?.path && backup.modifiedAt < cutoff
  ))

  await Promise.all(expiredBackups.map((backup) => unlink(backup.path)))

  if (expiredBackups.length) {
    console.log(`Removed ${expiredBackups.length} backup(s) older than 30 days.`)
  }
}

async function createBackup(content) {
  const backups = await getBackups()
  const lastNumber = backups.reduce((highest, backup) => {
    const match = /^backup-(\d+)-/.exec(backup.name)
    return Math.max(highest, Number(match?.[1] ?? 0))
  }, 0)
  const backupNumber = String(lastNumber + 1).padStart(3, '0')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupDirectory, `backup-${backupNumber}-${timestamp}.json`)

  await writeFile(backupPath, `${JSON.stringify(content, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  return backupPath
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

const { data, error } = await supabase
  .from(contentTable)
  .select('content, updated_at')
  .eq('id', contentId)
  .maybeSingle()

if (error) {
  throw new Error(`Could not load live website content: ${error.message}`)
}

if (!data || !hasWebsiteContentShape(data.content)) {
  throw new Error('Live website content is empty or incomplete. Local content was not changed.')
}

await mkdir(backupDirectory, { recursive: true })

const liveContent = `${JSON.stringify(data.content, null, 2)}\n`
const localContent = await readFile(contentFile, 'utf8')

if (localContent === liveContent) {
  await removeExpiredBackups()
  console.log('Local fallback already matches the live Supabase content.')
} else {
  const backupPath = await createBackup(data.content)
  await writeFile(contentFile, liveContent, 'utf8')
  await removeExpiredBackups()
  console.log(`Live content copied to src/data/websiteContent.json.`)
  console.log(`Backup created: ${backupPath}`)
  console.log(`Remote content timestamp: ${data.updated_at ?? 'not available'}`)
}
