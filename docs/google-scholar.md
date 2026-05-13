# NexusJournal — Google Scholar Indexing

## How It Works

Google Scholar does **not** have a submission form. It crawls your site via Google Search and detects papers using Highwire Press `citation_*` meta tags in the HTML `<head>`. The process is:

1. Googlebot crawls your site (triggered by Search Console sitemap submission)
2. Google Scholar's parser sees the `citation_*` tags and adds the paper to Scholar
3. Timeline: typically 2–8 weeks after Search Console sitemap submission

---

## What Is Already Implemented (as of May 2026)

| Feature | Status | Details |
|---|---|---|
| `citation_*` meta tags | ✅ Live | Injected server-side by Express for every `/papers/:id` URL |
| `citation_pdf_url` | ✅ Correct | Points to `/papers/:id/download` (same subdomain — required by Scholar) |
| `sitemap.xml` | ✅ Live | `https://journal.mind-meditate.com/sitemap.xml` — all paper URLs |
| `robots.txt` | ✅ Live | `Allow: *` + Sitemap pointer |
| Server-side rendering | ✅ Live | `/papers/*` routes through Express (not SPA) so crawlers see content |
| Branded PDF download | ✅ Live | `/papers/:id/download` serves TradMed cover page + manuscript PDF |

### Meta tags emitted per paper page
```html
<meta name="citation_title" content="...">
<meta name="citation_author" content="...">        <!-- one tag per author -->
<meta name="citation_author_orcid" content="...">  <!-- if ORCID present -->
<meta name="citation_publication_date" content="YYYY/MM/DD">
<meta name="citation_journal_title" content="TradMed International">
<meta name="citation_issn" content="...">          <!-- if journal has ISSN -->
<meta name="citation_doi" content="10.5281/zenodo.XXXXXXX">
<meta name="citation_pdf_url" content="https://.../papers/:id/download">
<meta name="citation_abstract_html_url" content="https://.../papers/:id">
<meta name="citation_keywords" content="keyword1; keyword2">
<meta name="description" content="Abstract (first 300 chars)">
<meta property="og:title" content="...">
<meta property="og:type" content="article">
<meta property="og:url" content="...">
```

---

## Submitting to Google Search Console

**Do this after the final domain is live (`tradmedint.com`).**

### Step 1 — Verify site ownership

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Click **Add property** → URL prefix → `https://tradmedint.com`
3. Choose **HTML tag** method
4. Copy the tag value: `<meta name="google-site-verification" content="XXXX...">`
5. Give Copilot the value (e.g. `XXXX...`) and it will inject it into the server

**What Copilot will do with the tag value:**
Add this to `buildMetaTags()` in `server/src/index.js`:
```js
tags.push(`<meta name="google-site-verification" content="${VERIFICATION_VALUE}">`);
```
Then redeploy `server/src/index.js`.

### Step 2 — Submit sitemap

1. In Search Console left sidebar → **Sitemaps**
2. Enter `sitemap.xml` → **Submit**

### Step 3 — Request indexing for each paper

For each published paper URL:
1. Paste URL in the Search Console top bar
2. Click **Request Indexing**

Current published paper URLs (update after domain migration):
- `https://tradmedint.com/papers/69f950f7...` — Modern Consumption Patterns
- `https://tradmedint.com/papers/6a017f00...` — Archetiq Archetype Blueprint
- `https://tradmedint.com/papers/6a043d4c84f269b21472c288` — AI in Siddha Medicine

---

## Zenodo Records

The 3 published papers also have records on Zenodo which are independently indexed by Google Scholar. Zenodo records are publicly accessible:

| Zenodo record | DOI | Status |
|---|---|---|
| `zenodo.org/records/20118137` | `10.5281/zenodo.20118137` | HTTP 200 (public) |
| `zenodo.org/records/20117947` | `10.5281/zenodo.20117947` | HTTP 200 (public) |
| `zenodo.org/records/20153396` | `10.5281/zenodo.20153396` | HTTP 200 (public) |

Zenodo records are picked up by Google Scholar automatically — no action needed beyond confirming they are published (not draft).

---

## How New Papers Are Automatically Included

When a manuscript is published via `POST /manuscripts/:id/publish`:
1. A Zenodo deposit is created and published → DOI assigned
2. A `Paper` record is created in MongoDB via Mongoose (idempotent upsert on DOI)
3. The Paper is immediately searchable on the journal site
4. The `sitemap.xml` endpoint dynamically includes it
5. Google Scholar picks it up on next crawl (days to weeks)

**No manual action is required for newly published papers.**

---

## Troubleshooting

### Paper not showing in Scholar search

Check each requirement:
```powershell
# 1. Citation meta tags present?
curl.exe -s https://tradmedint.com/papers/<id> | Select-String "citation_title"

# 2. PDF accessible via citation_pdf_url?
curl.exe -sI https://tradmedint.com/papers/<id>/download
# Should return HTTP 200 with Content-Type: application/pdf

# 3. Paper in sitemap?
curl.exe -s https://tradmedint.com/sitemap.xml | Select-String "<id>"

# 4. Google has indexed the page?
# In browser: site:tradmedint.com/papers/<id>
```

### Google Scholar won't crawl — robots.txt blocking?
```powershell
curl.exe -s https://tradmedint.com/robots.txt
# Should show: User-agent: * / Allow: / / Sitemap: https://...
```

### Wrong BASE_URL in meta tags?
Check the `BASE_URL` env var on the server:
```powershell
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "grep BASE_URL /opt/nexusjournal/server/.env"
```
