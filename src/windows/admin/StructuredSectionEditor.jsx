import { useRef, useState } from 'react'
import { uploadWebsiteAsset } from '../../services/websiteContentRemote'
import {
  appendArrayItemAtPath,
  cloneJsonValue,
  ensureUniqueStringId,
  getNextNumericId,
  removeArrayItemAtPath,
  setValueAtPath
} from './editorUtils'

const APPLICATION_PREVIEW_TONES = [
  'teal',
  'amber',
  'blue',
  'green',
  'rose',
  'violet',
  'navy',
  'slate'
]

const APPLICATION_PREVIEW_LAYOUTS = [
  'dashboard',
  'control',
  'editor',
  'kanban',
  'mobile',
  'desktop',
  'utility'
]

const PUBLIC_ASSET_HINT = 'Use a public path, e.g. /images/website/file.png. Leave blank to use the built-in fallback.'

function Field({
  label,
  children,
  hint,
  hintClassName = ''
}) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}</span>
      {children}
      {hint ? <span className={`admin-field-hint ${hintClassName}`.trim()}>{hint}</span> : null}
    </label>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder = '',
  hint = '',
  readOnly = false,
  type = 'text'
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type}
        className="admin-field-input"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </Field>
  )
}

function AssetInput({
  label,
  value,
  onChange,
  hint = PUBLIC_ASSET_HINT,
  folder = 'website',
  accept = 'image/*',
  allowDocuments = false
}) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    setUploadError('')
    try {
      const publicUrl = await uploadWebsiteAsset(file, folder)
      onChange(publicUrl)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'File upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field
      label={label}
      hint={uploadError || hint}
      hintClassName={uploadError ? 'is-error' : ''}
    >
      <div className="admin-asset-field">
        <input
          className="admin-field-input"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste a URL or upload a file"
        />
        <input
          ref={fileInputRef}
          className="admin-asset-file-input"
          type="file"
          accept={allowDocuments ? `${accept},application/pdf,.doc,.docx` : accept}
          onChange={handleUpload}
          tabIndex={-1}
          aria-hidden="true"
        />
        <button
          className="admin-mini-button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </Field>
  )
}

function TextAreaInput({
  label,
  value,
  onChange,
  placeholder = '',
  rows = 4
}) {
  return (
    <Field label={label}>
      <textarea
        className="admin-field-textarea"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </Field>
  )
}

