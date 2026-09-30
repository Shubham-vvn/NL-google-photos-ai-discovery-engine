require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
const apiRoutes = require('./routes/api');
const pipelineRoutes = require('./routes/pipeline');

app.use('/api', apiRoutes);
app.use('/api/pipeline', pipelineRoutes);

// Catch-all for single-page app client routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Auto-seed if database is empty (Render cold boot resilience)
try {
  const rowCount = db.prepare('SELECT COUNT(*) as count FROM evidence_nodes').get().count;
  if (rowCount === 0) {
    console.log('[Server] Database is empty. Running auto-seeder for cold boot initialization...');
    const seed = require('./db/seed');
    seed();
  }
} catch (e) {
  console.warn('[Server] Auto-seed check failed:', e.message);
}

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Google Photos Retrieval Discovery Engine`);
    console.log(` Server running at: http://localhost:${PORT}`);
    console.log(` Database connected: ${db.name || 'SQLite'}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
