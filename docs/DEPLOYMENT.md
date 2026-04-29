# NexusJournal — Deployment & VPS Setup

**Target Environment:** VPS at `76.13.211.100` (same as FinScan & Personality-Test)

---

## VPS Architecture

```
┌─────────────────────────────────────┐
│     VPS: 76.13.211.100              │
├─────────────────────────────────────┤
│                                     │
│  FinScan (port 5004)                │
│  Personality-Test (port 5002)       │
│  agents-service (port 5003)         │
│  NexusJournal (port 5005) ← NEW     │
│                                     │
│  MongoDB (port 27017)               │
│  Redis (port 6379)                  │
│  Elasticsearch (port 9200)          │
│                                     │
│  PM2 (process manager)              │
│  nginx (reverse proxy)              │
│  certbot (SSL certificates)         │
│                                     │
└─────────────────────────────────────┘
```

---

## Pre-Deployment Checklist

- [ ] VPS SSH key configured
- [ ] MongoDB running and accessible
- [ ] Node.js 18+ installed
- [ ] PM2 globally installed (`npm i -g pm2`)
- [ ] Environment variables configured
- [ ] Database backups scheduled
- [ ] Domain DNS configured

---

## Step 1: VPS Initial Setup

```bash
# SSH into VPS
ssh root@76.13.211.100

# Create project directory
mkdir -p /opt/nexusjournal
cd /opt/nexusjournal

# Create subdirectories
mkdir -p {server,client/dist,logs,uploads}

# Set permissions
chmod 755 /opt/nexusjournal
```

---

## Step 2: Deploy Backend

### From Local Machine

```powershell
# Windows PowerShell
cd "c:\My Apps\journal\server"

# 1. Test locally first
npm run test

# 2. Copy to VPS (using WSL bash)
wsl bash -c "
scp -r 'package.json' root@76.13.211.100:/opt/nexusjournal/server/
scp -r 'src/' root@76.13.211.100:/opt/nexusjournal/server/
scp '.env' root@76.13.211.100:/opt/nexusjournal/server/
"
```

### On VPS

```bash
cd /opt/nexusjournal/server

# Install dependencies
npm install --production

# Test connection
npm run test  # If test script exists

# Start with PM2
pm2 start src/index.js --name nexusjournal-app --watch

# Save PM2 config
pm2 save
pm2 startup
```

### PM2 Configuration (Optional)

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'nexusjournal-app',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5005,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs'],
    },
  ],
};
```

Then:
```bash
pm2 start ecosystem.config.js
```

---

## Step 3: Deploy Frontend

### Build Locally

```powershell
cd "c:\My Apps\journal\client"

# Build for production
npm run build

