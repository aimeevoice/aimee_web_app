const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-characters-long';

// Wine Inventory Database (in-memory for demo)
const wineInventory = [
  { id: 1, name: 'Pinot Noir', vintage: 2021, price: 45.99, stock: 12, region: 'Sonoma Valley' },
  { id: 2, name: 'Chardonnay', vintage: 2022, price: 38.50, stock: 8, region: 'Napa Valley' },
  { id: 3, name: 'Cabernet Sauvignon', vintage: 2020, price: 62.75, stock: 15, region: 'Paso Robles' },
  { id: 4, name: 'Syrah', vintage: 2021, price: 41.25, stock: 6, region: 'Central Coast' },
  { id: 5, name: 'Sauvignon Blanc', vintage: 2023, price: 32.99, stock: 20, region: 'Sonoma Coast' },
  { id: 6, name: 'Merlot', vintage: 2021, price: 48.75, stock: 10, region: 'Napa Valley' },
  { id: 7, name: 'Riesling', vintage: 2023, price: 29.99, stock: 18, region: 'Columbia Valley' },
  { id: 8, name: 'Rosé', vintage: 2023, price: 24.99, stock: 25, region: 'Provence Style' }
];

// Customer Database
const customers = [
  { id: 1, name: 'Thompson Restaurant', email: 'orders@thompsonrest.com', lastOrder: '2024-06-10', contact: 'Sarah Thompson' },
  { id: 2, name: 'Johnson Winery', email: 'purchasing@johnsonwinery.com', lastOrder: '2024-06-08', contact: 'Mike Johnson' },
  { id: 3, name: 'Coastal Bistro', email: 'manager@coastalbistro.com', lastOrder: '2024-06-12', contact: 'Lisa Chen' },
  { id: 4, name: 'Garden Cafe', email: 'orders@gardencafe.com', lastOrder: '2024-06-09', contact: 'David Garcia' },
  { id: 5, name: 'Wine & Dine', email: 'orders@wineanddine.com', lastOrder: '2024-06-11', contact: 'Emma Wilson' },
  { id: 6, name: 'Sunset Grill', email: 'purchasing@sunsetgrill.com', lastOrder: '2024-06-07', contact: 'Robert Kim' }
];

