const express = require('express');
const app = express();
const PORT = 3000;

// Sample wine database
const wines = [
  { id: 1, name: 'Pinot Noir', region: 'Burgundy', stock: 12 },
  { id: 2, name: 'Chardonnay', region: 'California', stock: 8 },
  { id: 3, name: 'Cabernet Sauvignon', region: 'Bordeaux', stock: 15 }
];

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleString()} - ${req.method} ${req.url}`);
  next();
});

// Endpoints
app.get('/api/wines', (req, res) => {
  res.json({
    success: true,
    count: wines.length,
    data: wines
  });
});

app.get('/api/wines/:id', (req, res) => {
  const wine = wines.find(w => w.id === parseInt(req.params.id));
  if (!wine) return res.status(404).json({ success: false, message: 'Wine not found' });
  res.json({ success: true, data: wine });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/wines',
      'GET /api/wines/:id',
      'GET /api/health'
    ]
  });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🍷 Wine API running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`- GET /api/wines`);
  console.log(`- GET /api/wines/:id`);
  console.log(`- GET /api/health`);
});
