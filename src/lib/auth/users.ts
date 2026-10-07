import { createServiceClient } from '@/lib/supabase/server'

/** Auth user id for an email (case-insensitive), or null. Pages through all users. */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createServiceClient()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw error
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (match) {
      return match.id
    }

    if (data.users.length < perPage) {
      break
    }
    page += 1
  }

  return null
}
