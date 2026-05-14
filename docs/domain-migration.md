# NexusJournal — Domain Migration to tradmedint.com

## Status: COMPLETE (migrated May 14, 2026)

Previous domain: `https://journal.mind-meditate.com` → 301 redirects to new domain  
Current domain:  `https://tradmedint.com`

---

## Pre-Migration Checklist (do before starting)

- [ ] Purchase / transfer `tradmedint.com` to your registrar
- [ ] Do NOT submit to Google Search Console or Google Scholar yet — wait until on new domain
- [ ] Confirm there is no other service already using `tradmedint.com` on the VPS

---

## Step 1 — Point DNS

In your registrar DNS panel for `tradmedint.com`, add:

```
Type  Name  Value           TTL
A     @     76.13.211.100   300
A     www   76.13.211.100   300
```

Wait for propagation (5–30 min). Test with:
```powershell
nslookup tradmedint.com
# Should return 76.13.211.100
```

---

## Step 2 — SSL Certificate (run on VPS)

```bash
ssh -i ~/.ssh/kvm4-hostinger root@76.13.211.100
certbot --nginx -d tradmedint.com -d www.tradmedint.com
# Follow prompts; choose to redirect HTTP → HTTPS
```

---

## Step 3 — New Nginx Server Block

Create `/etc/nginx/sites-available/tradmedint` on the VPS:

```nginx
server {
    listen 80;
    server_name tradmedint.com www.tradmedint.com;
    return 301 https://tradmedint.com$request_uri;
}

server {
    listen 443 ssl;
    server_name www.tradmedint.com;
    ssl_certificate     /etc/letsencrypt/live/tradmedint.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tradmedint.com/privkey.pem;
    return 301 https://tradmedint.com$request_uri;
}

server {
    listen 443 ssl;
    server_name tradmedint.com;

    ssl_certificate     /etc/letsencrypt/live/tradmedint.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tradmedint.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 25M;

    location /api/ {
        proxy_pass         http://127.0.0.1:5005;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    location /health { proxy_pass http://127.0.0.1:5005; }

    location = /robots.txt {
        proxy_pass       http://127.0.0.1:5005;
        proxy_set_header Host $host;
    }

    location /sitemap.xml {
        proxy_pass         http://127.0.0.1:5005;
        proxy_set_header   Host $host;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location /papers/ {
        proxy_pass         http://127.0.0.1:5005;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /opt/nexusjournal/uploads/;
        add_header Cache-Control "public, max-age=31536000";
        add_header X-Content-Type-Options nosniff;
        types {
            application/pdf pdf;
            application/msword doc;
            application/vnd.openxmlformats-officedocument.wordprocessingml.document docx;
        }
    }

    location / {
        root  /opt/nexusjournal/public;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        root /opt/nexusjournal/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        root /opt/nexusjournal/public;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    gzip            on;
    gzip_comp_level 5;
    gzip_types      text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}
```

Enable and reload:
```bash
ln -s /etc/nginx/sites-available/tradmedint /etc/nginx/sites-enabled/tradmedint
nginx -t && nginx -s reload
```

---

## Step 4 — Redirect Old Domain to New

Update `/etc/nginx/sites-enabled/nexusjournal` — replace the existing `server { listen 443 ... }` block's content with a 301 redirect:

```nginx
server {
    listen 443 ssl;
    server_name journal.mind-meditate.com;

    ssl_certificate     /etc/letsencrypt/live/journal.mind-meditate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/journal.mind-meditate.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://tradmedint.com$request_uri;
}
```

This preserves all old URLs — Zenodo landing page links, existing bookmarks, etc. will forward automatically.

```bash
nginx -t && nginx -s reload
```

---

## Step 5 — Update Server ENV

```powershell
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 @'
sed -i 's|BASE_URL=.*|BASE_URL=https://tradmedint.com|' /opt/nexusjournal/server/.env
sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://tradmedint.com|' /opt/nexusjournal/server/.env
pm2 restart nexusjournal --update-env && echo DONE
'@
```

---

## Step 6 — Update Paper Records in MongoDB

The 5 published Paper records (Zenodo DOIs) have the old domain in `urls.pdf`. Update them:

```bash
ssh -i ~/.ssh/kvm4-hostinger root@76.13.211.100 "node --input-type=module << 'EOF'
import mongoose from '/opt/nexusjournal/server/node_modules/mongoose/index.js';
await mongoose.connect('mongodb://finscan_admin:<pass>@localhost:27017/journal_db?authSource=admin');
const result = await mongoose.connection.db.collection('papers').updateMany(
  { 'urls.pdf': /journal\.mind-meditate\.com/ },
  [{ \$set: {
    'urls.pdf':     { \$replaceAll: { input: '\$urls.pdf',     find: 'journal.mind-meditate.com', replacement: 'tradmedint.com' } },
    'urls.landing': { \$replaceAll: { input: '\$urls.landing', find: 'journal.mind-meditate.com', replacement: 'tradmedint.com' } },
    'urls.source':  { \$replaceAll: { input: '\$urls.source',  find: 'journal.mind-meditate.com', replacement: 'tradmedint.com' } },
  }}]
);
console.log('Updated:', result.modifiedCount, 'paper records');
await mongoose.disconnect();
EOF"
```

---

## Step 7 — Build + Deploy Client with New Domain

The client Vite build has the API base URL as an env var. Check `client/.env.production`:
```
VITE_API_URL=https://tradmedint.com/api
```
Update it, then rebuild and deploy.

---

## Step 8 — Google Search Console + Scholar

✅ **COMPLETE** — Verification done via HTML file method (not meta tag). File at `/opt/nexusjournal/public/google0899841f8e4c769b.html` (source: `client/public/google0899841f8e4c769b.html` — included in Vite build output so it survives redeploys).

Next steps still needed:
1. Submit sitemap: `https://tradmedint.com/sitemap.xml` in Search Console → **Sitemaps**
2. Request indexing for each of the 5 published paper URLs (see `docs/google-scholar.md`)

---

## Step 9 — Email (noreply@tradmedint.com)

✅ **COMPLETE** — Configured May 14, 2026.

- Mailbox created on VPS Postfix/Dovecot at `/var/mail/vhosts/tradmedint.com/noreply/`
- `emailService.js` updated to use local relay (port 25, no auth)
- SPF, DKIM, DMARC DNS records added and verified
- DKIM key: `/etc/opendkim/keys/tradmedint.com/default.private`

See `docs/operations.md` → Email section for details.

---

## Verification After Migration

```powershell
# Check new domain serves correctly
curl.exe -sI https://tradmedint.com/

# Check old domain redirects
curl.exe -sI https://journal.mind-meditate.com/papers/6a043d4c84f269b21472c288
# Should return: Location: https://tradmedint.com/papers/6a043d4c84f269b21472c288

# Check Scholar meta tags on new domain
curl.exe -s https://tradmedint.com/papers/6a043d4c84f269b21472c288 | Select-String "citation_title"

# Check sitemap
curl.exe -s https://tradmedint.com/sitemap.xml | Select-String "tradmedint.com" | Select-Object -First 3
```
