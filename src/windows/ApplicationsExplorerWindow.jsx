import { useEffect, useState } from 'react'
import '../styles/applications-window.css'
import FolderGrid from './applications/FolderGrid'
import FolderTree from './applications/FolderTree'
import {
  getApplicationsCategories,
  getApplicationsExplorerRoot,
  getApplicationsFolderIcon
} from './applicationsData'

function ApplicationsExplorerWindow({
  onOpenProjectWindow,
  setHotlineMsg
}) {
  const applicationsCategories = getApplicationsCategories()
  const applicationsExplorerRoot = getApplicationsExplorerRoot()
  const applicationsFolderIcon = getApplicationsFolderIcon()

  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [selectedNodeKey, setSelectedNodeKey] = useState('')

  const activeCategory = applicationsCategories.find((category) => category.id === activeCategoryId) ?? null
  const selectedProject = activeCategory?.projects.find(
    (project) => selectedNodeKey === `project:${project.id}`
  ) ?? null
  const selectedCategory = applicationsCategories.find(
    (category) => selectedNodeKey === `category:${category.id}`
  ) ?? null

  const explorerPath = activeCategory
    ? `C:\\CHAOS\\${applicationsExplorerRoot}\\${activeCategory.label}`
    : `C:\\CHAOS\\${applicationsExplorerRoot}`

  const panelTitle = activeCategory?.label ?? applicationsExplorerRoot

  const statusLabel = activeCategory
    ? `${activeCategory.projects.length} folder(s)`
    : `${applicationsCategories.length} category folder(s)`

  const statusSelection = activeCategory
    ? (selectedProject ? `Selected: ${selectedProject.name}` : 'Project folder ready')
    : (selectedCategory ? `Selected: ${selectedCategory.label}` : 'Desktop root ready')

  const statusHint = activeCategory
    ? 'Icon view'
    : 'Desktop view'

  const handleSelectDesktop = () => {
    setActiveCategoryId('')
    setSelectedNodeKey('')
    setHotlineMsg?.(`Desktop root loaded. ${applicationsCategories.length} category folder(s) available.`)
  }

  const openCategory = (categoryId, shouldSpeak = true) => {
    const category = applicationsCategories.find((item) => item.id === categoryId)
    if (!category) return

    setActiveCategoryId(category.id)
    setSelectedNodeKey(`project:${category.projects[0]?.id ?? ''}`)

    if (shouldSpeak) {
      setHotlineMsg?.(`${category.label} opened. ${category.projects.length} project folder(s) available.`)
    }
  }

  const handleSelectCategory = (categoryId) => {
    openCategory(categoryId)
  }

  const handleSelectCategoryFolder = (categoryId) => {
    setSelectedNodeKey(`category:${categoryId}`)
  }

  const handleOpenCategory = (category) => {
    openCategory(category.id)
  }

  const handleSelectProject = (projectId) => {
    setSelectedNodeKey(`project:${projectId}`)
  }

  useEffect(() => {
    setHotlineMsg?.('Applications Explorer ready. Double-click a folder to open it.')
  }, [setHotlineMsg])

  const handleOpenProject = (project, category = activeCategory) => {
    setSelectedNodeKey(`project:${project.id}`)
    onOpenProjectWindow?.(category, project)
  }

  return (
    <div className="applications-explorer-shell">
      <div className="applications-explorer-addressbar">
        <button
          type="button"
          className="applications-toolbar-button"
          disabled={!activeCategory}
          onClick={handleSelectDesktop}
        >
          Up
        </button>
        <span className="applications-address-label">Address</span>
        <div className="applications-address-field">{explorerPath}</div>
      </div>

      <div className="applications-explorer-body">
        <aside className="applications-explorer-sidebar">
          <div className="applications-pane-titlebar">Folders</div>
          <div className="applications-sidebar-surface">
            <div className="applications-drive-block">
              <div className="applications-drive-row">
                <span>CHAOS (C:)</span>
              </div>
            </div>

            <FolderTree
              categories={applicationsCategories}
              activeCategoryId={activeCategory?.id ?? ''}
              selectedCategoryId={selectedCategory?.id ?? null}
              selectedProjectId={selectedProject?.id ?? null}
              onSelectDesktop={handleSelectDesktop}
              onSelectCategory={handleSelectCategory}
              onSelectProject={handleSelectProject}
              onOpenProject={handleOpenProject}
            />
          </div>
        </aside>

        <section className="applications-explorer-panel">
          <div className="applications-pane-titlebar">
            <span>{panelTitle}</span>
            <span className="applications-pane-caption">
              {activeCategory ? 'Project folders' : 'Category folders'}
            </span>
          </div>

          <FolderGrid
            category={activeCategory}
            categories={applicationsCategories}
            folderIconSrc={applicationsFolderIcon}
            isRootView={!activeCategory}
            selectedCategoryId={selectedCategory?.id ?? null}
            selectedProjectId={selectedProject?.id ?? null}
            onSelectCategory={handleSelectCategoryFolder}
            onOpenCategory={handleOpenCategory}
            onSelectProject={handleSelectProject}
            onOpenProject={handleOpenProject}
          />
        </section>
      </div>

      <div className="applications-explorer-status">
        <span>{statusSelection}</span>
        <span>{statusLabel}</span>
        <span>{statusHint}</span>
      </div>
    </div>
  )
}

export default ApplicationsExplorerWindow
