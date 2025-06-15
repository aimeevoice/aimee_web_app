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
  { id: 5, name: 'Sauvignon Blanc', vintage: 2023, price: 32.99, stock: 20, region: 'Sonoma Coast' }
];

// Customer Database
const customers = [
  { id: 1, name: 'Thompson Restaurant', email: 'orders@thompsonrest.com', lastOrder: '2024-06-10' },
  { id: 2, name: 'Johnson Winery', email: 'purchasing@johnsonwinery.com', lastOrder: '2024-06-08' },
  { id: 3, name: 'Coastal Bistro', email: 'manager@coastalbistro.com', lastOrder: '2024-06-12' },
  { id: 4, name: 'Garden Cafe', email: 'orders@gardencafe.com', lastOrder: '2024-06-09' }
];

// Recent orders for customer data
const recentOrders = [
  { customerId: 1, customerName: 'Thompson Restaurant', wineId: 1, quantity: 6, date: '2024-06-10' },
  { customerId: 2, customerName: 'Johnson Winery', wineId: 3, quantity: 12, date: '2024-06-08' },
  { customerId: 3, customerName: 'Coastal Bistro', wineId: 2, quantity: 4, date: '2024-06-12' },
  { customerId: 4, customerName: 'Garden Cafe', wineId: 5, quantity: 8, date: '2024-06-09' }
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
  // Add emotional context based on query type and content
  let enhancedText = text;
  
  if (queryType === 'email') {
    enhancedText = `(friendly) ${text}`;
  } else if (text.includes('stock') || text.includes('inventory')) {
    enhancedText = `(informative) ${text}`;
  } else if (text.includes('price') || text.includes('cost')) {
    enhancedText = `(professional) ${text}`;
  } else if (text.includes('sorry') || text.includes('error')) {
    enhancedText = `(apologetic) ${text}`;
  } else if (text.includes('excellent') || text.includes('great') || text.includes('perfect')) {
    enhancedText = `(enthusiastic) ${text}`;
  } else {
    enhancedText = `(warm) ${text}`;
  }
  
  return enhancedText;
}

// Smart query processing function
function processVoiceQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  // Email detection
  if (lowerQuery.includes('email') || lowerQuery.includes('send') || lowerQuery.includes('contact')) {
    const customerMatch = customers.find(c => 
      lowerQuery.includes(c.name.toLowerCase()) || 
      lowerQuery.includes(c.name.split(' ')[0].toLowerCase())
    );
    
    if (customerMatch) {
      return {
        type: 'email',
        emailData: {
          recipient: customerMatch.email,
          content: `Hi ${customerMatch.name},\n\nI hope this message finds you well. I wanted to reach out regarding our wine selection and see if you'd be interested in placing an order.\n\nWe have some excellent new arrivals that I think would be perfect for your establishment. Please let me know if you'd like to discuss our current offerings.\n\nBest regards,\nAimee\nWine Sales Assistant`
        },
        response: `I'll prepare an email for ${customerMatch.name} at ${customerMatch.email}. Please review the message below:`
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
      return {
        type: 'inventory',
        response: `We currently have ${wineMatch.stock} bottles of ${wineMatch.name} (${wineMatch.vintage}) in stock from ${wineMatch.region}.`
      };
    } else if (lowerQuery.includes('all') || lowerQuery.includes('everything')) {
      const inventoryList = wineInventory.map(wine => 
        `${wine.name} (${wine.vintage}): ${wine.stock} bottles`
      ).join(', ');
      return {
        type: 'inventory',
        response: `Here's our complete inventory: ${inventoryList}`
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
        response: `The ${wineMatch.name} (${wineMatch.vintage}) is priced at $${wineMatch.price} per bottle.`
      };
    } else if (lowerQuery.includes('all') || lowerQuery.includes('everything')) {
      const priceList = wineInventory.map(wine => 
        `${wine.name} (${wine.vintage}): $${wine.price}`
      ).join(', ');
      return {
        type: 'pricing',
        response: `Here are all our wine prices: ${priceList}`
      };
    }
  }
  
  // Customer queries
  if (lowerQuery.includes('customer') || lowerQuery.includes('bought') || lowerQuery.includes('ordered') || lowerQuery.includes('who')) {
    if (lowerQuery.includes('week') || lowerQuery.includes('recent')) {
      const recentCustomers = recentOrders.map(order => {
        const wine = wineInventory.find(w => w.id === order.wineId);
        return `${order.customerName} ordered ${order.quantity} bottles of ${wine.name} on ${order.date}`;
      }).join(', ');
      return {
        type: 'customers',
        response: `Recent customer orders: ${recentCustomers}`
      };
    }
  }
  
  // Help/capabilities
  if (lowerQuery.includes('help') || lowerQuery.includes('what can you') || lowerQuery.includes('do')) {
    return {
      type: 'help',
      response: `I can help you with: checking wine inventory and stock levels, getting pricing information, sending emails to customers, viewing recent customer orders, and managing wine sales data. Just ask me naturally, like "Do we have any Pinot Noir?" or "Email Thompson Restaurant about our new wines."`
    };
  }
  
  // Default response
  return {
    type: 'general',
    response: `I understand you're asking about "${query}". I can help with wine inventory, pricing, customer emails, and recent orders. Try asking something like "What's the price of our Chardonnay?" or "Email Thompson Restaurant."`
  };
}