// Recent orders for customer data
const recentOrders = [
  { customerId: 1, customerName: 'Thompson Restaurant', wineId: 1, wineName: 'Pinot Noir', quantity: 6, date: '2024-06-10', total: 275.94 },
  { customerId: 2, customerName: 'Johnson Winery', wineId: 3, wineName: 'Cabernet Sauvignon', quantity: 12, date: '2024-06-08', total: 753.00 },
  { customerId: 3, customerName: 'Coastal Bistro', wineId: 2, wineName: 'Chardonnay', quantity: 4, date: '2024-06-12', total: 154.00 },
  { customerId: 4, customerName: 'Garden Cafe', wineId: 5, wineName: 'Sauvignon Blanc', quantity: 8, date: '2024-06-09', total: 263.92 },
  { customerId: 5, customerName: 'Wine & Dine', wineId: 6, wineName: 'Merlot', quantity: 6, date: '2024-06-11', total: 292.50 },
  { customerId: 6, customerName: 'Sunset Grill', wineId: 7, wineName: 'Riesling', quantity: 10, date: '2024-06-07', total: 299.90 }
];

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'wine123') {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Enhanced text processing for V3 emotional tags
function enhanceTextForV3(text, queryType) {
  let enhancedText = text;
  
  if (queryType === 'email') {
    enhancedText = `(friendly) ${text}`;
  } else if (text.includes('stock') || text.includes('inventory')) {
    if (text.includes('0 bottles') || text.includes('out of stock')) {
      enhancedText = `(apologetic) ${text}`;
    } else {
      enhancedText = `(informative) ${text}`;
    }
  } else if (text.includes('price') || text.includes('cost')) {
    enhancedText = `(professional) ${text}`;
  } else if (text.includes('sorry') || text.includes('error') || text.includes('not found')) {
    enhancedText = `(apologetic) ${text}`;
  } else if (text.includes('excellent') || text.includes('great') || text.includes('perfect') || text.includes('success')) {
    enhancedText = `(enthusiastic) ${text}`;
  } else if (text.includes('order') || text.includes('customer')) {
    enhancedText = `(helpful) ${text}`;
  } else {
    enhancedText = `(warm) ${text}`;
  }
  
  return enhancedText;
}

// Smart query processing function
function processVoiceQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  // Email detection and processing
  if (lowerQuery.includes('email') || lowerQuery.includes('send') || lowerQuery.includes('contact')) {
    const customerMatch = customers.find(c => 
      lowerQuery.includes(c.name.toLowerCase()) || 
      lowerQuery.includes(c.name.split(' ')[0].toLowerCase()) ||
      lowerQuery.includes(c.contact.toLowerCase().split(' ')[0])
    );
    
    if (customerMatch) {
      let emailContent;
      
      if (lowerQuery.includes('order') || lowerQuery.includes('delivery')) {
        emailContent = `Hi ${customerMatch.contact},\n\nI hope this message finds you well. I wanted to follow up regarding your recent wine order and confirm the delivery details.\n\nOur team is ready to process your order and ensure timely delivery. Please let me know if you have any specific delivery preferences or timing requirements.\n\nBest regards,\nAimee\nWine Sales Assistant`;
      } else if (lowerQuery.includes('new') || lowerQuery.includes('arrival')) {
        emailContent = `Hi ${customerMatch.contact},\n\nExciting news! We have some fantastic new wine arrivals that I think would be perfect for ${customerMatch.name}.\n\nOur latest collection includes exceptional vintages from premium vineyards. I'd love to schedule a tasting session or send you our updated catalog.\n\nBest regards,\nAimee\nWine Sales Assistant`;
      } else {
        emailContent = `Hi ${customerMatch.contact},\n\nI hope this message finds you well. I wanted to reach out regarding our wine selection and see if you'd be interested in discussing your upcoming needs.\n\nWe have some excellent options that I think would be perfect for ${customerMatch.name}. Please let me know if you'd like to review our current offerings.\n\nBest regards,\nAimee\nWine Sales Assistant`;
      }
      
      return {
        type: 'email',
        emailData: {
          recipient: customerMatch.email,
          content: emailContent
        },
        response: `I'll prepare an email for ${customerMatch.contact} at ${customerMatch.name}. Please review the message below:`
      };
    } else {
      return {
        type: 'general',
        response: `I can help you send emails to our customers. Try saying "Email Thompson Restaurant" or "Send email to Johnson Winery about new arrivals."`
      };
    }
  }
  
  // Inventory queries
  if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('have')) {
    const wineMatch = wineInventory.find(wine => 
      lowerQuery.includes(wine.name.toLowerCase()) ||
      lowerQuery.includes(wine.name.split(' ')[0].toLowerCase())
    );
    
    if (wineMatch) {
      if (wineMatch.stock === 0) {
        return {
          type: 'inventory',
          response: `I'm sorry, we're currently out of stock on ${wineMatch.name} (${wineMatch.vintage}). Would you like me to check for similar wines or set up a restock notification?`
        };
      } else if (wineMatch.stock <= 5) {
        return {
          type: 'inventory',
          response: `We have ${wineMatch.stock} bottles of ${wineMatch.name} (${wineMatch.vintage}) remaining from ${wineMatch.region}. This is running low - you might want to reorder soon.`
        };
      } else {
        return {
          type: 'inventory',
          response: `We currently have ${wineMatch.stock} bottles of ${wineMatch.name} (${wineMatch.vintage}) in stock from ${wineMatch.region}. Plenty available for your orders!`
        };
      }
    } else if (lowerQuery.includes('all') || lowerQuery.includes('everything')) {
      const inventoryList = wineInventory.map(wine => 
        `${wine.name} (${wine.vintage}): ${wine.stock} bottles`
      ).join(', ');
      return {
        type: 'inventory',
        response: `Here's our complete inventory: ${inventoryList}. Total wines available: ${wineInventory.length} varieties.`
      };
    }
  }
  
  // Pricing queries
  if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('$')) {
    const wineMatch = wineInventory.find(wine => 
      lowerQuery.includes(wine.name.toLowerCase()) ||
      lowerQuery.includes(wine.name.split(' ')[0].toLowerCase())
    );
    
    if (wineMatch) {
      return {
        type: 'pricing',
        response: `The ${wineMatch.name} (${wineMatch.vintage}) from ${wineMatch.region} is priced at $${wineMatch.price} per bottle. We currently have ${wineMatch.stock} bottles available.`
      };
    } else if (lowerQuery.includes('all') || lowerQuery.includes('everything')) {
      const priceList = wineInventory.map(wine => 
        `${wine.name} (${wine.vintage}): $${wine.price}`
      ).join(', ');
      return {
        type: 'pricing',
        response: `Here's our complete price list: ${priceList}. Prices include volume discounts for orders over 12 bottles.`
      };
    }
  }
  
  // Customer queries
  if (lowerQuery.includes('customer') || lowerQuery.includes('bought') || lowerQuery.includes('ordered') || lowerQuery.includes('who')) {
    if (lowerQuery.includes('week') || lowerQuery.includes('recent')) {
      const recentCustomers = recentOrders.map(order => 
        `${order.customerName} ordered ${order.quantity} bottles of ${order.wineName} on ${order.date} for $${order.total}`
      ).join(', ');
      const totalSales = recentOrders.reduce((sum, order) => sum + order.total, 0);
      return {
        type: 'customers',
        response: `Recent customer orders: ${recentCustomers}. Total recent sales: $${totalSales.toFixed(2)}.`
      };
    }
  }
  
  // Help
  if (lowerQuery.includes('help') || lowerQuery.includes('what can you')) {
    return {
      type: 'help',
      response: `I'm Aimee, your wine sales assistant! I can help you with: checking wine inventory and stock levels, getting pricing information, sending emails to customers, viewing recent orders, and managing customer relationships. Just speak naturally!`
    };
  }
  
  // Default response
  return {
    type: 'general',
    response: `I understand you're asking about "${query}". I can help with wine inventory, pricing, customer emails, and recent orders. Try asking: "What's our Chardonnay price?" or "Do we have Pinot Noir?"`
  };
}

