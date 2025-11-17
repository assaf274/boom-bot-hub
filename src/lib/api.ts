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
  phone_number?: string;
  qr_code?: string;
  created_at: string;
  updated_at: string;
  connected_at?: string;
  last_active?: string;
  connection_id?: string;
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
export const createBot = async (botName: string, userId: string): Promise<Bot> => {
  try {
    return await callBotProxy('/bot', {
      method: "POST",
      body: {
        bot_name: botName,
        user_id: userId,
        customer_id: userId, // Set customer_id to the selected user
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
 * Delete a bot
 */
export const deleteBot = async (botId: string): Promise<void> => {
  try {
    await callBotProxy(`/bot/${botId}`, { method: "DELETE" });
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
