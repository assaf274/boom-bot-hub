import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const EXTERNAL_API_URL = "http://172.93.213.2:3001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[BOT-PROXY] Missing Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized: Missing authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user authentication
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[BOT-PROXY] Authentication failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[BOT-PROXY] Authenticated user: ${user.id}`);

    const { path, method, body } = await req.json();

    // Validate user authorization for sensitive operations
    const isAdmin = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(
      ({ data }) => data === true
    );

    // For write operations on specific bots, verify ownership or admin role
    if ((method === "PUT" || method === "DELETE") && path.startsWith("/bot/")) {
      const botId = path.split("/")[2];
      
      // Check if user owns this bot or is admin
      const { data: bot, error: botError } = await supabase
        .from("bots")
        .select("user_id")
        .eq("external_bot_id", botId)
        .single();

      if (botError || !bot) {
        console.error("[BOT-PROXY] Bot not found:", botId);
        return new Response(JSON.stringify({ error: "Bot not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (bot.user_id !== user.id && !isAdmin) {
        console.error("[BOT-PROXY] Unauthorized access attempt by user:", user.id);
        return new Response(JSON.stringify({ error: "Forbidden: You don't have access to this bot" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Add user_id to body for POST operations if not admin
    if (method === "POST" && path === "/bot") {
      body.user_id = user.id;
    }

    console.log(`[BOT-PROXY] ${method} -> ${EXTERNAL_API_URL}${path}`, body);

    // Call external server
    const response = await fetch(`${EXTERNAL_API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    console.log(`[BOT-PROXY] Response status: ${response.status}`, responseText);
    
    const data = responseText ? JSON.parse(responseText) : null;

    // Sync with Supabase based on the operation
    if (response.ok && data) {
      // POST /bot - Create new bot
      if (method === "POST" && path === "/bot") {
        const botId = data.external_bot_id || data.botId || data.id;
        console.log("[BOT-PROXY] Creating bot in Supabase:", botId, data);

        const { error: insertError } = await supabase.from("bots").insert({
          external_bot_id: botId,
          bot_name: data.bot_name || body.bot_name,
          user_id: data.user_id || body.user_id,
          status: data.status || "pending",
          phone_number: data.phone_number || null,
          qr_code: data.qr_code || null,
          connected_at: data.connected_at || null,
          last_active: data.last_active || null,
          connection_id: data.connection_id || null,
        });

        if (insertError) {
          console.error("[BOT-PROXY] Error inserting bot:", insertError);
        } else {
          console.log("[BOT-PROXY] Bot created successfully in Supabase");
        }
      }

      // PUT /bot/{id}/status - Update bot status
      if (method === "PUT" && path.includes("/status")) {
        const botId = path.split("/")[2];
        console.log("[BOT-PROXY] Updating bot status:", botId, data);

        const { error: updateError } = await supabase
          .from("bots")
          .update({
            status: data.status,
            last_active: data.last_active || null,
            connected_at: data.connected_at || null,
          })
          .eq("external_bot_id", botId);

        if (updateError) {
          console.error("[BOT-PROXY] Error updating bot status:", updateError);
        } else {
          console.log("[BOT-PROXY] Bot status updated successfully");
        }
      }

      // PUT /bot/{id} - Update bot name
      if (method === "PUT" && !path.includes("/status") && path.startsWith("/bot/")) {
        const botId = path.split("/")[2];
        console.log("[BOT-PROXY] Updating bot name:", botId, data);

        const { error: updateError } = await supabase
          .from("bots")
          .update({
            bot_name: data.bot_name || body.bot_name,
          })
          .eq("external_bot_id", botId);

        if (updateError) {
          console.error("[BOT-PROXY] Error updating bot name:", updateError);
        } else {
          console.log("[BOT-PROXY] Bot name updated successfully");
        }
      }

      // DELETE /bot/{id} - Delete bot
      if (method === "DELETE" && path.startsWith("/bot/")) {
        const botId = path.split("/")[2];
        console.log("[BOT-PROXY] Deleting bot:", botId);

        const { error: deleteError } = await supabase
          .from("bots")
          .delete()
          .eq("external_bot_id", botId);

        if (deleteError) {
          console.error("[BOT-PROXY] Error deleting bot:", deleteError);
        } else {
          console.log("[BOT-PROXY] Bot deleted successfully from Supabase");
        }
      }

      // GET /bots - Fetch all bots from Supabase
      if (method === "GET" && (path === "/bots" || path.startsWith("/bots?"))) {
        console.log("[BOT-PROXY] Fetching bots from Supabase");
        
        let query = supabase.from("bots").select("*");
        
        // Check if filtering by userId
        const userId = path.includes("userId=") ? path.split("userId=")[1]?.split("&")[0] : null;
        if (userId) {
          query = query.eq("user_id", userId);
        }
        
        const { data: supabaseBots, error: fetchError } = await query.order("created_at", { ascending: false });
        
        if (fetchError) {
          console.error("[BOT-PROXY] Error fetching bots:", fetchError);
        } else {
          console.log("[BOT-PROXY] Fetched bots from Supabase:", supabaseBots?.length);
          // Return Supabase data instead of external API data
          return new Response(JSON.stringify(supabaseBots || []), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[BOT-PROXY] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
