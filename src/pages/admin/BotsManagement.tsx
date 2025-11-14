import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, RefreshCw, Trash2, CheckCircle, XCircle, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Tables } from "@/integrations/supabase/types";

type Bot = Tables<"bots">;

const BotsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [newBotName, setNewBotName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Fetch all bots
  const { data: bots, isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bots")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all profiles for the add bot dialog
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Add bot mutation
  const addBotMutation = useMutation({
    mutationFn: async ({ botName, userId }: { botName: string; userId: string }) => {
      const { data, error } = await supabase
        .from("bots")
        .insert({
          bot_name: botName,
          user_id: userId,
          status: "pending",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast({
        title: "הבוט נוסף בהצלחה",
        description: "הבוט החדש נוצר והוא ממתין לחיבור",
      });
      setIsAddDialogOpen(false);
      setNewBotName("");
      setSelectedUserId("");
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בהוספת בוט",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update bot status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ botId, status }: { botId: string; status: "connected" | "disconnected" | "pending" }) => {
      const { error } = await supabase
        .from("bots")
        .update({ status })
        .eq("id", botId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast({
        title: "הסטטוס עודכן",
        description: "סטטוס הבוט עודכן בהצלחה",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: string) => {
      const { error } = await supabase
        .from("bots")
        .delete()
        .eq("id", botId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast({
        title: "הבוט נמחק",
        description: "הבוט הוסר מהמערכת בהצלחה",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה במחיקת בוט",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refresh QR code mutation
  const refreshQrMutation = useMutation({
    mutationFn: async (botId: string) => {
      // Simulate QR code generation - in real implementation, this would call WhatsApp API
      const mockQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=whatsapp-bot-${botId}`;
      
      const { error } = await supabase
        .from("bots")
        .update({ qr_code: mockQrCode })
        .eq("id", botId);
      
      if (error) throw error;
      return mockQrCode;
    },
    onSuccess: (qrCode) => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      setQrCodeUrl(qrCode);
      toast({
        title: "QR Code נוצר",
        description: "סרוק את הקוד כדי לחבר את הבוט",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה ביצירת QR Code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle className="h-3 w-3 ml-1" />
            מחובר
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 ml-1" />
            מנותק
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 ml-1" />
            ממתין
          </Badge>
        );
    }
  };

  const handleAddBot = () => {
    if (!newBotName.trim() || !selectedUserId) {
      toast({
        title: "שדות חסרים",
        description: "יש למלא את שם הבוט ולבחור לקוח",
        variant: "destructive",
      });
      return;
    }
    addBotMutation.mutate({ botName: newBotName, userId: selectedUserId });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center" dir="rtl">
          <p className="text-muted-foreground">טוען בוטים...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-8" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">ניהול בוטים</h1>
            <p className="text-muted-foreground text-lg">
              נהל את כל הבוטים במערכת
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                הוסף בוט חדש
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>הוספת בוט חדש</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="botName">שם הבוט</Label>
                  <Input
                    id="botName"
                    placeholder="לדוגמה: בוט תמיכה"
                    value={newBotName}
                    onChange={(e) => setNewBotName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userId">בחר לקוח</Label>
                  <select
                    id="userId"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <option value="">בחר לקוח</option>
                    {profiles?.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name} ({profile.email})
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleAddBot} className="w-full" disabled={addBotMutation.isPending}>
                  {addBotMutation.isPending ? "מוסיף..." : "הוסף בוט"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {bots && bots.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">אין בוטים במערכת. הוסף בוט חדש כדי להתחיל.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots?.map((bot: any) => (
              <Card key={bot.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{bot.bot_name}</span>
                    {getStatusBadge(bot.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>לקוח: {bot.profiles?.full_name || "לא ידוע"}</p>
                    <p>מספר טלפון: {bot.phone_number || "לא מחובר"}</p>
                    <p>
                      התחבר לאחרונה:{" "}
                      {bot.last_active
                        ? new Date(bot.last_active).toLocaleString("he-IL")
                        : "אף פעם"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => refreshQrMutation.mutate(bot.id)}
                        >
                          <QrCode className="h-4 w-4 ml-1" />
                          הצג QR
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl">
                        <DialogHeader>
                          <DialogTitle>QR Code - {bot.bot_name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                          {qrCodeUrl || bot.qr_code ? (
                            <>
                              <img
                                src={qrCodeUrl || bot.qr_code}
                                alt="QR Code"
                                className="w-64 h-64"
                              />
                              <p className="text-sm text-muted-foreground text-center">
                                סרוק את הקוד עם WhatsApp כדי לחבר את הבוט
                              </p>
                            </>
                          ) : (
                            <p className="text-muted-foreground">טוען QR Code...</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          botId: bot.id,
                          status: bot.status === "connected" ? "disconnected" : "connected",
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`האם אתה בטוח שברצונך למחוק את ${bot.bot_name}?`)) {
                          deleteBotMutation.mutate(bot.id);
                        }
                      }}
                      disabled={deleteBotMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BotsManagement;
