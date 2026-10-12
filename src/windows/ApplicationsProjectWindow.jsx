import { useState } from 'react'
import githubIcon from '../assets/icons/github.png'
import '../styles/applications-window.css'
import {
  getApplicationsExplorerRoot,
  getApplicationsFolderIcon
} from './applicationsData'
import FolderIcon from './applications/FolderIcon'
import ApplicationsPreviewCard from './applications/ApplicationsPreviewCard'

function ApplicationsProjectWindow({ category, project }) {
  const applicationsExplorerRoot = getApplicationsExplorerRoot()
  const applicationsFolderIcon = getApplicationsFolderIcon()
  const locationPath = `C:\\CHAOS\\${applicationsExplorerRoot}\\${category.label}\\${project.name}`
  const hasPreview = Boolean(project.screenshots?.length)
  const [activeTab, setActiveTab] = useState('general')

  const resolvedTab = activeTab === 'preview' && !hasPreview ? 'general' : activeTab

  const activeTabLabel = (
    resolvedTab === 'stack'
      ? 'Stack'
      : resolvedTab === 'preview'
        ? 'Preview'
        : 'General'
  )

  return (
    <div className="applications-project-shell">
      <div className="applications-explorer-addressbar is-project">
        <span className="applications-address-label">In</span>
        <div className="applications-address-field">{locationPath}</div>
      </div>

      <div className="applications-project-dialog">
        <div className="applications-project-tabbar" role="tablist" aria-label="Project properties">
          <button
            type="button"
            className={`applications-project-tab ${resolvedTab === 'general' ? 'is-active' : ''}`.trim()}
            onClick={() => setActiveTab('general')}
            role="tab"
            aria-selected={resolvedTab === 'general'}
          >
            General
          </button>
          <button
            type="button"
            className={`applications-project-tab ${resolvedTab === 'stack' ? 'is-active' : ''}`.trim()}
            onClick={() => setActiveTab('stack')}
            role="tab"
            aria-selected={resolvedTab === 'stack'}
          >
            Stack
          </button>
          {hasPreview ? (
            <button
              type="button"
              className={`applications-project-tab ${resolvedTab === 'preview' ? 'is-active' : ''}`.trim()}
              onClick={() => setActiveTab('preview')}
              role="tab"
              aria-selected={resolvedTab === 'preview'}
            >
              Preview
            </button>
          ) : null}
        </div>

        <div className="applications-project-sheet">
          {resolvedTab === 'general' ? (
            <div className="applications-project-page">
              <div className="applications-project-identity">
                <div className="applications-project-badge">
                  <FolderIcon size="xlarge" src={project.icon ?? applicationsFolderIcon} />
                  <div className="applications-project-badge-copy">
                    <div className="applications-project-kicker">{category.label}</div>
                    <div className="applications-project-type">Project Folder</div>
                  </div>
                </div>

                <div className="applications-project-hero">
                  <h2 className="applications-project-title">{project.name}</h2>
                  <p className="applications-project-description">{project.description}</p>
                </div>
              </div>

              <div className="applications-project-groups">
                <fieldset className="applications-project-group">
                  <legend>Folder</legend>
                  <div className="applications-project-fields">
                    <div className="applications-project-field">
                      <span className="applications-project-field-label">Category</span>
                      <span className="applications-project-field-value">{category.label}</span>
                    </div>
                    <div className="applications-project-field">
                      <span className="applications-project-field-label">Type</span>
                      <span className="applications-project-field-value">Project Folder</span>
                    </div>
                    <div className="applications-project-field">
                      <span className="applications-project-field-label">Tech Count</span>
                      <span className="applications-project-field-value">{project.technologies.length}</span>
                    </div>
                    <div className="applications-project-field">
                      <span className="applications-project-field-label">Repository</span>
                      <span className="applications-project-field-value">{project.githubLabel}</span>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="applications-project-group">
                  <legend>Notes</legend>
                  <div className="applications-project-panel-body">
                    <p className="applications-pane-copy">{project.repositoryNote}</p>
                  </div>
                </fieldset>
              </div>
            </div>
          ) : null}

          {resolvedTab === 'stack' ? (
            <div className="applications-project-page is-stack">
              <fieldset className="applications-project-group">
                <legend>Built With</legend>
                <div className="applications-project-panel-body">
                  <ul className="applications-tech-list">
                    {project.technologies.map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>
                </div>
              </fieldset>

              <fieldset className="applications-project-group">
                <legend>Repository</legend>
                <div className="applications-project-panel-body">
                  <a
                    className="applications-project-link"
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img src={githubIcon} alt="" aria-hidden="true" />
                    <span>{project.githubLabel}</span>
                  </a>

                  <p className="applications-pane-copy">{project.repositoryNote}</p>
                </div>
              </fieldset>
            </div>
          ) : null}

          {resolvedTab === 'preview' && hasPreview ? (
            <div className="applications-project-page is-preview">
              <fieldset className="applications-project-group">
                <legend>Preview Panels</legend>
                <div className="applications-project-panel-body">
                  <div className="applications-preview-gallery">
                    {project.screenshots.map((preview) => (
                      <ApplicationsPreviewCard key={preview.id} preview={preview} />
                    ))}
                  </div>
                </div>
              </fieldset>
            </div>
          ) : null}
        </div>
      </div>

      <div className="applications-explorer-status is-project">
        <span>{project.name}</span>
        <span>{activeTabLabel}</span>
        <span>{hasPreview ? 'Tabs ready' : 'No preview tab'}</span>
      </div>
    </div>
  )
}

export default ApplicationsProjectWindow
