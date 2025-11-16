# מדריך הקמה מהיר - שרת בוטים

## שלב 1: התקנה על השרת

```bash
# התחבר לשרת שלך
ssh user@172.93.213.2

# צור תיקייה חדשה
mkdir -p /opt/whatsapp-bots
cd /opt/whatsapp-bots

# העתק את כל הקבצים מ-external-bot-server/
# (או שכפל מ-git אם העלית לשם)

# התקן חבילות
npm install
```

## שלב 2: הגדרת Port והרשאות

```bash
# ודא שה-port 3001 פתוח
sudo ufw allow 3001

# תן הרשאות לתיקייה
chmod -R 755 .
```

## שלב 3: הפעלה ראשונית (בדיקה)

```bash
# הרצה רגילה לבדיקה
npm start

# צפה בלוגים - אמור לראות:
# "🚀 Bot server running on port 3001"
```

## שלב 4: הפעלה עם PM2 (Production)

```bash
# התקן PM2 באופן גלובלי
npm install -g pm2

# הפעל את השרת
pm2 start server.js --name whatsapp-bots

# שמור את ההגדרות
pm2 save

# הגדר הפעלה אוטומטית
pm2 startup
# הרץ את הפקודה שהוא מדפיס

# בדוק שהכל עובד
pm2 status
pm2 logs whatsapp-bots
```

## שלב 5: בדיקת חיבור מהאתר

```bash
# בדוק שהאתר יכול להגיע לשרת
curl http://172.93.213.2:3001/health

# אמור לקבל:
# {"status":"ok","bots":0,"uptime":...}
```

## שלב 6: יצירת בוט ראשון

מהאתר שלך:
1. לך לדף הבוטים
2. לחץ "הוסף בוט חדש"
3. תן לו שם
4. לחץ "צור בוט"
5. לחץ "הצג QR"
6. סרוק עם WhatsApp

## פקודות שימושיות

```bash
# צפייה בלוגים בזמן אמת
pm2 logs whatsapp-bots --lines 100

# הפעלה מחדש
pm2 restart whatsapp-bots

# עצירה
pm2 stop whatsapp-bots

# מחיקה מ-PM2
pm2 delete whatsapp-bots

# צפייה בשימוש משאבים
pm2 monit
```

## בעיות נפוצות

### הבוט לא נוצר
- בדוק לוגים: `pm2 logs whatsapp-bots`
- ודא שה-port פתוח: `netstat -tlnp | grep 3001`

### QR לא מוצג
- המתן 15-20 שניות אחרי יצירת הבוט
- בדוק שיש מספיק זיכרון RAM
- נסה לרענן את ה-QR דרך הכפתור באתר

### Session לא נשמר
- בדוק הרשאות: `ls -la sessions/`
- ודא שיש מקום בדיסק: `df -h`

## עדכונים עתידיים

כדי לעדכן את השרת:
```bash
cd /opt/whatsapp-bots
git pull  # אם זה ב-git
npm install
pm2 restart whatsapp-bots
```

---

**זהו! השרת שלך מוכן לניהול בוטים** 🎉
