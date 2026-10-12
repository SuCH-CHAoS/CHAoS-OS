function shouldOpenWithSingleClick() {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(max-width: 768px)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  )
}

function TreeRow({
  label,
  className = '',
  isExpanded = false,
  isOpen = false,
  isSelected = false,
  hasChildren = false,
  onClick,
  onDoubleClick
}) {
  return (
    <button
      type="button"
      className={[
        'applications-tree-row',
        className,
        isOpen ? 'is-open' : '',
        isSelected ? 'is-selected' : ''
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
    >
      {hasChildren ? (
        <span className="applications-tree-toggle" aria-hidden="true">
          {isExpanded ? '-' : '+'}
        </span>
      ) : (
        <span className="applications-tree-spacer" aria-hidden="true" />
      )}

      <span className="applications-tree-caption">
        <span className="applications-tree-label">{label}</span>
      </span>
    </button>
  )
}

function FolderTree({
  categories,
  activeCategoryId,
  selectedCategoryId,
  selectedProjectId,
  onSelectDesktop,
  onSelectCategory,
  onSelectProject,
  onOpenProject
}) {
  const isDesktopSelected = !activeCategoryId && !selectedCategoryId && !selectedProjectId

  return (
    <div className="applications-tree" role="tree" aria-label="Application categories">
      <div className="applications-tree-node is-drive">
        <TreeRow
          label="CHAOS (C:)"
          className="is-drive"
          hasChildren
          isExpanded
          isOpen={isDesktopSelected}
          onClick={onSelectDesktop}
        />

        <div className="applications-tree-children is-root" role="group">
          <div className="applications-tree-node">
            <TreeRow
              label="Desktop"
              className="is-root"
              hasChildren
              isExpanded
              isOpen={isDesktopSelected}
              isSelected={isDesktopSelected}
              onClick={onSelectDesktop}
            />

            <div className="applications-tree-children" role="group">
              {categories.map((category, categoryIndex) => {
                const expanded = category.id === activeCategoryId
                const isSelected = selectedCategoryId === category.id
                const isLastCategory = categoryIndex === categories.length - 1

                return (
                  <div
                    key={category.id}
                    className={`applications-tree-node ${isLastCategory ? 'is-last' : ''}`.trim()}
                  >
                    <TreeRow
                      label={category.label}
                      className="is-category"
                      hasChildren
                      isExpanded={expanded}
                      isOpen={expanded}
                      isSelected={isSelected}
                      onClick={() => onSelectCategory(category.id)}
                    />

                    {expanded ? (
                      <div className="applications-tree-children" role="group">
                        {category.projects.map((project, projectIndex) => (
                          <div
                            key={project.id}
                            className={`applications-tree-node ${projectIndex === category.projects.length - 1 ? 'is-last' : ''}`.trim()}
                          >
                            <TreeRow
                              label={project.name}
                              className="is-project"
                              isSelected={selectedProjectId === project.id}
                              onClick={() => {
                                if (shouldOpenWithSingleClick()) {
                                  onOpenProject(project, category)
                                  return
                                }

                                onSelectProject(project.id)
                              }}
                              onDoubleClick={() => onOpenProject(project, category)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FolderTree
