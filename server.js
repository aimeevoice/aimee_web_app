const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;

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

// Helper function to format prices naturally for speech
function formatPriceForSpeech(price) {
  const priceStr = price.toString();
  const [dollars, cents] = priceStr.split('.');
  
  if (!cents || cents === '00') {
    return `${dollars}`;
  } else if (cents.length === 1) {
    return `${dollars} ${cents}0`; // e.g., 12.5 becomes "$12 50"
  } else {
    return `${dollars} ${cents}`; // e.g., 12.99 becomes "$12 99"
  }
}

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

  // FIXED: Email confirmation with proper response type
  if (lowerQuery.includes('confirm email') || lowerQuery.includes('email ready')) {
    return {
      type: 'general',
      response: `I've prepared your email. Please review the message and say 'send email' to send it, or 'cancel' to cancel.`
    };
  }
  
  // Email detection and processing
  if (lowerQuery.includes('email') || lowerQuery.includes('send') || lowerQuery.includes('contact')) {
    const customerMatch = customers.find(c => 
      lowerQuery.includes(c.name.toLowerCase()) || 
      lowerQuery.includes(c.name.split(' ')[0].toLowerCase()) ||
      lowerQuery.includes(c.contact.toLowerCase().split(' ')[0])
    );
    
    if (customerMatch) {
      let emailContent = `Hi ${customerMatch.contact},\n\nI hope this message finds you well. I wanted to reach out regarding our wine selection and see if you'd be interested in discussing your upcoming needs.\n\nWe have some excellent options that I think would be perfect for ${customerMatch.name}. Please let me know if you'd like to review our current offerings.\n\nBest regards,\nAimee\nWine Sales Assistant`;
      
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
          response: `I'm sorry, we're currently out of stock on ${wineMatch.name} (${wineMatch.vintage}). Would you like me to check for similar wines?`
        };
      } else if (wineMatch.stock <= 5) {
        return {
          type: 'inventory',
          response: `We have ${wineMatch.stock} bottles of ${wineMatch.name} (${wineMatch.vintage}) remaining from ${wineMatch.region}. This is running low.`
        };
      } else {
        return {
          type: 'inventory',
          response: `We currently have ${wineMatch.stock} bottles of ${wineMatch.name} (${wineMatch.vintage}) in stock from ${wineMatch.region}.`
        };
      }
    } else if (lowerQuery.includes('all') || lowerQuery.includes('everything')) {
      const inventoryList = wineInventory.map(wine => 
        `${wine.name} (${wine.vintage}): ${wine.stock} bottles`
      ).join(', ');
      return {
        type: 'inventory',
        response: `Here's our complete inventory: ${inventoryList}.`
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
      const formattedPrice = formatPriceForSpeech(wineMatch.price);
      return {
        type: 'pricing',
        response: `The ${wineMatch.name} (${wineMatch.vintage}) from ${wineMatch.region} is priced at ${formattedPrice} per bottle.`
      };
    } else if (lowerQuery.includes('all') || lowerQuery.includes('everything')) {
      const priceList = wineInventory.map(wine => {
        const formattedPrice = formatPriceForSpeech(wine.price);
        return `${wine.name} (${wine.vintage}): ${formattedPrice}`;
      }).join(', ');
      return {
        type: 'pricing',
        response: `Here's our complete price list: ${priceList}.`
      };
    }
  }
  
  // FIXED: Customer queries with natural date formatting
  if (lowerQuery.includes('customer') || lowerQuery.includes('bought') || lowerQuery.includes('ordered') || lowerQuery.includes('who')) {
    if (lowerQuery.includes('week') || lowerQuery.includes('recent')) {
      const recentCustomers = recentOrders.map(order => {
        // Convert date to natural format
        const date = new Date(order.date);
        const naturalDate = date.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric' 
        });
        return `${order.customerName} ordered ${order.quantity} bottles of ${order.wineName} on ${naturalDate}`;
      }).join('. ');
      
      return {
        type: 'customers',
        response: `Recent customer orders: ${recentCustomers}.`
      };
    }
  }
  
  // Help
  if (lowerQuery.includes('help') || lowerQuery.includes('what can you')) {
    return {
      type: 'help',
      response: `I'm Aimee, your wine sales assistant! I can help you with checking wine inventory, getting pricing information, sending emails to customers, and viewing recent orders. Just speak naturally!`
    };
  }
  
  // Default response
  return {
    type: 'general',
    response: `I understand you're asking about "${query}". I can help with wine inventory, pricing, customer emails, and recent orders. Try asking: "What's our Chardonnay price?" or "Do we have Pinot Noir?"`
  };
}

