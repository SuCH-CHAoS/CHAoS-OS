import websiteContent from '../data/websiteContent'

export function getApplicationsExplorerRoot() {
  return websiteContent.applications.explorerRoot
}

export function getApplicationsFolderIcon() {
  return websiteContent.applications.folderIcon
}

export function getApplicationsCategories() {
  return websiteContent.applications.categories
}

export function getApplicationsProjectWindowId(projectId) {
  return `applications-project-${projectId}`
}