// Enhanced TTS generation with V3 support and fallback
async function generateSpeech(text, queryType, apiKey, voiceId, isIOS = false) {
  if (!apiKey || isIOS) {
    return null;
  }
  
  const useV3 = process.env.USE_ELEVEN_V3 === 'true';
  const cleanVoiceId = (voiceId || '').trim();
  
  if (!cleanVoiceId) {
    console.log('❌ No voice ID provided');
    return null;
  }
  
  // Determine model and settings
  let modelId, enhancedText, voiceSettings;
  
  if (useV3) {
    modelId = 'eleven_v3';
    enhancedText = enhanceTextForV3(text, queryType);
    voiceSettings = {
      stability: 0.3,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true
    };
    console.log(`🎭 Using Eleven V3 with enhanced text: "${enhancedText}"`);
  } else {
    modelId = 'eleven_flash_v2_5';
    enhancedText = text;
    voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.5
    };
    console.log(`⚡ Using Flash V2.5 for real-time response`);
  }
  
  try {
    console.log(`🎙️ Generating speech with voice ID: ${cleanVoiceId}`);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cleanVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: enhancedText,
        model_id: modelId,
        voice_settings: voiceSettings
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      console.log(`✅ TTS generation successful with ${modelId}`);
      return `data:audio/mpeg;base64,${base64Audio}`;
    } else {
      const errorText = await response.text();
      console.log(`❌ TTS generation failed: ${response.status} - ${errorText}`);
      
      // Fallback: If V3 fails, try Flash V2.5
      if (useV3 && (response.status === 400 || response.status === 422)) {
        console.log('🔄 V3 failed, falling back to Flash V2.5...');
        return await generateSpeechFallback(text, apiKey, cleanVoiceId);
      }
      
      return null;
    }
  } catch (error) {
    console.error('TTS generation error:', error.message);
    
    if (useV3) {
      console.log('🔄 Network error with V3, trying Flash V2.5 fallback...');
      return await generateSpeechFallback(text, apiKey, cleanVoiceId);
    }
    
    return null;
  }
}

