# Supabase 雲端儲存設定

依照下列步驟，將記帳本連接到 Supabase。

## 步驟 1：建立專案

1. 前往 [supabase.com](https://supabase.com) 並登入
2. 建立新專案（或使用現有專案）
3. 等待專案初始化完成

## 步驟 2：建立資料表

1. 在 Supabase 專案左側點 **SQL Editor**
2. 點 **New query**
3. 貼上以下 SQL 並執行（Run）：

```sql
-- 建立 entries 資料表
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 允許匿名讀寫（記帳本使用 anon key）
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON entries
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
```

## 步驟 3：取得 API 金鑰

1. 點左側 **Project Settings**（齒輪圖示）
2. 點 **API**
3. 複製：
   - **Project URL**（例如 `https://xxxx.supabase.co`）
   - **anon public** 金鑰（在 Project API keys 區塊）

## 步驟 4：在記帳本中設定

1. 點記帳本右上角 **齒輪**
2. 在 Supabase 區塊貼上：
   - **Project URL**
   - **anon key**
3. 點 **連接 Supabase**

完成後，記帳資料會同步到 Supabase 雲端，可跨裝置使用。
