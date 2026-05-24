import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export type AuthResult =
  | { authorized: true; userId: string; role: UserRole }
  | { authorized: false; status: 401 | 403 }

export async function requireRole(role: UserRole): Promise<AuthResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, status: 401 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== role) {
    return { authorized: false, status: 403 }
  }

  return { authorized: true, userId: user.id, role: profile.role as UserRole }
}
