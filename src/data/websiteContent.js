import seedContent from './websiteContent.json'

export const WEBSITE_CONTENT_UPDATED_EVENT = 'chaos-website-content-updated'

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function syncArrayTarget(target, source) {
  target.length = source.length

  source.forEach((nextValue, index) => {
    const currentValue = target[index]

    if (Array.isArray(nextValue) && Array.isArray(currentValue)) {
      syncArrayTarget(currentValue, nextValue)
      return
    }

    if (isPlainObject(nextValue) && isPlainObject(currentValue)) {
      syncObjectTarget(currentValue, nextValue)
      return
    }

    target[index] = cloneJsonValue(nextValue)
  })
}

function syncObjectTarget(target, source) {
  const sourceKeys = new Set(Object.keys(source))

  Object.keys(target).forEach((key) => {
    if (!sourceKeys.has(key)) {
      delete target[key]
    }
  })

  Object.entries(source).forEach(([key, nextValue]) => {
    const currentValue = target[key]

    if (Array.isArray(nextValue) && Array.isArray(currentValue)) {
      syncArrayTarget(currentValue, nextValue)
      return
    }

    if (isPlainObject(nextValue) && isPlainObject(currentValue)) {
      syncObjectTarget(currentValue, nextValue)
      return
    }

    target[key] = cloneJsonValue(nextValue)
  })
}

const websiteContent = cloneJsonValue(seedContent)

export function createWebsiteContentSnapshot() {
  return cloneJsonValue(websiteContent)
}

export function updateWebsiteContent(nextContent) {
  if (!isPlainObject(nextContent)) {
    throw new Error('Website content must be a JSON object.')
  }

  syncObjectTarget(websiteContent, nextContent)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WEBSITE_CONTENT_UPDATED_EVENT))
  }
}

export default websiteContent
