// Shared validation for image uploads that land in the public `renders` bucket.

const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** Returns the safe file extension for an allowed image, or an error message. */
export function validateImage(file: File): { ext: string; contentType: string } | { error: string } {
  const ext = ALLOWED[file.type]
  if (!ext) return { error: 'Only PNG, JPEG, WebP or GIF images are allowed' }
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Image must be 8 MB or smaller' }
  return { ext, contentType: file.type }
}
