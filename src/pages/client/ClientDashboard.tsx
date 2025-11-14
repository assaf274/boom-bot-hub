import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, FolderKanban, MessageSquare, Calendar, CheckCircle, XCircle } from "lucide-react";

const ClientDashboard = () => {
  const stats = [
    {
      title: "הבוטים שלי",
      value: "5",
      icon: Bot,
      description: "בוטים פעילים",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "קבוצות",
      value: "45",
      icon: FolderKanban,
      description: "קבוצות פעילות",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "הודעות היום",
      value: "1,234",
      icon: MessageSquare,
      description: "הודעות שנשלחו",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "תזמונים",
      value: "8",
      icon: Calendar,
      description: "תזמונים ממתינים",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
  ];

  const bots = [
    { name: "בוט 1", status: "מחובר", lastActive: "לפני 2 דקות" },
    { name: "בוט 2", status: "מחובר", lastActive: "לפני 5 דקות" },
    { name: "בוט 3", status: "מחובר", lastActive: "לפני 8 דקות" },
    { name: "בוט 4", status: "מנותק", lastActive: "לפני 2 שעות" },
    { name: "בוט 5", status: "מחובר", lastActive: "לפני דקה" },
  ];

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
                <Bot className="h-5 w-5 text-primary" />
                סטטוס בוטים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bots.map((bot) => (
                  <div
                    key={bot.name}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {bot.status === "מחובר" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{bot.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {bot.lastActive}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        bot.status === "מחובר"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {bot.status}
                    </span>
                  </div>
                ))}
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
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">פרסומת מבצע</span>
                    <span className="text-sm text-blue-600 font-medium">15:00</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    יישלח ל-45 קבוצות
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">עדכון שבועי</span>
                    <span className="text-sm text-blue-600 font-medium">18:30</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    יישלח ל-45 קבוצות
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">תזכורת לקוחות</span>
                    <span className="text-sm text-blue-600 font-medium">20:00</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    יישלח ל-30 קבוצות
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default ClientDashboard;
