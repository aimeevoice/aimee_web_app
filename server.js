const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8088;

// 1. Enhanced CORS configuration
app.use(cors({
  origin: ['https://aimee-production.up.railway.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Body parser middleware
app.use(express.json());

// 3. Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-characters-long';

// [Keep all your existing database arrays...]

// 4. Root endpoint - should work
app.get('/', (req, res) => {
  res.json({
    message: 'Aimee Wine Inventory API is running!',
    status: 'healthy',
    routes: ['/api/health', '/api/voice-inspector', '/api/auth/login']
  });
});

// 5. Health check endpoint - fixed version
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 6. Voice inspector endpoint - fixed version
app.get('/api/voice-inspector', async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.VOICE_ID;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'ELEVENLABS_API_KEY not configured',
        fix: 'Set the ELEVENLABS_API_KEY environment variable'
      });
    }
    
    const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 
        'xi-api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!voicesResponse.ok) {
      const errorText = await voicesResponse.text();
      return res.status(voicesResponse.status).json({
        error: `ElevenLabs API request failed`,
        status: voicesResponse.status,
        message: errorText
      });
    }
    
    const voicesData = await voicesResponse.json();
    
    // Check if current voice ID exists
    const currentVoiceExists = voicesData.voices.find(v => v.voice_id === voiceId);
    
    res.json({
      status: 'success',
      model: 'eleven_multilingual_v2',
      currentVoice: {
        id: voiceId,
        exists: !!currentVoiceExists,
        name: currentVoiceExists?.name || 'Not found'
      },
      availableVoices: voicesData.voices.map(v => ({
        id: v.voice_id,
        name: v.name,
        category: v.category
      }))
    });
    
  } catch (error) {
    console.error('Voice inspector error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// [Keep all your other existing endpoints...]

// 7. 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    requestedMethod: req.method,
    requestedPath: req.path,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/voice-inspector',
      'POST /api/auth/login'
    ]
  });
});

// 8. Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 9. Enhanced server startup
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log(`- GET /`);
  console.log(`- GET /api/health`);
  console.log(`- GET /api/voice-inspector`);
  console.log(`- POST /api/auth/login`);
  console.log(`(Plus your other endpoints...)`);
});
