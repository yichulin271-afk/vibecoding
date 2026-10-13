import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react'
import './draw.css'

const STORAGE_KEY = 'topic-draw-state'

const DEFAULT_TOPICS = [
  '最近讓你最有成就感的一件事',
  '一個你最近學到的新工具',
  '工作上踩過最大的坑',
  '如果有一天假，你會怎麼過',
  '推薦一本書或一部影片',
  '你最想改善的一個流程',
]

type Phase = 'idle' | 'shaking' | 'opening' | 'rising' | 'shown'

interface SavedState {
  topics: string[]
  drawn: string[]
  noRepeat: boolean
}

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedState>
      return {
        topics: Array.isArray(parsed.topics) ? parsed.topics : DEFAULT_TOPICS,
        drawn: Array.isArray(parsed.drawn) ? parsed.drawn : [],
        noRepeat: parsed.noRepeat ?? true,
      }
    }
  } catch {
    // 讀不到就用預設值
  }
  return { topics: DEFAULT_TOPICS, drawn: [], noRepeat: true }
}

function saveState(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 無痕模式等情況存不了，忽略
  }
}

const CONFETTI_COLORS = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c084fc', '#ff9f43']

function makeConfetti() {
  return Array.from({ length: 48 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 900,
    y: -200 - Math.random() * 350,
    r: Math.random() * 720 - 360,
    delay: Math.random() * 0.15,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }))
}

function DrawApp() {
  const [initial] = useState(loadState)
  const [topics, setTopics] = useState<string[]>(initial.topics)
  const [drawn, setDrawn] = useState<string[]>(initial.drawn)
  const [noRepeat, setNoRepeat] = useState(initial.noRepeat)
  const [phase, setPhase] = useState<Phase>('idle')
  const [current, setCurrent] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editorText, setEditorText] = useState('')
  const [confetti, setConfetti] = useState(makeConfetti)
  const timers = useRef<number[]>([])

  useEffect(() => {
    saveState({ topics, drawn, noRepeat })
  }, [topics, drawn, noRepeat])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const remaining = useMemo(
    () => (noRepeat ? topics.filter((t) => !drawn.includes(t)) : topics),
    [topics, drawn, noRepeat]
  )

  const busy = phase === 'shaking' || phase === 'opening' || phase === 'rising'

  const draw = useCallback(() => {
    if (busy || remaining.length === 0) return
    const pick = remaining[Math.floor(Math.random() * remaining.length)]
    setCurrent(pick)
    setConfetti(makeConfetti())
    setPhase('shaking')
    const at = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms))
    }
    at(1200, () => setPhase('opening'))
    at(1700, () => setPhase('rising'))
    at(2600, () => {
      setPhase('shown')
      setDrawn((d) => [...d, pick])
    })
  }, [busy, remaining])

  const closeResult = useCallback(() => {
    setPhase('idle')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showEditor) return
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        if (phase === 'shown') closeResult()
        else draw()
      } else if (e.code === 'Escape' && phase === 'shown') {
        closeResult()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draw, closeResult, phase, showEditor])

  const openEditor = () => {
    setEditorText(topics.join('\n'))
    setShowEditor(true)
  }

  const saveEditor = () => {
    const list = Array.from(
      new Set(
        editorText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    )
    setTopics(list)
    setDrawn((d) => d.filter((t) => list.includes(t)))
    setShowEditor(false)
  }

  const resetDrawn = () => {
    setDrawn([])
    setPhase('idle')
  }

  return (
    <div className="draw-app">
      <header className="draw-header">
        <h1>議題抽籤箱</h1>
        <p className="draw-subtitle">
          箱子裡還有 <strong>{remaining.length}</strong> 張籤
          {noRepeat && topics.length > 0 && ` / 共 ${topics.length} 張`}
        </p>
      </header>

      <main className="stage">
        <button
          type="button"
          className={`box phase-${phase}`}
          onClick={phase === 'shown' ? closeResult : draw}
          disabled={busy || (phase !== 'shown' && remaining.length === 0)}
          aria-label="抽一張籤"
        >
          <span className="slip" aria-hidden="true">
            <span className="slip-fold" />
          </span>
          <span className="box-lid" aria-hidden="true">
            <span className="box-lid-top" />
          </span>
          <span className="box-body" aria-hidden="true">
            <span className="box-slot" />
            <span className="box-label">?</span>
          </span>
        </button>

        <div className="actions">
          <button
            type="button"
            className="btn-draw"
            onClick={draw}
            disabled={busy || remaining.length === 0}
          >
            {remaining.length === 0 ? '籤抽完了' : busy ? '抽籤中…' : '抽一張！'}
          </button>
          <p className="hint">也可以按空白鍵抽籤</p>
        </div>
      </main>

      {phase === 'shown' && current && (
        <div className="result-overlay" onClick={closeResult}>
          <div className="confetti" aria-hidden="true">
            {confetti.map((c) => (
              <span
                key={c.id}
                style={
                  {
                    '--x': `${c.x}px`,
                    '--y': `${c.y}px`,
                    '--r': `${c.r}deg`,
                    '--d': `${c.delay}s`,
                    background: c.color,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="result-card" onClick={(e) => e.stopPropagation()}>
            <p className="result-label">本次議題</p>
            <p className="result-topic">{current}</p>
            <div className="result-actions">
              <button
                type="button"
                className="btn-draw"
                onClick={draw}
                disabled={remaining.length === 0}
              >
                再抽一張
              </button>
              <button type="button" className="btn-ghost" onClick={closeResult}>
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="panel-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={noRepeat}
              onChange={(e) => setNoRepeat(e.target.checked)}
            />
            抽過的不放回
          </label>
          <div className="panel-buttons">
            <button type="button" className="btn-ghost" onClick={openEditor}>
              編輯議題
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={resetDrawn}
              disabled={drawn.length === 0}
            >
              全部放回
            </button>
          </div>
        </div>

        {drawn.length > 0 && (
          <div className="history">
            <h2>已抽出</h2>
            <ol>
              {drawn.map((t, i) => (
                <li key={`${t}-${i}`}>{t}</li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {showEditor && (
        <div className="editor-overlay" onClick={() => setShowEditor(false)}>
          <div className="editor" onClick={(e) => e.stopPropagation()}>
            <h2>編輯議題</h2>
            <p className="hint">一行一個議題，重複的會自動合併</p>
            <textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              rows={12}
              autoFocus
            />
            <div className="result-actions">
              <button type="button" className="btn-draw" onClick={saveEditor}>
                儲存
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowEditor(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DrawApp
