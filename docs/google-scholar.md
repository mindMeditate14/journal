# NexusJournal — Indexing & Discoverability

## Indexing Methods Summary

| Method | Endpoint / URL | Status | Serves |
|---|---|---|---|
| Google Scholar (citation meta tags) | `/papers/:id` | ✅ Live | Google Scholar |
| Sitemap | `https://tradmedint.com/sitemap.xml` | ✅ Live | Googlebot / all crawlers |
| robots.txt | `https://tradmedint.com/robots.txt` | ✅ Live | All crawlers |
| OAI-PMH 2.0 | `https://tradmedint.com/oai` | ✅ Live (June 2026) | MySitasi, DOAJ, harvesters |
| Zenodo records | `zenodo.org/records/*` | ✅ Live | Google Scholar (auto) |
| Google Search Console | sitemap submitted | ⏳ Sitemap submit pending | Googlebot |

---

## Google Scholar

Google Scholar does **not** have a submission form. It crawls your site via Google Search and detects papers using Highwire Press `citation_*` meta tags in the HTML `<head>`. The process is:

1. Googlebot crawls your site (triggered by Search Console sitemap submission)
2. Google Scholar's parser sees the `citation_*` tags and adds the paper to Scholar
3. Timeline: typically 2–8 weeks after Search Console sitemap submission

---

## What Is Already Implemented (as of June 2026)

| Feature | Status | Details |
|---|---|---|
| `citation_*` meta tags | ✅ Live | Injected server-side by Express for every `/papers/:id` URL |
| `citation_pdf_url` | ✅ Correct | Points to `/papers/:id/download` (same subdomain — required by Scholar) |
| `citation_issn` | ✅ Live | Always outputs `3154-7443` (e-ISSN assigned May 2026) |
| `sitemap.xml` | ✅ Live | `https://tradmedint.com/sitemap.xml` — all published paper URLs |
| `robots.txt` | ✅ Live | `Allow: *` + Sitemap pointer |
| Server-side rendering | ✅ Live | `/papers/*` routes through Express (not SPA) so crawlers see content |
| Branded PDF download | ✅ Live | `/papers/:id/download` serves TradMed cover page + manuscript PDF |
| **OAI-PMH 2.0** | ✅ Live | `https://tradmedint.com/oai` — Dublin Core, for MySitasi / DOAJ |

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

✅ **Verification complete** (May 14, 2026) — HTML file method used. File served at `https://tradmedint.com/google0899841f8e4c769b.html`. Source file at `client/public/google0899841f8e4c769b.html` (persists through Vite builds).

### Step 2 — Submit sitemap

⏳ **Pending** — In Search Console left sidebar → **Sitemaps** → enter `sitemap.xml` → **Submit**.

### Step 3 — Request indexing for each paper

For each published paper URL:
1. Paste URL in the Search Console top bar
2. Click **Request Indexing**

All 5 published NexusJournal paper URLs:
- `https://tradmedint.com/papers/69f962655e4c17fc2398bf70` — Modern Consumption Patterns
- `https://tradmedint.com/papers/6a017f58bad7fe84aa659e42` — Archetiq Archetype Blueprint
- `https://tradmedint.com/papers/6a043d4c84f269b21472c288` — AI in Siddha Medicine
- `https://tradmedint.com/papers/6a04337e8221e4ae0a0fe99d` — Pancha Bhootha Medicine
- `https://tradmedint.com/papers/6a0433ca8221e4ae0a0fea4d` — Can Nutrition Delay Menopausal Complications?

---

## Zenodo Records

All 5 published papers have records on Zenodo which are independently indexed by Google Scholar:

| Zenodo record | DOI | Title |
|---|---|---|
| `zenodo.org/records/20118137` | `10.5281/zenodo.20118137` | Modern Consumption Patterns |
| `zenodo.org/records/20117947` | `10.5281/zenodo.20117947` | Archetiq Archetype Blueprint |
| `zenodo.org/records/20153396` | `10.5281/zenodo.20153396` | AI in Siddha Medicine |
| `zenodo.org/records/20153547` | `10.5281/zenodo.20153547` | Pancha Bhootha Medicine |
| `zenodo.org/records/20153596` | `10.5281/zenodo.20153596` | Can Nutrition Delay Menopausal Complications? |

Zenodo records are picked up by Google Scholar automatically — no action needed beyond confirming they are published (not draft).

---

## OAI-PMH 2.0 Endpoint

**Live since June 2026.** Allows MySitasi, DOAJ, and any OAI-PMH harvester to automatically pull all published paper metadata.

**Base URL:** `https://tradmedint.com/oai`  
**Protocol:** OAI-PMH 2.0  
**Metadata format:** Dublin Core (`oai_dc`)  
**Authentication:** None (fully public)

### Supported verbs

| Verb | Example URL |
|---|---|
| `Identify` | `https://tradmedint.com/oai?verb=Identify` |
| `ListMetadataFormats` | `https://tradmedint.com/oai?verb=ListMetadataFormats` |
| `ListIdentifiers` | `https://tradmedint.com/oai?verb=ListIdentifiers&metadataPrefix=oai_dc` |
| `ListRecords` | `https://tradmedint.com/oai?verb=ListRecords&metadataPrefix=oai_dc` |
| `GetRecord` | `https://tradmedint.com/oai?verb=GetRecord&identifier=oai:tradmedint.com:<mongoId>&metadataPrefix=oai_dc` |

Date filtering: append `&from=2026-01-01&until=2026-12-31` to ListIdentifiers or ListRecords.

### Usage — MySitasi
Register with `https://tradmedint.com/oai` as the OAI-PMH base URL and select **OAI-PMH harvesting** as the indexing method. No API key required.

### Usage — DOAJ
After DOAJ application is accepted, enter the same base URL in the DOAJ journal settings for article-level metadata harvesting.

### Source file
`server/src/routes/oai.js` — mounted at `/oai` in `server/src/index.js`.

---

## How New Papers Are Automatically Included

When a manuscript is published via `POST /manuscripts/:id/publish`:
1. A Zenodo deposit is created and published → DOI assigned
2. A `Paper` record is created in MongoDB via Mongoose (idempotent upsert on DOI)
3. The Paper is immediately searchable on the journal site
4. The `sitemap.xml` endpoint dynamically includes it
5. The OAI-PMH `/oai?verb=ListRecords` endpoint automatically includes it
6. Google Scholar picks it up on next crawl (days to weeks)
7. MySitasi / DOAJ harvesters pick it up on their next harvest cycle

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
