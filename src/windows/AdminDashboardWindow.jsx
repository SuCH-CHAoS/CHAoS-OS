import { useCallback, useEffect, useMemo, useState } from 'react'
import '../styles/admin-window.css'
import StructuredSectionEditor from './admin/StructuredSectionEditor'
import {
  createWebsiteContentSnapshot,
  updateWebsiteContent
} from '../data/websiteContent'
import {
  ADMIN_CONTENT_API_PATH,
  createAdminRequestHeaders
} from './admin/adminSession'
import {
  getRemoteContentStatus,
  getSupabaseSession,
  isAllowedAdminSession,
  loadRemoteWebsiteContent,
  saveRemoteWebsiteContent,
  signInAdmin,
  signOutAdmin
} from '../services/websiteContentRemote'
import {
  cloneJsonValue,
  deepJsonEqual,
  formatJson,
  getValueAtPath,
  setValueAtPath
} from './admin/editorUtils'
import { supportsStructuredSection } from './admin/structuredSections'

const ADMIN_FILE_LABEL = 'src\\data\\websiteContent.json'
const REMOTE_CONTENT_LABEL = 'Supabase website_content.main'

const ADMIN_SECTION_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      {
        id: 'dashboard-home',
        label: 'Home',
        path: [],
        pathLabel: 'control',
        description: 'Pick what you want to edit from one guided control screen.',
        home: true
      }
    ]
  },
  {
    id: 'workspace',
    label: 'Core',
    items: [
      {
        id: 'desktop',
        label: 'Desktop',
        path: ['desktop'],
        pathLabel: 'desktop',
        description: 'Desktop icons, hotline chatter, system status, and shell copy.',
        structured: true
      },
      {
        id: 'about',
        label: 'About',
        path: ['about'],
        pathLabel: 'about',
        description: 'Identity copy, focus areas, and current-state information.',
        structured: true
      },
      {
        id: 'socials',
        label: 'Socials',
        path: ['socials'],
        pathLabel: 'socials',
        description: 'External links and social labels.',
        structured: true
      }
    ]
  },
  {
    id: 'applications',
    label: 'Applications',
    items: [
      {
        id: 'applications-root',
        label: 'Applications Root',
        path: ['applications'],
        pathLabel: 'applications',
        description: 'Explorer-level application data, including shared folder icon settings.',
        structured: true
      },
      {
        id: 'applications-projects',
        label: 'Application Projects',
        path: ['applications', 'categories'],
        pathLabel: 'applications.categories',
        description: 'Category folders and all application project entries.',
        structured: true
      }
    ]
  },
  {
    id: 'shell',
    label: 'Shell',
    items: [
      {
        id: 'shell-root',
        label: 'Shell Root',
        path: ['shell'],
        pathLabel: 'shell',
        description: 'Terminal boot text, project collections, pixel maps, and hidden protocols.'
      },
      {
        id: 'shell-projects',
        label: 'Shell Projects',
        path: ['shell', 'projects'],
        pathLabel: 'shell.projects',
        description: 'Shell project windows, stack data, and hotline copy.',
        structured: true
      },
      {
        id: 'shell-networking',
        label: 'Networking Projects',
        path: ['shell', 'networkingProjects'],
        pathLabel: 'shell.networkingProjects',
        description: 'Networking lab projects and their project-window content.',
        structured: true
      },
      {
        id: 'shell-eggs',
        label: 'Terminal Easter Eggs',
        path: ['shell', 'terminalEasterEggs'],
        pathLabel: 'shell.terminalEasterEggs',
        description: 'Hidden terminal reaction blocks and phone responses.'
      },
      {
        id: 'shell-aliases',
        label: 'Egg Aliases',
        path: ['shell', 'easterEggAliases'],
        pathLabel: 'shell.easterEggAliases',
        description: 'Command aliases that map typed phrases to terminal easter eggs.'
      }
    ]
  },
  {
    id: 'arcade',
    label: 'Arcade',
    items: [
      {
        id: 'arcade-root',
        label: 'Arcade Root',
        path: ['arcade'],
        pathLabel: 'arcade',
        description: 'Arcade-mode zone labels, marquee text, hotline chatter, and controls.'
      },
      {
        id: 'arcade-projects',
        label: 'Arcade Projects',
        path: ['arcade', 'projects'],
        pathLabel: 'arcade.projects',
        description: 'Arcade and XR project cards, detail copy, and hotline sequences.',
        structured: true
      }
    ]
  },
  {
    id: 'advanced',
    label: 'Advanced',
    items: [
      {
        id: 'all-content',
        label: 'All Content JSON',
        path: [],
        pathLabel: 'root',
        description: 'Edit the full website content file in one pass.'
      }
    ]
  }
]

