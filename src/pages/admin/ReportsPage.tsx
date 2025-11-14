import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart, 
  Line,
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ReportStats {
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  pendingMessages: number;
  totalBots: number;
  connectedBots: number;
  disconnectedBots: number;
  totalGroups: number;
  totalClients: number;
  messagesByDay: any[];
  messagesByType: any[];
  botsByStatus: any[];
  clientActivity: any[];
  messagesTrend: any[];
}

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState("7");
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ReportStats>({
    totalMessages: 0,
    sentMessages: 0,
    failedMessages: 0,
    pendingMessages: 0,
    totalBots: 0,
    connectedBots: 0,
    disconnectedBots: 0,
    totalGroups: 0,
    totalClients: 0,
    messagesByDay: [],
    messagesByType: [],
    botsByStatus: [],
    clientActivity: [],
    messagesTrend: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      // Fetch messages
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .gte("created_at", daysAgo.toISOString());

      // Fetch bots
      const { data: bots } = await supabase.from("bots").select("*");

      // Fetch groups
      const { count: groupsCount } = await supabase
        .from("groups")
        .select("*", { count: "exact", head: true });

      // Fetch clients
      const { count: clientsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Calculate stats
      const sentCount = messages?.filter((m) => m.status === "sent").length || 0;
      const failedCount = messages?.filter((m) => m.status === "failed").length || 0;
      const pendingCount = messages?.filter((m) => m.status === "pending").length || 0;

      // Messages by day
      const messagesByDayMap = new Map();
      messages?.forEach((msg) => {
        const date = new Date(msg.created_at).toLocaleDateString("he-IL", {
          month: "short",
          day: "numeric",
        });
        if (!messagesByDayMap.has(date)) {
          messagesByDayMap.set(date, { date, sent: 0, failed: 0, pending: 0, total: 0 });
        }
        const dayData = messagesByDayMap.get(date);
        dayData.total++;
        if (msg.status === "sent") dayData.sent++;
        else if (msg.status === "failed") dayData.failed++;
        else if (msg.status === "pending") dayData.pending++;
      });

      // Messages by type
      const typeMap = new Map();
      messages?.forEach((msg) => {
        const type = msg.message_type;
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });

      const messagesByType = Array.from(typeMap.entries()).map(([type, count]) => ({
        name: type === "text" ? "טקסט" : type === "image" ? "תמונה" : type === "video" ? "וידאו" : "מסמך",
        value: count,
      }));

      // Bots by status
      const connectedCount = bots?.filter((b) => b.status === "connected").length || 0;
      const disconnectedCount = bots?.filter((b) => b.status === "disconnected").length || 0;
      const pendingBotsCount = bots?.filter((b) => b.status === "pending").length || 0;

      const botsByStatus = [
        { name: "מחוברים", value: connectedCount, color: "hsl(var(--chart-1))" },
        { name: "מנותקים", value: disconnectedCount, color: "hsl(var(--chart-2))" },
        { name: "ממתינים", value: pendingBotsCount, color: "hsl(var(--chart-3))" },
      ];

      // Client activity (messages per client)
      const clientActivityMap = new Map();
      messages?.forEach((msg) => {
        const userId = msg.user_id;
        clientActivityMap.set(userId, (clientActivityMap.get(userId) || 0) + 1);
      });

      const clientActivity = Array.from(clientActivityMap.entries())
        .map(([userId, count]) => ({
          client: `לקוח ${userId.substring(0, 8)}`,
          messages: count,
        }))
        .sort((a, b) => b.messages - a.messages)
        .slice(0, 10);

      // Messages trend (cumulative)
      const sortedDays = Array.from(messagesByDayMap.values()).sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      let cumulative = 0;
      const messagesTrend = sortedDays.map((day) => {
        cumulative += day.total;
        return {
          date: day.date,
          cumulative,
        };
      });

      setStats({
        totalMessages: messages?.length || 0,
        sentMessages: sentCount,
        failedMessages: failedCount,
        pendingMessages: pendingCount,
        totalBots: bots?.length || 0,
        connectedBots: connectedCount,
        disconnectedBots: disconnectedCount,
        totalGroups: groupsCount || 0,
        totalClients: clientsCount || 0,
        messagesByDay: Array.from(messagesByDayMap.values()),
        messagesByType,
        botsByStatus,
        clientActivity,
        messagesTrend,
      });
    } catch (error: any) {
      toast.error("שגיאה בטעינת נתוני דוח: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text("דוח ניתוח מערכת", 105, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`תאריך: ${new Date().toLocaleDateString("he-IL")}`, 105, 25, { align: "center" });
    doc.text(`תקופה: ${dateRange} ימים אחרונים`, 105, 32, { align: "center" });

    // Summary statistics
    doc.setFontSize(14);
    doc.text("סטטיסטיקות כלליות", 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [["מדד", "ערך"]],
      body: [
        ["סה\"כ הודעות", stats.totalMessages.toString()],
        ["הודעות שנשלחו", stats.sentMessages.toString()],
        ["הודעות שנכשלו", stats.failedMessages.toString()],
        ["הודעות ממתינות", stats.pendingMessages.toString()],
        ["סה\"כ בוטים", stats.totalBots.toString()],
        ["בוטים מחוברים", stats.connectedBots.toString()],
        ["בוטים מנותקים", stats.disconnectedBots.toString()],
        ["סה\"כ קבוצות", stats.totalGroups.toString()],
        ["סה\"כ לקוחות", stats.totalClients.toString()],
      ],
    });

    // Messages by day
    doc.setFontSize(14);
    doc.text("הודעות לפי יום", 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["תאריך", "נשלחו", "נכשלו", "ממתינות", "סה\"כ"]],
      body: stats.messagesByDay.map((day) => [
        day.date,
        day.sent.toString(),
        day.failed.toString(),
        day.pending.toString(),
        day.total.toString(),
      ]),
    });

    // Client activity
    if (stats.clientActivity.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("פעילות לקוחות (10 המובילים)", 14, 15);
      
      autoTable(doc, {
        startY: 20,
        head: [["לקוח", "מספר הודעות"]],
        body: stats.clientActivity.map((client) => [
          client.client,
          client.messages.toString(),
        ]),
      });
    }

    doc.save(`report-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("הדוח הורד בהצלחה!");
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["מדד", "ערך"],
      ["סה\"כ הודעות", stats.totalMessages],
      ["הודעות שנשלחו", stats.sentMessages],
      ["הודעות שנכשלו", stats.failedMessages],
      ["הודעות ממתינות", stats.pendingMessages],
      ["סה\"כ בוטים", stats.totalBots],
      ["בוטים מחוברים", stats.connectedBots],
      ["בוטים מנותקים", stats.disconnectedBots],
      ["סה\"כ קבוצות", stats.totalGroups],
      ["סה\"כ לקוחות", stats.totalClients],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "סיכום");

    // Messages by day sheet
    const messagesByDayData = [
      ["תאריך", "נשלחו", "נכשלו", "ממתינות", "סה\"כ"],
      ...stats.messagesByDay.map((day) => [
        day.date,
        day.sent,
        day.failed,
        day.pending,
        day.total,
      ]),
    ];
    const messagesByDaySheet = XLSX.utils.aoa_to_sheet(messagesByDayData);
    XLSX.utils.book_append_sheet(wb, messagesByDaySheet, "הודעות לפי יום");

    // Client activity sheet
    if (stats.clientActivity.length > 0) {
      const clientActivityData = [
        ["לקוח", "מספר הודעות"],
        ...stats.clientActivity.map((client) => [client.client, client.messages]),
      ];
      const clientActivitySheet = XLSX.utils.aoa_to_sheet(clientActivityData);
      XLSX.utils.book_append_sheet(wb, clientActivitySheet, "פעילות לקוחות");
    }

    XLSX.writeFile(wb, `report-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("הדוח הורד בהצלחה!");
  };

  const successRate = stats.totalMessages > 0 
    ? ((stats.sentMessages / stats.totalMessages) * 100).toFixed(1)
    : "0";

  const trend = stats.messagesTrend.length > 1
    ? stats.messagesTrend[stats.messagesTrend.length - 1].cumulative > 
      stats.messagesTrend[Math.floor(stats.messagesTrend.length / 2)].cumulative
      ? "עולה"
      : "יורדת"
    : "ללא מגמה";

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">דוחות וניתוח</h1>
            <p className="text-muted-foreground mt-1">ניתוח מתקדם וגרפים מפורטים</p>
          </div>
          
          <div className="flex gap-2 items-center">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ימים אחרונים</SelectItem>
                <SelectItem value="14">14 ימים אחרונים</SelectItem>
                <SelectItem value="30">30 ימים אחרונים</SelectItem>
                <SelectItem value="60">60 ימים אחרונים</SelectItem>
                <SelectItem value="90">90 ימים אחרונים</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportToPDF} variant="outline">
              <FileText className="ml-2 h-4 w-4" />
              ייצוא PDF
            </Button>
            
            <Button onClick={exportToExcel} variant="outline">
              <FileSpreadsheet className="ml-2 h-4 w-4" />
              ייצוא Excel
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה"כ הודעות</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                {stats.sentMessages} נשלחו בהצלחה
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">אחוז הצלחה</CardTitle>
              {parseFloat(successRate) >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-xs text-muted-foreground">
                מתוך {stats.totalMessages} הודעות
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">בוטים פעילים</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.connectedBots}</div>
              <p className="text-xs text-muted-foreground">
                מתוך {stats.totalBots} בוטים
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">מגמה</CardTitle>
              {trend === "עולה" ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : trend === "יורדת" ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Calendar className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trend}</div>
              <p className="text-xs text-muted-foreground">
                ב-{dateRange} ימים אחרונים
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="messages" className="space-y-4">
          <TabsList>
            <TabsTrigger value="messages">הודעות</TabsTrigger>
            <TabsTrigger value="bots">בוטים</TabsTrigger>
            <TabsTrigger value="clients">לקוחות</TabsTrigger>
            <TabsTrigger value="trends">מגמות</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>הודעות לפי יום</CardTitle>
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
                      <BarChart data={stats.messagesByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="sent" fill="hsl(var(--chart-1))" name="נשלחו" />
                        <Bar dataKey="failed" fill="hsl(var(--chart-2))" name="נכשלו" />
                        <Bar dataKey="pending" fill="hsl(var(--chart-3))" name="ממתינות" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>התפלגות סוגי הודעות</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      value: { label: "כמות", color: "hsl(var(--chart-1))" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.messagesByType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.messagesByType.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`hsl(var(--chart-${(index % 5) + 1}))`} 
                            />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bots" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>סטטוס בוטים</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    value: { label: "כמות", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.botsByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.botsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>10 הלקוחות המובילים</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    messages: { label: "הודעות", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.clientActivity} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="client" type="category" width={100} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="messages" fill="hsl(var(--chart-1))" name="הודעות" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>מגמת הודעות מצטברת</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      cumulative: { label: "מצטבר", color: "hsl(var(--chart-1))" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.messagesTrend}>
                        <defs>
                          <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="cumulative" 
                          stroke="hsl(var(--chart-1))" 
                          fillOpacity={1} 
                          fill="url(#colorCumulative)"
                          name="הודעות מצטברות"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>קו מגמה</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      total: { label: "סה\"כ", color: "hsl(var(--chart-1))" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.messagesByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="hsl(var(--chart-1))" 
                          strokeWidth={2}
                          name='סה"כ הודעות'
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ReportsPage;
