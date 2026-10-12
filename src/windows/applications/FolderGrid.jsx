import FolderIcon from './FolderIcon'

function shouldOpenWithSingleClick() {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(max-width: 768px)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  )
}

function FolderGrid({
  category,
  categories,
  folderIconSrc = '',
  isRootView = false,
  selectedCategoryId,
  selectedProjectId,
  onSelectCategory,
  onOpenCategory,
  onSelectProject,
  onOpenProject
}) {
  if (isRootView) {
    return (
      <div className="applications-folder-grid" role="list">
        {categories.map((folder) => (
          <button
            key={folder.id}
            type="button"
            className={`applications-folder-tile ${selectedCategoryId === folder.id ? 'is-selected' : ''}`.trim()}
            onClick={() => {
              if (shouldOpenWithSingleClick()) {
                onOpenCategory(folder)
                return
              }

              onSelectCategory(folder.id)
            }}
            onDoubleClick={() => onOpenCategory(folder)}
            role="listitem"
          >
            <FolderIcon size="large" src={folderIconSrc} />
            <span className="applications-folder-name">{folder.label}</span>
            <span className="applications-folder-meta">{folder.projects.length} item(s)</span>
          </button>
        ))}
      </div>
    )
  }

  if (!category) {
    return (
      <div className="applications-empty-state">
        No folders available.
      </div>
    )
  }

  return (
    <div className="applications-folder-grid" role="list">
      {category.projects.map((project) => (
        <button
          key={project.id}
          type="button"
          className={`applications-folder-tile ${selectedProjectId === project.id ? 'is-selected' : ''}`.trim()}
          onClick={() => {
            if (shouldOpenWithSingleClick()) {
              onOpenProject(project, category)
              return
            }

            onSelectProject(project.id)
          }}
          onDoubleClick={() => onOpenProject(project, category)}
          role="listitem"
        >
          <FolderIcon size="large" src={folderIconSrc} />
          <span className="applications-folder-name">{project.name}</span>
          <span className="applications-folder-meta">Project Folder</span>
        </button>
      ))}
    </div>
  )
}

export default FolderGrid