function SelectInput({
  label,
  value,
  onChange,
  options
}) {
  return (
    <Field label={label}>
      <select
        className="admin-field-select"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

function ListEditor({
  label,
  items,
  onAdd,
  onRemove,
  onUpdate,
  addLabel = 'Add Item',
  multiline = false,
  placeholder = ''
}) {
  return (
    <fieldset className="admin-groupbox">
      <legend>{label}</legend>

      <div className="admin-list-editor">
        {items.length === 0 ? (
          <div className="admin-list-empty">No items yet.</div>
        ) : null}

        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="admin-list-item">
            <div className="admin-list-item-row">
              {multiline ? (
                <textarea
                  className="admin-field-textarea is-compact"
                  value={item}
                  onChange={(event) => onUpdate(index, event.target.value)}
                  placeholder={placeholder}
                  rows={2}
                />
              ) : (
                <input
                  className="admin-field-input"
                  value={item}
                  onChange={(event) => onUpdate(index, event.target.value)}
                  placeholder={placeholder}
                />
              )}

              <button
                type="button"
                className="admin-mini-button"
                onClick={() => onRemove(index)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="admin-toolbar-button"
          onClick={onAdd}
        >
          {addLabel}
        </button>
      </div>
    </fieldset>
  )
}

function KeyValueListEditor({
  label,
  items,
  onAdd,
  onRemove,
  onChange
}) {
  return (
    <fieldset className="admin-groupbox">
      <legend>{label}</legend>

      <div className="admin-list-editor">
        {items.length === 0 ? (
          <div className="admin-list-empty">No entries yet.</div>
        ) : null}

        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="admin-list-item">
            <div className="admin-field-grid is-single-column">
              <TextInput
                label="Label"
                value={item.label}
                onChange={(value) => onChange(index, { ...item, label: value })}
              />
              <TextInput
                label="Value"
                value={item.value}
                onChange={(value) => onChange(index, { ...item, value })}
              />
            </div>

            <div className="admin-inline-actions">
              <button
                type="button"
                className="admin-mini-button"
                onClick={() => onRemove(index)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="admin-toolbar-button"
          onClick={onAdd}
        >
          Add Row
        </button>
      </div>
    </fieldset>
  )
}

function SocialLinksEditor({
  links,
  onAdd,
  onRemove,
  onChange
}) {
  return (
    <fieldset className="admin-groupbox">
      <legend>Links</legend>

      <div className="admin-list-editor">
        {links.length === 0 ? (
          <div className="admin-list-empty">No links yet.</div>
        ) : null}

        {links.map((link, index) => (
          <div key={`${link.id}-${index}`} className="admin-list-item">
            <div className="admin-field-grid">
              <TextInput
                label="ID"
                value={link.id}
                onChange={(value) => onChange(index, { ...link, id: value })}
              />
              <TextInput
                label="Label"
                value={link.label}
                onChange={(value) => onChange(index, { ...link, label: value })}
              />
              <TextInput
                label="URL / Href"
                value={link.href}
                onChange={(value) => onChange(index, { ...link, href: value })}
              />
              <TextInput
                label="Icon Key"
                value={link.iconKey}
                onChange={(value) => onChange(index, { ...link, iconKey: value })}
              />
              <AssetInput
                label="Custom Icon Path"
                value={link.iconPath ?? ''}
                onChange={(value) => onChange(index, { ...link, iconPath: value || undefined })}
                folder="socials"
                hint={PUBLIC_ASSET_HINT}
              />
            </div>

            <div className="admin-inline-actions">
              <button
                type="button"
                className="admin-mini-button"
                onClick={() => onRemove(index)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="admin-toolbar-button"
          onClick={onAdd}
        >
          Add Link
        </button>
      </div>
    </fieldset>
  )
}

function ScreenshotListEditor({
  screenshots,
  onAdd,
  onRemove,
  onChange
}) {
  return (
    <fieldset className="admin-groupbox">
      <legend>Preview Panels</legend>

      <div className="admin-list-editor">
        {screenshots.length === 0 ? (
          <div className="admin-list-empty">No preview panels yet.</div>
        ) : null}

        {screenshots.map((screenshot, index) => (
          <div key={`${screenshot.id}-${index}`} className="admin-list-item">
            <div className="admin-field-grid">
              <TextInput
                label="Preview ID"
                value={screenshot.id}
                onChange={(value) => onChange(index, { ...screenshot, id: value })}
              />
              <TextInput
                label="Title"
                value={screenshot.title}
                onChange={(value) => onChange(index, { ...screenshot, title: value })}
              />
              <SelectInput
                label="Tone"
                value={screenshot.tone}
                onChange={(value) => onChange(index, { ...screenshot, tone: value })}
                options={APPLICATION_PREVIEW_TONES.map((tone) => ({
                  value: tone,
                  label: tone
                }))}
              />
              <SelectInput
                label="Layout"
                value={screenshot.layout}
                onChange={(value) => onChange(index, { ...screenshot, layout: value })}
                options={APPLICATION_PREVIEW_LAYOUTS.map((layout) => ({
                  value: layout,
                  label: layout
                }))}
              />
              <AssetInput
                label="Image Path"
                value={screenshot.imagePath ?? screenshot.image ?? ''}
                onChange={(value) => onChange(index, { ...screenshot, imagePath: value || undefined })}
                folder="applications/previews"
                hint={PUBLIC_ASSET_HINT}
              />
            </div>

            <TextAreaInput
              label="Caption"
              value={screenshot.caption}
              onChange={(value) => onChange(index, { ...screenshot, caption: value })}
              rows={2}
            />

            <div className="admin-inline-actions">
              <button
                type="button"
                className="admin-mini-button"
                onClick={() => onRemove(index)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="admin-toolbar-button"
          onClick={onAdd}
        >
          Add Preview
        </button>
      </div>
    </fieldset>
  )
}

function ItemNavigator({
  title,
  caption,
  items,
  selectedId,
  onSelect,
  secondaryTitle,
  secondaryItems,
  secondarySelectedId,
  onSecondarySelect,
  actions,
  secondaryActions
}) {
  return (
    <div className="admin-structured-sidebar">
      <div className="admin-pane-titlebar">
        <span>{title}</span>
        <span className="admin-pane-caption">{caption}</span>
      </div>

      <div className="admin-structured-surface">
        {actions ? <div className="admin-inline-actions">{actions}</div> : null}

        <div className="admin-list-nav">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-item-row ${selectedId === item.id ? 'is-selected' : ''}`.trim()}
              onClick={() => onSelect(item.id)}
            >
              <span className="admin-item-title">{item.title}</span>
              {item.meta ? <span className="admin-item-meta">{item.meta}</span> : null}
            </button>
          ))}
        </div>

        {secondaryItems ? (
          <>
            <div className="admin-subheading">{secondaryTitle}</div>
            {secondaryActions ? <div className="admin-inline-actions">{secondaryActions}</div> : null}
            <div className="admin-list-nav">
              {secondaryItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-item-row ${secondarySelectedId === item.id ? 'is-selected' : ''}`.trim()}
                  onClick={() => onSecondarySelect(item.id)}
                >
                  <span className="admin-item-title">{item.title}</span>
                  {item.meta ? <span className="admin-item-meta">{item.meta}</span> : null}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function DesktopEditor({
  content,
  onChange
}) {
  const desktop = content.desktop
  const [selectedIconId, setSelectedIconId] = useState(desktop.icons[0]?.id ?? '')
  const resolvedIconId = desktop.icons.some((icon) => icon.id === selectedIconId)
    ? selectedIconId
    : (desktop.icons[0]?.id ?? '')
  const selectedIconIndex = desktop.icons.findIndex((icon) => icon.id === resolvedIconId)
  const selectedIcon = desktop.icons[selectedIconIndex] ?? null

  const updateDesktopField = (field, value) => {
    onChange(setValueAtPath(content, ['desktop', field], value))
  }

  const updateIconField = (field, value) => {
    if (!selectedIcon || selectedIconIndex < 0) return
    onChange(setValueAtPath(content, ['desktop', 'icons', selectedIconIndex, field], value))
  }

  const updateStringList = (field, nextItems) => {
    onChange(setValueAtPath(content, ['desktop', field], nextItems))
  }

  return (
    <div className="admin-structured-layout">
      <ItemNavigator
        title="Desktop"
        caption={`${desktop.icons.length} icons`}
        items={desktop.icons.map((icon) => ({
          id: icon.id,
          title: icon.label,
          meta: icon.value
        }))}
        selectedId={resolvedIconId}
        onSelect={setSelectedIconId}
      />

      <div className="admin-structured-form">
        <div className="admin-pane-titlebar">
          <span>{selectedIcon ? selectedIcon.label : 'Desktop'}</span>
          <span className="admin-pane-caption">Icons and shell copy</span>
        </div>

        <div className="admin-structured-surface">
          <div className="admin-form-stack">
            {selectedIcon ? (
              <fieldset className="admin-groupbox">
                <legend>Desktop Icon</legend>
                <div className="admin-field-grid">
                  <TextInput label="ID" value={selectedIcon.id} onChange={() => {}} readOnly />
                  <TextInput
                    label="Label"
                    value={selectedIcon.label}
                    onChange={(value) => updateIconField('label', value)}
                  />
                  <TextInput label="Kind" value={selectedIcon.kind} onChange={() => {}} readOnly />
                  <TextInput label="Open Target" value={selectedIcon.value} onChange={() => {}} readOnly />
                  <TextInput
                    label="Built-In Icon Key"
                    value={selectedIcon.iconKey}
                    onChange={(value) => updateIconField('iconKey', value)}
                    hint="Fallback key used when Custom Icon Path is blank."
                  />
                  <AssetInput
                    label="Custom Icon Path"
                    value={selectedIcon.iconPath ?? ''}
                    onChange={(value) => updateIconField('iconPath', value || undefined)}
                    folder="desktop"
                    hint={PUBLIC_ASSET_HINT}
                  />
                </div>
              </fieldset>
            ) : (
              <div className="admin-empty-panel">No desktop icons available.</div>
            )}

            <fieldset className="admin-groupbox">
              <legend>Desktop Copy</legend>
              <div className="admin-field-grid">
                <TextInput
                  label="Late Night Message"
                  value={desktop.lateNightMessage}
                  onChange={(value) => updateDesktopField('lateNightMessage', value)}
                />
                <TextInput
                  label="CV Download Message"
                  value={desktop.cvDownloadMessage}
                  onChange={(value) => updateDesktopField('cvDownloadMessage', value)}
                />
                <TextInput
                  label="System Status Title"
                  value={desktop.systemStatusTitle}
                  onChange={(value) => updateDesktopField('systemStatusTitle', value)}
                />
                <TextInput
                  label="Mode Label"
                  value={desktop.modeLabel}
                  onChange={(value) => updateDesktopField('modeLabel', value)}
                />
              </div>
            </fieldset>

            <div className="admin-two-column-layout">
              <ListEditor
                label="Idle Lines"
                items={desktop.idleLines}
                onAdd={() => updateStringList('idleLines', [...desktop.idleLines, ''])}
                onRemove={(index) => updateStringList('idleLines', desktop.idleLines.filter((_, itemIndex) => itemIndex !== index))}
                onUpdate={(index, value) => updateStringList('idleLines', desktop.idleLines.map((item, itemIndex) => (
                  itemIndex === index ? value : item
                )))}
                addLabel="Add Idle Line"
              />

              <ListEditor
                label="Security Tray Lines"
                items={desktop.securityTrayLines}
                onAdd={() => updateStringList('securityTrayLines', [...desktop.securityTrayLines, ''])}
                onRemove={(index) => updateStringList('securityTrayLines', desktop.securityTrayLines.filter((_, itemIndex) => itemIndex !== index))}
                onUpdate={(index, value) => updateStringList('securityTrayLines', desktop.securityTrayLines.map((item, itemIndex) => (
                  itemIndex === index ? value : item
                )))}
                addLabel="Add Tray Line"
              />
            </div>

            <div className="admin-two-column-layout">
              <ListEditor
                label="Bill Probe Lines"
                items={desktop.billProbeMessages}
                onAdd={() => updateStringList('billProbeMessages', [...desktop.billProbeMessages, ''])}
                onRemove={(index) => updateStringList('billProbeMessages', desktop.billProbeMessages.filter((_, itemIndex) => itemIndex !== index))}
                onUpdate={(index, value) => updateStringList('billProbeMessages', desktop.billProbeMessages.map((item, itemIndex) => (
                  itemIndex === index ? value : item
                )))}
                addLabel="Add Probe Line"
              />

              <ListEditor
                label="CHAoS Reveal Lines"
                items={desktop.chaosRevealLines}
                onAdd={() => updateStringList('chaosRevealLines', [...desktop.chaosRevealLines, ''])}
                onRemove={(index) => updateStringList('chaosRevealLines', desktop.chaosRevealLines.filter((_, itemIndex) => itemIndex !== index))}
                onUpdate={(index, value) => updateStringList('chaosRevealLines', desktop.chaosRevealLines.map((item, itemIndex) => (
                  itemIndex === index ? value : item
                )))}
                addLabel="Add Reveal Line"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AboutEditor({
  content,
  onChange
}) {
  const about = content.about

  const updateAbout = (field, value) => {
    onChange(setValueAtPath(content, ['about', field], value))
  }

  const updateStringList = (field, nextItems) => {
    onChange(setValueAtPath(content, ['about', field], nextItems))
  }

  const updateCurrentStateItem = (index, nextItem) => {
    const nextItems = about.currentState.map((item, itemIndex) => (
      itemIndex === index ? nextItem : item
    ))
    onChange(setValueAtPath(content, ['about', 'currentState'], nextItems))
  }

  return (
    <div className="admin-form-stack">
      <fieldset className="admin-groupbox">
        <legend>Identity</legend>
        <div className="admin-field-grid">
          <TextInput label="Name" value={about.name} onChange={(value) => updateAbout('name', value)} />
          <TextInput label="Role" value={about.role} onChange={(value) => updateAbout('role', value)} />
          <TextInput label="Location" value={about.location} onChange={(value) => updateAbout('location', value)} />
          <TextInput label="Status" value={about.status} onChange={(value) => updateAbout('status', value)} />
          <AssetInput
            label="CV File"
            value={about.cvPath}
            onChange={(value) => updateAbout('cvPath', value)}
            folder="about"
            accept=".pdf,.doc,.docx"
            allowDocuments
            hint="Upload a PDF or document (12 MB max), or paste its public URL."
          />
          <AssetInput
            label="Profile Image (PNG, JPG, WebP, or GIF)"
            value={about.profileImage ?? ''}
            onChange={(value) => updateAbout('profileImage', value || undefined)}
            folder="about"
            accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
            hint="Upload an image or animated GIF (12 MB max), or paste its public URL."
          />
        </div>
      </fieldset>

      <TextAreaInput
        label="Who I Am"
        value={about.whoIAm}
        onChange={(value) => updateAbout('whoIAm', value)}
        rows={8}
      />

      <div className="admin-two-column-layout">
        <ListEditor
          label="What I Do"
          items={about.whatIDo}
          onAdd={() => updateStringList('whatIDo', [...about.whatIDo, ''])}
          onRemove={(index) => updateStringList('whatIDo', about.whatIDo.filter((_, itemIndex) => itemIndex !== index))}
          onUpdate={(index, value) => updateStringList('whatIDo', about.whatIDo.map((item, itemIndex) => (
            itemIndex === index ? value : item
          )))}
          addLabel="Add Line"
          multiline
        />

        <ListEditor
          label="Focus Areas"
          items={about.focusAreas}
          onAdd={() => updateStringList('focusAreas', [...about.focusAreas, ''])}
          onRemove={(index) => updateStringList('focusAreas', about.focusAreas.filter((_, itemIndex) => itemIndex !== index))}
          onUpdate={(index, value) => updateStringList('focusAreas', about.focusAreas.map((item, itemIndex) => (
            itemIndex === index ? value : item
          )))}
          addLabel="Add Focus"
          multiline
        />
      </div>

      <KeyValueListEditor
        label="Current System State"
        items={about.currentState}
        onAdd={() => updateStringList('currentState', [...about.currentState, { label: '', value: '' }])}
        onRemove={(index) => updateStringList('currentState', about.currentState.filter((_, itemIndex) => itemIndex !== index))}
        onChange={updateCurrentStateItem}
      />
    </div>
  )
}

function SocialsEditor({
  content,
  onChange
}) {
  const socials = content.socials

  const updateSocials = (field, value) => {
    onChange(setValueAtPath(content, ['socials', field], value))
  }

  const updateLinks = (nextLinks) => {
    onChange(setValueAtPath(content, ['socials', 'links'], nextLinks))
  }

  return (
    <div className="admin-form-stack">
      <fieldset className="admin-groupbox">
        <legend>Header</legend>
        <div className="admin-field-grid">
          <TextInput label="Title" value={socials.title} onChange={(value) => updateSocials('title', value)} />
          <TextInput label="Status" value={socials.status} onChange={(value) => updateSocials('status', value)} />
        </div>
      </fieldset>

      <SocialLinksEditor
        links={socials.links}
        onAdd={() => {
          const existingIds = socials.links.map((link) => link.id)
          const nextId = ensureUniqueStringId(existingIds, 'new-link', 'link')
          updateLinks([
            ...socials.links,
            {
              id: nextId,
              label: 'New Link',
              href: '',
              iconKey: 'github'
            }
          ])
        }}
        onRemove={(index) => updateLinks(socials.links.filter((_, itemIndex) => itemIndex !== index))}
        onChange={(index, nextLink) => updateLinks(socials.links.map((link, itemIndex) => (
          itemIndex === index ? nextLink : link
        )))}
      />
    </div>
  )
}

function ApplicationsRootEditor({
  content,
  onChange
}) {
  const applications = content.applications

  const updateApplicationsField = (field, value) => {
    onChange(setValueAtPath(content, ['applications', field], value))
  }

  return (
    <div className="admin-form-stack">
      <fieldset className="admin-groupbox">
        <legend>Explorer Root</legend>
        <div className="admin-field-grid">
          <TextInput
            label="Root Label"
            value={applications.explorerRoot}
            onChange={(value) => updateApplicationsField('explorerRoot', value)}
          />
          <AssetInput
            label="Shared Folder Icon"
            value={applications.folderIcon}
            onChange={(value) => updateApplicationsField('folderIcon', value)}
            folder="applications"
            hint="One icon used by every folder tile in Applications Explorer."
          />
        </div>
      </fieldset>

      <fieldset className="admin-groupbox">
        <legend>Categories</legend>
        <div className="admin-list-editor">
          {applications.categories.map((category) => (
            <div key={category.id} className="admin-list-item">
              <div className="admin-field-grid">
                <TextInput label="Category" value={category.label} onChange={() => {}} readOnly />
                <TextInput label="Projects" value={String(category.projects.length)} onChange={() => {}} readOnly />
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="admin-empty-panel">
        Use Application Projects for adding/editing categories and project entries. This root panel controls explorer-level asset paths.
      </div>
    </div>
  )
}

function ApplicationsProjectsEditor({
  content,
  onChange,
  onStatusChange
}) {
  const categories = content.applications.categories
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? '')
  const resolvedCategoryId = categories.some((category) => category.id === selectedCategoryId)
    ? selectedCategoryId
    : (categories[0]?.id ?? '')
  const selectedCategory = categories.find((category) => category.id === resolvedCategoryId) ?? null
  const [selectedProjectId, setSelectedProjectId] = useState(selectedCategory?.projects[0]?.id ?? '')
  const selectedCategoryIndex = categories.findIndex((category) => category.id === resolvedCategoryId)
  const resolvedProjectId = selectedCategory?.projects.some((project) => project.id === selectedProjectId)
    ? selectedProjectId
    : (selectedCategory?.projects[0]?.id ?? '')
  const selectedProject = selectedCategory?.projects.find((project) => project.id === resolvedProjectId) ?? null
  const selectedProjectIndex = selectedCategory?.projects.findIndex((project) => project.id === resolvedProjectId) ?? -1

  const updateCategoryField = (field, value) => {
    if (selectedCategoryIndex < 0) return
    onChange(setValueAtPath(content, ['applications', 'categories', selectedCategoryIndex, field], value))
  }

  const updateProjectField = (field, value) => {
    if (!selectedProject || selectedProjectIndex < 0) return
    onChange(setValueAtPath(content, [
      'applications',
      'categories',
      selectedCategoryIndex,
      'projects',
      selectedProjectIndex,
      field
    ], value))
  }

  const updateProjectArray = (field, nextItems) => {
    if (!selectedProject || selectedProjectIndex < 0) return
    onChange(setValueAtPath(content, [
      'applications',
      'categories',
      selectedCategoryIndex,
      'projects',
      selectedProjectIndex,
      field
    ], nextItems))
  }

  const addProject = () => {
    if (!selectedCategory || selectedCategoryIndex < 0) return

    const existingIds = categories.flatMap((category) => category.projects.map((project) => project.id))
    const baseName = `New ${selectedCategory.label} Project`
    const nextId = ensureUniqueStringId(existingIds, baseName, 'project')
    const nextProject = {
      id: nextId,
      name: baseName,
      windowTitle: baseName,
      description: '',
      technologies: [],
      githubUrl: 'https://github.com/SuCH-CHAoS',
      githubLabel: 'Open repository',
      repositoryNote: '',
      screenshots: [],
      hotlineOpen: `Opened ${selectedCategory.label} project: ${baseName}.`
    }

    onChange(appendArrayItemAtPath(content, [
      'applications',
      'categories',
      selectedCategoryIndex,
      'projects'
    ], nextProject))
    setSelectedProjectId(nextProject.id)
    onStatusChange?.(`${nextProject.name} added to ${selectedCategory.label}.`)
  }

  const addCategory = () => {
    const nextId = ensureUniqueStringId(categories.map((category) => category.id), 'new-category', 'category')
    const nextCategory = {
      id: nextId,
      label: 'New Category',
      summary: '',
      projects: []
    }

    onChange(appendArrayItemAtPath(content, ['applications', 'categories'], nextCategory))
    setSelectedCategoryId(nextCategory.id)
    setSelectedProjectId('')
    onStatusChange?.(`${nextCategory.label} added.`)
  }

  const deleteCategory = () => {
    if (!selectedCategory || selectedCategoryIndex < 0) return

    if (
      selectedCategory.projects.length > 0
      && !window.confirm(`Delete ${selectedCategory.label} and its ${selectedCategory.projects.length} project(s)?`)
    ) {
      return
    }

    const remainingCategories = categories.filter((_, index) => index !== selectedCategoryIndex)
    onChange(removeArrayItemAtPath(content, ['applications', 'categories'], selectedCategoryIndex))
    setSelectedCategoryId(remainingCategories[0]?.id ?? '')
    setSelectedProjectId('')
    onStatusChange?.(`${selectedCategory.label} removed.`)
  }

  const duplicateProject = () => {
    if (!selectedProject) return

    const existingIds = categories.flatMap((category) => category.projects.map((project) => project.id))
    const copyName = `${selectedProject.name} Copy`
    const nextProject = {
      ...cloneJsonValue(selectedProject),
      id: ensureUniqueStringId(existingIds, copyName, 'project-copy'),
      name: copyName,
      windowTitle: `${selectedProject.windowTitle} Copy`
    }

    onChange(appendArrayItemAtPath(content, [
      'applications',
      'categories',
      selectedCategoryIndex,
      'projects'
    ], nextProject))
    setSelectedProjectId(nextProject.id)
    onStatusChange?.(`${nextProject.name} duplicated.`)
  }

  const deleteProject = () => {
    if (!selectedProject || selectedProjectIndex < 0) return

    const remainingProjects = selectedCategory.projects.filter((_, index) => index !== selectedProjectIndex)
    onChange(removeArrayItemAtPath(content, [
      'applications',
      'categories',
      selectedCategoryIndex,
      'projects'
    ], selectedProjectIndex))
    setSelectedProjectId(remainingProjects[0]?.id ?? '')
    onStatusChange?.(`${selectedProject.name} removed.`)
  }

  return (
    <div className="admin-structured-layout">
      <ItemNavigator
        title="Applications"
        caption={`${categories.length} categories`}
        items={categories.map((category) => ({
          id: category.id,
          title: category.label,
          meta: `${category.projects.length} project(s)`
        }))}
        selectedId={resolvedCategoryId}
        onSelect={setSelectedCategoryId}
        actions={(
          <>
            <button type="button" className="admin-mini-button" onClick={addCategory}>Add Category</button>
            <button type="button" className="admin-mini-button" onClick={deleteCategory} disabled={!selectedCategory}>Delete Category</button>
          </>
        )}
        secondaryTitle="Projects"
        secondaryItems={(selectedCategory?.projects ?? []).map((project) => ({
          id: project.id,
          title: project.name,
          meta: project.windowTitle
        }))}
        secondarySelectedId={resolvedProjectId}
        onSecondarySelect={setSelectedProjectId}
        secondaryActions={selectedCategory ? (
          <>
            <button type="button" className="admin-mini-button" onClick={addProject}>Add</button>
            <button type="button" className="admin-mini-button" onClick={duplicateProject} disabled={!selectedProject}>Duplicate</button>
            <button type="button" className="admin-mini-button" onClick={deleteProject} disabled={!selectedProject}>Delete</button>
          </>
        ) : null}
      />

      <div className="admin-structured-form">
        <div className="admin-pane-titlebar">
          <span>{selectedProject ? selectedProject.name : (selectedCategory?.label ?? 'Applications')}</span>
          <span className="admin-pane-caption">Applications editor</span>
        </div>

        <div className="admin-structured-surface">
          {selectedCategory ? (
          <div className="admin-form-stack">
            <fieldset className="admin-groupbox">
              <legend>Category</legend>
              <div className="admin-field-grid">
                <TextInput
                  label="Category Label"
                  value={selectedCategory.label}
                  onChange={(value) => updateCategoryField('label', value)}
                />
                <TextInput
                  label="Category ID"
                  value={selectedCategory.id}
                  onChange={() => {}}
                  readOnly
                  hint="Created automatically for each category."
                />
              </div>
              <TextAreaInput
                label="Summary"
                value={selectedCategory.summary}
                onChange={(value) => updateCategoryField('summary', value)}
                rows={3}
              />
            </fieldset>

            {selectedProject ? (
              <>
                <fieldset className="admin-groupbox">
                  <legend>Project Identity</legend>
                  <div className="admin-field-grid">
                    <TextInput
                      label="Project ID"
                      value={selectedProject.id}
                      onChange={() => {}}
                      readOnly
                    />
                    <TextInput
                      label="Window Title"
                      value={selectedProject.windowTitle}
                      onChange={(value) => updateProjectField('windowTitle', value)}
                    />
                    <TextInput
                      label="Project Name"
                      value={selectedProject.name}
                      onChange={(value) => updateProjectField('name', value)}
                    />
                    <AssetInput
                      label="Project Icon"
                      value={selectedProject.icon ?? ''}
                      onChange={(value) => updateProjectField('icon', value || undefined)}
                      folder={`applications/${selectedCategory.id}`}
                      hint="Optional public path. Leave blank to use the shared folder icon."
                    />
                  </div>
                </fieldset>

                <TextAreaInput
                  label="Description"
                  value={selectedProject.description}
                  onChange={(value) => updateProjectField('description', value)}
                  rows={6}
                />

                <fieldset className="admin-groupbox">
                  <legend>Repository</legend>
                  <div className="admin-field-grid">
                    <TextInput
                      label="GitHub URL"
                      value={selectedProject.githubUrl}
                      onChange={(value) => updateProjectField('githubUrl', value)}
                    />
                    <TextInput
                      label="GitHub Label"
                      value={selectedProject.githubLabel}
                      onChange={(value) => updateProjectField('githubLabel', value)}
                    />
                    <TextInput
                      label="Hotline Open Line"
                      value={selectedProject.hotlineOpen}
                      onChange={(value) => updateProjectField('hotlineOpen', value)}
                    />
                  </div>
                  <TextAreaInput
                    label="Repository Note"
                    value={selectedProject.repositoryNote}
                    onChange={(value) => updateProjectField('repositoryNote', value)}
                    rows={4}
                  />
                </fieldset>

                <ListEditor
                  label="Technologies"
                  items={selectedProject.technologies}
                  onAdd={() => updateProjectArray('technologies', [...selectedProject.technologies, ''])}
                  onRemove={(index) => updateProjectArray(
                    'technologies',
                    selectedProject.technologies.filter((_, itemIndex) => itemIndex !== index)
                  )}
                  onUpdate={(index, value) => updateProjectArray(
                    'technologies',
                    selectedProject.technologies.map((item, itemIndex) => (
                      itemIndex === index ? value : item
                    ))
                  )}
                  addLabel="Add Technology"
                />

                <ScreenshotListEditor
                  screenshots={selectedProject.screenshots ?? []}
                  onAdd={() => {
                    const existingIds = (selectedProject.screenshots ?? []).map((item) => item.id)
                    const nextId = ensureUniqueStringId(existingIds, `${selectedProject.id}-preview`, 'preview')
                    updateProjectArray('screenshots', [
                      ...(selectedProject.screenshots ?? []),
                      {
                        id: nextId,
                        title: 'New Preview',
                        caption: '',
                        tone: 'blue',
                        layout: 'dashboard'
                      }
                    ])
                  }}
                  onRemove={(index) => updateProjectArray(
                    'screenshots',
                    (selectedProject.screenshots ?? []).filter((_, itemIndex) => itemIndex !== index)
                  )}
                  onChange={(index, nextScreenshot) => updateProjectArray(
                    'screenshots',
                    (selectedProject.screenshots ?? []).map((item, itemIndex) => (
                      itemIndex === index ? nextScreenshot : item
                    ))
                  )}
                />
              </>
            ) : (
              <div className="admin-empty-panel">This category has no projects yet. Use Add to create one.</div>
            )}
          </div>
          ) : (
            <div className="admin-empty-panel">No application categories available. Use Add Category to create one.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ShellCollectionEditor({
  content,
  collectionKey,
  onChange,
  onStatusChange
}) {
  const projects = content.shell[collectionKey]
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? '')
  const resolvedProjectId = projects.some((project) => project.id === selectedProjectId)
    ? selectedProjectId
    : (projects[0]?.id ?? '')
  const selectedProjectIndex = projects.findIndex((project) => project.id === resolvedProjectId)
  const selectedProject = projects[selectedProjectIndex] ?? null
  const collectionLabel = collectionKey === 'projects' ? 'Shell' : 'Networking'
  const projectKind = collectionKey === 'projects' ? 'projects' : 'networking'
  const artOptions = Object.keys(content.shell.pixelArtMaps)

  const updateProjectField = (field, value) => {
    if (selectedProjectIndex < 0) return
    onChange(setValueAtPath(content, ['shell', collectionKey, selectedProjectIndex, field], value))
  }

  const updateHighlights = (nextHighlights) => {
    if (selectedProjectIndex < 0) return
    onChange(setValueAtPath(content, ['shell', collectionKey, selectedProjectIndex, 'highlights'], nextHighlights))
  }

  const addProject = () => {
    const nextId = getNextNumericId(projects)
    const baseName = collectionKey === 'projects'
      ? `New Shell Project ${nextId}`
      : `New Networking Project ${nextId}`
    const nextProject = {
      id: nextId,
      kind: projectKind,
      title: baseName,
      windowTitle: baseName,
      stack: '',
      intro: '',
      details: '',
      highlights: [],
      art: artOptions[0] ?? '',
      hotlineOpen: `Opened ${collectionLabel.toLowerCase()} project ${nextId}: ${baseName}.`
    }

    onChange(appendArrayItemAtPath(content, ['shell', collectionKey], nextProject))
    setSelectedProjectId(nextProject.id)
    onStatusChange?.(`${baseName} added.`)
  }

  const duplicateProject = () => {
    if (!selectedProject) return

    const nextId = getNextNumericId(projects)
    const nextProject = {
      ...cloneJsonValue(selectedProject),
      id: nextId,
      title: `${selectedProject.title} Copy`,
      windowTitle: `${selectedProject.windowTitle} Copy`
    }

    onChange(appendArrayItemAtPath(content, ['shell', collectionKey], nextProject))
    setSelectedProjectId(nextProject.id)
    onStatusChange?.(`${nextProject.title} duplicated.`)
  }

  const deleteProject = () => {
    if (!selectedProject || selectedProjectIndex < 0) return

    const remainingProjects = projects.filter((_, index) => index !== selectedProjectIndex)
    onChange(removeArrayItemAtPath(content, ['shell', collectionKey], selectedProjectIndex))
    setSelectedProjectId(remainingProjects[0]?.id ?? '')
    onStatusChange?.(`${selectedProject.title} removed.`)
  }

  return (
    <div className="admin-structured-layout">
      <ItemNavigator
        title={collectionLabel}
        caption={`${projects.length} project(s)`}
        items={projects.map((project) => ({
          id: project.id,
          title: project.title,
          meta: `ID ${project.id}`
        }))}
        selectedId={resolvedProjectId}
        onSelect={setSelectedProjectId}
        actions={(
          <>
            <button type="button" className="admin-mini-button" onClick={addProject}>Add</button>
            <button type="button" className="admin-mini-button" onClick={duplicateProject} disabled={!selectedProject}>Duplicate</button>
            <button type="button" className="admin-mini-button" onClick={deleteProject} disabled={!selectedProject}>Delete</button>
          </>
        )}
      />

      <div className="admin-structured-form">
        <div className="admin-pane-titlebar">
          <span>{selectedProject ? selectedProject.title : collectionLabel}</span>
          <span className="admin-pane-caption">Terminal project editor</span>
        </div>

        <div className="admin-structured-surface">
          {selectedProject ? (
            <div className="admin-form-stack">
              <fieldset className="admin-groupbox">
                <legend>Project Identity</legend>
                <div className="admin-field-grid">
                  <TextInput label="Terminal ID" value={String(selectedProject.id)} onChange={() => {}} readOnly />
                  <TextInput label="Kind" value={selectedProject.kind} onChange={() => {}} readOnly />
                  <TextInput
                    label="Title"
                    value={selectedProject.title}
                    onChange={(value) => updateProjectField('title', value)}
                  />
                  <TextInput
                    label="Window Title"
                    value={selectedProject.windowTitle}
                    onChange={(value) => updateProjectField('windowTitle', value)}
                  />
                  <TextInput
                    label="Stack"
                    value={selectedProject.stack}
                    onChange={(value) => updateProjectField('stack', value)}
                  />
                  <SelectInput
                    label="Pixel Art"
                    value={selectedProject.art}
                    onChange={(value) => updateProjectField('art', value)}
                    options={artOptions.map((art) => ({ value: art, label: art }))}
                  />
                  <AssetInput
                    label="Visual Image Path"
                    value={selectedProject.imagePath ?? ''}
                    onChange={(value) => updateProjectField('imagePath', value || undefined)}
                    folder="shell/projects"
                    hint="Optional. Overrides Pixel Art when filled."
                  />
                </div>
                <TextInput
                  label="Hotline Open Line"
                  value={selectedProject.hotlineOpen}
                  onChange={(value) => updateProjectField('hotlineOpen', value)}
                />
              </fieldset>

              <TextAreaInput
                label="Intro"
                value={selectedProject.intro}
                onChange={(value) => updateProjectField('intro', value)}
                rows={5}
              />

              <TextAreaInput
                label="Details"
                value={selectedProject.details}
                onChange={(value) => updateProjectField('details', value)}
                rows={5}
              />

              <ListEditor
                label="Highlights"
                items={selectedProject.highlights}
                onAdd={() => updateHighlights([...selectedProject.highlights, ''])}
                onRemove={(index) => updateHighlights(
                  selectedProject.highlights.filter((_, itemIndex) => itemIndex !== index)
                )}
                onUpdate={(index, value) => updateHighlights(
                  selectedProject.highlights.map((item, itemIndex) => (
                    itemIndex === index ? value : item
                  ))
                )}
                addLabel="Add Highlight"
                multiline
              />
            </div>
          ) : (
            <div className="admin-empty-panel">No terminal projects yet. Use Add to create one.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ArcadeProjectsEditor({
  content,
  onChange,
  onStatusChange
}) {
  const arcade = content.arcade
  const projects = arcade.projects
  const zones = Object.entries(arcade.zoneLabels).map(([id, label]) => ({ id, label }))
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id ?? '')
  const resolvedZoneId = zones.some((zone) => zone.id === selectedZoneId)
    ? selectedZoneId
    : (zones[0]?.id ?? '')
  const selectedZone = zones.find((zone) => zone.id === resolvedZoneId) ?? null
  const zoneProjects = projects.filter((project) => project.zone === resolvedZoneId)
  const [selectedProjectId, setSelectedProjectId] = useState(zoneProjects[0]?.id ?? '')
  const resolvedProjectId = zoneProjects.some((project) => project.id === selectedProjectId)
    ? selectedProjectId
    : (zoneProjects[0]?.id ?? '')
  const selectedProjectIndex = projects.findIndex((project) => project.id === resolvedProjectId)
  const selectedProject = projects[selectedProjectIndex] ?? null

  if (!selectedZone) {
    return <div className="admin-empty-panel">No arcade zones available.</div>
  }

  const updateProjectField = (field, value) => {
    if (!selectedProject || selectedProjectIndex < 0) return
    onChange(setValueAtPath(content, ['arcade', 'projects', selectedProjectIndex, field], value))
  }

  const updateProjectArray = (field, nextItems) => {
    if (!selectedProject || selectedProjectIndex < 0) return
    onChange(setValueAtPath(content, ['arcade', 'projects', selectedProjectIndex, field], nextItems))
  }

  const addProject = () => {
    const baseName = `New ${selectedZone.label} Project`
    const nextId = ensureUniqueStringId(projects.map((project) => project.id), baseName, 'arcade-project')
    const nextProject = {
      id: nextId,
      zone: resolvedZoneId,
      thumb: 'runner',
      anim: 'anim-runner',
      title: baseName,
      type: '',
      engine: '',
      platforms: [],
      objective: '',
      narrative: '',
      technical: [],
      hotline: [`${baseName} loaded.`],
      hotlineHover: `${baseName} highlighted.`
    }

    onChange(appendArrayItemAtPath(content, ['arcade', 'projects'], nextProject))
    setSelectedProjectId(nextProject.id)
    onStatusChange?.(`${nextProject.title} added to ${selectedZone.label}.`)
  }

  const duplicateProject = () => {
    if (!selectedProject) return

    const copyName = `${selectedProject.title} Copy`
    const nextProject = {
      ...cloneJsonValue(selectedProject),
      id: ensureUniqueStringId(projects.map((project) => project.id), copyName, 'arcade-project-copy'),
      title: copyName
    }

    onChange(appendArrayItemAtPath(content, ['arcade', 'projects'], nextProject))
    setSelectedProjectId(nextProject.id)
    onStatusChange?.(`${nextProject.title} duplicated.`)
  }

  const deleteProject = () => {
    if (!selectedProject || selectedProjectIndex < 0) return

    const remainingZoneProjects = zoneProjects.filter((project) => project.id !== selectedProject.id)
    onChange(removeArrayItemAtPath(content, ['arcade', 'projects'], selectedProjectIndex))
    setSelectedProjectId(remainingZoneProjects[0]?.id ?? '')
    onStatusChange?.(`${selectedProject.title} removed.`)
  }

  return (
    <div className="admin-structured-layout">
      <ItemNavigator
        title="Arcade"
        caption={`${zones.length} zones`}
        items={zones.map((zone) => ({
          id: zone.id,
          title: zone.label,
          meta: `${projects.filter((project) => project.zone === zone.id).length} project(s)`
        }))}
        selectedId={resolvedZoneId}
        onSelect={setSelectedZoneId}
        secondaryTitle="Projects"
        secondaryItems={zoneProjects.map((project) => ({
          id: project.id,
          title: project.title,
          meta: project.type
        }))}
        secondarySelectedId={resolvedProjectId}
        onSecondarySelect={setSelectedProjectId}
        secondaryActions={(
          <>
            <button type="button" className="admin-mini-button" onClick={addProject}>Add</button>
            <button type="button" className="admin-mini-button" onClick={duplicateProject} disabled={!selectedProject}>Duplicate</button>
            <button type="button" className="admin-mini-button" onClick={deleteProject} disabled={!selectedProject}>Delete</button>
          </>
        )}
      />

      <div className="admin-structured-form">
        <div className="admin-pane-titlebar">
          <span>{selectedProject ? selectedProject.title : selectedZone.label}</span>
          <span className="admin-pane-caption">Arcade project editor</span>
        </div>

        <div className="admin-structured-surface">
          {selectedProject ? (
            <div className="admin-form-stack">
              <fieldset className="admin-groupbox">
                <legend>Project Identity</legend>
                <div className="admin-field-grid">
                  <TextInput label="Project ID" value={selectedProject.id} onChange={() => {}} readOnly />
                  <SelectInput
                    label="Zone"
                    value={selectedProject.zone}
                    onChange={(value) => updateProjectField('zone', value)}
                    options={zones.map((zone) => ({ value: zone.id, label: zone.label }))}
                  />
                  <TextInput
                    label="Title"
                    value={selectedProject.title}
                    onChange={(value) => updateProjectField('title', value)}
                  />
                  <TextInput
                    label="Type"
                    value={selectedProject.type}
                    onChange={(value) => updateProjectField('type', value)}
                  />
                  <TextInput
                    label="Engine"
                    value={selectedProject.engine}
                    onChange={(value) => updateProjectField('engine', value)}
                  />
                  <TextInput
                    label="Pixel Thumb Key"
                    value={selectedProject.thumb}
                    onChange={(value) => updateProjectField('thumb', value)}
                    hint="Fallback key used when Custom Thumb Image is blank."
                  />
                  <TextInput
                    label="Thumb Animation"
                    value={selectedProject.anim}
                    onChange={(value) => updateProjectField('anim', value)}
                  />
                  <AssetInput
                    label="Custom Thumb Image"
                    value={selectedProject.imagePath ?? ''}
                    onChange={(value) => updateProjectField('imagePath', value || undefined)}
                    folder="arcade/projects"
                    hint={PUBLIC_ASSET_HINT}
                  />
                </div>
                <TextInput
                  label="Hover Hotline"
                  value={selectedProject.hotlineHover}
                  onChange={(value) => updateProjectField('hotlineHover', value)}
                />
              </fieldset>

              <TextAreaInput
                label="Objective"
                value={selectedProject.objective}
                onChange={(value) => updateProjectField('objective', value)}
                rows={5}
              />

              <TextAreaInput
                label="Narrative"
                value={selectedProject.narrative}
                onChange={(value) => updateProjectField('narrative', value)}
                rows={5}
              />

              <div className="admin-two-column-layout">
                <ListEditor
                  label="Platforms"
                  items={selectedProject.platforms}
                  onAdd={() => updateProjectArray('platforms', [...selectedProject.platforms, ''])}
                  onRemove={(index) => updateProjectArray(
                    'platforms',
                    selectedProject.platforms.filter((_, itemIndex) => itemIndex !== index)
                  )}
                  onUpdate={(index, value) => updateProjectArray(
                    'platforms',
                    selectedProject.platforms.map((item, itemIndex) => (
                      itemIndex === index ? value : item
                    ))
                  )}
                  addLabel="Add Platform"
                />

                <ListEditor
                  label="Technical Focus"
                  items={selectedProject.technical}
                  onAdd={() => updateProjectArray('technical', [...selectedProject.technical, ''])}
                  onRemove={(index) => updateProjectArray(
                    'technical',
                    selectedProject.technical.filter((_, itemIndex) => itemIndex !== index)
                  )}
                  onUpdate={(index, value) => updateProjectArray(
                    'technical',
                    selectedProject.technical.map((item, itemIndex) => (
                      itemIndex === index ? value : item
                    ))
                  )}
                  addLabel="Add Technical Line"
                  multiline
                />
              </div>

              <ListEditor
                label="Hotline Lines"
                items={selectedProject.hotline}
                onAdd={() => updateProjectArray('hotline', [...selectedProject.hotline, ''])}
                onRemove={(index) => updateProjectArray(
                  'hotline',
                  selectedProject.hotline.filter((_, itemIndex) => itemIndex !== index)
                )}
                onUpdate={(index, value) => updateProjectArray(
                  'hotline',
                  selectedProject.hotline.map((item, itemIndex) => (
                    itemIndex === index ? value : item
                  ))
                )}
                addLabel="Add Hotline Line"
                multiline
              />
            </div>
          ) : (
            <div className="admin-empty-panel">This zone has no projects yet. Use Add to create one.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function StructuredSectionEditor({
  sectionId,
  content,
  onChange,
  onStatusChange
}) {
  if (sectionId === 'desktop') {
    return <DesktopEditor content={content} onChange={onChange} />
  }

  if (sectionId === 'about') {
    return <AboutEditor content={content} onChange={onChange} />
  }

  if (sectionId === 'socials') {
    return <SocialsEditor content={content} onChange={onChange} />
  }

  if (sectionId === 'applications-root') {
    return <ApplicationsRootEditor content={content} onChange={onChange} />
  }

  if (sectionId === 'applications-projects') {
    return (
      <ApplicationsProjectsEditor
        content={content}
        onChange={onChange}
        onStatusChange={onStatusChange}
      />
    )
  }

  if (sectionId === 'shell-projects') {
    return (
      <ShellCollectionEditor
        content={content}
        collectionKey="projects"
        onChange={onChange}
        onStatusChange={onStatusChange}
      />
    )
  }

  if (sectionId === 'shell-networking') {
    return (
      <ShellCollectionEditor
        content={content}
        collectionKey="networkingProjects"
        onChange={onChange}
        onStatusChange={onStatusChange}
      />
    )
  }

  if (sectionId === 'arcade-projects') {
    return (
      <ArcadeProjectsEditor
        content={content}
        onChange={onChange}
        onStatusChange={onStatusChange}
      />
    )
  }

  return null
}

export default StructuredSectionEditor
