const express = require('express');
const app = express();

// 1. Add your middleware first (these are standard)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. THIS IS THE SPECIAL PORT HANDLING CODE - COPY THIS WHOLE BLOCK
const startPort = 3000;

function startServer(port) {
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`✅ Server is running on: http://localhost:${port}`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is busy, trying ${port + 1} instead...`);
      startServer(port + 1); // Try next port
    } else {
      console.error('🔥 Server error:', err.message);
    }
  });
}

// 3. Add your routes AFTER the port code
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', port: server.address().port });
});

// 4. Start the server with this line
startServer(startPort);
