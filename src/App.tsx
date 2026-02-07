import { useState } from 'react'
import './App.css'

type Entry = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  date: string
}

function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')

  const addEntry = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!description.trim() || isNaN(num) || num <= 0) return

    setEntries([
      ...entries,
      {
        id: crypto.randomUUID(),
        description: description.trim(),
        amount: num,
        type,
        date: new Date().toISOString().slice(0, 10),
      },
    ])
    setDescription('')
    setAmount('')
  }

  const deleteEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id))
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
      </header>

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
          onChange={(e) => setType(e.target.value as 'income' | 'expense')}
          className="select-type"
        >
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        <button type="submit" className="btn-add">
          新增
        </button>
      </form>

      <section className="entry-list">
        <h2>紀錄</h2>
        {entries.length === 0 ? (
          <p className="empty">尚無紀錄，新增一筆試試</p>
        ) : (
          <ul>
            {[...entries].reverse().map((entry) => (
              <li key={entry.id} className={`entry-item ${entry.type}`}>
                <div className="entry-info">
                  <span className="entry-desc">{entry.description}</span>
                  <span className="entry-date">{entry.date}</span>
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
