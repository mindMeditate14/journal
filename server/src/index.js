import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
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

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

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
