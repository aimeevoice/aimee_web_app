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
  { id: 1, name: 'Pinot Noir', vintage: 2021, region: 'Oregon', price: 45.99, stock: 12, description: 'Light-bodied red with cherry notes' },
  { id: 2, name: 'Chardonnay', vintage: 2022, region: 'California', price: 38.50, stock: 8, description: 'Crisp white with oak aging' },
  { id: 3, name: 'Cabernet Sauvignon', vintage: 2020, region: 'Napa Valley', price: 62.75, stock: 15, description: 'Full-bodied red with dark fruit flavors' },
  { id: 4, name: 'Sauvignon Blanc', vintage: 2023, region: 'New Zealand', price: 32.25, stock: 20, description: 'Fresh and zesty with citrus notes' },
  { id: 5, name: 'Syrah', vintage: 2021, region: 'Australia', price: 41.00, stock: 6, description: 'Bold red with spicy finish' }
];

// Customer Database
const customers = [
  { id: 1, name: 'Thompson Restaurant', email: 'sarah@thompsonrestaurant.com', contact: 'Sarah Thompson', phone: '555-0123' },
  { id: 2, name: 'Johnson Winery', email: 'mike@johnsonwinery.com', contact: 'Mike Johnson', phone: '555-0456' },
  { id: 3, name: 'Bella Vista Bistro', email: 'orders@bellavistabistro.com', contact: 'Maria Rodriguez', phone: '555-0789' },
  { id: 4, name: 'Ocean View Restaurant', email: 'chef@oceanviewrestaurant.com', contact: 'David Chen', phone: '555-0321' },
  { id: 5, name: 'Mountain Lodge', email: 'beverages@mountainlodge.com', contact: 'Lisa Park', phone: '555-0654' }
];

// Recent Orders
const recentOrders = [
  { customerName: 'Thompson Restaurant', wineName: 'Pinot Noir', quantity: 6, date: '2024-06-10', total: 275.94 },
  { customerName: 'Bella Vista Bistro', wineName: 'Chardonnay', quantity: 4, date: '2024-06-08', total: 154.00 },
  { customerName: 'Johnson Winery', wineName: 'Cabernet Sauvignon', quantity: 8, date: '2024-06-06', total: 502.00 },
  { customerName: 'Ocean View Restaurant', wineName: 'Sauvignon Blanc', quantity: 12, date: '2024-06-05', total: 387.00 }
];

// Authentication middleware
function authenticateToken(req, res, next) {
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
}

// Format price for natural speech
function formatPriceForSpeech(price) {
  const dollars = Math.floor(price);
  const cents = Math.round((price - dollars) * 100);
  
  if (cents === 0) {
    return `$${dollars}`;
  } else if (cents < 10) {
    return `$${dollars} 0${cents}`;
  } else {
    return `$${dollars} ${cents}`;
  }
}

// ElevenLabs Speech Generation
async function generateSpeech(text, queryType = 'general') {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = process.env.VOICE_ID || 'rzsnuMd2pwYz1rGtMIVI';
  
  if (!ELEVENLABS_API_KEY) {
    console.log('ElevenLabs API key not configured');
    return null;
  }

  try {
    const modelId = 'eleven_multilingual_v2'; // Forced to V2 Multilingual
    const voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.5
    };

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: voiceSettings
      })
    });

    if (!response.ok) {
      console.error('ElevenLabs API error:', response.status, response.statusText);
      return null;
    }

    const audioBuffer = await response.buffer();
    const base64Audio = audioBuffer.toString('base64');
    return `data:audio/mpeg;base64,${base64Audio}`;

  } catch (error) {
    console.error('Error generating speech:', error);
    return null;
  }
}

// Generate email content based on customer and context
function generateEmailContent(customerName, query) {
  const lowerQuery = query.toLowerCase();
  
  let subject = 'Wine Availability Update';
  let content = `Dear ${customerName} team,\n\nI hope this message finds you well. `;
  
  if (lowerQuery.includes('new') || lowerQuery.includes('arrival')) {
    subject = 'Exciting New Wine Arrivals';
    content += `We're excited to share our latest wine arrivals that would be perfect for your establishment.\n\n`;
    content += `• 2023 Sauvignon Blanc - Fresh and crisp with citrus notes\n`;
    content += `• 2021 Pinot Noir - Light-bodied with elegant cherry flavors\n`;
    content += `• 2020 Cabernet Sauvignon - Full-bodied with rich dark fruit\n\n`;
  } else if (lowerQuery.includes('order') || lowerQuery.includes('delivery')) {
    subject = 'Order and Delivery Information';
    content += `I wanted to follow up regarding your recent wine order and confirm delivery details.\n\n`;
    content += `We have your preferred selections in stock and ready for delivery. `;
  } else if (lowerQuery.includes('special') || lowerQuery.includes('deal')) {
    subject = 'Special Wine Pricing';
    content += `I'm pleased to offer you exclusive pricing on selected wines for this month.\n\n`;
    content += `Take advantage of our restaurant partner discounts on premium selections. `;
  } else {
    content += `I wanted to reach out about our current wine selection and availability for your restaurant.\n\n`;
    content += `We have excellent inventory levels across our range, including some exceptional vintages that would complement your menu perfectly. `;
  }
  
  content += `\n\nPlease let me know if you'd like to discuss quantities, pricing, or schedule a tasting.\n\n`;
  content += `Best regards,\nAimee\nWine Sales Assistant\nPremium Wine Distributors`;
  
  return content;
}

