# WhatsApp Multi-Bot Server

שרת Node.js לניהול מספר בוטים של WhatsApp Web.js במקביל, עם אינטגרציה מלאה למערכת Supabase שלך.

## ✨ תכונות

- ✅ ניהול מספר בוטים במקביל
- ✅ QR Code לכל בוט
- ✅ Session נפרד לכל בוט
- ✅ API מלא לניהול בוטים
- ✅ אינטגרציה עם Supabase דרך bot-proxy
- ✅ הפעלה אוטומטית של בוטים קיימים

## 📋 דרישות מקדימות

- Node.js 18 או גרסה חדשה יותר
- npm או yarn
- מערכת הפעלה: Linux, macOS, או Windows
- אחסון דיסק לשמירת sessions

## 🚀 התקנה

1. **העתק את התיקייה לשרת שלך**:
```bash
cd /path/to/your/server
mkdir whatsapp-bots
cd whatsapp-bots
```

2. **העתק את כל הקבצים מתיקיית `external-bot-server/`**

3. **התקן את החבילות**:
```bash
npm install
```

4. **צור קובץ `.env`** (אופציונלי):
```bash
PORT=3001
```

## 🏃 הפעלה

### הפעלה רגילה:
```bash
npm start
```

### הפעלה עם auto-reload (פיתוח):
```bash
npm run dev
```

### הפעלה עם PM2 (production):
```bash
npm install -g pm2
pm2 start server.js --name whatsapp-bots
pm2 save
pm2 startup
```

## 📡 API Endpoints

### 1. יצירת בוט חדש
```bash
POST /bot
Content-Type: application/json

{
  "bot_name": "בוט-ראשון",
  "user_id": "uuid-של-המשתמש"
}

תגובה:
{
  "id": "בוט-ראשון",
  "external_bot_id": "בוט-ראשון",
  "bot_name": "בוט-ראשון",
  "status": "pending",
  "created_at": "2025-01-10T10:00:00.000Z"
}
```

### 2. קבלת QR Code
```bash
GET /bot/:id/qr

תגובה:
{
  "id": "בוט-ראשון",
  "qr_code": "data:image/png;base64,...",
  "status": "pending"
}
```

### 3. רענון QR Code
```bash
POST /bot/:id/qr/refresh

תגובה:
{
  "id": "בוט-ראשון",
  "status": "pending",
  "message": "QR code refresh initiated"
}
```

### 4. בדיקת סטטוס בוט
```bash
GET /bot/:id/status

תגובה:
{
  "id": "בוט-ראשון",
  "status": "connected",
  "phone_number": "972501234567",
  "connected_at": "2025-01-10T10:05:00.000Z",
  "last_active": "2025-01-10T10:10:00.000Z"
}
```

### 5. מחיקת בוט
```bash
DELETE /bot/:id

תגובה:
{
  "message": "Bot deleted successfully"
}
```

### 6. רשימת כל הבוטים
```bash
GET /bots

תגובה:
[
  {
    "id": "בוט-ראשון",
    "external_bot_id": "בוט-ראשון",
    "status": "connected",
    "phone_number": "972501234567",
    "connected_at": "2025-01-10T10:05:00.000Z",
    "last_active": "2025-01-10T10:10:00.000Z"
  }
]
```

## 🔄 אינטגרציה עם המערכת הקיימת

השרת הזה עובד מושלם עם ה-bot-proxy ב-Supabase שכבר יצרנו:

1. **יצירת בוט דרך האתר** → קורא ל-bot-proxy → קורא לשרת הזה → יוצר instance חדש
2. **QR Code** → מוצג באתר דרך bot-proxy מהשרת הזה
3. **סטטוס** → מתעדכן אוטומטית דרך realtime בסופאבייס

## 📁 מבנה תיקיות

```
whatsapp-bots/
├── server.js           # השרת הראשי
├── package.json        # התלויות
├── README.md          # המדריך הזה
├── .env               # משתני סביבה (אופציונלי)
└── sessions/          # תיקייה לשמירת sessions (נוצרת אוטומטית)
    ├── session-בוט-ראשון/
    ├── session-בוט-שני/
    └── ...
```

## 🔧 פתרון בעיות

### הבוט לא מתחבר
1. ודא שה-port 3001 פתוח
2. בדוק שיש מספיק זיכרון RAM (לפחות 2GB)
3. ודא שאין firewall שחוסם

### QR Code לא מופיע
1. המתן 10-20 שניות אחרי יצירת הבוט
2. נסה לרענן את ה-QR: `POST /bot/:id/qr/refresh`
3. בדוק את הלוגים: `pm2 logs whatsapp-bots`

### Session לא נשמר
1. ודא שיש הרשאות כתיבה לתיקיית `sessions/`
2. בדוק שיש מספיק מקום בדיסק

## 📊 ניטור

עם PM2:
```bash
pm2 status              # סטטוס השרת
pm2 logs whatsapp-bots  # צפייה בלוגים
pm2 monit              # ניטור משאבים
pm2 restart whatsapp-bots  # הפעלה מחדש
```

## 🔐 אבטחה

- השרת מאזין רק על localhost בברירת מחדל
- השתמש ב-reverse proxy (nginx/apache) עבור HTTPS
- שמור על תיקיית `sessions/` מוגנת (מכילה נתונים רגישים)

## 🆘 תמיכה

אם יש בעיות:
1. בדוק את הלוגים
2. ודא שהגרסה של Node.js 18+
3. נסה להריץ `npm install` מחדש
4. מחק את תיקיית `sessions/` ונסה שוב

## 📝 הערות חשובות

- כל בוט זקוק לזיכרון של ~150-300MB
- Session נשמר אוטומטית אחרי התחברות ראשונה
- אין צורך לסרוק QR בכל פעם אחרי ההתחברות הראשונה
- הבוטים מופעלים אוטומטית בהפעלה של השרת
