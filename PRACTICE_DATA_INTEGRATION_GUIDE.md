# NexusJournal Data-to-Manuscript Pipeline - Integration Guide

## Overview
This guide walks through integrating the practice data collection, statistics calculation, and PDF export features into NexusJournal.

**What's Included:**
- ✅ Backend: PracticeData model, StatisticsService, practiceDataController, routes
- ✅ Frontend: PracticeDataCollectionPage (4-step wizard), PDFGenerator utility
- ❌ Not Yet: Navigation integration, dependencies installation

**Status:** Ready for server mounting and npm installation

---

## Part 1: Install NPM Dependencies

### Client Dependencies

Add these packages to `client/package.json`:

```json
{
  "dependencies": {
    "html2pdf.js": "^0.10.1",
    "chart.js": "^4.4.0"
  }
}
```

Then run:
```bash
cd "c:\My Apps\journal\client"
npm install
npm run build
```

---

## Part 2: Mount Server Routes

### Edit `server/src/index.js`

At the **top** of the file (around line 23), add the import:

```javascript
import practiceDataRoutes from './routes/practiceData.js';
```

Then find the section where routes are mounted (around line 50-55) and add:

```javascript
// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/journals', journalsRoutes);
app.use('/api/manuscripts', manuscriptsRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/practice-data', practiceDataRoutes);  // ← ADD THIS LINE
```

### Verify the route file exists

Check that this file exists at: `server/src/routes/practiceData.js`

If it doesn't exist, it's provided in this session's conversation history.

---

## Part 3: Integrate Navigation

### Add to Client Sidebar

Edit `client/src/components/Layout.tsx` or wherever your navigation is defined. Add a link to the data collection page:

```tsx
<Link to="/practice-data/create" className="menu-item">
  📊 Convert Data to Research
</Link>
```

### Add Route to Router

Edit `client/src/App.tsx` and add:

```tsx
import PracticeDataCollectionPage from './pages/PracticeDataCollectionPage';

// ... in your route definitions:
<Route path="/practice-data/create" element={<PracticeDataCollectionPage />} />
<Route path="/practice-data/:practiceDataId/generate-manuscript" element={<GenerateManuscriptPage />} />
```

**Note:** `GenerateManuscriptPage` is referenced but not yet created. See "Next Steps" below.

---

## Part 4: Test the Integration

### 1. Start the server
```bash
cd "c:\My Apps\journal\server"
npm run dev
# or
node src/index.js
```

### 2. Build and serve the client
```bash
cd "c:\My Apps\journal\client"
npm run build
npm run dev
```

### 3. Test the workflow

1. Navigate to the "Convert Data to Research" link
2. **Step 1 - Study Setup:**
   - Enter title, condition, intervention
   - Add 3-4 outcome measures
   - Mark research quality checkboxes
   - Click "Continue to Patient Data"
3. **Step 2 - Patient Data:**
   - Add 3+ patients with baseline and follow-up measurements
   - Click "Generate Statistics"
4. **Step 3 - Review Statistics:**
   - Verify statistical calculations display correctly
   - See completion rate and improvement rates
   - Click "Generate Manuscript" button

### 4. Check API endpoints

Test in Postman or curl:

```bash
# Create practice data
curl -X POST http://localhost:5005/api/practice-data \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Study",
    "condition": {"name": "Test Condition", "description": "Test"},
    "outcomes": [{"name": "Pain", "type": "numeric", "unit": "0-10"}]
  }'

# Add patient data
curl -X POST http://localhost:5005/api/practice-data/<ID>/patients \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P1",
    "age": 45,
    "gender": "M",
    "baselineData": {"Pain": 8},
    "completed": true
  }'

# Generate statistics
curl -X POST http://localhost:5005/api/practice-data/<ID>/statistics \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Part 5: PDF Generation (Client-side)

The `PDFGenerator` utility is ready to use. It:

1. **Creates charts** using Chart.js (bar charts for baseline vs endpoint, pie charts for improvement rates)
2. **Generates manuscript HTML** with all sections (Abstract, Introduction, Methods, Results, Discussion, Conclusion)
3. **Embeds base64 images** of charts directly in the PDF
4. **Exports to PDF** using html2pdf.js

### Usage Example

```typescript
import PDFGenerator from '@/utils/pdfGenerator';

// After generating statistics:
const manuscriptData = {
  title: 'Study Title',
  condition: { name: 'Condition', description: 'Description' },
  intervention: { name: 'Treatment', description: 'Description' },
  population: { totalCount: 10, ageRange: { min: 20, max: 80 } },
  outcomes: [ /* array of outcomes */ ],
  statistics: {
    completionRate: 90,
    outcomesStats: [ /* array of outcome statistics */ ]
  },
  studyType: 'case-series'
};

