const STRUCTURED_SECTION_IDS = new Set([
  'desktop',
  'about',
  'socials',
  'applications-root',
  'applications-projects',
  'shell-projects',
  'shell-networking',
  'arcade-projects'
])

export function supportsStructuredSection(sectionId) {
  return STRUCTURED_SECTION_IDS.has(sectionId)
}