// Fallback TTS generation
async function generateSpeechFallback(text, apiKey, voiceId) {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      console.log('✅ Fallback TTS successful with Flash V2.5');
      return `data:audio/mpeg;base64,${base64Audio}`;
    } else {
      console.log(`❌ Fallback TTS also failed: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('Fallback TTS error:', error.message);
    return null;
  }
}

// 🔍 VOICE INSPECTOR ENDPOINT - THIS WILL FIX YOUR VOICE ISSUE
app.get('/api/voice-inspector', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.VOICE_ID;
  
  console.log('🔍 Voice Inspector called');
  console.log(`Current Voice ID: "${voiceId}"`);
  console.log(`API Key present: ${!!apiKey}`);
  
  if (!apiKey) {
    return res.json({ 
      error: 'No ELEVENLABS_API_KEY configured',
      fix: 'Set ELEVENLABS_API_KEY environment variable on Railway'
    });
  }
  
  try {
    // Get all voices from ElevenLabs
    const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 
        'xi-api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!voicesResponse.ok) {
      const errorText = await voicesResponse.text();
      return res.json({
        error: `ElevenLabs API failed: ${voicesResponse.status}`,
        details: errorText,
        fix: 'Check your ELEVENLABS_API_KEY - it might be invalid'
      });
    }
    
    const voicesData = await voicesResponse.json();
    console.log(`✅ Found ${voicesData.voices.length} total voices`);
    
    // Check if current voice ID exists
    const currentVoiceExists = voicesData.voices.find(v => v.voice_id === voiceId);
    
    // Find custom voices (your created voices)
    const customVoices = voicesData.voices.filter(v => 
      v.category === 'cloned' || v.category === 'generated'
    );
    
    // Look for Aimee voice specifically
    const aimeeVoices = voicesData.voices.filter(v => 
      v.name.toLowerCase().includes('aimee') || 
      v.name.toLowerCase().includes('amy')
    );
    
    // Good default female voices as backup
    const goodFemaleVoices = voicesData.voices.filter(v => 
      v.category === 'premade' && (
        v.name.toLowerCase().includes('rachel') ||
        v.name.toLowerCase().includes('bella') ||
        v.name.toLowerCase().includes('dorothy')
      )
    );
    
    // Create response with fixes
    const response = {
      timestamp: new Date().toISOString(),
      status: currentVoiceExists ? 'VOICE_FOUND' : 'VOICE_NOT_FOUND',
      
      current: {
        voiceId: voiceId,
        voiceIdLength: voiceId?.length || 0,
        found: !!currentVoiceExists,
        name: currentVoiceExists?.name || 'NOT FOUND',
        category: currentVoiceExists?.category || 'N/A'
      },
      
      analysis: {
        totalVoices: voicesData.voices.length,
        customVoices: customVoices.length,
        aimeeVoices: aimeeVoices.length
      },
      
      yourCustomVoices: customVoices.map(v => ({
        name: v.name,
        id: v.voice_id,
        category: v.category
      })),
      
      aimeeVoices: aimeeVoices.map(v => ({
        name: v.name,
        id: v.voice_id,
        category: v.category
      })),
      
      backupVoices: goodFemaleVoices.map(v => ({
        name: v.name,
        id: v.voice_id,
        description: 'Good female voice as backup'
      })),
      
      // Immediate fixes
      fixes: []
    };
    
    // Generate specific fixes based on what we found
    if (!currentVoiceExists) {
      response.fixes.push({
        issue: 'Current voice ID not found',
        severity: 'HIGH',
        solution: voiceId ? `Voice ID "${voiceId}" doesn't exist in your account` : 'No voice ID configured'
      });
      
      if (aimeeVoices.length > 0) {
        response.fixes.push({
          issue: 'Found Aimee voice(s)',
          severity: 'FIX',
          solution: `Use this voice ID: ${aimeeVoices[0].voice_id}`,
          railwayCommand: `VOICE_ID=${aimeeVoices[0].voice_id}`
        });
      } else if (customVoices.length > 0) {
        response.fixes.push({
          issue: 'No Aimee voice, but found custom voices',
          severity: 'OPTION',
          solution: `Try one of your custom voices: ${customVoices[0].voice_id}`,
          railwayCommand: `VOICE_ID=${customVoices[0].voice_id}`
        });
      } else {
        response.fixes.push({
          issue: 'No custom voices found',
          severity: 'BACKUP',
          solution: `Use Rachel as backup: ${goodFemaleVoices[0]?.voice_id || '21m00Tcm4TlvDq8ikWAM'}`,
          railwayCommand: `VOICE_ID=${goodFemaleVoices[0]?.voice_id || '21m00Tcm4TlvDq8ikWAM'}`
        });
      }
    } else {
      response.fixes.push({
        issue: 'Voice ID is correct',
        severity: 'OK',
        solution: 'Voice ID exists and should work. Check API key or network issues.'
      });
    }
    
    console.log(`🎯 Voice Inspector Result: ${response.status}`);
    if (aimeeVoices.length > 0) {
      console.log(`🎉 Found Aimee voice: ${aimeeVoices[0].name} - ${aimeeVoices[0].voice_id}`);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Voice Inspector Error:', error);
    res.json({
      error: 'Inspector failed',
      details: error.message,
      fix: 'Check network connection and API key'
    });
  }
});

