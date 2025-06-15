const express = require('express');
const app = express();
const PORT = process.env.PORT || 8088;

// 1. Essential Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 3. Health Check Endpoint (Simplified)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 4. Voice Inspector Endpoint
app.get('/api/voice-inspector', async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }
    
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    res.json({
      voices: data.voices.map(v => ({
        id: v.voice_id,
        name: v.name,
        category: v.category
      })),
      currentVoice: process.env.VOICE_ID || 'Not configured'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Root Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Aimee API is running',
    endpoints: [
      '/api/health',
      '/api/voice-inspector'
    ]
  });
});

// 6. 404 Handler (MUST be last)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 7. Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('GET /');
  console.log('GET /api/health');
  console.log('GET /api/voice-inspector');
});
