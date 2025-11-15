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

    const { path, method, body } = await req.json();

    console.log(`Proxying ${method} -> ${EXTERNAL_API_URL}${path}`);

    // call external server
    const response = await fetch(`${EXTERNAL_API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : null;

    // Normalize bot ID (important!)
    const botId = data?.botId || data?.id || null;

    if (response.ok && botId) {
      if (method === "POST" && path === "/bot") {
        console.log("Creating bot in Supabase:", botId);

        await supabase.from("bots").upsert({
          id: botId, // <— KEY FIX HERE!!
          external_bot_id: botId,
          bot_name: data.bot_name,
          user_id: data.user_id,
          status: "pending",
          phone_number: null,
          qr_code: null,
          connected_at: null,
          last_active: null,
        });
      }

      if (method === "PUT" && path.includes("/status")) {
        console.log("Updating bot status:", botId);

        await supabase
          .from("bots")
          .update({
            status: data.status,
            last_active: data.last_active || null,
            connected_at: data.connected_at || null,
          })
          .eq("id", botId);
      }

      if (method === "DELETE" && path.startsWith("/bot/")) {
        console.log("Deleting bot:", botId);

        await supabase.from("bots").delete().eq("id", botId);
      }
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("bot-proxy error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
