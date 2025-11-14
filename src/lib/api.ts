const API_URL = import.meta.env.VITE_API_URL;

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
    const response = await fetch(`${API_URL}/bots?userId=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bots: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${API_URL}/bots`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bots: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${API_URL}/bot/${botId}/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bot status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching bot status:", error);
    throw error;
  }
};

/**
 * Get bot QR code
 */
export const getBotQR = async (botId: string): Promise<BotQR> => {
  try {
    const response = await fetch(`${API_URL}/bot/${botId}/qr`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bot QR: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${API_URL}/bot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bot_name: botName,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create bot: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${API_URL}/bot/${botId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update bot status: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${API_URL}/bot/${botId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bot_name: botName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update bot name: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${API_URL}/bot/${botId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete bot: ${response.statusText}`);
    }
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
    const response = await fetch(`${API_URL}/bot/${botId}/qr/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh bot QR: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error refreshing bot QR:", error);
    throw error;
  }
};
