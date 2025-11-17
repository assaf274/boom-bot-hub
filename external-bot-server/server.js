require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { loadExistingBotsFromSupabase } = require('./loadExistingBots');

const app = express();
const PORT = process.env.PORT || 3001;

// Store active bot instances
const bots = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

// Create a new bot instance
function createBotInstance(botId) {
  console.log(`[BOT-MANAGER] Creating bot instance: ${botId}`);
  
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: botId,
      dataPath: sessionsDir
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  const botData = {
    client,
    qrCode: null,
    status: 'pending',
    phoneNumber: null,
    lastActive: new Date(),
    connectedAt: null
  };

  // QR Code event
  client.on('qr', async (qr) => {
    console.log(`[BOT-${botId}] QR Code generated`);
    try {
      botData.qrCode = await qrcode.toDataURL(qr);
      botData.status = 'pending';
    } catch (err) {
      console.error(`[BOT-${botId}] QR generation error:`, err);
    }
  });

  // Ready event
  client.on('ready', () => {
    console.log(`[BOT-${botId}] Connected successfully`);
    botData.status = 'connected';
    botData.connectedAt = new Date();
    botData.lastActive = new Date();
    botData.qrCode = null;
    
    // Get phone number
    client.info.wid.user && (botData.phoneNumber = client.info.wid.user);
  });

  // Authenticated event
  client.on('authenticated', () => {
    console.log(`[BOT-${botId}] Authenticated`);
  });

  // Auth failure event
  client.on('auth_failure', (msg) => {
    console.error(`[BOT-${botId}] Authentication failure:`, msg);
    botData.status = 'disconnected';
    botData.qrCode = null;
  });

  // Disconnected event
  client.on('disconnected', (reason) => {
    console.log(`[BOT-${botId}] Disconnected:`, reason);
    botData.status = 'disconnected';
    botData.qrCode = null;
  });

  // Message event (for keeping last_active updated)
  client.on('message', () => {
    botData.lastActive = new Date();
  });

  // Initialize the client
  client.initialize().catch(err => {
    console.error(`[BOT-${botId}] Initialization error:`, err);
    botData.status = 'disconnected';
  });

  bots.set(botId, botData);
  return botData;
}

// API Endpoints

// GET /bots - Get all bots
app.get('/bots', (req, res) => {
  const botsList = Array.from(bots.entries()).map(([id, data]) => ({
    id,
    external_bot_id: id,
    status: data.status,
    phone_number: data.phoneNumber,
    connected_at: data.connectedAt,
    last_active: data.lastActive
  }));
  res.json(botsList);
});

