# Google Sheet 記帳儲存設定

依照下列步驟，將記帳本連接到你的 Google 試算表。

## 步驟 1：建立 Google 試算表

1. 前往 [Google 試算表](https://sheets.google.com)
2. 建立空白試算表
3. 在第一列輸入標題：`id` | `description` | `amount` | `type` | `category` | `date`

## 步驟 2：新增 Apps Script

1. 在試算表選單點 **擴充功能** → **Apps Script**
2. 刪除預設程式碼，貼上以下完整程式碼：

```javascript
const SHEET_NAME = '工作表1'; // 若你的工作表名稱不同，請修改

function doGet(e) {
  const result = getEntries();
  return createJsonResponse(result);
}

function doPost(e) {
  let result = { success: false, message: '' };
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'add') {
      addEntry(data.entry);
      result = { success: true, entries: getEntries() };
    } else if (action === 'delete') {
      deleteEntry(data.id);
      result = { success: true, entries: getEntries() };
    }
  } catch (err) {
    result.message = err.toString();
  }
  return createJsonResponse(result);
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function getEntries() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 1) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const entries = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      entries.push({
        id: String(row[0]),
        description: String(row[1] || ''),
        amount: Number(row[2]) || 0,
        type: row[3] === 'income' ? 'income' : 'expense',
        category: String(row[4] || '其他'),
        date: String(row[5] || '')
      });
    }
  }
  return entries;
}

function addEntry(entry) {
  const sheet = getSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'description', 'amount', 'type', 'category', 'date']);
  }
  sheet.appendRow([
    entry.id,
    entry.description,
    entry.amount,
    entry.type,
    entry.category,
    entry.date
  ]);
}

function deleteEntry(id) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}
```

3. 若試算表的工作表名稱不是「工作表1」，請修改第一行的 `SHEET_NAME`
4. 點 **儲存**（Ctrl+S），專案名稱可填「記帳API」

## 步驟 3：部署為網路應用程式

1. 點 **部署** → **新增部署作業**
2. 類型選 **網路應用程式**
3. 設定：
   - **說明**：記帳 API（可自訂）
   - **執行身分**：我（你的帳號）
   - **存取權**：**任何人**（重要：否則記帳本無法讀寫）
4. 點 **部署**
5. **授權**：第一次會要求你授權，點選你的 Google 帳號並允許
6. 複製產生的 **網路應用程式網址**（結尾是 `/exec`）

## 步驟 4：在記帳本中設定

1. 在記帳本頁面點 **設定**
2. 貼上剛才複製的網址
3. 點 **儲存**

完成後，記帳資料會同步到你的 Google 試算表。

---

## 若出現 CORS 錯誤

從 StackBlitz 或部分網域呼叫 Google Apps Script 時，瀏覽器可能會阻擋請求（CORS 錯誤）。

**解法**：使用 CORS 代理，將網址改為：
```
https://corsproxy.io/?https://script.google.com/macros/s/你的ID/exec
```
把整段貼到記帳本的設定中即可。
