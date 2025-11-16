/**
 * Optional: Load existing bots from Supabase on server startup
 * 
 * This is useful if you want to automatically restore all bots
 * that were previously created and stored in your Supabase database.
 * 
 * To use this, you need to install @supabase/supabase-js:
 * npm install @supabase/supabase-js
 * 
 * And add your Supabase credentials to .env:
 * SUPABASE_URL=your-supabase-url
 * SUPABASE_SERVICE_KEY=your-service-role-key
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function loadExistingBotsFromSupabase(createBotInstanceFn) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[LOAD-BOTS] Supabase credentials not found, skipping auto-load');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('[LOAD-BOTS] Fetching existing bots from Supabase...');
    
    const { data: bots, error } = await supabase
      .from('bots')
      .select('external_bot_id, bot_name, status')
      .not('external_bot_id', 'is', null);

    if (error) {
      console.error('[LOAD-BOTS] Error fetching bots:', error);
      return;
    }

    if (!bots || bots.length === 0) {
      console.log('[LOAD-BOTS] No existing bots found in Supabase');
      return;
    }

    console.log(`[LOAD-BOTS] Found ${bots.length} bots in Supabase, initializing...`);

    for (const bot of bots) {
      if (bot.external_bot_id) {
        console.log(`[LOAD-BOTS] Initializing bot: ${bot.external_bot_id}`);
        try {
          createBotInstanceFn(bot.external_bot_id);
        } catch (err) {
          console.error(`[LOAD-BOTS] Error initializing ${bot.external_bot_id}:`, err.message);
        }
      }
    }

    console.log('[LOAD-BOTS] Finished loading existing bots');
  } catch (err) {
    console.error('[LOAD-BOTS] Unexpected error:', err);
  }
}

module.exports = { loadExistingBotsFromSupabase };