// POST /bot - Create a new bot
app.post('/bot', (req, res) => {
  const { bot_name, user_id, customer_id } = req.body;
  
  if (!bot_name) {
    return res.status(400).json({ error: 'bot_name is required' });
  }

  if (!customer_id) {
    return res.status(400).json({ error: 'Missing customer_id in request' });
  }

  // Use bot_name as external_bot_id
  const botId = bot_name;

  // Check if bot already exists
  if (bots.has(botId)) {
    return res.status(400).json({ error: 'Bot already exists' });
  }

  try {
    createBotInstance(botId);
    
    res.status(201).json({
      id: botId,
      external_bot_id: botId,
      bot_name,
      user_id,
      customer_id,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[BOT-CREATE] Error:', error);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// GET /bot/:id/qr - Get QR code for a bot
app.get('/bot/:id/qr', (req, res) => {
  const botId = req.params.id;
  const bot = bots.get(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  if (bot.status === 'connected') {
    return res.json({
      id: botId,
      status: 'connected',
      message: 'Bot is already connected'
    });
  }

  if (!bot.qrCode) {
    return res.json({
      id: botId,
      status: 'pending',
      message: 'QR code is being generated, please wait...'
    });
  }

  res.json({
    id: botId,
    qr_code: bot.qrCode,
    status: bot.status
  });
});

// POST /bot/:id/qr/refresh - Refresh QR code
app.post('/bot/:id/qr/refresh', async (req, res) => {
  const botId = req.params.id;
  const bot = bots.get(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  try {
    // Logout and restart to generate new QR
    await bot.client.logout();
    bot.status = 'pending';
    bot.qrCode = null;
    
    // Re-initialize
    await bot.client.initialize();

    res.json({
      id: botId,
      status: 'pending',
      message: 'QR code refresh initiated'
    });
  } catch (error) {
    console.error('[BOT-REFRESH] Error:', error);
    res.status(500).json({ error: 'Failed to refresh QR code' });
  }
});

// GET /bot/:id/status - Get bot status
app.get('/bot/:id/status', (req, res) => {
  const botId = req.params.id;
  const bot = bots.get(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  res.json({
    id: botId,
    status: bot.status,
    phone_number: bot.phoneNumber,
    connected_at: bot.connectedAt,
    last_active: bot.lastActive
  });
});

// PUT /bot/:id/status - Update bot status (for external sync)
app.put('/bot/:id/status', (req, res) => {
  const botId = req.params.id;
  const { status } = req.body;
  const bot = bots.get(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  // This endpoint is mainly for logging/sync purposes
  console.log(`[BOT-${botId}] Status update request: ${status}`);

  res.json({
    id: botId,
    status: bot.status, // Return actual status
    message: 'Status logged'
  });
});

// PUT /bot/:id - Update bot name
app.put('/bot/:id', (req, res) => {
  const botId = req.params.id;
  const { bot_name } = req.body;
  const bot = bots.get(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  // Note: Can't change botId/session, so this is mainly for logging
  console.log(`[BOT-${botId}] Name update request: ${bot_name}`);

  res.json({
    id: botId,
    external_bot_id: botId,
    bot_name: bot_name || botId,
    status: bot.status
  });
});

// DELETE /bot/:id - Delete a bot
app.delete('/bot/:id', (req, res) => {
  const botId = req.params.id;
  console.log(`[BOT-MANAGER] Delete request for bot: ${botId}`);
  
  const botData = bots.get(botId);
  if (!botData) {
    console.log(`[BOT-MANAGER] Bot not found: ${botId}`);
    return res.status(404).json({ error: 'Bot not found' });
  }

  try {
    // Destroy the client
    if (botData.client) {
      botData.client.destroy().catch(err => {
        console.error(`[BOT-${botId}] Error destroying client:`, err);
      });
    }

    // Remove from active bots
    bots.delete(botId);
    
    // Delete session files
    const sessionPath = path.join(sessionsDir, `session-${botId}`);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(`[BOT-${botId}] Session files deleted`);
    }

    console.log(`[BOT-${botId}] Deleted successfully`);
    res.json({ success: true, message: 'Bot deleted successfully' });
  } catch (error) {
    console.error(`[BOT-${botId}] Error deleting bot:`, error);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

// POST /bot/:id/send-message - Send message to WhatsApp group
app.post('/bot/:id/send-message', async (req, res) => {
  const botId = req.params.id;
  const { message, groupId } = req.body;
  
  console.log(`[BOT-${botId}] Send message request to group: ${groupId}`);
  
  if (!message || !groupId) {
    console.error(`[BOT-${botId}] Missing message or groupId`);
    return res.status(400).json({ error: 'Missing message or groupId' });
  }

  const botData = bots.get(botId);
  if (!botData) {
    console.log(`[BOT-${botId}] Bot not found`);
    return res.status(404).json({ error: 'Bot not found' });
  }

  if (botData.status !== 'connected') {
    console.error(`[BOT-${botId}] Bot not connected, status: ${botData.status}`);
    return res.status(400).json({ error: 'Bot is not connected' });
  }

  try {
    console.log(`[BOT-${botId}] Sending message to group ${groupId}: ${message}`);
    
    // Format groupId if needed (should be in format: 972XXXXXXXXX-XXXXXXXXXX@g.us)
    let formattedGroupId = groupId;
    if (!groupId.includes('@g.us')) {
      formattedGroupId = `${groupId}@g.us`;
    }
    
    await botData.client.sendMessage(formattedGroupId, message);
    
    console.log(`[BOT-${botId}] Message sent successfully to ${formattedGroupId}`);
    res.json({ 
      success: true, 
      message: 'Message sent successfully',
      groupId: formattedGroupId 
    });
  } catch (error) {
    console.error(`[BOT-${botId}] Error sending message:`, error);
    res.status(500).json({ 
      error: 'Failed to send message', 
      details: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bots: bots.size,
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Bot server running on port ${PORT}`);
  console.log(`📁 Sessions directory: ${sessionsDir}`);
  console.log(`🤖 Ready to manage WhatsApp bots`);
  
  // Load existing bots from Supabase (if configured)
  await loadExistingBotsFromSupabase(createBotInstance);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  for (const [botId, bot] of bots.entries()) {
    try {
      console.log(`[BOT-${botId}] Logging out...`);
      await bot.client.destroy();
    } catch (err) {
      console.error(`[BOT-${botId}] Shutdown error:`, err);
    }
  }
  
  process.exit(0);
});
