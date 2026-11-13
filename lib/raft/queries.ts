import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 1000

/** Reads every row of a table, page by page, selecting only the named columns. */
export async function selectAll<T>(table: string, columns: string, orderBy: string[]): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(columns)
    for (const column of orderBy) query = query.order(column, { ascending: true })
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = (data ?? []) as unknown as T[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}
