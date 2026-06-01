import { supabaseAdmin } from './supabase'

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('clerk_id', userId)
    .maybeSingle()
  return data?.is_admin === true
}