// Enhanced TTS generation with V3 support
async function generateSpeech(text, queryType, apiKey, voiceId) {
  const useV3 = process.env.USE_ELEVEN_V3 === 'true';
  
  // Determine model based on use case and V3 availability
  let modelId;
  let enhancedText = text;
  
  if (useV3) {
    modelId = 'eleven_v3';
    enhancedText = enhanceTextForV3(text, queryType);
    console.log(`🎭 Using Eleven V3 with enhanced text: "${enhancedText}"`);
  } else {
    // Use Flash for real-time applications like Aimee
    modelId = 'eleven_flash_v2_5';
    console.log(`⚡ Using Flash V2.5 for real-time response`);
  }
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: enhancedText,
        model_id: modelId,
        voice_settings: {
          stability: useV3 ? 0.3 : 0.5,        // Lower stability for V3 expressiveness
          similarity_boost: useV3 ? 0.8 : 0.5,  // Higher similarity for V3
          style: useV3 ? 0.2 : undefined,       // V3-specific style setting
          use_speaker_boost: useV3 ? true : undefined
        }
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
      
      // Fallback to Flash V2.5 if V3 fails
      if (useV3 && response.status === 400) {
        console.log('🔄 Falling back to Flash V2.5...');
        return generateSpeech(text, queryType, apiKey, voiceId, false);
      }
      
      return null;
    }
  } catch (error) {
    console.error('TTS generation error:', error);
    return null;
  }
}

// Main voice query endpoint
app.post('/api/voice-query', authenticateToken, async (req, res) => {
  const { query, isIOS } = req.body;
  console.log('Voice query received:', query);

  if (!query) {
    return res.status(400).json({ error: 'Query missing' });
  }

  // Process the query using our wine business logic
  const result = processVoiceQuery(query);
  
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = process.env.VOICE_ID || 'rzsnuMd2pwYz1rGtMIVI';

  // Generate audio (skip for iOS or if no API key)
  let audioUrl = null;
  if (ELEVENLABS_API_KEY && !isIOS) {
    audioUrl = await generateSpeech(result.response, result.type, ELEVENLABS_API_KEY, VOICE_ID);
  }

  // Return the appropriate response based on query type
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
  
  console.log(`📧 Simulating email send to: ${recipient}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  res.json({ 
    success: true, 
    message: `Email successfully sent to ${recipient}` 
  });
});

// V3 Model testing endpoint
app.get('/api/test-v3', authenticateToken, async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.VOICE_ID;
  
  if (!apiKey || !voiceId) {
    return res.json({ 
      error: 'Missing API key or Voice ID',
      hasApiKey: !!apiKey,
      hasVoiceId: !!voiceId
    });
  }
  
  // Test V3 availability
  const testText = "(excited) Testing Eleven V3 with emotional tags!";
  
  try {
    const v3Response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_v3',
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      })
    });
    
    res.json({
      v3Available: v3Response.ok,
      v3Status: v3Response.status,
      v3Error: v3Response.ok ? null : await v3Response.text(),
      recommendation: v3Response.ok ? 
        'V3 is available! Set USE_ELEVEN_V3=true to enable.' : 
        'V3 not available. Using Flash V2.5 for optimal real-time performance.'
    });
    
  } catch (error) {
    res.json({
      v3Available: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const useV3 = process.env.USE_ELEVEN_V3 === 'true';
  res.json({ 
    status: 'online', 
    message: 'Aimee voice assistant API is running',
    model: useV3 ? 'Eleven V3 (alpha)' : 'Flash V2.5',
    inventory: wineInventory.length + ' wines available',
    customers: customers.length + ' customers in database'
  });
});

// Get wine inventory (optional endpoint for testing)
app.get('/api/inventory', authenticateToken, (req, res) => {
  res.json(wineInventory);
});

// Get customers (optional endpoint for testing)
app.get('/api/customers', authenticateToken, (req, res) => {
  res.json(customers);
});

app.listen(PORT, () => {
  const useV3 = process.env.USE_ELEVEN_V3 === 'true';
  console.log(`🍷 Aimee Wine Assistant API running on port ${PORT}`);
  console.log(`📊 Loaded ${wineInventory.length} wines and ${customers.length} customers`);
  console.log(`🔑 JWT Secret configured: ${JWT_SECRET ? 'Yes' : 'No'}`);
  console.log(`🎙️ ElevenLabs API: ${process.env.ELEVENLABS_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`🎭 Model: ${useV3 ? 'Eleven V3 (alpha) - Expressive' : 'Flash V2.5 - Real-time'}`);
  console.log(`💡 To test V3: Visit /api/test-v3`);
});