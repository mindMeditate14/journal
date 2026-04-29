# NexusJournal Publishing Platform — Quick Start Guide

## 📌 TL;DR (If You Have 5 Minutes)

**You want to:** Allow authors to submit articles → get peer reviewed → publish with DOI

**How to do it:**
1. Create submission form (upload markdown + auto-parse metadata)
2. Editor dashboard to manage reviews
3. Integrate Zenodo for free DOI
4. Publish button → auto-generate PDF → assign DOI
5. Index in Google Scholar

**Timeline:** 4–6 weeks for MVP

**Cost:** $0 (Zenodo is free)

---

## 🎯 Three Core Flows

### Flow 1: Author Submits Article

```
Author downloads template (markdown) 
    ↓ 
Fills YAML metadata + writes article
    ↓
Pastes into submission form
    ↓
Auto-parse frontmatter ← "Nice! Everything correct?"
    ↓
Click "Submit"
    ↓
Status = "submitted", Email sent to editor
```

### Flow 2: Editor Reviews & Assigns Peers

```
Editor sees manuscript in dashboard
    ↓
"Out of scope?" → YES ✗ Desk Reject
    ↓ NO
Select 2–3 reviewers from dropdown
    ↓
Send review invitations (auto email)
    ↓
Wait 30 days for reviews
    ↓
Make decision: Accept / Minor revisions / Major revisions / Reject
    ↓
Send decision email
```

### Flow 3: Publish with DOI

```
Editor clicks "Approve for Publication"
    ↓
Auto-generate PDF
    ↓
Upload to Zenodo API
    ↓
Get DOI: 10.5281/zenodo.7654321
    ↓
Save DOI + mark status = "published"
    ↓
Create Paper record (for search/discovery)
    ↓
Email author: "Your article is published! Here's your DOI"
    ↓
Readers can find, cite, download
```

---

## 📋 Database Models You Need

### **Manuscript**
```javascript
{
  _id, submissionId, journalId,
  title, abstract, keywords, authors,
  body (markdown), discipline, methodology,
  status (draft/submitted/under-review/accepted/published/rejected),
  assignedEditor, reviews: [{reviewer, score, feedback}],
  doi, publishedAt,
  metrics: {views, downloads}
}
```

### **Journal**
```javascript
{
  _id, title, owner (User),
  description, scope, submissionGuidelines,
  reviewProcess (open/single-blind/double-blind),
  editors: [User._id],
  stats: {submissions, accepted, acceptanceRate}
}
```

### **Update User**
```javascript
{
  // existing fields...
  author: {
    manuscripts: [Manuscript._id],
    orcid: string
  },
  reviewer: {
    assignedReviews: [Manuscript._id],
    reviewsCompleted: number
  }
}
```

---

## 🔌 Essential API Endpoints

### **Author endpoints**
```
POST   /api/manuscripts              Submit manuscript
GET    /api/manuscripts/:id          View my manuscript
PATCH  /api/manuscripts/:id          Edit draft
GET    /api/manuscripts/:id/reviews  View peer feedback (after decision)
POST   /api/manuscripts/:id/revisions Submit revised version
```

### **Editor endpoints**
```
GET    /api/manuscripts?journal=...  Dashboard (all subs for this journal)
PATCH  /api/manuscripts/:id/assign-reviewers  Assign peers
PATCH  /api/manuscripts/:id/decision Make Accept/Reject decision
POST   /api/manuscripts/:id/publish   Publish + assign DOI
```

### **Journal endpoints**
```
GET    /api/journals                List all journals
POST   /api/journals                Create journal (author becomes owner)
PATCH  /api/journals/:id            Update journal settings
```

---

## 🎨 UI Pages You Need

### **Author Facing**
1. **Journal Browse** (`/journals`) — list journals, read scope
2. **Submit Manuscript** (`/journals/:id/submit`) — multi-step form
3. **My Submissions** (`/profile/submissions`) — dashboard with status
4. **View Manuscript** (`/manuscripts/:id`) — see current status + reviews (after decision)

### **Editor Facing**
1. **Editor Dashboard** (`/editor/journals/:id/submissions`) — all submissions
2. **Review Manuscript** (`/manuscripts/:id/review`) — read ms + assign reviewers
3. **View Reviews** (`/manuscripts/:id/reviews`) — see peer feedback + make decision

### **Public Facing**
1. **Published Articles** (`/articles/:id` or `/journals/:id/articles`) — view/download
2. **Search** (existing, now includes published articles)

---

## 📄 Submission Template

**Provide this to authors:**

```markdown
---
title: "Your Article Title"
authors:
  - name: "Author Name"
    email: "email@example.com"
    affiliation: "University Name, Country"
    orcid: "0000-0000-0000-0000"
keywords: ["keyword1", "keyword2", "keyword3"]
abstract: "50-250 word summary"
discipline: "Ayurveda"
methodology: "systematic-review"
fundingStatement: "Funded by..."
dataAvailability: "https://zenodo.org/..."
---

## 1. Introduction
Your content here...

## 2. Methods
...

## 3. Results
...

## 4. Discussion
...

## 5. References
1. Author et al. (Year). Title. Journal.
```

