# מערכת ניהול בוטים - תיעוד מלא

## 📋 סקירה כללית

המערכת מורכבת מ-3 חלקים עיקריים:
1. **Edge Function**: `bot-proxy` - מתווך בין הפרונט לשרת החיצוני ומסנכרן עם Supabase
2. **טבלת Database**: `bots` - שומרת את כל נתוני הבוטים
3. **ממשקי UI**: דפי ניהול בוטים עבור אדמין ולקוח

---

## 🗄️ מבנה טבלת `bots`

```sql
CREATE TABLE public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_bot_id TEXT,           -- מזהה הבוט מהשרת החיצוני
  bot_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',  -- connected/disconnected/pending
  phone_number TEXT,
  qr_code TEXT,
  connected_at TIMESTAMP,
  last_active TIMESTAMP,
  connection_id TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### הבדל בין `id` ל-`external_bot_id`:
- **id**: UUID פנימי של Supabase (primary key)
- **external_bot_id**: המזהה שמחזיר השרת החיצוני שלך

---

## 🔄 Edge Function: `bot-proxy`

### מיקום הקובץ
`supabase/functions/bot-proxy/index.ts`

### תפקידים:
1. **פרוקסי לשרת החיצוני** - מעביר בקשות ל-`http://172.93.213.2:3001`
2. **סנכרון אוטומטי** - מעדכן את טבלת `bots` לפי הפעולות
3. **טיפול ב-CORS** - מאפשר גישה מהפרונט

### פעולות נתמכות:

#### 1. יצירת בוט חדש
```typescript
POST /bot
Body: {
  bot_name: "שם הבוט",
  user_id: "uuid-של-משתמש"
}
```
**מה קורה בפועל:**
- שולח בקשה לשרת החיצוני
- מקבל `botId` בתשובה
- יוצר רשומה חדשה בטבלת `bots` עם `external_bot_id` = `botId`

#### 2. קבלת QR קוד
```typescript
GET /bot/{external_bot_id}/qr
```
**מחזיר:**
```json
{
  "id": "bot-123",
  "qr_code": "https://..."
}
```

#### 3. בדיקת סטטוס
```typescript
GET /bot/{external_bot_id}/status
```
**מחזיר:**
```json
{
  "id": "bot-123",
  "status": "connected",
  "last_active": "2025-11-15T...",
  "connected_at": "2025-11-15T..."
}
```
**מה קורה בפועל:**
- שולח בקשה לשרת החיצוני
- מעדכן את הסטטוס בטבלת `bots`

#### 4. עדכון שם בוט
```typescript
PUT /bot/{external_bot_id}
Body: {
  bot_name: "שם חדש"
}
```
**מה קורה בפועל:**
- מעדכן בשרת החיצוני
- מעדכן בטבלת `bots`

#### 5. מחיקת בוט
```typescript
DELETE /bot/{external_bot_id}
```
**מה קורה בפועל:**
- מוחק מהשרת החיצוני
- מוחק מטבלת `bots`

#### 6. שליפת רשימת בוטים
```typescript
GET /bots
GET /bots?userId={user_id}
```
**מחזיר:** רשימת בוטים **ישירות מ-Supabase** (לא מהשרת החיצוני)

---

## 💻 ממשקי משתמש

### 1. עמוד אדמין (`/admin/bots`)
**קובץ:** `src/pages/admin/BotsManagement.tsx`

**יכולות:**
- ✅ הצגת כל הבוטים של כל המשתמשים
- ✅ יצירת בוט חדש (בחירת משתמש מרשימה)
- ✅ צפייה ב-QR קוד
- ✅ בדיקת סטטוס בזמן אמת
- ✅ מחיקת בוט
- ✅ עריכת שם בוט
- ✅ עדכונים בזמן אמת (Realtime Subscription)

### 2. עמוד לקוח (`/client/bots`)
**קובץ:** `src/pages/client/ClientBotsManagement.tsx`

**יכולות:**
- ✅ הצגת הבוטים של המשתמש המחובר בלבד
- ✅ יצירת בוט חדש
- ✅ צפייה ב-QR קוד
- ✅ בדיקת סטטוס
- ✅ מחיקת בוט
- ✅ הגבלת מספר בוטים לפי `max_bots` בפרופיל
- ✅ עדכונים בזמן אמת

---

## 📡 API Functions (`src/lib/api.ts`)

כל הפונקציות קוראות ל-`bot-proxy`:

```typescript
// יצירת בוט
await api.createBot("שם הבוט", userId);

// קבלת QR (חשוב! צריך external_bot_id)
await api.getBotQR(bot.external_bot_id);

// בדיקת סטטוס (חשוב! צריך external_bot_id)
await api.getBotStatus(bot.external_bot_id);

// מחיקת בוט
await api.deleteBot(bot.external_bot_id);

// עדכון שם
await api.updateBotName(bot.external_bot_id, "שם חדש");

// שליפת בוטים
await api.getBots(userId);        // בוטים של משתמש ספציפי
await api.getAllBots();           // כל הבוטים (אדמין)
```

---

## 🔐 אבטחה (RLS Policies)

הטבלה מוגנת ב-Row Level Security:

```sql
-- משתמשים רואים רק את הבוטים שלהם
CREATE POLICY "Users can view their own bots"
  ON bots FOR SELECT
  USING (auth.uid() = user_id);

-- אדמינים רואים הכל
CREATE POLICY "Admins can view all bots"
  ON bots FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

---

## 🔄 Realtime Updates

שני הממשקים מקשיבים לשינויים בזמן אמת:

```typescript
const channel = supabase
  .channel('bots-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bots'
  }, (payload) => {
    // רענן את הנתונים
    queryClient.invalidateQueries({ queryKey: ["bots"] });
  })
  .subscribe();
```

---

## 🧪 בדיקת המערכת

### 1. יצירת בוט חדש
```bash
# מה שקורה מאחורי הקלעים:
1. לוחצים על "הוסף בוט חדש"
2. Frontend -> bot-proxy -> שרת חיצוני
3. שרת חיצוני מחזיר: { botId: "abc123", bot_name: "...", user_id: "..." }
4. bot-proxy שומר בטבלת bots עם external_bot_id = "abc123"
5. Frontend מתעדכן אוטומטית (Realtime)
```

### 2. צפייה ב-QR
```bash
# מה שקורה מאחורי הקלעים:
1. לוחצים על כפתור QR
2. Frontend קורא: api.getBotQR(bot.external_bot_id)
3. bot-proxy שולח: GET http://172.93.213.2:3001/bot/abc123/qr
4. מקבל: { id: "abc123", qr_code: "https://..." }
5. מציג את ה-QR בדיאלוג
```

### 3. בדיקת סטטוס
```bash
# מה שקורה מאחורי הקלעים:
1. לוחצים על "בדוק סטטוס"
2. Frontend קורא: api.getBotStatus(bot.external_bot_id)
3. bot-proxy שולח: GET http://172.93.213.2:3001/bot/abc123/status
4. מקבל: { status: "connected", ... }
5. bot-proxy מעדכן את הטבלה
6. Frontend מתעדכן אוטומטית
```

---

## 🐛 Debugging

### לוגים ב-Edge Function
כל הפעולות נרשמות עם prefix `[BOT-PROXY]`:

```typescript
console.log("[BOT-PROXY] POST -> http://172.93.213.2:3001/bot");
console.log("[BOT-PROXY] Response status: 200");
console.log("[BOT-PROXY] Creating bot in Supabase:", botId);
```

### איך לראות לוגים:
1. לך ל-Cloud -> Edge Functions
2. בחר `bot-proxy`
3. לחץ על "Logs"

---

## ⚙️ הגדרות חשובות

### משתני סביבה (מוגדרים אוטומטית):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### CORS Headers:
```typescript
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
}
```

---

## 📝 הערות חשובות

1. **external_bot_id vs id:**
   - כשקוראים ל-QR או סטטוס, **תמיד** השתמש ב-`bot.external_bot_id`
   - `bot.id` הוא רק למטרות פנימיות של Supabase

2. **Realtime:**
   - המערכת מתעדכנת אוטומטית בזמן אמת
   - אין צורך ברענון ידני

3. **הגבלת בוטים:**
   - שדה `max_bots` בטבלת `profiles` מגביל את מספר הבוטים
   - ברירת מחדל: 5 בוטים

4. **סטטוסים:**
   - `pending` - ממתין לחיבור
   - `connected` - מחובר ופעיל
   - `disconnected` - מנותק

---

## ✅ סיכום

המערכת כוללת:
- ✅ Edge Function מלא (`bot-proxy`)
- ✅ טבלת `bots` עם כל השדות הנדרשים
- ✅ סנכרון אוטומטי עם השרת החיצוני
- ✅ ממשקי ניהול מלאים (אדמין + לקוח)
- ✅ Realtime updates
- ✅ אבטחה מלאה (RLS)
- ✅ CORS מוגדר
- ✅ לוגים מפורטים

**הכל עובד ומוכן לשימוש! 🎉**
