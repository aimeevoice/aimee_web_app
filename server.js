const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Aimee server is running!' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test route working!' });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Health check working'
  });
});

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

// TTS generation with V2 Multilingual (FORCED)
async function generateSpeech(text, queryType, apiKey, isIOS = false) {
  if (!apiKey || isIOS) {
    return null;
  }
  
  // HARDCODED VOICE ID - YOUR CUSTOM VOICE
  const VOICE_ID = "rzsnuMd2pwYz1rGtMIVI";
  
  // FORCE V2 MULTILINGUAL MODEL
  const modelId = 'eleven_multilingual_v2';
  const voiceSettings = {
    stability: 0.35,
    similarity_boost: 0.85,
    style: 0.3,
    speaker_boost: true
  };
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: voiceSettings
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      return `data:audio/mpeg;base64,${base64Audio}`;
    } else {
      const errorText = await response.text();
      console.error(`ElevenLabs Error: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error('TTS Error:', error);
    return null;
  }
}

// 🔍 VOICE INSPECTOR ENDPOINT
app.get('/api/voice-inspector', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return res.json({ 
      error: 'No ELEVENLABS_API_KEY configured',
      fix: 'Set ELEVENLABS_API_KEY environment variable on Railway'
    });
  }
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 
        'xi-api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return res.json({
        error: `ElevenLabs API failed: ${response.status}`,
        fix: 'Check your API key permissions'
      });
    }
    
    const voicesData = await response.json();
    const yourVoice = voicesData.voices.find(v => v.voice_id === "rzsnuMd2pwYz1rGtMIVI");
    
    res.json({
      status: yourVoice ? 'VOICE_READY' : 'VOICE_NOT_FOUND',
      yourVoice: yourVoice ? {
        name: yourVoice.name,
        id: yourVoice.voice_id,
        preview: yourVoice.preview_url
      } : null,
      model: 'eleven_multilingual_v2 (forced)'
    });
    
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Main voice query endpoint
app.post('/api/voice-query', authenticateToken, async (req, res) => {
  const { query, isIOS } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query missing' });
  }

  const result = processVoiceQuery(query);
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

  // Generate audio with YOUR VOICE
  let audioUrl = null;
  if (ELEVENLABS_API_KEY && !isIOS) {
    audioUrl = await generateSpeech(result.response, result.type, ELEVENLABS_API_KEY, isIOS);
  }

  // Return response
  res.json({
    type: result.type,
    response: result.response,
    emailData: result.emailData,
    audioUrl
  });
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

// Health check endpoint - MAKE SURE THIS EXISTS
app.get('/api/health', (req, res) => {
  const hasApiKey = !!process.env.ELEVENLABS_API_KEY;
  const hasVoiceId = !!process.env.VOICE_ID;
  
  res.json({ 
    status: 'online', 
    message: 'Aimee Wine Sales Assistant API is running',
    model: 'V2 Multilingual (Forced)',
    inventory: `${wineInventory.length} wines available`,
    customers: `${customers.length} customers in database`,
    recentOrders: `${recentOrders.length} recent orders`,
    configuration: {
      hasApiKey,
      hasVoiceId,
      model: 'eleven_multilingual_v2'
    }
  });
});

// Start the server - MAKE SURE THIS IS AT THE VERY END
app.listen(PORT, () => {
  console.log(`🍷 Aimee Wine Assistant API running on port ${PORT}`);
  console.log(`🎙️ ElevenLabs API: ${process.env.ELEVENLABS_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🎭 Voice Model: V2 Multilingual (Forced)`);
  console.log(`🎯 Voice ID: ${process.env.VOICE_ID || 'Not set'}`);
});
