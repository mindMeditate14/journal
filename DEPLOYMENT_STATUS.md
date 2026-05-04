# Journal App Deployment Status

**Build Date:** May 4, 2026
**Status:** ✅ BUILD COMPLETE - Ready for deployment
**Target:** https://journal.mind-meditate.com (journal.mind-meditate.com)

---

## Build Artifacts Ready

✅ **Frontend**
- Location: `c:\MyApps\journal\client\dist\`
- Status: Production build complete (Vite optimized)
- Size: ~1.2 MB gzipped

✅ **Backend**
- Location: `c:\MyApps\journal\server\`
- Dependencies: Installed (449 packages)
- Status: Ready to run

---

## One-Command Deployment

When VPS is accessible, run from PowerShell:

```powershell
& "C:\Program Files\Git\bin\bash.exe" "c:\MyApps\hostinger\deploy-journal-bash.sh" "Jfg469956789#"
```

Or from Git Bash:
```bash
bash c:\MyApps\hostinger\deploy-journal-bash.sh Jfg469956789#
```

---

## Deployment Steps (If Manual)

1. **Upload server files**
```bash
tar --exclude='node_modules' -czf server.tar.gz -C c:\MyApps\journal\server .
scp server.tar.gz root@76.13.211.100:/tmp/
ssh root@76.13.211.100 "tar xzf /tmp/server.tar.gz -C /opt/nexusjournal/server"
```

2. **Install and start**
```bash
ssh root@76.13.211.100 "cd /opt/nexusjournal/server && npm install --production && pm2 start src/index.js --name nexusjournal"
```

3. **Upload frontend**
```bash
tar -czf dist.tar.gz -C c:\MyApps\journal\client\dist .
scp dist.tar.gz root@76.13.211.100:/tmp/
ssh root@76.13.211.100 "tar xzf /tmp/dist.tar.gz -C /opt/nexusjournal/public"
```

4. **Restart nginx**
```bash
ssh root@76.13.211.100 "systemctl reload nginx"
```

---

## VPS Connection Status

**Current Issue:** SSH connection timing out on 76.13.211.100:22
- This typically indicates: network issue, firewall block, or VPS downtime
- Expected to resolve automatically or contact Hostinger support

**When VPS is back online:**
- Run the deployment command above
- Application will be live at: `https://journal.mind-meditate.com`
- Health check: `https://journal.mind-meditate.com/health`
- PM2 monitoring: `ssh root@76.13.211.100 "pm2 show nexusjournal"`

---

## Deployment Configuration

**Domain:** journal.mind-meditate.com
**Server Port:** 5005
**API Endpoint:** /api/*
**Static Root:** /opt/nexusjournal/public
**Nginx Config:** /etc/nginx/sites-available/nexusjournal

**Environment Variables** (auto-created):
- NODE_ENV=production
- MONGO_URI=mongodb://localhost:27017/journal_db
- CORS_ORIGIN=https://journal.mind-meditate.com
- ⚠️ Note: JWT secrets pre-populated with placeholders - UPDATE before production

---

## Post-Deployment Checklist

- [ ] SSH connection restored to VPS
- [ ] Run deployment script
- [ ] Verify application at https://journal.mind-meditate.com
- [ ] Check health endpoint: https://journal.mind-meditate.com/health
- [ ] Verify PM2 process: `pm2 show nexusjournal`
- [ ] Update JWT_SECRET and other sensitive env vars
- [ ] Review MongoDB connection and backups
- [ ] Test API endpoints
- [ ] Monitor logs: `pm2 logs nexusjournal`
