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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function loadExistingBotsFromSupabase(createBotInstanceFn) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('[LOAD-BOTS] Supabase credentials not found, skipping auto-load');
    console.log(`[LOAD-BOTS] SUPABASE_URL: ${SUPABASE_URL || 'NOT SET'}`);
    console.log(`[LOAD-BOTS] SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY ? `SET (length: ${SUPABASE_SERVICE_KEY.length})` : 'NOT SET'}`);
    return;
  }

  try {
    console.log(`[LOAD-BOTS] Connecting to Supabase: ${SUPABASE_URL}`);
    console.log(`[LOAD-BOTS] Service key length: ${SUPABASE_SERVICE_KEY.length}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    console.log('[LOAD-BOTS] Fetching existing bots from Supabase...');
    
    const { data: bots, error } = await supabase
      .from('bots')
      .select('external_bot_id, bot_name, status, customer_id')
      .neq('external_bot_id', null);

    if (error) {
      console.error('[LOAD-BOTS] Error fetching bots from public.bots table:', error);
      console.error('[LOAD-BOTS] Error details:', JSON.stringify(error, null, 2));
      return;
    }

    if (!bots || bots.length === 0) {
      console.log('[LOAD-BOTS] No existing bots found in Supabase');
      return;
    }

    console.log(`[LOAD-BOTS] Found ${bots.length} bots in Supabase, initializing...`);

    for (const bot of bots) {
      if (bot.external_bot_id) {
        console.log(`[LOAD-BOTS] Initializing bot: ${bot.external_bot_id} (customer: ${bot.customer_id || 'none'})`);
        try {
          createBotInstanceFn(bot.external_bot_id, bot.customer_id);
        } catch (err) {
          console.error(`[LOAD-BOTS] Error initializing ${bot.external_bot_id}:`, err.message);
        }
      }
    }

    console.log('[LOAD-BOTS] Finished loading existing bots');
  } catch (err) {
    console.error('[LOAD-BOTS] Unexpected error:', err);
    console.error('[LOAD-BOTS] Error message:', err.message);
    console.error('[LOAD-BOTS] Error stack:', err.stack);
  }
}

module.exports = { loadExistingBotsFromSupabase };
