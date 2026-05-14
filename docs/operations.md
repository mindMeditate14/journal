# NexusJournal — Operations & Hotfix Guide

Day-to-day commands for deploying changes and managing the live server.

## SSH Connection

```powershell
# Test connection (Windows PowerShell — WSL not available on this machine)
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "echo OK"
```

Key: `~/.ssh/kvm4-hostinger`. Password login is disabled on this VPS.

---

## Deploy Client (full build + upload)

```powershell
# 1. Build
cd "C:\MyApps\journal\client" ; npm run build

# 2. Package + deploy in one line
cd "C:\MyApps\journal\client\dist"
tar czf "$env:TEMP\nexus-public.tar.gz" .
scp -i "$HOME\.ssh\kvm4-hostinger" "$env:TEMP\nexus-public.tar.gz" root@76.13.211.100:/tmp/nexus-public.tar.gz
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "rm -rf /opt/nexusjournal/public/* && tar xzf /tmp/nexus-public.tar.gz -C /opt/nexusjournal/public/ && rm /tmp/nexus-public.tar.gz && echo DONE"
```

> After deploying, ask users to hard-refresh (**Ctrl+Shift+R**) — the SPA caches aggressively.

---

## Deploy Server (single file hotfix — no rebuild needed)

```powershell
scp -i "$HOME\.ssh\kvm4-hostinger" "C:\MyApps\journal\server\src\<relative\path>" root@76.13.211.100:/opt/nexusjournal/server/src/<relative/path>
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "pm2 restart nexusjournal --silent && echo DONE"
```

### Most-commonly hotfixed files

| Local path | Remote path |
|---|---|
| `server/src/index.js` | `/opt/nexusjournal/server/src/index.js` |
| `server/src/controllers/manuscriptController.js` | `…/controllers/manuscriptController.js` |
| `server/src/controllers/paperController.js` | `…/controllers/paperController.js` |
| `server/src/utils/coverPageService.js` | `…/utils/coverPageService.js` |
| `server/src/utils/zenodoService.js` | `…/utils/zenodoService.js` |

---

## Deploy Both Client + Server

```powershell
# Build client
cd "C:\MyApps\journal\client" ; npm run build

# Package + upload client
cd "C:\MyApps\journal\client\dist"
tar czf "$env:TEMP\nexus-public.tar.gz" .
scp -i "$HOME\.ssh\kvm4-hostinger" "$env:TEMP\nexus-public.tar.gz" root@76.13.211.100:/tmp/nexus-public.tar.gz
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "rm -rf /opt/nexusjournal/public/* && tar xzf /tmp/nexus-public.tar.gz -C /opt/nexusjournal/public/ && rm /tmp/nexus-public.tar.gz && echo CLIENT_DONE"

# Upload changed server file(s) then restart
scp -i "$HOME\.ssh\kvm4-hostinger" "C:\MyApps\journal\server\src\controllers\manuscriptController.js" root@76.13.211.100:/opt/nexusjournal/server/src/controllers/manuscriptController.js
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "pm2 restart nexusjournal && echo SERVER_DONE"
```

---

## Server Status + Logs

```powershell
# All PM2 processes
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "pm2 status"

# NexusJournal logs (last 50 lines)
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "pm2 logs nexusjournal --lines 50"

# Check port is listening
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "ss -tlnp | grep 5005"
```

---

## Environment Variables

File: `/opt/nexusjournal/server/.env`

```powershell
# View
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "cat /opt/nexusjournal/server/.env"

# Edit (nano on VPS)
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "nano /opt/nexusjournal/server/.env"
```

| Variable | Description |
|---|---|
| `PORT` | `5005` |
| `HOST` | `127.0.0.1` (nginx proxies externally) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `BASE_URL` | Public URL used in meta tags + sitemap (change when migrating domain) |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `ZENODO_API_KEY` | Zenodo API token |
| `SMTP_HOST` | `127.0.0.1` — local Postfix relay (no external SMTP service) |
| `SMTP_PORT` | `25` (local relay, no TLS needed) |
| `SMTP_USER` | `noreply@tradmedint.com` |
| `SMTP_PASS` | *(empty — local relay needs no auth)* |
| `SMTP_FROM` | `"TradMed International <noreply@tradmedint.com>"` |
| `GEMINI_API_KEY` | Google Gemini AI key |

