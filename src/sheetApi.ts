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

// 使用 CORS 代理繞過跨域限制（StackBlitz 等環境需要）
const CORS_PROXY = 'https://corsproxy.io/?url='

function getFetchUrl(url: string): string {
  if (!url) return url
  const trimmed = url.trim()
  const isGoogleScript = trimmed.includes('script.google.com')
  const alreadyProxied = trimmed.includes('corsproxy.io') || trimmed.includes('cors.sh')
  if (isGoogleScript && !alreadyProxied) {
    return CORS_PROXY + encodeURIComponent(trimmed)
  }
  return trimmed
}

export async function fetchFromSheet(url: string): Promise<Entry[]> {
  const fetchUrl = getFetchUrl(url)
  const res = await fetch(fetchUrl)
  if (!res.ok) throw new Error('無法載入資料')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function addToSheet(url: string, entry: Entry): Promise<Entry[]> {
  const fetchUrl = getFetchUrl(url)
  const res = await fetch(fetchUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', entry }),
  })
  if (!res.ok) throw new Error('新增失敗')
  const data = await res.json()
  return data.entries || []
}

export async function deleteFromSheet(
  url: string,
  id: string
): Promise<Entry[]> {
  const fetchUrl = getFetchUrl(url)
  const res = await fetch(fetchUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  })
  if (!res.ok) throw new Error('刪除失敗')
  const data = await res.json()
  return data.entries || []
}
