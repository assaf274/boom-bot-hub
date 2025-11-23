import { supabase } from "@/integrations/supabase/client";

// Helper function to call the bot-proxy edge function
const callBotProxy = async (path: string, options: { method: string; body?: any } = { method: "GET" }) => {
  const log = (window as any).appLog || console.log;
  
  log("🔵 callBotProxy START: " + JSON.stringify({ path, method: options.method }));
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  log("🔵 VITE_SUPABASE_URL: " + supabaseUrl);
  
  if (!supabaseUrl) {
    log("❌ VITE_SUPABASE_URL is not defined!");
    throw new Error("Supabase URL is not configured");
  }
  
  log("🔵 Getting session...");
  const { data: { session } } = await supabase.auth.getSession();
  log("🔵 Session: " + (session ? "✅ Found" : "❌ Not found"));
  
  if (!session) {
    log("❌ User not authenticated");
    throw new Error("Not authenticated");
  }

  const fullUrl = `${supabaseUrl}/functions/v1/bot-proxy`;
  log(`🚀 Calling bot-proxy POST: ${fullUrl}`);
  log(`🚀 Path: ${path}, Method: ${options.method}`);

  log("🔵 About to send fetch request...");
  
  try {
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        path,
        method: options.method,
        body: options.body,
      }),
    });

    log(`📊 bot-proxy response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      log("❌ Bot proxy error response: " + errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText };
      }
      throw new Error(error.error || "Bot proxy request failed");
    }

    const data = await response.json();
    log(`✅ bot-proxy response data: ${JSON.stringify(data)}`);
    return data;
  } catch (fetchError) {
    log("❌ Fetch error: " + (fetchError instanceof Error ? fetchError.message : String(fetchError)));
    if (fetchError instanceof Error) {
      log("❌ Error stack: " + fetchError.stack);
    }
    throw fetchError;
  }
};

export interface Bot {
  id: string;
  bot_name: string;
  status: "connected" | "disconnected" | "pending";
  user_id: string;
  customer_id?: string;
  phone_number?: string;
  qr_code?: string;
  created_at: string;
  updated_at: string;
  connected_at?: string;
  last_active?: string;
  connection_id?: string;
  external_bot_id?: string;
}

export interface BotStatus {
  id: string;
  status: "connected" | "disconnected" | "pending";
  last_active?: string;
  connected_at?: string;
}

export interface BotQR {
  id: string;
  qr_code: string;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
}

export interface SendToGroupsRequest {
  groupIds: string[];
  message: string;
  mediaUrl?: string;
}

export interface SendToGroupsResponse {
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  errors?: Array<{ groupId: string; error: string }>;
}

/**
 * Get all bots for a specific user
 */
export const getBots = async (userId: string): Promise<Bot[]> => {
  try {
    return await callBotProxy(`/bots?userId=${userId}`, { method: "GET" });
  } catch (error) {
    console.error("Error fetching bots:", error);
    throw error;
  }
};

/**
 * Get all bots (for admin)
 */
export const getAllBots = async (): Promise<Bot[]> => {
  try {
    return await callBotProxy('/bots', { method: "GET" });
  } catch (error) {
    console.error("Error fetching all bots:", error);
    throw error;
  }
};

/**
 * Get bot status
 */
export const getBotStatus = async (botId: string): Promise<BotStatus> => {
  try {
    return await callBotProxy(`/bot/${botId}/status`, { method: "GET" });
  } catch (error) {
    console.error("Error fetching bot status:", error);
    throw error;
  }
};

/**
 * Get bot QR code using external bot ID
 */
export const getBotQR = async (externalBotId: string): Promise<BotQR> => {
  const log = (window as any).appLog || console.log;
  log("🟢 getBotQR called with externalBotId: " + externalBotId);
  try {
    if (!externalBotId) {
      log("❌ No external bot ID provided");
      throw new Error("מזהה בוט חיצוני חסר");
    }
    log("🟢 Calling callBotProxy for QR...");
    const result = await callBotProxy(`/bot/${externalBotId}/qr`, { method: "GET" });
    log("🟢 getBotQR result: " + JSON.stringify(result));
    return result;
  } catch (error) {
    log("❌ Error fetching bot QR: " + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
};

/**
 * Create a new bot
 */
export const createBot = async (botName: string, customerId: string): Promise<Bot> => {
  try {
    return await callBotProxy('/bot', {
      method: "POST",
      body: {
        bot_name: botName,
        customer_id: customerId, // The customer who owns the bot
      },
    });
  } catch (error) {
    console.error("Error creating bot:", error);
    throw error;
  }
};

/**
 * Update bot status
 */
export const updateBotStatus = async (
  botId: string,
  status: "connected" | "disconnected" | "pending"
): Promise<Bot> => {
  try {
    return await callBotProxy(`/bot/${botId}/status`, {
      method: "PUT",
      body: { status },
    });
  } catch (error) {
    console.error("Error updating bot status:", error);
    throw error;
  }
};

/**
 * Update bot name
 */
export const updateBotName = async (botId: string, botName: string): Promise<Bot> => {
  try {
    return await callBotProxy(`/bot/${botId}`, {
      method: "PUT",
      body: { bot_name: botName },
    });
  } catch (error) {
    console.error("Error updating bot name:", error);
    throw error;
  }
};

/**
 * Delete a bot using external_bot_id
 */
export const deleteBot = async (externalBotId: string): Promise<void> => {
  try {
    await callBotProxy(`/bot/${externalBotId}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error deleting bot:", error);
    throw error;
  }
};

