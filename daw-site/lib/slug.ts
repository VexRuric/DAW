/** URL slug for wrestler, faction and title pages: "Uncle Vac" → "uncle-vac". */
export function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
