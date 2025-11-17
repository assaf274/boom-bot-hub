import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Bot, FolderKanban, MessageSquare, Activity, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeBots: 0,
    totalGroups: 0,
    todayMessages: 0,
    successfulMessages: 0,
    failedMessages: 0,
    pendingMessages: 0,
  });
  const [messagesByDay, setMessagesByDay] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch clients count
      const { count: clientsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch active bots
      const { count: botsCount } = await supabase
        .from("bots")
        .select("*", { count: "exact", head: true })
        .eq("status", "connected");

      // Fetch total groups
      const { count: groupsCount } = await supabase
        .from("groups")
        .select("*", { count: "exact", head: true });

      // Fetch today's messages
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Fetch message status counts
      const { count: successCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent");

      const { count: failedCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed");

      const { count: pendingCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch messages by day for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: messagesData } = await supabase
        .from("messages")
        .select("created_at, status")
        .gte("created_at", sevenDaysAgo.toISOString());

      // Group messages by day
      const messagesByDayMap = new Map();
      messagesData?.forEach((msg) => {
        const date = new Date(msg.created_at).toLocaleDateString("he-IL", {
          month: "short",
          day: "numeric",
        });
        if (!messagesByDayMap.has(date)) {
          messagesByDayMap.set(date, { date, sent: 0, failed: 0, pending: 0 });
        }
        const dayData = messagesByDayMap.get(date);
        if (msg.status === "sent") dayData.sent++;
        else if (msg.status === "failed") dayData.failed++;
        else if (msg.status === "pending") dayData.pending++;
      });

      setMessagesByDay(Array.from(messagesByDayMap.values()));

      setStats({
        totalClients: clientsCount || 0,
        activeBots: botsCount || 0,
        totalGroups: groupsCount || 0,
        todayMessages: todayCount || 0,
        successfulMessages: successCount || 0,
        failedMessages: failedCount || 0,
        pendingMessages: pendingCount || 0,
      });
    } catch (error: any) {
      toast.error("שגיאה בטעינת נתונים: " + error.message);
    }
  };

  const addDemoData = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Add demo bots
      const { data: bots, error: botsError } = await supabase
        .from("bots")
        .insert([
          {
            bot_name: "בוט דמו 1",
            user_id: userData.user.id,
            status: "connected",
            phone_number: "+972501234567",
          },
          {
            bot_name: "בוט דמו 2",
            user_id: userData.user.id,
            status: "connected",
            phone_number: "+972507654321",
          },
          {
            bot_name: "בוט דמו 3",
            user_id: userData.user.id,
            status: "pending",
          },
        ])
        .select();

      if (botsError) throw botsError;

      // Add demo groups
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .insert([
          {
            group_name: "קבוצת דמו 1",
            user_id: userData.user.id,
            whatsapp_id: "120363123456789@g.us",
            participants_count: 50,
            max_participants: 256,
            group_order: 1,
          },
          {
            group_name: "קבוצת דמו 2",
            user_id: userData.user.id,
            whatsapp_id: "120363987654321@g.us",
            participants_count: 120,
            max_participants: 256,
            group_order: 2,
          },
          {
            group_name: "קבוצת דמו 3",
            user_id: userData.user.id,
            participants_count: 30,
            max_participants: 100,
            group_order: 3,
          },
        ])
        .select();

      if (groupsError) throw groupsError;

      // Add demo messages
      if (bots && bots.length > 0 && groups && groups.length > 0) {
        const { error: messagesError } = await supabase.from("messages").insert([
          {
            bot_id: String(bots[0].id),
            group_id: groups[0].id,
            user_id: userData.user.id,
            content: "שלום! זו הודעת דמו ראשונה",
            message_type: "text",
            status: "sent",
            sent_at: new Date().toISOString(),
          },
          {
            bot_id: String(bots[0].id),
            group_id: groups[1].id,
            user_id: userData.user.id,
            content: "הודעת דמו שנייה",
            message_type: "text",
            status: "sent",
            sent_at: new Date().toISOString(),
          },
          {
            bot_id: String(bots[1].id),
            group_id: groups[0].id,
            user_id: userData.user.id,
            content: "הודעה ממתינה לשליחה",
            message_type: "text",
            status: "pending",
            scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          },
          {
            bot_id: String(bots[1].id),
            group_id: groups[2].id,
            user_id: userData.user.id,
            content: "הודעה שנכשלה",
            message_type: "text",
            status: "failed",
          },
        ]);

        if (messagesError) throw messagesError;
      }

      toast.success("נתוני דמו נוספו בהצלחה!");
      fetchStats(); // Refresh stats after adding demo data
    } catch (error: any) {
      toast.error("שגיאה בהוספת נתוני דמו: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const statsCards = [
    {
      title: "לקוחות פעילים",
      value: stats.totalClients.toString(),
      icon: Users,
      description: "סה\"כ לקוחות במערכת",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "בוטים פעילים",
      value: stats.activeBots.toString(),
      icon: Bot,
      description: "בוטים מחוברים כעת",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "קבוצות במערכת",
      value: stats.totalGroups.toString(),
      icon: FolderKanban,
      description: "סה\"כ קבוצות מנוהלות",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "הודעות היום",
      value: stats.todayMessages.toString(),
      icon: MessageSquare,
      description: "הודעות שנשלחו היום",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  const statusData = [
    { name: "נשלחו", value: stats.successfulMessages, color: "hsl(var(--chart-1))" },
    { name: "נכשלו", value: stats.failedMessages, color: "hsl(var(--chart-2))" },
    { name: "ממתינות", value: stats.pendingMessages, color: "hsl(var(--chart-3))" },
  ];

  return (
    <AppLayout>
      <div className="p-8 space-y-8" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">דשבורד מנהל</h1>
            <p className="text-muted-foreground text-lg">
              סקירה כללית של המערכת
            </p>
          </div>
          <Button onClick={addDemoData} disabled={isLoading}>
            <Database className="ml-2 h-4 w-4" />
            {isLoading ? "מוסיף..." : "הוסף נתוני דמו"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat) => (
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
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
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
              <CardTitle>הודעות לפי יום (7 ימים אחרונים)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  sent: { label: "נשלחו", color: "hsl(var(--chart-1))" },
                  failed: { label: "נכשלו", color: "hsl(var(--chart-2))" },
                  pending: { label: "ממתינות", color: "hsl(var(--chart-3))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={messagesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="sent" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="failed" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="pending" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>סטטוס הודעות</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  sent: { label: "נשלחו", color: "hsl(var(--chart-1))" },
                  failed: { label: "נכשלו", color: "hsl(var(--chart-2))" },
                  pending: { label: "ממתינות", color: "hsl(var(--chart-3))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">הודעות שנשלחו</span>
                  <span className="text-sm font-bold">{stats.successfulMessages}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">הודעות שנכשלו</span>
                  <span className="text-sm font-bold">{stats.failedMessages}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">הודעות ממתינות</span>
                  <span className="text-sm font-bold">{stats.pendingMessages}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
