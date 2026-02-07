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

export async function fetchFromSheet(url: string): Promise<Entry[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('無法載入資料')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function addToSheet(url: string, entry: Entry): Promise<Entry[]> {
  const res = await fetch(url, {
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
  const res = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  })
  if (!res.ok) throw new Error('刪除失敗')
  const data = await res.json()
  return data.entries || []
}