---

## 🔐 Quality Checks (Before Publishing)

**Auto-checks (2 seconds):**
- [ ] Title length (10–100 chars)
- [ ] Abstract length (100–300 words)
- [ ] Authors have names + emails
- [ ] Keywords present (3–8)
- [ ] References formatted

**Editor checks (10 minutes):**
- [ ] Clear research question
- [ ] Appropriate methodology
- [ ] Results well presented
- [ ] Limitations acknowledged
- [ ] No obvious plagiarism (Turnitin score < 20%)

**Before publishing:**
- [ ] All figures have alt text
- [ ] PDF is searchable
- [ ] DOI will be assigned
- [ ] Metadata complete

---

## 🆔 DOI Assignment (Using Zenodo)

**Setup (one-time, 5 minutes):**
1. Get Zenodo API key from `https://zenodo.org/account/settings/applications/`
2. Add to `.env`:
   ```
   ZENODO_API_KEY=xxxxx
   ```

**On publish:**
```javascript
// In controller
const response = await axios.post('https://zenodo.org/api/deposit/depositions', {
  metadata: {
    title: manuscript.title,
    description: manuscript.abstract,
    creators: manuscript.authors.map(a => ({name: a.name, affiliation: a.affiliation})),
    keywords: manuscript.keywords,
    license: 'cc-by',
    access_right: 'open',
  }
});

const recordId = response.data.id;
const doiResponse = await axios.post(`https://zenodo.org/api/deposit/depositions/${recordId}/actions/publish`);
const doi = doiResponse.data.doi;  // 10.5281/zenodo.7654321

// Save to database
manuscript.doi = doi;
manuscript.publishedAt = new Date();
await manuscript.save();
```

**Result:** DOI assigned, article accessible at `https://zenodo.org/record/{recordId}`

---

## ⚡ Peer Review Workflow

### **Simple Version (MVP)**
1. Editor selects 2 reviewers
2. Email sent: "Please review this manuscript by [date]"
3. Reviewer fills form: score + feedback
4. Editor sees both reviews, makes decision
5. Email sent to author: "Accept / Minor revisions / Reject"

### **Form Reviewers See**
```
Manuscript: "[Title]"

1. Recommendation (required)
   ☐ Accept
   ☐ Minor revisions needed
   ☐ Major revisions needed
   ☐ Reject

2. Your score (1-5)
   ☐ Poor   ☐ Fair   ☐ Good   ☐ Very Good   ☐ Excellent

3. Detailed feedback
   [Large text area for comments]

4. Optional: Suggest specific changes
   [Text area]
```

---

## 📧 Email Templates

### **1. Review Invitation**
```
Subject: Review invitation: [Manuscript Title]

Dear [Reviewer Name],

We invite you to review the following manuscript:

Title: [Title]
Authors: [Names]
Keywords: [Keywords]
Abstract: [First 200 words...]

This is a [single-blind / double-blind] review. 
Your review is due by [Date].

Manuscript PDF: [Link]
Review form: [Link]

Thank you for supporting open science!

Editorial Board
```

### **2. Acceptance Decision**
```
Subject: Decision on your submission: [Title]

Dear [Author],

We're pleased to inform you that your manuscript 
"[Title]" has been ACCEPTED for publication!

The editor will now publish your article and assign a DOI.
You'll receive a notification when your article is live.

Best regards,
Editorial Team
```

### **3. Publication Notification**
```
Subject: Your article is published! DOI: [DOI]

Dear [Author],

Your article is now published and available online:

Title: [Title]
DOI: [DOI]
URL: https://zenodo.org/record/...

Cite this work:
[BibTeX format]

Share with colleagues!
```

---

## 🚀 Implementation Checklist

### **Week 1: Database & API**
- [ ] Create Manuscript model
- [ ] Create Journal model
- [ ] Update User model (author, reviewer fields)
- [ ] Write submit manuscript endpoint
- [ ] Write editor decision endpoint
- [ ] Write publish endpoint (with Zenodo integration)

### **Week 2: Author UI**
- [ ] Journal browse page
- [ ] Submission form (multi-step)
- [ ] YAML parser + metadata validator
- [ ] My submissions dashboard
- [ ] Manuscript view page

### **Week 3: Editor UI**
- [ ] Editor dashboard (manuscripts list)
- [ ] Review assignment flow
- [ ] Peer review form
- [ ] Decision interface
- [ ] Email notifications

### **Week 4: Publishing**
- [ ] Zenodo integration test
- [ ] Publish button + workflow
- [ ] DOI assignment
- [ ] Auto-create Paper record
- [ ] Smoke test end-to-end

### **Week 5-6: Polish & Launch**
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Author guidelines
- [ ] Submission template
- [ ] Plagiarism checks
- [ ] Beta test with real authors

