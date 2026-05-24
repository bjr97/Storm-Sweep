import { TOOL_PHOTO_KEYS, type ToolPhotoKey } from '@/lib/sweepers/constants'
import type { Json } from '@/types/database'

export function parseToolPhotos(value: Json | null | undefined): Record<string, string> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, string>
}

export function countUploadedTools(toolPhotos: Record<string, string>): number {
  return TOOL_PHOTO_KEYS.filter((key) => Boolean(toolPhotos[key])).length
}

export function allToolsUploaded(toolPhotos: Record<string, string>): boolean {
  return countUploadedTools(toolPhotos) === TOOL_PHOTO_KEYS.length
}

export function isValidToolKey(key: string): key is ToolPhotoKey {
  return (TOOL_PHOTO_KEYS as readonly string[]).includes(key)
}

export function generateTempPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}
