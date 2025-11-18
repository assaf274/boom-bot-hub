import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const EXTERNAL_API_URL = "http://172.93.213.2:3001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🚀 START bot-proxy");
  console.log("📍 Request method:", req.method);
  
  if (req.method === "OPTIONS") {
    console.log("✅ OPTIONS request - returning CORS headers");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔐 Checking authentication...");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("❌ Authentication failed:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ User authenticated:", user.id);

    const { path, method, body } = await req.json();
    console.log("📦 REQUEST BODY:", { path, method, body });
    const isAdmin = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => data === true);

    // Handle GET /bot/:id/targets
    if (method === "GET" && path.match(/^\/bot\/[^/]+\/targets$/)) {
      const externalBotId = path.split("/")[2];
      const { data: targets } = await supabase.from("bot_target_groups").select("group_id").eq("external_bot_id", externalBotId);
      return new Response(JSON.stringify(targets?.map(t => t.group_id) || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle GET /bots
    if (method === "GET" && (path === "/bots" || path.startsWith("/bots?"))) {
      let query = supabase.from("bots").select("*");
      const urlParams = new URLSearchParams(path.split('?')[1] || '');
      const userId = urlParams.get('userId');
      
      if (userId && !isAdmin) {
        query = query.or(`user_id.eq.${userId},customer_id.eq.${userId}`);
      }
      
      const { data: botsData } = await query;
      return new Response(JSON.stringify(botsData?.map(bot => ({
        id: bot.external_bot_id,
        external_bot_id: bot.external_bot_id,
        bot_name: bot.bot_name,
        status: bot.status,
        user_id: bot.user_id,
        customer_id: bot.customer_id,
        phone_number: bot.phone_number,
        connected_at: bot.connected_at,
        last_active: bot.last_active
      })) || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle GET /bot/:id/qr - Forward to external server
    if (method === "GET" && path.match(/^\/bot\/[^/]+\/qr$/)) {
      const botServerUrl = `${EXTERNAL_API_URL}${path}`;
      console.log(`🔍 Fetching QR code from external server`);
      console.log(`📡 BOT SERVER URL: ${botServerUrl}`);
      
      try {
        console.log("⏳ CALLING BOT SERVER...");
        const response = await fetch(botServerUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        console.log(`📊 BOT RESPONSE STATUS: ${response.status}`);
        
        const responseText = await response.text();
        console.log(`📄 BOT RESPONSE TEXT: ${responseText.substring(0, 200)}...`);
        
        const data = responseText ? JSON.parse(responseText) : null;

        console.log("✅ QR request completed successfully");
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("❌ BOT-PROXY ERROR (QR):", error);
        console.error("❌ Error details:", error instanceof Error ? error.message : "Unknown error");
        console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack");
        return new Response(JSON.stringify({ 
          error: "לא ניתן להתחבר לשרת החיצוני",
          details: error instanceof Error ? error.message : "Unknown error"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle GET /bot/:id/status - Forward to external server
    if (method === "GET" && path.match(/^\/bot\/[^/]+\/status$/)) {
      const botServerUrl = `${EXTERNAL_API_URL}${path}`;
      console.log(`🔍 Fetching status from external server`);
      console.log(`📡 BOT SERVER URL: ${botServerUrl}`);
      
      try {
        console.log("⏳ CALLING BOT SERVER...");
        const response = await fetch(botServerUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        console.log(`📊 BOT RESPONSE STATUS: ${response.status}`);
        
        const responseText = await response.text();
        console.log(`📄 BOT RESPONSE TEXT: ${responseText.substring(0, 200)}...`);
        const data = responseText ? JSON.parse(responseText) : null;

        console.log("✅ Status request completed successfully");
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("❌ BOT-PROXY ERROR (Status):", error);
        console.error("❌ Error details:", error instanceof Error ? error.message : "Unknown error");
        return new Response(JSON.stringify({ 
          error: "לא ניתן להתחבר לשרת החיצוני",
          details: error instanceof Error ? error.message : "Unknown error"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle POST /bot
    if (method === "POST" && path === "/bot") {
      if (!body.customer_id) {
        return new Response(JSON.stringify({ error: "Missing customer_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body.user_id = user.id;
    }

    // Forward all other requests to external server
    const botServerUrl = `${EXTERNAL_API_URL}${path}`;
    console.log(`📡 Forwarding to external server: ${method} ${botServerUrl}`);
    console.log(`📦 Request body:`, body);
    
    const response = await fetch(botServerUrl, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`📊 External server response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`📄 External server response: ${responseText.substring(0, 200)}...`);
    const data = responseText ? JSON.parse(responseText) : null;

    // Handle Supabase side effects
    if (response.ok && data) {
      if (method === "POST" && path === "/bot") {
        await supabase.from("bots").insert({
          external_bot_id: data.external_bot_id || data.id,
          bot_name: data.bot_name || body.bot_name,
          user_id: body.user_id,
          customer_id: body.customer_id,
          status: data.status || "pending",
        });
      }
      if (method === "DELETE" && path.startsWith("/bot/")) {
        await supabase.from("bots").delete().eq("external_bot_id", path.split("/")[2]);
      }
    }

    console.log("✅ Request completed successfully");
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ BOT-PROXY GLOBAL ERROR:", error);
    console.error("❌ Error message:", error instanceof Error ? error.message : "Unknown error");
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack");
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      details: "Error in bot-proxy"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});