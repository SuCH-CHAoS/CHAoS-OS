export function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined
  }

  return JSON.parse(JSON.stringify(value))
}

export function formatJson(value) {
  return JSON.stringify(value, null, 2)
}

export function deepJsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function getValueAtPath(source, path) {
  return path.reduce((value, key) => value?.[key], source)
}

export function setValueAtPath(source, path, nextValue) {
  if (!path.length) {
    return cloneJsonValue(nextValue)
  }

  const nextSource = cloneJsonValue(source)
  let cursor = nextSource

  for (let index = 0; index < path.length - 1; index += 1) {
    cursor = cursor[path[index]]
  }

  cursor[path[path.length - 1]] = cloneJsonValue(nextValue)
  return nextSource
}

export function appendArrayItemAtPath(source, path, nextItem) {
  const items = [...(getValueAtPath(source, path) ?? [])]
  items.push(cloneJsonValue(nextItem))
  return setValueAtPath(source, path, items)
}

export function removeArrayItemAtPath(source, path, index) {
  const items = [...(getValueAtPath(source, path) ?? [])]
  items.splice(index, 1)
  return setValueAtPath(source, path, items)
}

export function slugify(value, fallback = 'item') {
  const normalized = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || fallback
}

export function ensureUniqueStringId(existingIds, value, fallback = 'item') {
  const baseId = slugify(value, fallback)
  const usedIds = new Set(existingIds)

  if (!usedIds.has(baseId)) {
    return baseId
  }

  let suffix = 2
  while (usedIds.has(`${baseId}-${suffix}`)) {
    suffix += 1
  }

  return `${baseId}-${suffix}`
}

export function getNextNumericId(items) {
  return items.reduce((maxId, item) => {
    const numericId = Number(item?.id)
    return Number.isFinite(numericId) ? Math.max(maxId, numericId) : maxId
  }, 0) + 1
}