After editing `.env`:
```powershell
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "pm2 restart nexusjournal --update-env"
```

---

## Nginx Operations

```powershell
# View current config
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "cat /etc/nginx/sites-enabled/nexusjournal"

# Test config syntax
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "nginx -t"

# Reload (zero downtime)
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "nginx -s reload"
```

### Current nginx route map

| Path | Destination |
|---|---|
| `/api/*` | Express :5005 |
| `/health` | Express :5005 |
| `/robots.txt` | Express :5005 |
| `/sitemap.xml` | Express :5005 |
| `/papers/*` | Express :5005 (Scholar meta tag injection) |
| `/uploads/*` | `/opt/nexusjournal/uploads/` (static files) |
| `/assets/*` | `/opt/nexusjournal/public/assets/` (immutable cache) |
| `/*` | SPA fallback → `index.html` |

---

## MongoDB Operations

### Quick check via mongosh
```bash
ssh -i ~/.ssh/kvm4-hostinger root@76.13.211.100
mongosh "mongodb://finscan_admin:<pass>@localhost:27017/journal_db?authSource=admin"
```

### Run a one-off Node.js script on VPS
```powershell
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 @'
node --input-type=module << 'EOF'
import mongoose from '/opt/nexusjournal/server/node_modules/mongoose/index.js';
await mongoose.connect('mongodb://finscan_admin:<pass>@localhost:27017/journal_db?authSource=admin');
// your script here
await mongoose.disconnect();
EOF
'@
```

> **Always use Mongoose model layer** (not raw `db.collection().insertOne()`) when creating Paper records — raw inserts bypass the `$text` index and break search.

---

## Uploads Directory

Uploaded PDFs: `/opt/nexusjournal/uploads/manuscripts/`  
This is **outside** the public folder — it survives client redeploys. Never delete it.

---

## SSL Certificate

```bash
# Check expiry
certbot certificates

# Renew
certbot renew --nginx
```
Auto-renews via cron.

---

## Email (Postfix + Dovecot)

NexusJournal uses the **VPS-local Postfix** as an SMTP relay — no external email service. Emails are sent from `noreply@tradmedint.com`.

### Mailbox locations
```
/var/mail/vhosts/tradmedint.com/noreply/   ← inbound mail storage
/etc/postfix/vmailbox                       ← Postfix mailbox map
/etc/dovecot/users                          ← Dovecot auth (passwd-file)
```

### DNS records (set May 2026)
| Type | Host | Value |
|---|---|---|
| TXT (SPF) | `tradmedint.com` | `v=spf1 ip4:76.13.211.100 mx a ~all` |
| TXT (DKIM) | `default._domainkey.tradmedint.com` | `v=DKIM1; h=sha256; k=rsa; p=...` |
| TXT (DMARC) | `_dmarc.tradmedint.com` | `v=DMARC1; p=none; rua=mailto:postmaster@tradmedint.com; adkim=s; aspf=s` |

DKIM private key: `/etc/opendkim/keys/tradmedint.com/default.private`

### Test email delivery
```powershell
scp -i "$HOME\.ssh\kvm4-hostinger" "C:\temp\send-test-email.sh" root@76.13.211.100:/tmp/
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "bash /tmp/send-test-email.sh"
```

### Verify DNS records
```powershell
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "dig TXT tradmedint.com +short ; dig TXT default._domainkey.tradmedint.com +short ; dig TXT _dmarc.tradmedint.com +short"
```

### Webmail access
Roundcube webmail is at `https://webmail.archetiq.com`. Log in with `noreply@tradmedint.com` / `Abcd12345#` to read incoming mail.
