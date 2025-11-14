import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Bot, FolderKanban, MessageSquare, Activity, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);

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
            bot_id: bots[0].id,
            group_id: groups[0].id,
            user_id: userData.user.id,
            content: "שלום! זו הודעת דמו ראשונה",
            message_type: "text",
            status: "sent",
            sent_at: new Date().toISOString(),
          },
          {
            bot_id: bots[0].id,
            group_id: groups[1].id,
            user_id: userData.user.id,
            content: "הודעת דמו שנייה",
            message_type: "text",
            status: "sent",
            sent_at: new Date().toISOString(),
          },
          {
            bot_id: bots[1].id,
            group_id: groups[0].id,
            user_id: userData.user.id,
            content: "הודעה ממתינה לשליחה",
            message_type: "text",
            status: "pending",
            scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          },
          {
            bot_id: bots[1].id,
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
    } catch (error: any) {
      toast.error("שגיאה בהוספת נתוני דמו: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const stats = [
    {
      title: "לקוחות פעילים",
      value: "24",
      icon: Users,
      description: "סה\"כ לקוחות במערכת",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "בוטים פעילים",
      value: "156",
      icon: Bot,
      description: "בוטים מחוברים כעת",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "קבוצות במערכת",
      value: "892",
      icon: FolderKanban,
      description: "סה\"כ קבוצות מנוהלות",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "הודעות היום",
      value: "12,453",
      icon: MessageSquare,
      description: "הודעות שנשלחו היום",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
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
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                פעילות אחרונה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">בוט חדש התחבר</p>
                    <p className="text-sm text-muted-foreground">לקוח: ישראל כהן</p>
                  </div>
                  <span className="text-xs text-muted-foreground">לפני 5 דקות</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">פרסומת נשלחה</p>
                    <p className="text-sm text-muted-foreground">150 קבוצות</p>
                  </div>
                  <span className="text-xs text-muted-foreground">לפני 12 דקות</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">לקוח חדש נוסף</p>
                    <p className="text-sm text-muted-foreground">דוד לוי</p>
                  </div>
                  <span className="text-xs text-muted-foreground">לפני 25 דקות</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>סטטוס מערכת</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">שרת ראשי</span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-green-600">פעיל</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">מסד נתונים</span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-green-600">פעיל</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">שירות בוטים</span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-green-600">פעיל</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">שירות תזמונים</span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-green-600">פעיל</span>
                  </span>
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