// Process voice queries and return appropriate responses
function processVoiceQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  // Greeting responses
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi ') || lowerQuery === 'hi' || lowerQuery.includes('hey')) {
    return {
      type: 'greeting',
      response: "Hello! I'm Aimee, your wine sales assistant. I can help you check inventory, get pricing information, manage customer data, or send emails to restaurants."
    };
  }
  
  // Help and capabilities
  if (lowerQuery.includes('help') || lowerQuery.includes('what can you') || lowerQuery.includes('capabilities')) {
    return {
      type: 'help',
      response: "I can help you with wine inventory checks, pricing information, customer orders, and sending emails to restaurants. Try asking about specific wines, customer information, or say 'email Thompson Restaurant' to send a message."
    };
  }

  // Add this case for email confirmations
  if (lowerQuery.includes('confirm email') || lowerQuery.includes('email ready')) {
    return {
      type: 'general',
      response: `I've prepared your email. Please review the message and say 'send email' to send it, or 'cancel' to cancel.`
    };
  }

  // Add demo email success response
  if (lowerQuery.includes('email sent successfully demo') || (lowerQuery.includes('email sent') && lowerQuery.includes('demo'))) {
    return {
      type: 'general',
      response: 'Email sent successfully! This was a demonstration of the email feature.'
    };
  }

  // Email detection and processing - Check for specific customers FIRST
  if (lowerQuery.includes('email') || lowerQuery.includes('send') || lowerQuery.includes('contact')) {
    // Check for specific restaurant/customer FIRST
    let recipient = '';
    let customerName = '';
    
    if (lowerQuery.includes('thompson')) {
      recipient = 'sarah@thompsonrestaurant.com';
      customerName = 'Thompson Restaurant';
    } else if (lowerQuery.includes('johnson')) {
      recipient = 'mike@johnsonwinery.com';
      customerName = 'Johnson Winery';
    } else if (lowerQuery.includes('bella vista')) {
      recipient = 'orders@bellavistabistro.com';
      customerName = 'Bella Vista Bistro';
    }
    
    // If we found a specific customer, process the email
    if (recipient && customerName) {
      return {
        type: 'email',
        response: `I'll prepare an email for ${customerName}. Please review the message below:`,
        emailData: {
          recipient: recipient,
          customerName: customerName,
          content: generateEmailContent(customerName, lowerQuery)
        }
      };
    } else {
      // Only show help if no specific customer was mentioned
      return {
        type: 'email_help',
        response: 'I can help you send emails to our customers. Try saying "Email Thompson Restaurant" or "Send email to Johnson Winery about new arrivals."'
      };
    }
  }

  // Inventory queries
  if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('have')) {
    if (lowerQuery.includes('all') || lowerQuery.includes('everything') || lowerQuery.includes('complete')) {
      const inventoryList = wineInventory.map(wine => 
        `${wine.name} (${wine.vintage}): ${wine.stock} bottles available`
      ).join(', ');
      return {
        type: 'inventory',
        response: `Here's our complete inventory: ${inventoryList}. Total wines available: ${wineInventory.length} varieties.`
      };
    }
    
    // Check for specific wine mentions
    const wineNames = ['pinot noir', 'chardonnay', 'cabernet sauvignon', 'sauvignon blanc', 'syrah'];
    for (const wineName of wineNames) {
      if (lowerQuery.includes(wineName)) {
        const wine = wineInventory.find(w => w.name.toLowerCase().includes(wineName));
        if (wine) {
          return {
            type: 'inventory',
            response: `We have ${wine.stock} bottles of ${wine.name} (${wine.vintage}) from ${wine.region} in stock.`
          };
        }
      }
    }
    
    return {
      type: 'inventory', 
      response: `We currently have ${wineInventory.length} different wines in stock. Our inventory includes Pinot Noir, Chardonnay, Cabernet Sauvignon, Sauvignon Blanc, and Syrah. What specific wine are you interested in?`
    };
  }

  // Pricing queries
  if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('how much')) {
    if (lowerQuery.includes('all') || lowerQuery.includes('everything') || lowerQuery.includes('complete')) {
      const priceList = wineInventory.map(wine => 
        `${wine.name}: ${formatPriceForSpeech(wine.price)} per bottle`
      ).join(', ');
      return {
        type: 'pricing',
        response: `Here are all our wine prices: ${priceList}.`
      };
    }
    
    // Check for specific wine pricing
    const wineNames = ['pinot noir', 'chardonnay', 'cabernet sauvignon', 'sauvignon blanc', 'syrah'];
    for (const wineName of wineNames) {
      if (lowerQuery.includes(wineName)) {
        const wine = wineInventory.find(w => w.name.toLowerCase().includes(wineName));
        if (wine) {
          return {
            type: 'pricing',
            response: `The ${wine.name} is priced at ${formatPriceForSpeech(wine.price)} per bottle.`
          };
        }
      }
    }
    
    return {
      type: 'pricing',
      response: `I can provide pricing for any of our wines. We have Pinot Noir, Chardonnay, Cabernet Sauvignon, Sauvignon Blanc, and Syrah. Which wine's price would you like to know?`
    };
  }

  // Customer and order queries  
  if (lowerQuery.includes('customer') || lowerQuery.includes('order') || lowerQuery.includes('bought') || lowerQuery.includes('purchase')) {
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
        type: 'orders',
        response: `Recent wine purchases this week: ${recentCustomers}.`
      };
    }
    
    return {
      type: 'customers',
      response: `We have ${customers.length} active restaurant customers including Thompson Restaurant, Johnson Winery, Bella Vista Bistro, Ocean View Restaurant, and Mountain Lodge. Would you like recent order information?`
    };
  }

  // Default response for unrecognized queries
  return {
    type: 'general',
    response: "I can help you with wine inventory, pricing, customer information, and sending emails. Try asking about specific wines, customer orders, or say 'help' for more options."
  };
}

