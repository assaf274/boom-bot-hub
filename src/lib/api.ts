import { supabase } from "@/integrations/supabase/client";

// Helper function to call the bot-proxy edge function
const callBotProxy = async (path: string, options: { method: string; body?: any } = { method: "GET" }) => {
  const { data, error } = await supabase.functions.invoke('bot-proxy', {
    body: {
      path,
      method: options.method,
      body: options.body,
    },
  });

  if (error) {
    console.error("Bot proxy error:", error);
    throw new Error(error.message);
  }

  return data;
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
  try {
    if (!externalBotId) {
      throw new Error("מזהה בוט חיצוני חסר");
    }
    return await callBotProxy(`/bot/${externalBotId}/qr`, { method: "GET" });
  } catch (error) {
    console.error("Error fetching bot QR:", error);
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
