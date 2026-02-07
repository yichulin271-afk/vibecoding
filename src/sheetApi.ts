const STORAGE_KEY = 'ledger-entries'
const SHEET_URL_KEY = 'ledger-sheet-url'

export type Entry = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

export function getSheetUrl(): string {
  return localStorage.getItem(SHEET_URL_KEY) || ''
}

export function setSheetUrl(url: string): void {
  if (url.trim()) {
    localStorage.setItem(SHEET_URL_KEY, url.trim())
  } else {
    localStorage.removeItem(SHEET_URL_KEY)
  }
}

export function loadFromLocal(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveToLocal(entries: Entry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

// CORS 代理列表，依序嘗試（StackBlitz 等環境可能阻擋直接請求）
const CORS_PROXIES: ((u: string) => string)[] = [
  (u) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
]

function getFetchUrls(url: string): string[] {
  if (!url) return []
  const trimmed = url.trim()
  const isGoogleScript = trimmed.includes('script.google.com')
  const alreadyProxied =
    trimmed.includes('corsproxy.io') ||
    trimmed.includes('cors.sh') ||
    trimmed.includes('cors.lol')
  if (isGoogleScript && !alreadyProxied) {
    return CORS_PROXIES.map((fn) => fn(trimmed))
  }
  return [trimmed]
}

async function fetchWithProxies(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const urls = getFetchUrls(url)
  let lastError: unknown
  for (const fetchUrl of urls) {
    try {
      const res = await fetch(fetchUrl, options)
      if (res.ok) return res
      lastError = new Error(`HTTP ${res.status}`)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

export async function fetchFromSheet(url: string): Promise<Entry[]> {
  const res = await fetchWithProxies(url)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function addToSheet(url: string, entry: Entry): Promise<Entry[]> {
  const res = await fetchWithProxies(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', entry }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || '新增失敗')
  return data.entries || []
}

export async function deleteFromSheet(
  url: string,
  id: string
): Promise<Entry[]> {
  const res = await fetchWithProxies(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || '刪除失敗')
  return data.entries || []
}
