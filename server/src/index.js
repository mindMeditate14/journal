import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import { fiveXxMiddleware } from './utils/alerter.js';
import { startScheduledIngest } from './jobs/scheduledIngest.js';

// Routes
import authRoutes from './routes/auth.js';
import passwordResetRoutes from './routes/passwordReset.js';
import journalRoutes from './routes/journals.js';
import manuscriptRoutes from './routes/manuscripts.js';
import workspaceRoutes from './routes/workspace.js';
import paperRoutes from './routes/papers.js';
import ingestRoutes from './routes/ingest.js';
import adminRoutes from './routes/admin.js';
import practiceDataRoutes from './routes/practiceData.js';
import configRoutes from './routes/config.js';

// ── Scholar-friendly paper page & sitemap ───────────────────────────────────
// Lazy-import Paper model to avoid circular deps at module load time
async function getPaperModel() {
  const { default: Paper } = await import('./models/Paper.js');
  return Paper;
}

const PUBLIC_DIR = path.resolve(process.cwd(), '../public');
const BASE_URL = (process.env.BASE_URL || 'https://journal.mind-meditate.com').replace(/\/$/, '');

function escape(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildMetaTags(paper) {
  const tags = [];
  tags.push(`<meta name="citation_title" content="${escape(paper.title)}">`);
  (paper.authors || []).forEach(a => {
    tags.push(`<meta name="citation_author" content="${escape(a.name)}">`);
    if (a.orcid) tags.push(`<meta name="citation_author_orcid" content="${escape(a.orcid)}">`);
  });
  if (paper.publishedAt) {
    const d = new Date(paper.publishedAt);
    tags.push(`<meta name="citation_publication_date" content="${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}">`);
  }
  if (paper.journal?.name) tags.push(`<meta name="citation_journal_title" content="${escape(paper.journal.name)}">`);
  if (paper.journal?.issn)  tags.push(`<meta name="citation_issn" content="${escape(paper.journal.issn)}">`);
  if (paper.doi)            tags.push(`<meta name="citation_doi" content="${escape(paper.doi)}">`);
  // citation_pdf_url must be same subdirectory as abstract for Google Scholar
  tags.push(`<meta name="citation_pdf_url" content="${BASE_URL}/papers/${paper._id}/download">`);
  tags.push(`<meta name="citation_abstract_html_url" content="${BASE_URL}/papers/${paper._id}">`);
  if ((paper.keywords || []).length) tags.push(`<meta name="citation_keywords" content="${escape(paper.keywords.join('; '))}">`);
  if (paper.abstract) tags.push(`<meta name="description" content="${escape(paper.abstract.substring(0, 300))}">`);
  tags.push(`<!-- og:title --><meta property="og:title" content="${escape(paper.title)}">`);
  tags.push(`<meta property="og:type" content="article">`);
  tags.push(`<meta property="og:url" content="${BASE_URL}/papers/${paper._id}">`);
  return tags.join('\n    ');
}
// ────────────────────────────────────────────────────────────────────────────

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // Allow blob: in frame-src so Chrome's PDF viewer can render PDFs in iframes
      frameSrc: ["'self'", 'blob:'],
    },
  },
}));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Serve uploaded working/final manuscript files.
app.use('/uploads', express.static(path.resolve(process.cwd(), '../uploads')));

// 5xx rate alerting — must be before routes
app.use(fiveXxMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/manuscripts', manuscriptRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/practice-data', practiceDataRoutes);

// ── SPA fallback for bare /papers path (nginx location /papers/ redirects /papers → /papers/) ──
app.get(['/papers', '/papers/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ── Scholar-visible paper pages (/papers/:id → inject citation meta tags) ──
app.get('/papers/:id', async (req, res, next) => {
  try {
    const indexHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
    const Paper = await getPaperModel();
    const paper = await Paper.findById(req.params.id).lean();
    if (!paper) return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    const metaTags = buildMetaTags(paper);
    const title = `${paper.title} | ${paper.journal?.name || 'Traditional Medicine International'}`;
    const html = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
      .replace('</head>', `    ${metaTags}\n  </head>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

// ── robots.txt ──────────────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: ${BASE_URL}/sitemap.xml
`);
});

// ── sitemap.xml ─────────────────────────────────────────────────────────────
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const Paper = await getPaperModel();
    const papers = await Paper.find({}, { _id: 1, updatedAt: 1 }).lean();
    const urls = papers.map(p => `  <url>
    <loc>${BASE_URL}/papers/${p._id}</loc>
    <lastmod>${(p.updatedAt || new Date()).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection
await connectDB();

// Start scheduled ingest (no-op if SCHEDULED_INGEST_ENABLED != 'true')
startScheduledIngest();

const PORT = process.env.PORT || 5005;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  logger.info(`🚀 NexusJournal API running on http://${HOST}:${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