---

## 🎓 Publishing Best Practices (Checklist)

### **Before Review**
- [ ] Desk review for scope (2 days)
- [ ] Invite reviewers (email sent within 3 days)
- [ ] Reviewers have 30 days to review

### **Peer Review**
- [ ] 2 minimum reviewers (3 recommended)
- [ ] Conflict of interest disclosed
- [ ] Double-blind preferred (authors don't know reviewers)
- [ ] Feedback constructive + specific

### **Editorial Decision**
- [ ] Accept (publish immediately)
- [ ] Minor revisions (author revises, resubmit, 1 week)
- [ ] Major revisions (author revises, 2nd review round, 2–3 weeks)
- [ ] Reject (with feedback so they improve)

### **Publication**
- [ ] Generate PDF (include metadata)
- [ ] Assign DOI
- [ ] Register with Zenodo + Crossref
- [ ] Add to journal website
- [ ] Index in Google Scholar
- [ ] Notify author + reviewers

---

## 💡 Launch Strategies

### **Strategy 1: Soft Launch (Recommended)**
- Invite 3 pilot journals + 20 beta authors
- Publish 10 articles without big announcement
- Fix bugs + iterate
- Then public launch

### **Strategy 2: Big Launch**
- Announce publicly immediately
- Invite all target communities (Ayurveda associations, etc.)
- Risk: Influx of submissions, overwhelmed editors

### **Strategy 3: Gradual Rollout**
- Week 1: Closed beta (friends + colleagues)
- Week 2: Public for journal owners (can create own journal)
- Week 3: Public for all authors (can submit)
- Week 4: Full features (peer review, publishing)

**Recommendation:** Strategy 1 (soft launch) → Strategy 2 (public launch).

---

## 📊 Success Metrics (First Month)

| Metric | Target | How to Measure |
|--------|--------|---|
| Journals created | 3–5 | Admin dashboard |
| Manuscripts submitted | 10–20 | /api/manuscripts?status=submitted |
| Peer reviews assigned | 5–10 | /api/manuscripts?status=under-review |
| Articles published | 2–5 | /api/manuscripts?status=published |
| DOIs assigned | 2–5 | Check Zenodo API |
| Avg review cycle | < 45 days | (publishedAt - submittedAt) / 2 |
| Editor satisfaction | > 4/5 | Survey |
| Author satisfaction | > 4/5 | Survey |

---

## ⚠️ Common Pitfalls (Avoid These)

| Pitfall | Why Bad | Solution |
|---------|---------|----------|
| No plagiarism check | Low quality + legal risk | Use Turnitin API |
| Missing metadata | Can't index in Google Scholar | Validate YAML parsing |
| No DOI | Authors can't cite | Use Zenodo (free) |
| Unclear review decision | Authors confused | Template decision email |
| No revision tracking | Can't see what changed | Version control (v1, v2) |
| Poor accessibility | Excludes readers | WCAG 2.1 audit |
| No conflict of interest | Bias in reviews | Require disclosure |
| Slow review cycle | Authors frustrated | Set deadlines + reminders |

---

## 🔗 External Services (Free)

| Service | Cost | Purpose | Integration |
|---------|------|---------|-------------|
| **Zenodo** | Free | DOI + archival | API |
| **Google Scholar** | Free | Indexing | Auto-indexed (no setup) |
| **Crossref** | Free (basic) | DOI registration | API |
| **Turnitin** | $0–500 | Plagiarism | API |
| **ORCID** | Free | Author identifiers | OAuth + API |
| **Mailgun** | Free (1000/mo) | Email sending | API |

---

## 📞 Support Resources

**For authors:**
- Submission template + guidelines
- FAQ page
- Video tutorial (how to submit)
- Email support (submit@nexusjournal.org)

**For editors:**
- Peer review guidelines
- Decision matrix (when to accept/reject)
- Email templates (invitations, decisions)
- Training session

**For reviewers:**
- Reviewer guidelines
- Review form (simple, 10 min)
- Confidentiality agreement
- Certificate of appreciation

---

## 🎬 30-Minute Demo

**Show user:**
1. Journal browse page (read scope, click "Submit")
2. Submission form (fill YAML + markdown, auto-parse)
3. Author dashboard (view submission status)
4. Editor dashboard (assign reviewers, see feedback)
5. Review form (fill out + submit)
6. Publish button (assign DOI, download PDF)
7. Published article (view on Zenodo, cite with DOI)

---

## Next Steps

1. **Today:** Review these docs, decide on launch strategy
2. **Tomorrow:** Create Manuscript + Journal models
3. **This week:** Build submission form + author dashboard
4. **Next week:** Editor workflow + peer review form
5. **End of month:** Zenodo integration + publish button
6. **Month 2:** Beta test with real authors

**Need help?** Refer to `PUBLISHING_IMPLEMENTATION_GUIDE.md` for detailed code.

---

**Good luck! Your platform will unlock publishing for Ayurvedic researchers. 🚀**
