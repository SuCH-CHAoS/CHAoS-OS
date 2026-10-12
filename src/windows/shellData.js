import websiteContent from '../data/websiteContent'

export function getPixelArtMaps() {
  return websiteContent.shell.pixelArtMaps
}

export function getShellProjects() {
  return websiteContent.shell.projects
}

export function getNetworkingProjects() {
  return websiteContent.shell.networkingProjects
}

export function getTerminalEasterEggs() {
  return websiteContent.shell.terminalEasterEggs
}

export function getEasterEggAliases() {
  return websiteContent.shell.easterEggAliases
}

export function getInitialTerminalLines() {
  return websiteContent.shell.initialTerminalLines
}

export function getTerminalHelpLines() {
  return websiteContent.shell.helpLines
}

export function getTerminalStatusLines() {
  return websiteContent.shell.statusLines
}

export function getSpecialChannelCommand() {
  return websiteContent.shell.channelCommand
}

export function getSpecialChannelLines() {
  return websiteContent.shell.channelLines
}

export function getSpecialChannelPhoneMsg() {
  return websiteContent.shell.channelPhoneMsg
}

export function getProjectCollection(collectionKey) {
  const { shell } = websiteContent
  const collection = shell.collections[collectionKey]

  if (!collection) {
    return null
  }

  return {
    title: collection.title,
    items: collectionKey === 'projects'
      ? getShellProjects()
      : getNetworkingProjects(),
    prompt: collection.prompt,
    windowPrefix: collection.windowPrefix
  }
}

export function getProjectById(collectionKey, numericId) {
  const collection = getProjectCollection(collectionKey)
  if (!collection) return null
  return collection.items.find((project) => project.id === numericId) ?? null
}

export function getProjectWindowId(collectionKey, numericId) {
  const collection = getProjectCollection(collectionKey)
  if (!collection) return null
  return `${collection.windowPrefix}-${numericId}`
}