# Output goes to: dist/
```

### Deploy to VPS

```powershell
# From Windows (using WSL bash)
wsl bash -c "
cd '/mnt/c/My Apps/journal/client'
tar czf /tmp/nexusjournal-dist.tar.gz dist/
scp /tmp/nexusjournal-dist.tar.gz root@76.13.211.100:/tmp/
rm /tmp/nexusjournal-dist.tar.gz
"
```

### On VPS

```bash
# Extract and deploy
cd /opt/nexusjournal
tar xzf /tmp/nexusjournal-dist.tar.gz
cp -r dist/* client/dist/

# Cleanup
rm /tmp/nexusjournal-dist.tar.gz

# Verify files
ls -la client/dist/
```

---

## Step 4: Nginx Configuration

Update `/etc/nginx/sites-available/nexusjournal`:

```nginx
server {
    listen 80;
    server_name nexusjournal.mind-meditate.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name nexusjournal.mind-meditate.com;

    ssl_certificate /etc/letsencrypt/live/nexusjournal.mind-meditate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexusjournal.mind-meditate.com/privkey.pem;

    # Frontend (React client)
    location / {
        root /opt/nexusjournal/client/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # API reverse proxy
    location /api {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets (PDFs, etc.)
    location /uploads {
        alias /opt/nexusjournal/uploads;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
```

Enable and test:
```bash
# Enable site
ln -s /etc/nginx/sites-available/nexusjournal /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload
systemctl reload nginx
```

---

## Step 5: SSL Certificate Setup

```bash
# Using Certbot
certbot certonly --nginx -d nexusjournal.mind-meditate.com

# Auto-renewal
certbot renew --dry-run
```

---

## Step 6: Environment Variables

Create `/opt/nexusjournal/server/.env`:

```bash
NODE_ENV=production
PORT=5005
HOST=127.0.0.1

MONGO_URI=mongodb://localhost:27017/nexusjournal_db
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

JWT_SECRET=<your-super-secret-key-change-this>
JWT_REFRESH_SECRET=<your-refresh-secret-change-this>

AYUSH_ENTRY_API_URL=http://localhost:5001/api
AYUSH_ENTRY_API_KEY=<get-from-AYUSH-team>

GOOGLE_GEMINI_API_KEY=<your-gemini-key>

CORS_ORIGIN=https://nexusjournal.mind-meditate.com

LOG_LEVEL=info
LOG_FILE=/var/log/nexusjournal/app.log
```

---

## Step 7: Logging & Monitoring

```bash
# Create log directory
mkdir -p /var/log/nexusjournal
chown nobody:nogroup /var/log/nexusjournal

# View logs
pm2 logs nexusjournal-app

# Monitoring dashboard
pm2 monit
```

---

## Step 8: Database Backups

Create `/opt/nexusjournal/scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/nexusjournal/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nexusjournal_$TIMESTAMP.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri "mongodb://localhost:27017/nexusjournal_db" \
  --out /tmp/nexusjournal_dump

# Compress
tar czf $BACKUP_FILE /tmp/nexusjournal_dump

# Cleanup
rm -rf /tmp/nexusjournal_dump

# Keep only last 7 days
find $BACKUP_DIR -name "nexusjournal_*.tar.gz" -mtime +7 -delete

echo "✅ Backup complete: $BACKUP_FILE"
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/nexusjournal/scripts/backup.sh
```

---

## Step 9: Health Checks & Alerts

```bash
# Test API endpoint
curl https://nexusjournal.mind-meditate.com/api/health

# Expected response:
# {"status":"OK","timestamp":"2024-04-28T..."}
```

Monitor with cron:
```bash
# Check every 5 minutes
*/5 * * * * /opt/nexusjournal/scripts/health-check.sh
```

---

## Step 10: Database Indexes

Run once after deployment:

```bash
ssh root@76.13.211.100
mongo
use nexusjournal_db
db.journals.createIndex({ status: 1, publishedAt: -1 })
db.manuscripts.createIndex({ owner: 1, projectId: 1, updatedAt: -1 })
db.clinicalevidence.createIndex({ "condition.name": 1, "intervention.name": 1 })
```

---

## Updating Deployment

### Backend Update

```powershell
# 1. From local: copy new server code
wsl bash -c "
scp -r 'c:/My Apps/journal/server/src/*' root@76.13.211.100:/opt/nexusjournal/server/src/
"

# 2. On VPS: restart
ssh root@76.13.211.100 'pm2 restart nexusjournal-app'
```

### Frontend Update

```powershell
# 1. Local build
cd client
npm run build

# 2. Deploy
wsl bash -c "
tar czf /tmp/dist.tar.gz -C '/mnt/c/My Apps/journal/client' dist/
scp /tmp/dist.tar.gz root@76.13.211.100:/tmp/
rm /tmp/dist.tar.gz
"

# 3. On VPS
ssh root@76.13.211.100 '
cd /opt/nexusjournal
rm -rf client/dist/*
tar xzf /tmp/dist.tar.gz
cp -r dist/* client/dist/
rm /tmp/dist.tar.gz
'
```

---

## Rollback

```bash
# If something breaks:
pm2 delete nexusjournal-app
git checkout <previous-commit>
npm install
pm2 start ecosystem.config.js
```

---

## Monitoring & Maintenance

### Check Server Status
```bash
pm2 status
pm2 logs nexusjournal-app --lines 100
```

### Database Maintenance
```bash
# Backup
mongodump --uri "mongodb://localhost:27017/nexusjournal_db"

# Verify integrity
mongosh
db.adminCommand({ validate: true })
```

### Performance Tuning
```bash
# Check memory usage
pm2 monit

# Increase Node.js memory if needed
pm2 delete nexusjournal-app
pm2 start src/index.js --max-memory-restart 1G
```

---

## Production Checklist

- [ ] JWT secrets are strong and unique
- [ ] MongoDB backups scheduled
- [ ] Nginx/HTTPS configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Error logging active
- [ ] PM2 auto-restart on reboot
- [ ] Health check endpoint working
- [ ] Database indexes created
- [ ] API keys securely stored

---

## Troubleshooting

### Port Already in Use
```bash
lsof -i :5005
kill -9 <PID>
```

### MongoDB Connection Failed
```bash
mongosh
# Should connect and show shell prompt
```

### Nginx Not Routing
```bash
nginx -t  # Check syntax
systemctl status nginx
```

---

*Deployment Guide — v1.0.0 — Production Ready*
