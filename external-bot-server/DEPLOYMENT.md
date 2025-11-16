# מדריך פריסה מפורט (Deployment Guide)

## אפשרות 1: הרצה עם PM2 (מומלץ)

### יתרונות PM2:
- ✅ Restart אוטומטי בקריסה
- ✅ ניהול לוגים
- ✅ ניטור משאבים
- ✅ Cluster mode (אופציונלי)
- ✅ הפעלה אוטומטית בהפעלת שרת

### התקנה:
```bash
# התקן PM2 גלובלית
npm install -g pm2

# הפעל את השרת
pm2 start server.js --name whatsapp-bots

# שמור הגדרות
pm2 save

# הגדר startup script
pm2 startup
# הרץ את הפקודה שהוא מדפיס (דורש sudo)
```

### ניהול:
```bash
# סטטוס
pm2 status

# לוגים
pm2 logs whatsapp-bots
pm2 logs whatsapp-bots --lines 200

# הפעלה מחדש
pm2 restart whatsapp-bots

# עצירה
pm2 stop whatsapp-bots

# מחיקה
pm2 delete whatsapp-bots

# ניטור
pm2 monit
```

---

## אפשרות 2: הרצה עם systemd

### יתרונות systemd:
- ✅ Built-in לכל Linux
- ✅ שילוב עם journald
- ✅ הרשאות מדויקות
- ✅ אמין ויציב

### התקנה:

1. **ערוך את הקובץ `whatsapp-bots.service`**:
```bash
nano whatsapp-bots.service

# שנה:
User=YOUR_USERNAME                    # למשתמש שלך
WorkingDirectory=/opt/whatsapp-bots   # לנתיב שלך
```

2. **העתק ל-systemd**:
```bash
sudo cp whatsapp-bots.service /etc/systemd/system/
sudo systemctl daemon-reload
```

3. **הפעל**:
```bash
sudo systemctl enable whatsapp-bots
sudo systemctl start whatsapp-bots
```

### ניהול:
```bash
# סטטוס
sudo systemctl status whatsapp-bots

# לוגים
sudo journalctl -u whatsapp-bots -f
sudo journalctl -u whatsapp-bots --since today

# הפעלה מחדש
sudo systemctl restart whatsapp-bots

# עצירה
sudo systemctl stop whatsapp-bots

# ביטול הפעלה אוטומטית
sudo systemctl disable whatsapp-bots
```

---

## אפשרות 3: Docker (מתקדם)

### יתרונות Docker:
- ✅ סביבה מבודדת
- ✅ קל לפרוס על VPS
- ✅ גרסאות מבוקרות

### Dockerfile:
```dockerfile
FROM node:18-alpine

# Install Chromium dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
```

### docker-compose.yml:
```yaml
version: '3.8'

services:
  whatsapp-bots:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./sessions:/app/sessions
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
```

### הרצה:
```bash
# Build
docker-compose build

# Run
docker-compose up -d

# לוגים
docker-compose logs -f

# עצירה
docker-compose down
```

---

## בדיקת תקינות אחרי פריסה

### 1. בדוק שהשרת פועל:
```bash
curl http://localhost:3001/health

# צריך להחזיר:
# {"status":"ok","bots":0,"uptime":...}
```

### 2. בדוק מבחוץ:
```bash
curl http://172.93.213.2:3001/health
```

### 3. צור בוט בדיקה:
```bash
curl -X POST http://localhost:3001/bot \
  -H "Content-Type: application/json" \
  -d '{"bot_name":"test-bot","user_id":"123"}'
```

### 4. קבל QR:
```bash
curl http://localhost:3001/bot/test-bot/qr
```

---

## אבטחה

### Firewall:
```bash
# הרשה רק מהרשת הפנימית
sudo ufw allow from 172.93.213.0/24 to any port 3001

# או הרשה מכל מקום (פחות מאובטח)
sudo ufw allow 3001
```

### Reverse Proxy (מומלץ):

#### Nginx:
```nginx
server {
    listen 80;
    server_name bots.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/bots /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL (Let's Encrypt):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d bots.yourdomain.com
```

---

## ניטור ותחזוקה

### ניטור משאבים:
```bash
# עם PM2
pm2 monit

# עם htop
htop -p $(pgrep -f "node server.js")

# עם systemd
systemd-cgtop
```

### גיבוי Sessions:
```bash
# יומי
0 2 * * * tar -czf /backups/sessions-$(date +\%Y\%m\%d).tar.gz /opt/whatsapp-bots/sessions/

# שבועי + מחיקת ישנים
0 3 * * 0 find /backups -name "sessions-*.tar.gz" -mtime +30 -delete
```

### Rotation לוגים:

#### עבור PM2:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

#### עבור systemd:
```bash
# journald מטפל בזה אוטומטית
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=500M
```

---

## פתרון בעיות נפוצות

### השרת לא עולה:

1. **בדוק לוגים**:
```bash
# PM2
pm2 logs whatsapp-bots --err

# systemd
sudo journalctl -u whatsapp-bots -n 50

# הרצה ידנית
node server.js
```

2. **בדוק port**:
```bash
sudo netstat -tlnp | grep 3001
# אם תפוס, מצא תהליך: sudo lsof -i :3001
```

3. **בדוק הרשאות**:
```bash
ls -la /opt/whatsapp-bots
# צריך להיות בעלים של המשתמש שמריץ
```

### Chromium לא עובד:

```bash
# התקן תלויות
sudo apt-get install -y \
  gconf-service \
  libasound2 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgconf-2-4 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxss1 \
  fonts-liberation \
  libappindicator1 \
  xdg-utils
```

### זיכרון גבוה:

```bash
# הגבל זיכרון ב-PM2
pm2 start server.js --name whatsapp-bots --max-memory-restart 1G

# הגבל ב-systemd
# הוסף ל-whatsapp-bots.service:
[Service]
MemoryLimit=2G
```

---

## עדכונים

### עדכון הקוד:
```bash
cd /opt/whatsapp-bots

# גיבוי
tar -czf backup-$(date +%Y%m%d).tar.gz .

# משוך גרסה חדשה (git או העתקה ידנית)
git pull

# התקן תלויות חדשות
npm install

# הפעל מחדש
pm2 restart whatsapp-bots
# או
sudo systemctl restart whatsapp-bots
```

### עדכון whatsapp-web.js:
```bash
npm update whatsapp-web.js
pm2 restart whatsapp-bots
```

---

## 🎯 Checklist לפריסה ראשונית

- [ ] Node.js 18+ מותקן
- [ ] npm מותקן
- [ ] תיקייה `/opt/whatsapp-bots` נוצרה
- [ ] קבצים הועתקו
- [ ] `npm install` רץ בהצלחה
- [ ] Port 3001 פתוח (firewall)
- [ ] השרת עובד: `curl localhost:3001/health`
- [ ] PM2/systemd מוגדר
- [ ] Auto-start מוגדר
- [ ] לוגים עובדים
- [ ] גיבויים מוגדרים (אופציונלי)

---

**המערכת שלך מוכנה לייצור!** 🚀