// TTS generation with V2 Multilingual
async function generateSpeech(text, queryType, apiKey, voiceId, isIOS = false) {
  if (!apiKey || isIOS) {
    return null;
  }
  
  const cleanVoiceId = (voiceId || '').trim();
  
  if (!cleanVoiceId) {
    console.log('❌ No voice ID provided');
    return null;
  }
  
  const modelId = 'eleven_multilingual_v2';
  const voiceSettings = {
    stability: 0.5,
    similarity_boost: 0.5
  };
  
  console.log(`🎙️ Using V2 Multilingual with voice ID: ${cleanVoiceId}`);
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cleanVoiceId}`, {
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
      console.log(`✅ TTS generation successful`);
      return `data:audio/mpeg;base64,${base64Audio}`;
    } else {
      const errorText = await response.text();
      console.log(`❌ TTS generation failed: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error('TTS generation error:', error.message);
    return null;
  }
}

// Voice Inspector endpoint
app.get('/api/voice-inspector', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.VOICE_ID;
  
  if (!apiKey) {
    return res.json({ 
      error: 'No ELEVENLABS_API_KEY configured'
    });
  }
  
  try {
    const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 
        'xi-api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!voicesResponse.ok) {
      return res.json({
        error: `ElevenLabs API failed: ${voicesResponse.status}`
      });
    }
    
    const voicesData = await voicesResponse.json();
    const currentVoiceExists = voicesData.voices.find(v => v.voice_id === voiceId);
    
    const customVoices = voicesData.voices.filter(v => 
      v.category === 'cloned' || v.category === 'generated'
    );
    
    const aimeeVoices = voicesData.voices.filter(v => 
      v.name.toLowerCase().includes('aimee') || 
      v.name.toLowerCase().includes('amy')
    );
    
    const backupVoices = voicesData.voices.filter(v => 
      v.category === 'premade' && (
        v.name.toLowerCase().includes('rachel') ||
        v.name.toLowerCase().includes('bella')
      )
    );
    
    res.json({
      status: currentVoiceExists ? 'VOICE_FOUND' : 'VOICE_NOT_FOUND',
      current: {
        voiceId: voiceId,
        found: !!currentVoiceExists,
        name: currentVoiceExists?.name || 'NOT FOUND'
      },
      yourCustomVoices: customVoices.map(v => ({ name: v.name, id: v.voice_id })),
      aimeeVoices: aimeeVoices.map(v => ({ name: v.name, id: v.voice_id })),
      backupVoices: backupVoices.map(v => ({ name: v.name, id: v.voice_id })),
      quickFix: backupVoices[0] ? `Set VOICE_ID=${backupVoices[0].voice_id}` : null
    });
    
  } catch (error) {
    res.json({ error: error.message });
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
    message: `Email successfully sent to ${recipient}`
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasApiKey = !!process.env.ELEVENLABS_API_KEY;
  const hasVoiceId = !!process.env.VOICE_ID;
  
  res.json({ 
    status: 'online', 
    message: 'Aimee Wine Sales Assistant API is running',
    model: 'V2 Multilingual',
    inventory: `${wineInventory.length} wines available`,
    customers: `${customers.length} customers in database`,
    configuration: {
      hasApiKey,
      hasVoiceId
    }
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
  console.log(`🍷 Aimee Wine Assistant API running on port ${PORT}`);
  console.log(`🎙️ ElevenLabs API: ${process.env.ELEVENLABS_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🎯 Voice ID: ${process.env.VOICE_ID || 'Not set'}`);
  console.log(`🔍 Voice Inspector: /api/voice-inspector`);
});
