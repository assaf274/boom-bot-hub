require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@supabase/supabase-js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { loadExistingBotsFromSupabase } = require('./loadExistingBots');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Store active bot instances
const bots = new Map();

// Global state for master group ID
let masterGroupId = null;

// Load master group ID from Supabase
async function loadMasterGroupId() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'MASTER_GROUP_ID')
      .maybeSingle();
    
    if (error) {
      console.error('❌ Error loading master group ID:', error);
      return;
    }
    
    if (data && data.value) {
      masterGroupId = data.value;
      console.log('✅ Master Group ID loaded from Supabase:', masterGroupId);
    } else {
      console.warn('⚠️  No MASTER_GROUP_ID found in system_settings');
    }
  } catch (error) {
    console.error('❌ Failed to load master group ID:', error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

// Create a new bot instance
async function createBotInstance(botId, customerId = null) {
  console.log(`[BOT-MANAGER] Creating bot instance: ${botId}, customerId: ${customerId}`);
  
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
    connectedAt: null,
    customerId: customerId,
    customerMasterGroup: null
  };

  // Load customer's master group link
  if (customerId) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('master_group_link')
        .eq('id', customerId)
        .single();
      
      if (!error && profile && profile.master_group_link) {
        botData.customerMasterGroup = profile.master_group_link;
        console.log(`[BOT-${botId}] Customer master group loaded: ${profile.master_group_link}`);
      } else {
        console.log(`[BOT-${botId}] No master group configured for customer ${customerId}`);
      }
    } catch (err) {
      console.error(`[BOT-${botId}] Error loading customer master group:`, err);
    }
  }

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
  client.on('ready', async () => {
    console.log(`[BOT-${botId}] Connected successfully`);
    botData.status = 'connected';
    botData.connectedAt = new Date();
    botData.lastActive = new Date();
    botData.qrCode = null;
    
    // Get phone number
    client.info.wid.user && (botData.phoneNumber = client.info.wid.user);
    
    // Update status in Supabase
    try {
      const { error } = await supabase
        .from('bots')
        .update({
          status: 'connected',
          connected_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
          phone_number: botData.phoneNumber,
          qr_code: null
        })
        .eq('external_bot_id', botId);
      
      if (error) {
        console.error(`[BOT-${botId}] Error updating status in Supabase:`, error);
      } else {
        console.log(`[BOT-${botId}] Status updated in Supabase successfully`);
      }
    } catch (err) {
      console.error(`[BOT-${botId}] Exception updating status:`, err);
    }
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

  // Message event - Listen for messages from customer's MASTER_GROUP
  client.on('message', async (message) => {
    botData.lastActive = new Date();
    
    try {
      // Check if this bot has a customer master group configured
      if (!botData.customerMasterGroup) {
        return; // No master group configured, skip message processing
      }
      
      // Check if message is from this customer's MASTER_GROUP
      if (message.from === botData.customerMasterGroup) {
        console.log(`[BOT-${botId}] Received message from customer's MASTER_GROUP`);
        
        // First, find the bot in the database to get its internal ID and customer_id
        const { data: botRecord, error: botError } = await supabase
          .from('bots')
          .select('id, customer_id')
          .eq('external_bot_id', botId)
          .single();
        
        if (botError || !botRecord) {
          console.error(`[BOT-${botId}] Error finding bot in database:`, botError);
          return;
        }
        
        // Fetch customer's message delay setting
        let messageDelay = 0;
        if (botRecord.customer_id) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('message_delay_seconds')
            .eq('id', botRecord.customer_id)
            .single();
          
          if (!profileError && profile && profile.message_delay_seconds) {
            messageDelay = profile.message_delay_seconds;
            console.log(`[BOT-${botId}] Customer message delay: ${messageDelay} seconds`);
          }
        }
        
        // Now fetch distribution groups for this bot
        const { data: groups, error } = await supabase
          .from('bot_distribution_groups')
          .select('group_id, group_name')
          .eq('bot_id', botRecord.id);
        
        if (error) {
          console.error(`[BOT-${botId}] Error fetching distribution groups:`, error);
          return;
        }
        
        if (!groups || groups.length === 0) {
          console.log(`[BOT-${botId}] No distribution groups configured`);
          return;
        }
        
        // Send message to all distribution groups
        console.log(`[BOT-${botId}] Broadcasting to ${groups.length} distribution groups`);
        
        for (const group of groups) {
          try {
            let formattedGroupId = group.group_id;
            if (!group.group_id.includes('@g.us')) {
              formattedGroupId = `${group.group_id}@g.us`;
            }
            
            // Support text, images, and files
            if (message.hasMedia) {
              const media = await message.downloadMedia();
              await client.sendMessage(formattedGroupId, media, {
                caption: message.body || undefined
              });
              console.log(`[BOT-${botId}] Media sent to ${group.group_name || formattedGroupId}`);
            } else {
              await client.sendMessage(formattedGroupId, message.body);
              console.log(`[BOT-${botId}] Message sent to ${group.group_name || formattedGroupId}`);
            }
            
            // Apply delay after each message (except the last one)
            if (messageDelay > 0 && group !== groups[groups.length - 1]) {
              console.log(`[BOT-${botId}] Waiting ${messageDelay} seconds before next message...`);
              await new Promise(resolve => setTimeout(resolve, messageDelay * 1000));
            }
          } catch (err) {
            console.error(`[BOT-${botId}] Error sending to ${group.group_name || group.group_id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error(`[BOT-${botId}] Error in message handler:`, err);
    }
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
    createBotInstance(botId, customer_id);
    
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

// GET /bot/:id/groups - Get WhatsApp groups from bot
app.get('/bot/:id/groups', async (req, res) => {
  const botId = req.params.id;
  const bot = bots.get(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  if (bot.status !== 'connected') {
    return res.status(400).json({ error: 'Bot is not connected' });
  }

  try {
    console.log(`[BOT-${botId}] Fetching WhatsApp groups...`);
    const chats = await bot.client.getChats();
    const groups = chats
      .filter(chat => chat.isGroup)
      .map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        participantsCount: chat.participants ? chat.participants.length : 0
      }));
    
    console.log(`[BOT-${botId}] Found ${groups.length} groups`);
    res.json({ groups });
  } catch (error) {
    console.error(`[BOT-${botId}] Error fetching groups:`, error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// GET /system/reload-settings - Reload system settings from Supabase
app.get('/system/reload-settings', async (req, res) => {
  try {
    await loadMasterGroupId();
    res.json({ 
      success: true, 
      message: 'System settings reloaded',
      masterGroupId: masterGroupId 
    });
  } catch (error) {
    console.error('Error reloading system settings:', error);
    res.status(500).json({ error: 'Failed to reload system settings' });
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
  
  // Load master group ID from Supabase
  await loadMasterGroupId();
  
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
