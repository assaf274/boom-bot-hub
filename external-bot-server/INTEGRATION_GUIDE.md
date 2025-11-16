# מדריך אינטגרציה - שרת הבוטים + Lovable + Supabase

## 🔄 איך המערכת עובדת ביחד

```
[משתמש באתר] 
    ↓ לוחץ "הוסף בוט"
[Lovable Frontend]
    ↓ קורא ל-API
[Supabase bot-proxy Edge Function]
    ↓ מעביר בקשה ל-
[השרת שלך - http://172.93.213.2:3001]
    ↓ יוצר instance של WhatsApp
[Bot Instance + Session]
    ↓ מחזיר QR
[הכל חזרה למשתמש]
```

## 📊 זרימת יצירת בוט

### 1. המשתמש לוחץ "הוסף בוט" באתר

**Frontend (`ClientBotsManagement.tsx`)**:
```typescript
api.createBot(botName, user.id)
```

**API Client (`src/lib/api.ts`)**:
```typescript
supabase.functions.invoke('bot-proxy', {
  body: {
    path: '/bot',
    method: 'POST',
    body: { bot_name: botName, user_id: userId }
  }
})
```

### 2. bot-proxy מעביר לשרת החיצוני

**Edge Function (`supabase/functions/bot-proxy/index.ts`)**:
```typescript
const response = await fetch(`${EXTERNAL_API_URL}/bot`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bot_name, user_id })
})
```

### 3. השרת שלך יוצר את הבוט

**Your Server (`server.js`)**:
```javascript
app.post('/bot', (req, res) => {
  const { bot_name } = req.body;
  const botId = bot_name; // external_bot_id
  
  createBotInstance(botId);
  
  res.json({
    id: botId,
    external_bot_id: botId,
    bot_name,
    status: 'pending'
  });
});
```

### 4. bot-proxy שומר ב-Supabase

**Edge Function**:
```typescript
await supabase.from('bots').insert({
  bot_name: data.bot_name,
  external_bot_id: data.external_bot_id,
  user_id: body.user_id,
  status: 'pending'
})
```

### 5. המשתמש מקבל את הבוט באתר

**Frontend** מקבל את הבוט החדש ויכול לבקש QR.

## 🔐 זרימת QR Code

### 1. לחיצה על כפתור QR

```typescript
// Frontend
api.getBotQR(bot.external_bot_id)
  ↓
// bot-proxy
fetch(`${EXTERNAL_API_URL}/bot/${external_bot_id}/qr`)
  ↓
// Your Server
app.get('/bot/:id/qr', (req, res) => {
  const bot = bots.get(req.params.id);
  res.json({ qr_code: bot.qrCode });
})
```

### 2. רענון אוטומטי כל 30 שניות

```typescript
// Frontend - ClientBotsManagement.tsx
useEffect(() => {
  if (showQrDialog && selectedBot?.status === 'pending') {
    const interval = setInterval(() => {
      fetchQR();
    }, 30000);
    return () => clearInterval(interval);
  }
}, [showQrDialog, selectedBot]);
```

## 🗄️ מבנה הנתונים

### Supabase Table: `bots`
```sql
CREATE TABLE bots (
  id UUID PRIMARY KEY,
  external_bot_id TEXT,          -- ה-ID שהשרת שלך מחזיר
  bot_name TEXT,
  user_id UUID,
  status bot_status,             -- 'pending', 'connected', 'disconnected'
  phone_number TEXT,
  qr_code TEXT,
  connection_id TEXT,
  connected_at TIMESTAMP,
  last_active TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Your Server: In-Memory Map
```javascript
const bots = new Map();

bots.set('בוט-ראשון', {
  client: WhatsAppClient,
  qrCode: 'data:image/png;base64,...',
  status: 'connected',
  phoneNumber: '972501234567',
  lastActive: Date,
  connectedAt: Date
});
```

## 🚀 תרחישי שימוש

### תרחיש 1: משתמש רוצה ליצור בוט חדש

1. ✅ משתמש ממלא "שם הבוט" באתר
2. ✅ לוחץ "צור בוט"
3. ✅ הבקשה עוברת דרך bot-proxy לשרת שלך
4. ✅ השרת יוצר instance חדש של WhatsApp
5. ✅ bot-proxy שומר ב-Supabase
6. ✅ הבוט מופיע ברשימה באתר
7. ✅ משתמש לוחץ "הצג QR"
8. ✅ משתמש סורק QR עם הטלפון
9. ✅ הבוט מתחבר והסטטוס משתנה ל-"connected"

### תרחיש 2: שרת עולה מחדש

1. ✅ השרת קורא ל-`loadExistingBotsFromSupabase()`
2. ✅ מקבל רשימה של כל הבוטים מ-Supabase
3. ✅ יוצר instance לכל בוט עם ה-`external_bot_id` שלו
4. ✅ אם יש session שמור - הבוט מתחבר אוטומטית
5. ✅ אם אין session - הבוט ממתין ל-QR חדש

### תרחיש 3: בוט מתנתק

1. ✅ WhatsApp Web מתנתק
2. ✅ השרת שולח event 'disconnected'
3. ✅ הסטטוס משתנה ל-"disconnected"
4. ⚠️ אופציונלי: bot-proxy יכול לעדכן את Supabase (עדיין לא מיושם)
5. ✅ משתמש יכול לרענן QR כדי להתחבר מחדש

## ⚙️ הגדרות מומלצות

### על השרת החיצוני (172.93.213.2)

#### הפעלה עם PM2:
```bash
pm2 start server.js --name whatsapp-bots
pm2 save
pm2 startup
```

#### ניטור:
```bash
pm2 logs whatsapp-bots --lines 100
pm2 monit
```

### באתר Lovable

#### Realtime Updates (אופציונלי):
אם רוצים שינויים בזמן אמת בסטטוס:

```typescript
// בעתיד: bot-proxy יכול לעדכן את Supabase כש-bot מתחבר
// ו-Frontend ישתמש ב-realtime subscription לעדכון אוטומטי
```

## 🔧 Troubleshooting

### הבוט לא נוצר

**בדוק:**
1. השרת פועל? `curl http://172.93.213.2:3001/health`
2. bot-proxy מגיע לשרת? בדוק לוגים: `pm2 logs whatsapp-bots`
3. יש שגיאות ב-Console? פתח DevTools באתר

### QR לא מופיע

**בדוק:**
1. `bot.external_bot_id` קיים? בדוק ב-Console
2. השרת החזיר QR? `curl http://172.93.213.2:3001/bot/{botId}/qr`
3. המתן 15-20 שניות - יצירת QR לוקחת זמן

### הבוט לא מתחבר

**בדוק:**
1. סרקת את ה-QR בפרק זמן? (QR תקף ל-20 שניות)
2. ה-WhatsApp בטלפון מחובר לאינטרנט?
3. Session קיים? `ls -la sessions/`
4. יש מספיק זיכרון? `free -h`

## 📝 הערות חשובות

1. **external_bot_id = bot_name**: כרגע אנחנו משתמשים בשם הבוט כ-ID החיצוני
2. **Sessions נשמרים מקומית**: בתיקייה `sessions/` על השרת
3. **QR חדש כל פעם**: אם אין session, צריך QR חדש
4. **Connection נשאר**: עם session תקין, הבוט מתחבר אוטומטית

## 🎯 Next Steps (אופציונלי)

1. ✅ הוספת webhook ל-bot-proxy כשבוט מתחבר
2. ✅ realtime updates בסטטוס
3. ✅ שליחת הודעות דרך הבוטים
4. ✅ ניהול קבוצות
5. ✅ לוח בקרה מתקדם