// Simple test routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Aimee server is running!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Simple test route working!' });
});

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

// Voice Inspector
app.get('/api/voice-inspector', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.VOICE_ID;
  
  console.log('🔍 Voice Inspector called');
  
  if (!apiKey) {
    return res.json({ 
      error: 'No ELEVENLABS_API_KEY configured',
      fix: 'Set ELEVENLABS_API_KEY environment variable on Railway'
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
        error: `ElevenLabs API failed: ${voicesResponse.status}`,
        fix: 'Check your ELEVENLABS_API_KEY'
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
      quickFix: backupVoices[0] ? `Set VOICE_ID=${backupVoices[0].voice_id} for immediate fix` : null
    });
    
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'wine123') {
    const token = jwt.sign(
      { username: 'admin', role: 'wine_manager' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token,
      user: { username: 'admin', role: 'wine_manager' },
      message: 'Login successful'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Protected voice query endpoint
app.post('/api/voice-query', authenticateToken, async (req, res) => {
  try {
    const { query, isIOS } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🎙️ Processing voice query: "${query}"`);
    
    const queryResult = processVoiceQuery(query);
    let audioUrl = null;

    // Generate speech using ElevenLabs (skip on iOS for compatibility)
    if (process.env.ELEVENLABS_API_KEY && !isIOS) {
      audioUrl = await generateSpeech(queryResult.response, queryResult.type);
    }

    const response = {
      query: query,
      response: queryResult.response,
      type: queryResult.type,
      audioUrl: audioUrl
    };

    // Include email data if it's an email query
    if (queryResult.emailData) {
      response.emailData = queryResult.emailData;
    }

    res.json(response);

  } catch (error) {
    console.error('Error processing voice query:', error);
    res.status(500).json({ 
      error: 'Failed to process voice query',
      details: error.message 
    });
  }
});

// Email sending endpoint (DEMO - simulates email sending)
app.post('/api/send-email', authenticateToken, async (req, res) => {
  try {
    const { to, content } = req.body;
    
    if (!to || !content) {
      return res.status(400).json({ error: 'Recipient and content are required' });
    }

    console.log(`📧 DEMO: Simulating email send to: ${to}`);
    console.log(`📄 DEMO: Content preview: ${content.substring(0, 100)}...`);
    
    // Simulate email sending delay (no actual email sent)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully (demo)',
      recipient: to,
      timestamp: new Date().toISOString(),
      demo: true  // Indicates this is a simulation
    });

  } catch (error) {
    console.error('Error in email demo:', error);
    res.status(500).json({ 
      error: 'Failed to send email (demo)',
      details: error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🍷 Aimee Wine Assistant API running on port ${PORT}`);
  console.log(`🎙️ ElevenLabs API: ${process.env.ELEVENLABS_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🎭 Voice Model: V2 Multilingual (Forced)`);
  console.log(`🎯 Voice ID: ${process.env.VOICE_ID || 'Not set'}`);
  console.log(`🔍 Voice Inspector: /api/voice-inspector`);
});
