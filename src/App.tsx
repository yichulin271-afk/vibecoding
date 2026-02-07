import { useState, useEffect, useCallback } from 'react'
import {
  type Entry,
  getSheetUrl,
  setSheetUrl,
  getUseProxy,
  setUseProxy,
  loadFromLocal,
  saveToLocal,
  fetchFromSheet,
  addToSheet,
  deleteFromSheet,
} from './sheetApi'
import './App.css'

const EXPENSE_CATEGORIES = ['飲食', '交通', '娛樂', '日用', '購物', '其他'] as const
const INCOME_CATEGORIES = ['薪水', '獎金', '投資', '其他'] as const

type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
type IncomeCategory = (typeof INCOME_CATEGORIES)[number]

function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState<ExpenseCategory | IncomeCategory>('飲食')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [sheetUrlInput, setSheetUrlInput] = useState(getSheetUrl())
  const [useProxy, setUseProxyState] = useState(() => getUseProxy())

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const url = getSheetUrl()
    try {
      if (url) {
        const data = await fetchFromSheet(url)
        setEntries(data)
        saveToLocal(data)
      } else {
        setEntries(loadFromLocal())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗')
      setEntries(loadFromLocal())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveSheetUrl = () => {
    setSheetUrl(sheetUrlInput.trim())
    setSheetUrlInput(sheetUrlInput.trim())
    setShowSettings(false)
    loadData()
  }

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!description.trim() || isNaN(num) || num <= 0) return

    const newEntry: Entry = {
      id: crypto.randomUUID(),
      description: description.trim(),
      amount: num,
      type,
      category,
      date: new Date().toISOString().slice(0, 10),
    }

    const url = getSheetUrl()
    setError(null)
    try {
      if (url) {
        const data = await addToSheet(url, newEntry)
        setEntries(data)
        saveToLocal(data)
      } else {
        const updated = [...entries, newEntry]
        setEntries(updated)
        saveToLocal(updated)
      }
      setDescription('')
      setAmount('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失敗')
    }
  }

  const deleteEntry = async (id: string) => {
    const url = getSheetUrl()
    setError(null)
    try {
      if (url) {
        const data = await deleteFromSheet(url, id)
        setEntries(data)
        saveToLocal(data)
      } else {
        const updated = entries.filter((e) => e.id !== id)
        setEntries(updated)
        saveToLocal(updated)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  const totalIncome = entries
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0)
  const totalExpense = entries
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)
  const balance = totalIncome - totalExpense

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(n)

  return (
    <div className="ledger-app">
      <header className="ledger-header">
        <h1>記帳本</h1>
        <p className="subtitle">簡單管理你的收支</p>
        <button
          type="button"
          className="btn-settings"
          onClick={() => setShowSettings(!showSettings)}
          title="設定"
        >
          ⚙️
        </button>
      </header>

      {showSettings && (
        <div className="settings-panel">
          <h3>Google Sheet 連線</h3>
          <p className="settings-hint">
            請先依照專案 docs/GOOGLE_SHEET_SETUP.md 的說明部署 Apps Script，再貼上網址
          </p>
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/xxx/exec"
            value={sheetUrlInput}
            onChange={(e) => setSheetUrlInput(e.target.value)}
            className="input-sheet-url"
          />
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={useProxy}
              onChange={(e) => {
                const v = e.target.checked
                setUseProxy(v)
                setUseProxyState(v)
              }}
            />
            使用 CORS 代理（若出現 403 可嘗試取消勾選）
          </label>
          <div className="settings-actions">
            <button type="button" className="btn-save-url" onClick={handleSaveSheetUrl}>
              儲存
            </button>
            <button
              type="button"
              className="btn-clear-url"
              onClick={() => {
                setSheetUrl('')
                setSheetUrlInput('')
                setEntries(loadFromLocal())
                setShowSettings(false)
              }}
            >
              清除（改用本機儲存）
            </button>
          </div>
          {getSheetUrl() && (
            <p className="settings-status">✓ 已連接 Google Sheet</p>
          )}
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="balance-card">
        <span className="balance-label">目前結餘</span>
        <span className={`balance-value ${balance >= 0 ? 'positive' : 'negative'}`}>
          {formatMoney(balance)}
        </span>
        <div className="balance-breakdown">
          <span>收入：{formatMoney(totalIncome)}</span>
          <span>支出：{formatMoney(totalExpense)}</span>
        </div>
      </div>

      <form className="add-form" onSubmit={addEntry}>
        <input
          type="text"
          placeholder="項目說明（如：午餐、薪水）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-desc"
        />
        <input
          type="number"
          placeholder="金額"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-amount"
          min="0"
          step="1"
        />
        <select
          value={type}
          onChange={(e) => {
            const t = e.target.value as 'income' | 'expense'
            setType(t)
            setCategory(t === 'expense' ? '飲食' : '薪水')
          }}
          className="select-type"
        >
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        <div className="category-row">
          <span className="category-label">分類</span>
          <div className="category-btns">
            {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn-category ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>
        <button type="submit" className="btn-add" disabled={loading}>
          {loading ? '載入中...' : '新增'}
        </button>
      </form>

      <section className="entry-list">
        <h2>紀錄</h2>
        {loading ? (
          <p className="empty">載入中...</p>
        ) : entries.length === 0 ? (
          <p className="empty">尚無紀錄，新增一筆試試</p>
        ) : (
          <ul>
            {[...entries].reverse().map((entry) => (
              <li key={entry.id} className={`entry-item ${entry.type}`}>
                <div className="entry-info">
                  <span className="entry-desc">{entry.description}</span>
                  <span className="entry-meta">
                    <span className="entry-category">{entry.category}</span>
                    <span className="entry-date">{entry.date}</span>
                  </span>
                </div>
                <div className="entry-right">
                  <span className={`entry-amount ${entry.type}`}>
                    {entry.type === 'income' ? '+' : '-'}
                    {formatMoney(entry.amount)}
                  </span>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => deleteEntry(entry.id)}
                    aria-label="刪除"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