const ADMIN_SECTIONS = ADMIN_SECTION_GROUPS.flatMap((group) => group.items)

function AdminSectionTree({
  activeSectionId,
  onSelectSection
}) {
  return (
    <div className="admin-section-tree" role="tree" aria-label="Dashboard sections">
      {ADMIN_SECTION_GROUPS.map((group) => (
        <section key={group.id} className="admin-section-group">
          <div className="admin-section-group-label">{group.label}</div>
          <div className="admin-section-group-items">
            {group.items.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`admin-section-row ${activeSectionId === section.id ? 'is-selected' : ''}`.trim()}
                onClick={() => onSelectSection(section.id)}
                role="treeitem"
                aria-selected={activeSectionId === section.id}
              >
                <span className="admin-section-row-label">{section.label}</span>
                <span className="admin-section-row-path">{section.pathLabel}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function applyRawDrafts(content, rawDrafts) {
  let nextContent = cloneJsonValue(content)

  Object.entries(rawDrafts).forEach(([sectionId, rawDraft]) => {
    const section = ADMIN_SECTIONS.find((item) => item.id === sectionId)
    if (!section) return

    nextContent = setValueAtPath(nextContent, section.path, JSON.parse(rawDraft))
  })

  return nextContent
}

function AdminHomePanel({
  isDirty,
  status,
  busy,
  storageLabel,
  onSelectSection,
  onReload,
  onSave
}) {
  const quickActions = [
    {
      id: 'applications-projects',
      title: 'Application Projects',
      label: 'Add/edit apps',
      description: 'Manage application categories, project folders, tech stacks, links, icons, and previews.'
    },
    {
      id: 'shell-projects',
      title: 'Shell Projects',
      label: 'Terminal entries',
      description: 'Edit Shell projects, stack text, highlights, terminal visuals, and phone lines.'
    },
    {
      id: 'shell-networking',
      title: 'Networking Projects',
      label: 'Network labs',
      description: 'Update networking project windows, lab descriptions, operations, and visuals.'
    },
    {
      id: 'arcade-projects',
      title: 'Arcade Projects',
      label: 'Arcade cards',
      description: 'Control Arcade project cards, thumbnails, platform lists, and detail copy.'
    },
    {
      id: 'desktop',
      title: 'Desktop',
      label: 'Shell + icons',
      description: 'Change desktop icon labels/images, idle chatter, tray lines, and system copy.'
    },
    {
      id: 'about',
      title: 'About',
      label: 'Profile',
      description: 'Edit identity text, profile image, CV path, focus areas, and current system state.'
    },
    {
      id: 'socials',
      title: 'Socials',
      label: 'Links',
      description: 'Update social labels, URLs, mail links, and custom icon paths.'
    },
    {
      id: 'all-content',
      title: 'Advanced JSON',
      label: 'Full file',
      description: 'Use this only when a field is not exposed in the structured editors yet.'
    }
  ]

  return (
    <div className="admin-home-surface">
      <section className="admin-home-hero">
        <div>
          <div className="admin-home-kicker">SUPABASE CONTROL PANEL</div>
          <h2>Choose what you want to edit.</h2>
          <p>
            Start with a card below, change fields in the structured editor, then press Save All.
            Raw JSON is still available for advanced edits.
          </p>
        </div>

        <div className="admin-home-state">
          <span className={isDirty ? 'is-dirty' : 'is-synced'}>
            {isDirty ? 'Pending edits' : 'Synced'}
          </span>
          <span>{status}</span>
        </div>
      </section>

      <section className="admin-home-steps" aria-label="Dashboard steps">
        <div className="admin-home-step">
          <span>1</span>
          <strong>Pick Section</strong>
          <p>Use a quick card or the left section list.</p>
        </div>
        <div className="admin-home-step">
          <span>2</span>
          <strong>Edit Fields</strong>
          <p>Structured controls are preferred. JSON is the fallback.</p>
        </div>
        <div className="admin-home-step">
          <span>3</span>
          <strong>Save All</strong>
          <p>Writes changes to the active content source.</p>
        </div>
      </section>

      <section className="admin-home-actions" aria-label="Quick actions">
        {quickActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="admin-home-card"
            onClick={() => onSelectSection(action.id)}
          >
            <span>{action.label}</span>
            <strong>{action.title}</strong>
            <em>{action.description}</em>
          </button>
        ))}
      </section>

      <section className="admin-home-footer">
        <div className="admin-home-note">
          Save writes to <strong>{storageLabel}</strong>.
        </div>
        <div className="admin-inline-actions">
          <button
            type="button"
            className="admin-toolbar-button"
            onClick={onReload}
            disabled={busy}
          >
            Reload Content
          </button>
          <button
            type="button"
            className="admin-toolbar-button is-primary"
            onClick={onSave}
            disabled={busy || !isDirty}
          >
            Save All
          </button>
        </div>
      </section>
    </div>
  )
}

function AdminLoginPanel({
  email,
  password,
  status,
  busy,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit
}) {
  return (
    <div className="admin-login-surface">
      <form className="admin-login-card" onSubmit={onSubmit} autoComplete="off">
        <div className="admin-home-kicker">PRIVATE CONTENT ACCESS</div>
        <h2>Sign in to Supabase.</h2>
        <p>
          The terminal phrase only opens this door. Supabase Auth and database policies decide
          whether content can actually be edited.
        </p>

        <label className="admin-field">
          <span className="admin-field-label">Email</span>
          <input
            className="admin-field-input"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="admin-field">
          <span className="admin-field-label">Password</span>
          <input
            className="admin-field-input"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="off"
          />
        </label>

        {error ? <div className="admin-login-error">{error}</div> : null}
        <div className="admin-login-status">{status}</div>

        <button
          type="submit"
          className="admin-toolbar-button is-primary"
          disabled={busy || !email || !password}
        >
          {busy ? 'Checking...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

function AdminDashboardWindow({ adminToken, setHotlineMsg, onClose }) {
  const remoteStatus = getRemoteContentStatus()
  const [savedContent, setSavedContent] = useState(() => createWebsiteContentSnapshot())
  const [draftContent, setDraftContent] = useState(() => createWebsiteContentSnapshot())
  const [activeSectionId, setActiveSectionId] = useState('dashboard-home')
  const [rawDrafts, setRawDrafts] = useState({})
  const [editorModes, setEditorModes] = useState({})
  const [status, setStatus] = useState(remoteStatus.configured
    ? 'Connect Supabase to edit live content.'
    : 'Supabase is not configured. Local dev fallback active.'
  )
  const [busy, setBusy] = useState(false)
  const [adminSession, setAdminSession] = useState(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const activeSection = useMemo(
    () => ADMIN_SECTIONS.find((section) => section.id === activeSectionId) ?? ADMIN_SECTIONS[0],
    [activeSectionId]
  )

  const isHomeSection = activeSection.home === true
  const supportsStructuredEditor = !isHomeSection && activeSection.structured && supportsStructuredSection(activeSection.id)
  const activeEditorMode = isHomeSection
    ? 'home'
    : supportsStructuredEditor
    ? (editorModes[activeSection.id] ?? 'structured')
    : 'json'
  const activeSectionValue = getValueAtPath(draftContent, activeSection.path)
  const savedSectionValue = getValueAtPath(savedContent, activeSection.path)
  const serializedSectionValue = useMemo(
    () => formatJson(activeSectionValue),
    [activeSectionValue]
  )

  const editorValue = rawDrafts[activeSection.id] ?? serializedSectionValue
  const activeSectionDirty = rawDrafts[activeSection.id] !== undefined
    || !deepJsonEqual(activeSectionValue, savedSectionValue)
  const isDirty = !deepJsonEqual(draftContent, savedContent) || Object.keys(rawDrafts).length > 0
  const canUseRemoteContent = remoteStatus.configured && isAllowedAdminSession(adminSession)
  const storageLabel = canUseRemoteContent ? REMOTE_CONTENT_LABEL : ADMIN_FILE_LABEL
  const needsRemoteLogin = remoteStatus.configured && !canUseRemoteContent

  const applyRemoteContent = useCallback((content, nextStatus) => {
    setSavedContent(content)
    setDraftContent(content)
    setRawDrafts({})
    updateWebsiteContent(content)
    setStatus(nextStatus)
  }, [])

  const loadRemoteDraft = useCallback(async (successStatus = 'Supabase content loaded.') => {
    const result = await loadRemoteWebsiteContent()

    if (!result.ok) {
      const emptyRemote = result.reason === 'Remote content is empty or incomplete.'
      setStatus(emptyRemote
        ? 'Supabase content is empty. Your local draft will stay local until you save an edit.'
        : 'Supabase content could not be loaded. Your local draft will stay local.'
      )
      return false
    }

    applyRemoteContent(result.content, successStatus)
    return true
  }, [applyRemoteContent])

  useEffect(() => {
    setHotlineMsg?.('CHAoS Control Desk online.')
  }, [setHotlineMsg])

  useEffect(() => {
    let cancelled = false

    async function initializeDashboard() {
      if (!remoteStatus.configured) {
        return
      }

      try {
        const session = await getSupabaseSession()

        if (cancelled) return

        if (isAllowedAdminSession(session)) {
          setAdminSession(session)
          await loadRemoteDraft('Supabase session restored.')
          return
        }

        if (session) {
          await signOutAdmin()
          setAdminSession(null)
          setAuthEmail('')
          setAuthPassword('')
          setStatus('Sign in to edit live Supabase content.')
          return
        }

        setStatus('Sign in to edit live Supabase content.')
      } catch {
        if (!cancelled) {
          setStatus('Unable to verify the Supabase session.')
        }
      }
    }

    initializeDashboard()

    return () => {
      cancelled = true
    }
  }, [loadRemoteDraft, remoteStatus.configured])

  const handleAdminSignIn = async (event) => {
    event.preventDefault()
    setBusy(true)
    setAuthError('')
    setStatus('Checking Supabase credentials...')

    try {
      const nextSession = await signInAdmin(authEmail, authPassword)

      if (!isAllowedAdminSession(nextSession)) {
        await signOutAdmin()
        throw new Error('This account is not authorized to edit this website.')
      }

      setAdminSession(nextSession)
      setAuthPassword('')
      await loadRemoteDraft('Supabase signed in. Live content ready.')
      setHotlineMsg?.('Control desk authenticated.')
    } catch (error) {
      const message = error instanceof Error && error.message === 'This account is not authorized to edit this website.'
        ? error.message
        : 'Sign-in failed. Check your credentials and try again.'
      setAuthEmail('')
      setAuthPassword('')
      setAuthError(message)
      setStatus(message)
      setHotlineMsg?.('Control desk authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleAdminSignOut = async () => {
    setBusy(true)
    let signOutFailed = false

    try {
      await signOutAdmin()
    } catch {
      signOutFailed = true
    } finally {
      setAdminSession(null)
      setAuthEmail('')
      setAuthPassword('')
      setAuthError('')
      setStatus(signOutFailed
        ? 'Dashboard session cleared. Reload the page if you need to verify sign-out.'
        : 'Signed out. Local draft remains visible.'
      )
      setHotlineMsg?.('Control desk signed out.')
      setBusy(false)
    }
  }

  const handleDashboardClose = async () => {
    setBusy(true)
    let reloadToClearSession = false

    try {
      if (remoteStatus.configured) {
        await signOutAdmin()
      }
    } catch {
      reloadToClearSession = true
    } finally {
      setAdminSession(null)
      setAuthEmail('')
      setAuthPassword('')
      setAuthError('')
      setBusy(false)
      onClose?.()

      if (reloadToClearSession) {
        window.location.reload()
      }
    }
  }

  const handleSelectSection = (sectionId) => {
    const nextSection = ADMIN_SECTIONS.find((section) => section.id === sectionId)
    if (!nextSection) return

    setActiveSectionId(sectionId)
    setStatus(`Editing ${nextSection.label}.`)
    setHotlineMsg?.(`Control desk focus: ${nextSection.label}.`)
  }

  const handleModeChange = (nextMode) => {
    setEditorModes((prev) => ({
      ...prev,
      [activeSection.id]: nextMode
    }))
    setStatus(`${activeSection.label}: ${nextMode === 'structured' ? 'structured' : 'raw JSON'} editor.`)
  }

  const handleDraftChange = (event) => {
    const nextValue = event.target.value
    setRawDrafts((prev) => ({
      ...prev,
      [activeSection.id]: nextValue
    }))
  }

  const handleResetSection = () => {
    setRawDrafts((prev) => {
      const nextRawDrafts = { ...prev }
      delete nextRawDrafts[activeSection.id]
      return nextRawDrafts
    })

    if (!activeSection.path.length) {
      const resetContent = createWebsiteContentSnapshot()
      setSavedContent(resetContent)
      setDraftContent(resetContent)
      setRawDrafts({})
      setStatus('Reset full control-desk draft.')
      return
    }

    setDraftContent((prev) => setValueAtPath(prev, activeSection.path, savedSectionValue))
    setStatus(`Reset ${activeSection.label} draft.`)
  }

  const handleFormatSection = () => {
    try {
      const parsedValue = JSON.parse(editorValue)
      setRawDrafts((prev) => ({
        ...prev,
        [activeSection.id]: formatJson(parsedValue)
      }))
      setStatus(`Formatted ${activeSection.label}.`)
    } catch (error) {
      setStatus(`Format failed: ${error instanceof Error ? error.message : 'Unknown JSON error.'}`)
      setHotlineMsg?.('JSON format failed.')
    }
  }

  const reloadContent = async () => {
    if (remoteStatus.configured) {
      if (!canUseRemoteContent) {
        setStatus('Reload blocked: Supabase sign-in required.')
        setHotlineMsg?.('Control desk needs Supabase sign-in.')
        return
      }

      setBusy(true)
      setStatus('Loading latest Supabase content...')

      try {
        await loadRemoteDraft('Supabase content refreshed.')
        setHotlineMsg?.('Control desk refreshed from Supabase.')
      } catch {
        setStatus('Supabase content could not be reloaded.')
        setHotlineMsg?.('Control desk reload failed.')
      } finally {
        setBusy(false)
      }

      return
    }

    if (!import.meta.env.DEV) {
      setStatus('Local disk reload is only available during development.')
      return
    }

    if (!adminToken) {
      setStatus('Reload blocked: admin session missing.')
      setHotlineMsg?.('Control desk session missing.')
      return
    }

    setBusy(true)
    setStatus('Loading latest file from disk...')

    try {
      const response = await fetch(ADMIN_CONTENT_API_PATH, {
        method: 'GET',
        headers: createAdminRequestHeaders(adminToken, {
          Accept: 'application/json'
        })
      })

      if (!response.ok) {
        throw new Error(`Reload failed with status ${response.status}.`)
      }

      const nextContent = await response.json()
      setSavedContent(nextContent)
      setDraftContent(nextContent)
      setRawDrafts({})
      updateWebsiteContent(nextContent)
      setStatus('Disk copy loaded.')
      setHotlineMsg?.('Control desk refreshed from disk.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Control desk reload failed.')
      setHotlineMsg?.('Control desk reload failed.')
    } finally {
      setBusy(false)
    }
  }

  const saveSection = async () => {
    if (remoteStatus.configured && !canUseRemoteContent) {
      setStatus('Save blocked: Supabase sign-in required.')
      setHotlineMsg?.('Control desk needs Supabase sign-in.')
      return
    }

    if (!remoteStatus.configured && (!import.meta.env.DEV || !adminToken)) {
      setStatus('Save blocked: no Supabase connection or local admin session.')
      setHotlineMsg?.('Control desk save blocked.')
      return
    }

    setBusy(true)
    setStatus('Saving all pending changes...')

    try {
      const nextContent = applyRawDrafts(draftContent, rawDrafts)

      if (remoteStatus.configured) {
        const savedRemoteContent = await saveRemoteWebsiteContent(nextContent)
        setSavedContent(savedRemoteContent)
        setDraftContent(savedRemoteContent)
        setRawDrafts({})
        updateWebsiteContent(savedRemoteContent)
        setStatus('All pending content saved to Supabase.')
        setHotlineMsg?.('Control desk saved to Supabase.')
        return
      }

      const response = await fetch(ADMIN_CONTENT_API_PATH, {
        method: 'POST',
        headers: createAdminRequestHeaders(adminToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(nextContent)
      })

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}.`)
      }

      setSavedContent(nextContent)
      setDraftContent(nextContent)
      setRawDrafts({})
      updateWebsiteContent(nextContent)
      setStatus('All pending content saved to disk.')
      setHotlineMsg?.('Control desk saved.')
    } catch {
      setStatus('Content could not be saved. Confirm the admin session and Supabase policies.')
      setHotlineMsg?.('Control desk save failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-dashboard-shell">
      <div className="admin-toolbar">
        <div className="admin-toolbar-brand">
          <span>CHAoS OS</span>
          <strong>Control Desk</strong>
        </div>
        <div className="admin-toolbar-field">{storageLabel}</div>
        <span className="admin-toolbar-badge">
          {canUseRemoteContent ? 'SUPABASE' : remoteStatus.configured ? 'SIGN IN' : 'DEV FALLBACK'}
        </span>
        {canUseRemoteContent ? (
          <button
            type="button"
            className="admin-toolbar-button"
            onClick={handleAdminSignOut}
            disabled={busy}
          >
            Sign Out
          </button>
        ) : null}
        <button
          type="button"
          className="admin-toolbar-button"
          onClick={handleDashboardClose}
          disabled={busy}
        >
          Return Desktop
        </button>
      </div>

      <div className="admin-dashboard-body">
        <aside className="admin-dashboard-sidebar">
          <div className="admin-pane-titlebar">
            <span>Sections</span>
            <span className="admin-pane-caption">{ADMIN_SECTIONS.length} targets</span>
          </div>
          <div className="admin-sidebar-surface">
            <AdminSectionTree
              activeSectionId={activeSection.id}
              onSelectSection={handleSelectSection}
            />
          </div>
        </aside>

        <section className="admin-dashboard-main">
          <div className="admin-pane-titlebar">
            <span>{activeSection.label}</span>
            <span className="admin-pane-caption">
              {isHomeSection
                ? 'Quick actions'
                : activeEditorMode === 'structured' ? 'Structured editor' : activeSection.pathLabel}
            </span>
          </div>

          <div className="admin-editor-surface">
            {needsRemoteLogin ? (
              <AdminLoginPanel
                email={authEmail}
                password={authPassword}
                status={status}
                busy={busy}
                error={authError}
                onEmailChange={setAuthEmail}
                onPasswordChange={setAuthPassword}
                onSubmit={handleAdminSignIn}
              />
            ) : isHomeSection ? (
              <AdminHomePanel
                isDirty={isDirty}
                status={status}
                busy={busy}
                storageLabel={storageLabel}
                onSelectSection={handleSelectSection}
                onReload={reloadContent}
                onSave={saveSection}
              />
            ) : (
              <>
                <div className="admin-editor-meta">
                  <div className="admin-editor-copy">{activeSection.description}</div>
                  <div className="admin-editor-hint">
                    Step 1: edit this section. Step 2: press Save All. Use Raw JSON only if the structured controls do not expose what you need.
                  </div>
                </div>

                <div className="admin-editor-actions">
                  {supportsStructuredEditor ? (
                    <div className="admin-mode-switch">
                      <button
                        type="button"
                        className={`admin-mode-button ${activeEditorMode === 'structured' ? 'is-active' : ''}`.trim()}
                        onClick={() => handleModeChange('structured')}
                        disabled={busy}
                      >
                        Easy Editor
                      </button>
                      <button
                        type="button"
                        className={`admin-mode-button ${activeEditorMode === 'json' ? 'is-active' : ''}`.trim()}
                        onClick={() => handleModeChange('json')}
                        disabled={busy}
                      >
                        Raw JSON
                      </button>
                    </div>
                  ) : null}
                  {activeEditorMode === 'json' ? (
                    <button
                      type="button"
                      className="admin-toolbar-button"
                      onClick={handleFormatSection}
                      disabled={busy}
                    >
                      Format
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="admin-toolbar-button"
                    onClick={() => handleSelectSection('dashboard-home')}
                    disabled={busy}
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    className="admin-toolbar-button"
                    onClick={handleResetSection}
                    disabled={busy || !activeSectionDirty}
                  >
                    Reset Section
                  </button>
                  <button
                    type="button"
                    className="admin-toolbar-button"
                    onClick={reloadContent}
                    disabled={busy}
                  >
                    Reload Content
                  </button>
                  <button
                    type="button"
                    className="admin-toolbar-button is-primary"
                    onClick={saveSection}
                    disabled={busy || !isDirty}
                  >
                    Save All
                  </button>
                </div>

                {activeEditorMode === 'structured' ? (
                  <StructuredSectionEditor
                    key={activeSection.id}
                    sectionId={activeSection.id}
                    content={draftContent}
                    onChange={(nextContent) => {
                      setDraftContent(nextContent)
                      setRawDrafts((prev) => {
                        const nextRawDrafts = { ...prev }
                        delete nextRawDrafts[activeSection.id]
                        return nextRawDrafts
                      })
                    }}
                    onStatusChange={setStatus}
                  />
                ) : (
                  <textarea
                    className="admin-editor-textarea"
                    value={editorValue}
                    onChange={handleDraftChange}
                    spellCheck="false"
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <div className="admin-dashboard-status">
        <span>{activeSection.pathLabel}</span>
        <span>
          {isHomeSection
            ? (isDirty ? 'Website has pending edits' : 'Website synced')
            : (activeSectionDirty ? 'Section has pending edits' : 'Section synced')}
        </span>
        <span>{status}</span>
      </div>
    </div>
  )
}

export default AdminDashboardWindow
