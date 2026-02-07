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

const USE_PROXY_KEY = 'ledger-use-proxy'

export function getUseProxy(): boolean {
  const v = localStorage.getItem(USE_PROXY_KEY)
  return v !== 'false'
}

export function setUseProxy(use: boolean): void {
  localStorage.setItem(USE_PROXY_KEY, String(use))
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

function getFetchUrls(url: string, useProxy?: boolean): string[] {
  if (!url) return []
  const trimmed = url.trim()
  const alreadyProxied =
    trimmed.includes('corsproxy.io') ||
    trimmed.includes('cors.sh') ||
    trimmed.includes('cors.lol')
  const isGoogleScript = trimmed.includes('script.google.com')
  const shouldProxy =
    useProxy !== false &&
    isGoogleScript &&
    !alreadyProxied
  if (shouldProxy) {
    return CORS_PROXIES.map((fn) => fn(trimmed))
  }
  return [trimmed]
}

async function fetchWithProxies(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const useProxy = getUseProxy()
  const urls = getFetchUrls(url, useProxy)
  let lastError: unknown
  for (const fetchUrl of urls) {
    try {
      const res = await fetch(fetchUrl, options)
      if (res.ok) return res
      const msg =
        res.status === 403
          ? `HTTP 403：請確認 Apps Script 部署的存取權為「任何人」`
          : `HTTP ${res.status}`
      lastError = new Error(msg)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text()
  const trimmed = text.trim()
  if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!')) {
    throw new Error(
      '收到 HTML 而非 JSON，可能是代理或網址錯誤。請嘗試：1) 取消勾選「使用 CORS 代理」 2) 確認 Apps Script 網址正確'
    )
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`無法解析回應：${trimmed.slice(0, 50)}...`)
  }
}

export async function fetchFromSheet(url: string): Promise<Entry[]> {
  const res = await fetchWithProxies(url)
  const data = await parseJsonResponse(res)
  return Array.isArray(data) ? data : []
}

export async function addToSheet(url: string, entry: Entry): Promise<Entry[]> {
  const res = await fetchWithProxies(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', entry }),
  })
  const data = (await parseJsonResponse(res)) as {
    success?: boolean
    message?: string
    entries?: Entry[]
  }
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
  const data = (await parseJsonResponse(res)) as {
    success?: boolean
    message?: string
    entries?: Entry[]
  }
  if (!data.success) throw new Error(data.message || '刪除失敗')
  return data.entries || []
}
