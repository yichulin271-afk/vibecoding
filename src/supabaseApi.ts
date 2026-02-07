import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL_KEY = 'ledger-supabase-url'
const SUPABASE_ANON_KEY = 'ledger-supabase-anon-key'

export type Entry = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = localStorage.getItem(SUPABASE_URL_KEY)?.trim()
  const anonKey = localStorage.getItem(SUPABASE_ANON_KEY)?.trim()
  if (url && anonKey) return { url, anonKey }
  return null
}

export function setSupabaseConfig(url: string, anonKey: string): void {
  if (url.trim() && anonKey.trim()) {
    localStorage.setItem(SUPABASE_URL_KEY, url.trim())
    localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim())
  } else {
    localStorage.removeItem(SUPABASE_URL_KEY)
    localStorage.removeItem(SUPABASE_ANON_KEY)
  }
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_URL_KEY)
  localStorage.removeItem(SUPABASE_ANON_KEY)
}

function getClient(): SupabaseClient | null {
  const config = getSupabaseConfig()
  if (!config) return null
  return createClient(config.url, config.anonKey)
}

export async function fetchFromSupabase(): Promise<Entry[]> {
  const client = getClient()
  if (!client) return []
  const { data, error } = await client
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map((row) => ({
    id: row.id,
    description: row.description || '',
    amount: Number(row.amount) || 0,
    type: row.type === 'income' ? 'income' : 'expense',
    category: row.category || '其他',
    date: row.date || '',
  }))
}

export async function addToSupabase(entry: Entry): Promise<Entry[]> {
  const client = getClient()
  if (!client) throw new Error('未設定 Supabase')
  const { error } = await client.from('entries').insert({
    id: entry.id,
    description: entry.description,
    amount: entry.amount,
    type: entry.type,
    category: entry.category,
    date: entry.date,
  })
  if (error) throw new Error(error.message)
  return fetchFromSupabase()
}

export async function deleteFromSupabase(id: string): Promise<Entry[]> {
  const client = getClient()
  if (!client) throw new Error('未設定 Supabase')
  const { error } = await client.from('entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return fetchFromSupabase()
}
