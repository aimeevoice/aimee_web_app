const express = require('express');
const app = express();
const PORT = 3000;

// Essential middleware
app.use(express.json());

// 1. PORT HANDLER WITH AUTO-RETRY (keep this exactly as-is)
function startServer(port) {
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

// 2. REQUIRED ROUTES (add your endpoints here)
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the API',
    endpoints: [
      '/api/health',
      '/api/wines'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// 3. SAMPLE DATA ENDPOINT
const wines = [
  { id: 1, name: 'Chardonnay', region: 'France' },
  { id: 2, name: 'Merlot', region: 'Italy' }
];

app.get('/api/wines', (req, res) => {
  res.json({
    success: true,
    count: wines.length,
    data: wines
  });
});

// 4. START THE SERVER (this must be LAST)
startServer(PORT);
