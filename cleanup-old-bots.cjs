#!/usr/bin/env node

/**
 * Cleanup script to remove old bots without external_bot_id from Supabase
 * Run this script to clean up bots from the old system
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupOldBots() {
  console.log('🔍 Checking for old bots...');

  try {
    // Get all bots
    const { data: allBots, error: fetchError } = await supabase
      .from('bots')
      .select('id, bot_name, external_bot_id, created_at');

    if (fetchError) {
      console.error('❌ Error fetching bots:', fetchError);
      return;
    }

    console.log(`📊 Total bots in database: ${allBots?.length || 0}`);

    // Find bots without external_bot_id
    const oldBots = allBots?.filter(bot => !bot.external_bot_id) || [];

    if (oldBots.length === 0) {
      console.log('✅ No old bots found. Database is clean!');
      return;
    }

    console.log(`🗑️  Found ${oldBots.length} old bot(s) to delete:`);
    oldBots.forEach(bot => {
      console.log(`   - ${bot.bot_name} (ID: ${bot.id})`);
    });

    // Delete old bots
    const { error: deleteError } = await supabase
      .from('bots')
      .delete()
      .is('external_bot_id', null);

    if (deleteError) {
      console.error('❌ Error deleting old bots:', deleteError);
      return;
    }

    console.log('✅ Successfully deleted all old bots!');
    console.log(`🎉 Cleaned up ${oldBots.length} bot(s)`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run cleanup
cleanupOldBots();
