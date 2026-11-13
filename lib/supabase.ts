import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://zjmusfshkykcvkufuokc.supabase.co',
  'sb_publishable_MHMgRjs5WpaZ00lzcDD3ww_2cpZT3J7',
  { db: { schema: 'raft' } },
)
