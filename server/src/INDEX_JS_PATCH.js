/**
 * MANUAL PATCH FOR server/src/index.js
 * 
 * This file shows exactly what needs to be changed.
 * Apply these changes manually if the apply_patch tool fails.
 * 
 * Reference: "Practice Data to Manuscript Pipeline Integration"
 */

// ============================================
// CHANGE 1: Add import at the top
// ============================================

// LOCATION: Around line 23, after other imports

// BEFORE:
// import adminRoutes from './routes/admin.js';

// AFTER:
import adminRoutes from './routes/admin.js';
import practiceDataRoutes from './routes/practiceData.js';  // ← ADD THIS LINE

// ============================================
// CHANGE 2: Mount the route
// ============================================

// LOCATION: Around line 50-60, in the app.use() section

// BEFORE:
// app.use('/api/auth', authRoutes);
// app.use('/api/journals', journalsRoutes);
// app.use('/api/manuscripts', manuscriptsRoutes);
// app.use('/api/workspace', workspaceRoutes);
// app.use('/api/papers', papersRoutes);
// app.use('/api/ingest', ingestRoutes);
// app.use('/api/admin', adminRoutes);

// AFTER:
// app.use('/api/auth', authRoutes);
// app.use('/api/journals', journalsRoutes);
// app.use('/api/manuscripts', manuscriptsRoutes);
// app.use('/api/workspace', workspaceRoutes);
// app.use('/api/papers', papersRoutes);
// app.use('/api/ingest', ingestRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api/practice-data', practiceDataRoutes);  // ← ADD THIS LINE

// ============================================
// That's it! Two simple changes.
// ============================================

// After making these changes:
// 1. Save the file
// 2. Restart the server (pm2 restart nexusjournal)
// 3. Test: POST to /api/practice-data
