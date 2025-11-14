import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const EXTERNAL_API_URL = "http://172.93.213.2:3001";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the request body which contains path, method, and body
    const { path, method, body } = await req.json();
    
    console.log(`Proxying ${method} request to: ${EXTERNAL_API_URL}${path}`);

    // Forward the request to the external API
    const response = await fetch(`${EXTERNAL_API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`External API responded with status: ${response.status}`);

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : null;
    
    // Sync bot data with Supabase when creating or updating bots
    if (response.ok && data) {
      // Handle POST /bot (create bot)
      if (method === 'POST' && path === '/bot' && data.id) {
        console.log('Syncing new bot to Supabase:', data.id);
        await supabase.from('bots').upsert({
          id: data.id,
          bot_name: data.bot_name,
          user_id: data.user_id,
          status: data.status || 'pending',
          phone_number: data.phone_number || null,
          qr_code: data.qr_code || null,
          connected_at: data.connected_at || null,
          last_active: data.last_active || null,
          connection_id: data.connection_id || null,
        });
      }
      
      // Handle PUT /bot/{id}/status (update status)
      if (method === 'PUT' && path.includes('/status') && data.id) {
        console.log('Syncing bot status to Supabase:', data.id);
        await supabase.from('bots').update({
          status: data.status,
          connected_at: data.connected_at || null,
          last_active: data.last_active || null,
        }).eq('id', data.id);
      }
      
      // Handle PUT /bot/{id} (update bot name)
      if (method === 'PUT' && !path.includes('/status') && !path.includes('/qr') && data.id) {
        console.log('Syncing bot update to Supabase:', data.id);
        await supabase.from('bots').update({
          bot_name: data.bot_name,
        }).eq('id', data.id);
      }
      
      // Handle DELETE /bot/{id}
      if (method === 'DELETE' && path.startsWith('/bot/')) {
        const botId = path.split('/')[2];
        console.log('Deleting bot from Supabase:', botId);
        await supabase.from('bots').delete().eq('id', botId);
      }
    }
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in bot-proxy function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