/**
 * Refresh bot QR code
 */
export const refreshBotQR = async (botId: string): Promise<BotQR> => {
  try {
    return await callBotProxy(`/bot/${botId}/qr/refresh`, { method: "POST" });
  } catch (error) {
    console.error("Error refreshing bot QR:", error);
    throw error;
  }
};

/**
 * Get distribution groups for a bot
 */
export const getBotDistributionGroups = async (botId: number): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('bot_distribution_groups')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching bot distribution groups:", error);
    throw error;
  }
};

/**
 * Add a distribution group to a bot
 */
export const addBotDistributionGroup = async (
  botId: number,
  groupId: string,
  groupName?: string
): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('bot_distribution_groups')
      .insert({ bot_id: botId, group_id: groupId, group_name: groupName })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding bot distribution group:", error);
    throw error;
  }
};

/**
 * Delete a distribution group
 */
export const deleteBotDistributionGroup = async (groupId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('bot_distribution_groups')
      .delete()
      .eq('id', groupId);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting bot distribution group:", error);
    throw error;
  }
};

/**
 * Get a system setting by key
 */
export const getSystemSetting = async (key: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching system setting:", error);
    throw error;
  }
};

/**
 * Update a system setting
 */
export const updateSystemSetting = async (key: string, value: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating system setting:", error);
    throw error;
  }
};

/**
 * Reload system settings in external bot server
 */
export const reloadExternalServerSettings = async (): Promise<void> => {
  try {
    await callBotProxy('/system/reload-settings', { method: "GET" });
  } catch (error) {
    console.error("Error reloading external server settings:", error);
    throw error;
  }
};

/**
 * Update customer master group link
 */
export const updateCustomerMasterGroup = async (customerId: string, masterGroupLink: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ master_group_link: masterGroupLink })
    .eq('id', customerId);
  
  if (error) throw error;
  return data;
};

/**
 * Update customer message delay
 */
export const updateCustomerMessageDelay = async (customerId: string, delaySeconds: number) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ message_delay_seconds: delaySeconds })
    .eq('id', customerId);

  if (error) throw error;
  return data;
};

/**
 * Get WhatsApp groups from a connected bot
 */
export const getBotGroups = async (externalBotId: string): Promise<WhatsAppGroup[]> => {
  try {
    if (!externalBotId) {
      throw new Error("External bot ID is required");
    }
    const response = await callBotProxy(`/bot/${externalBotId}/groups`, { method: "GET" });
    return response.groups || [];
  } catch (error) {
    console.error("Error fetching bot groups:", error);
    throw error;
  }
};

/**
 * Send message to selected WhatsApp groups
 */
export const sendToGroups = async (
  externalBotId: string,
  request: SendToGroupsRequest
): Promise<SendToGroupsResponse> => {
  try {
    if (!externalBotId) {
      throw new Error("External bot ID is required");
    }
    return await callBotProxy(`/bot/${externalBotId}/send-to-groups`, {
      method: "POST",
      body: request,
    });
  } catch (error) {
    console.error("Error sending to groups:", error);
    throw error;
  }
};