// Main voice query endpoint
app.post('/api/voice-query', authenticateToken, async (req, res) => {
  const { query, isIOS } = req.body;
  console.log('Voice query received:', query);

  if (!query) {
    return res.status(400).json({ error: 'Query missing' });
  }

  const result = processVoiceQuery(query);
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = process.env.VOICE_ID;

  // Generate audio
  let audioUrl = null;
  if (ELEVENLABS_API_KEY && !isIOS) {
    audioUrl = await generateSpeech(result.response, result.type, ELEVENLABS_API_KEY, VOICE_ID, isIOS);
  }

  // Return response
  if (result.type === 'email') {
    res.json({
      type: 'email',
      response: result.response,
      emailData: result.emailData,
      audioUrl
    });
  } else {
    res.json({
      type: 'text',
      response: result.response,
      audioUrl
    });
  }
});

// Email sending endpoint
app.post('/api/send-email', authenticateToken, async (req, res) => {
  const { recipient, content } = req.body;
  
  if (!recipient || !content) {
    return res.status(400).json({ error: 'Recipient and content required' });
  }
  
  console.log(`📧 Email sent to: ${recipient}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  res.json({ 
    success: true, 
    message: `Email successfully sent to ${recipient}`,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const useV3 = process.env.USE_ELEVEN_V3 === 'true';
  const hasApiKey = !!process.env.ELEVENLABS_API_KEY;
  const hasVoiceId = !!process.env.VOICE_ID;
  
  res.json({ 
    status: 'online', 
    message: 'Aimee Wine Sales Assistant API is running',
    model: useV3 ? 'Eleven V3 (alpha) - Expressive' : 'Flash V2.5 - Real-time',
    inventory: `${wineInventory.length} wines available`,
    customers: `${customers.length} customers in database`,
    recentOrders: `${recentOrders.length} recent orders`,
    configuration: {
      hasApiKey,
      hasVoiceId,
      v3Enabled: useV3
    },
    endpoints: [
      'POST /api/voice-query - Main voice processing',
      'POST /api/send-email - Email sending',
      'GET /api/voice-inspector - Fix voice issues',
      'GET /api/health - System status'
    ]
  });
});

// Get wine inventory
app.get('/api/inventory', authenticateToken, (req, res) => {
  res.json(wineInventory);
});

// Get customers
app.get('/api/customers', authenticateToken, (req, res) => {
  res.json(customers);
});

// Start the server
app.listen(PORT, () => {
  const useV3 = process.env.USE_ELEVEN_V3 === 'true';
  console.log(`🍷 Aimee Wine Assistant API running on port ${PORT}`);
  console.log(`📊 Loaded ${wineInventory.length} wines and ${customers.length} customers`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET ? 'Configured' : 'Missing'}`);
  console.log(`🎙️ ElevenLabs API: ${process.env.ELEVENLABS_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🎭 Voice Model: ${useV3 ? 'Eleven V3 (alpha)' : 'Flash V2.5'}`);
  console.log(`🎯 Voice ID: ${process.env.VOICE_ID || 'Not set'}`);
  console.log(`🔍 Voice Inspector: https://your-app.railway.app/api/voice-inspector`);
});