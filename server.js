const express = require('express');
const app = express();
const PORT = 3000; // Using standard Node port

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check executed successfully');
  res.json({ 
    status: 'running',
    os: 'windows',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Add to server.js before the app.listen() call

// Example wine inventory endpoint
app.get('/api/wines', (req, res) => {
  res.json([
    { id: 1, name: 'Pinot Noir', stock: 12 },
    { id: 2, name: 'Chardonnay', stock: 8 }
  ]);
});

// Example POST endpoint
app.post('/api/orders', express.json(), (req, res) => {
  console.log('Received order:', req.body);
  res.json({ status: 'Order received', order: req.body });
});

// Start server with Windows-specific settings
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`
  🚀 Server successfully started!
  Access at: http://localhost:${PORT}/api/health
  `);
  
  // Auto-open in default browser (Windows only)
  require('child_process').exec(`start http://localhost:${PORT}/api/health`);
});

// Enhanced error handling
server.on('error', (err) => {
  console.error('❌ Server failed to start:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log(`💡 Try either:
    1. Change PORT number in server.js (currently ${PORT})
    2. Run: netstat -ano | findstr :${PORT}
    3. Then: taskkill /PID [PID] /F`);
  }
});
