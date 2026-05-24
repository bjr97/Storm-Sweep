import { APPLICANT_SESSION_KEY } from '@/lib/sweepers/constants'

export function getApplicantId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(APPLICANT_SESSION_KEY)
}

export function setApplicantId(id: string): void {
  sessionStorage.setItem(APPLICANT_SESSION_KEY, id)
}

export function clearApplicantId(): void {
  sessionStorage.removeItem(APPLICANT_SESSION_KEY)
}