// Export to PDF
PDFGenerator.exportToPDF(manuscriptData, 'my-study.pdf');
```

---

## Next Steps (Not Yet Implemented)

### 1. Create GenerateManuscriptPage

This page should:
- Fetch the PracticeData document
- Show the generated manuscript preview
- Allow editing of sections
- Provide option to export as PDF
- Link to save as Draft Manuscript (create Manuscript model with `sourcePath='practice_data'`)

### 2. Add Manuscript Generation Engine

Use Gemini API to:
- Auto-generate Introduction (from condition + literature context)
- Auto-generate Methods (from study setup + population)
- Auto-generate Results section narrative
- Suggest Discussion points
- Generate Conclusion with recommendations

**Prompt template:**
```
Given this clinical practice data and statistics:
- Condition: [name]
- Intervention: [name]
- N patients: [count]
- Primary outcome improvement: [rate]%
- Study type: [case-series]

Generate a professional Introduction section for a research manuscript that:
1. Establishes the clinical problem
2. Explains the evidence gap
3. Justifies this study
4. States clear objectives

Keep it 300-400 words, suitable for a peer-reviewed journal.
```

### 3. Add Navigation Links

- Add "Create Research from Data" to Dashboard
- Add sidebar menu item "📊 My Practice Data"
- Link completed manuscripts to submission workflow

### 4. Add Testing

- Unit tests for StatisticsService calculations
- Integration tests for API endpoints
- E2E test of entire workflow (data entry → PDF export)

---

## File Checklist

✅ **Backend (created):**
- `server/src/models/PracticeData.js` (195 lines)
- `server/src/services/statisticsService.js` (350+ lines)
- `server/src/controllers/practiceDataController.js` (300+ lines)
- `server/src/routes/practiceData.js` (26 routes)

✅ **Frontend (created):**
- `client/src/pages/PracticeDataCollectionPage.tsx` (650+ lines)
- `client/src/utils/pdfGenerator.ts` (350+ lines)

⏳ **Pending:**
- `client/src/pages/GenerateManuscriptPage.tsx` (not yet created)
- Navigation integration in `client/src/App.tsx`
- Navigation links in `client/src/components/Layout.tsx`

❌ **Not Yet Implemented:**
- Manuscript generation engine (Gemini integration)
- Advanced graph visualization (more chart types)
- Manuscript comparison feature
- Literature reference integration

---

## Database Verification

After mounting the routes, verify the PracticeData collection was created:

```javascript
// In MongoDB/MongoDB Compass:
db.practicedata.findOne()

// Should return a document like:
{
  "_id": ObjectId(...),
  "title": "Study Title",
  "studyType": "case-series",
  "condition": { "name": "...", "description": "..." },
  "population": { "totalCount": 10, ... },
  "outcomes": [ { "name": "...", "type": "numeric", ... } ],
  "patients": [ { "patientId": "P1", "age": 45, ... } ],
  "statistics": { "completionRate": 90, "outcomesStats": [...] },
  "manuscriptStatus": "collecting",
  "createdAt": "2024-12-15T...",
  "updatedAt": "2024-12-15T..."
}
```

---

## Troubleshooting

### Issue: Routes not found (404 on /api/practice-data)
**Solution:** Verify the import and app.use() lines were added to `server/src/index.js` and the server was restarted.

### Issue: PDF generation fails ("html2pdf is not defined")
**Solution:** Run `npm install html2pdf.js chart.js` in the client folder and rebuild.

### Issue: Statistics calculations are wrong
**Solution:** Check that the StatisticsService is correctly calculating mean/sd/pValue. Review the algorithms in `server/src/services/statisticsService.js`.

### Issue: Patient data not saving
**Solution:** Verify that `practiceDataId` is correctly passed from Step 1 to Step 2. Check browser console for API errors.

---

## Support

For issues or questions:
1. Check the API response in browser DevTools Network tab
2. Review server logs for detailed error messages
3. Verify database connectivity: `db.practicedata.stats()`
4. Ensure JWT token is valid and includes user context

---

## Deployment

Once tested locally, deploy to VPS:

```bash
# 1. Build client
cd "c:\My Apps\journal\client"
npm run build

# 2. Deploy to server
wsl bash -c "tar czf /tmp/journal-public.tar.gz -C '/mnt/c/My Apps/journal/public' . && scp /tmp/journal-public.tar.gz root@76.13.211.100:/tmp/ && ssh root@76.13.211.100 'rm -rf /opt/nexusjournal/public/* && tar xzf /tmp/journal-public.tar.gz -C /opt/nexusjournal/public/ && rm /tmp/journal-public.tar.gz'"

# 3. Restart server
wsl bash -c "ssh root@76.13.211.100 'pm2 restart nexusjournal'"

# 4. Verify
curl https://journal.mind-meditate.com/api/practice-data
```

Then ask users to do Ctrl+Shift+R twice to clear service worker cache.

---

**Created:** December 15, 2024
**Version:** 1.0
**Status:** Ready for integration
