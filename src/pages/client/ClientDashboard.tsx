import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, FolderKanban, MessageSquare, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

const ClientDashboard = () => {
  const { user } = useAuth();
  const [todayMessages, setTodayMessages] = useState(0);

  // Fetch user's bots
  const { data: bots = [], isLoading: botsLoading } = useQuery({
    queryKey: ["user-bots", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["user-groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch today's messages
  useEffect(() => {
    if (!user?.id) return;

    const fetchTodayMessages = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("messages")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());

      if (!error && data) {
        setTodayMessages(data.length);
      }
    };

    fetchTodayMessages();
  }, [user?.id]);

  // Fetch scheduled messages
  const { data: scheduledMessages = [] } = useQuery({
    queryKey: ["scheduled-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*, groups(group_name)")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .not("scheduled_at", "is", null)
        .order("scheduled_at", { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const connectedBots = bots.filter(bot => bot.status === "connected").length;

  const stats = [
    {
      title: "הבוטים שלי",
      value: connectedBots.toString(),
      icon: Bot,
      description: `${bots.length} סה"כ בוטים`,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "קבוצות",
      value: groups.length.toString(),
      icon: FolderKanban,
      description: "קבוצות פעילות",
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "הודעות היום",
      value: todayMessages.toString(),
      icon: MessageSquare,
      description: "הודעות שנשלחו",
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "תזמונים",
      value: scheduledMessages.length.toString(),
      icon: Calendar,
      description: "תזמונים קרובים",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
  ];

  const getRelativeTime = (date: string | null) => {
    if (!date) return "אף פעם";
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "כרגע";
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    const diffDays = Math.floor(diffHours / 24);
    return `לפני ${diffDays} ימים`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "מחובר";
      case "disconnected":
        return "מנותק";
      case "error":
        return "שגיאה";
      default:
        return "ממתין";
    }
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-8" dir="rtl">
        <div>
          <h1 className="text-4xl font-bold mb-2">הדשבורד שלי</h1>
          <p className="text-muted-foreground text-lg">
            סקירה כללית של הפעילות שלך
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">
                  {botsLoading || groupsLoading ? "..." : stat.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                סטטוס בוטים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {botsLoading ? (
                  <p className="text-center text-muted-foreground py-4">טוען...</p>
                ) : bots.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">אין בוטים עדיין</p>
                ) : (
                  bots.map((bot) => (
                    <div
                      key={bot.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {bot.status === "connected" ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <div>
                          <p className="font-medium">{bot.bot_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getRelativeTime(bot.last_active)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          bot.status === "connected"
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {getStatusText(bot.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                תזמונים קרובים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">אין תזמונים קרובים</p>
                ) : (
                  scheduledMessages.map((message: any) => (
                    <div key={message.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium line-clamp-1">
                          {message.content.substring(0, 30)}...
                        </span>
                        <span className="text-sm text-blue-600 font-medium">
                          {message.scheduled_at
                            ? new Date(message.scheduled_at).toLocaleTimeString("he-IL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {message.groups?.group_name || "ללא קבוצה"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default ClientDashboard;
