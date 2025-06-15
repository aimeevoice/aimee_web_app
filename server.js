const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8088; // Updated to match Railway

// Enhanced CORS configuration
app.use(cors({
  origin: ['https://aimee-production.up.railway.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-characters-long';

// [Keep all your existing database arrays...]

// Add root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Aimee Wine Inventory API is running!',
    status: 'healthy',
    routes: ['/api/health', '/api/voice-inspector', '/api/auth/login']
  });
});

// [Keep all your existing middleware and functions...]

// Enhanced voice inspector endpoint
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
    
    // [Rest of your existing voice inspector logic...]
    
  } catch (error) {
    console.error('Voice inspector error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// [Keep all your other existing endpoints...]

// Enhanced server startup
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍷 Aimee Wine Assistant API running on port ${PORT}`);
  console.log(`📊 Loaded ${wineInventory.length} wines and ${customers.length} customers`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET ? 'Configured' : 'Missing'}`);
  console.log(`🎙️ ElevenLabs API: ${process.env.ELEVENLABS_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🎭 Voice Model: V2 Multilingual (FORCED)`);
  console.log(`🎯 Voice ID: ${process.env.VOICE_ID || 'Not set'}`);
  console.log(`🔍 Voice Inspector: https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:' + PORT}/api/voice-inspector`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
