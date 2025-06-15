require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware Setup
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://your-netlify-app.netlify.app',
    'https://your-railway.app'
  ]
}));
app.use(express.json());

// 2. Auto-port Handling (Improved)
function startServer(port) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`
    🚀 Aimee Assistant Running
    --------------------------
    Local: http://localhost:${port}
    ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Missing'}
    Voice ID: ${process.env.VOICE_ID || 'Not set'}
    `);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

// 3. RESTORE YOUR ORIGINAL ROUTES
// ==============================

// Authentication
app.post('/api/auth/login', (req, res) => {
  // Your existing login logic
});

// Voice Processing
app.post('/api/voice-query', async (req, res) => {
  // Your ElevenLabs/Whisper integration
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/...', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    // Your voice processing logic
  } catch (error) {
    console.error('Voice API error:', error);
  }
});

// 4. Frontend Connection Routes
app.get('/api/config', (req, res) => {
  res.json({
    services: {
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      voiceId: !!process.env.VOICE_ID,
      backend: 'active'
    }
  });
});

// 5. Start Server (LAST LINE)
startServer(PORT);
