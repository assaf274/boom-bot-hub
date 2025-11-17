import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Plus, Trash2, QrCode, AlertCircle, RefreshCw, Send } from "lucide-react";
import * as api from "@/lib/api";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ClientBotsManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<any | null>(null);
  const [newBotName, setNewBotName] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [currentBotExternalId, setCurrentBotExternalId] = useState<string | null>(null);
  const [currentBotStatus, setCurrentBotStatus] = useState<string | null>(null);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [selectedBotForMessage, setSelectedBotForMessage] = useState<any | null>(null);
  const [isSendMessageDialogOpen, setIsSendMessageDialogOpen] = useState(false);

  // Fetch user profile to get max_bots and target_group_id
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("max_bots, target_group_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's bots from Supabase
  const {
    data: bots = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["client-bots", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log("No user ID found");
        return [];
      }
      console.log("Fetching bots for user from Supabase:", user.id);
      try {
        const { data, error } = await supabase
          .from("bots")
          .select("*")
          .or(`user_id.eq.${user.id},customer_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        console.log("Bots fetched successfully from Supabase:", data);
        console.log("🔍 Checking external_bot_id for each bot:");
        data?.forEach(bot => {
          console.log(`  Bot: ${bot.bot_name}, external_bot_id: ${bot.external_bot_id}, status: ${bot.status}`);
        });
        return data || [];
      } catch (err) {
        console.error("Error fetching bots:", err);
        throw err;
      }
    },
    enabled: !!user?.id,
  });

  // Setup realtime subscription for bot updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("client-bots-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bots",
          filter: `or(user_id.eq.${user.id},customer_id.eq.${user.id})`,
        },
        (payload) => {
          console.log("Bot change received:", payload);
          queryClient.invalidateQueries({ queryKey: ["client-bots", user.id] });
          
          // Update current bot status if it's the one being viewed
          if (payload.new && typeof payload.new === 'object' && 'external_bot_id' in payload.new) {
            if (payload.new.external_bot_id === currentBotExternalId && 'status' in payload.new) {
              setCurrentBotStatus(payload.new.status as string);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, currentBotExternalId]);

  // Auto-refresh QR code every 30 seconds when dialog is open and bot is pending
  useEffect(() => {
    if (!isQrDialogOpen || !currentBotExternalId || currentBotStatus !== "pending") {
      return;
    }

    const refreshQr = async () => {
      try {
        setIsRefreshingQr(true);
        const qrData = await api.getBotQR(currentBotExternalId);
        setQrCodeUrl(qrData.qr_code);
        console.log("QR code refreshed automatically");
      } catch (error) {
        console.error("Failed to refresh QR:", error);
      } finally {
        setIsRefreshingQr(false);
      }
    };

    const interval = setInterval(refreshQr, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isQrDialogOpen, currentBotExternalId, currentBotStatus]);

  // Show error message if query failed
  if (error) {
    console.error("Query error:", error);
  }

  const addBotMutation = useMutation({
    mutationFn: async (botName: string) => {
      if (!user?.id) throw new Error("אין משתמש מחובר");
      try {
        return await api.createBot(botName, user.id);
      } catch (error) {
        console.error("API Error:", error);
        throw new Error(`לא ניתן להתחבר לשרת. אנא ודא שהשרת ב-${import.meta.env.VITE_API_URL} פועל.`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-bots"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] }); // Refresh count
      toast({
        title: "בוט נוסף בהצלחה",
        description: "הבוט שלך נוסף למערכת",
      });
      setIsAddDialogOpen(false);
      setNewBotName("");
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בהוספת בוט",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBotMutation = useMutation({
    mutationFn: async (bot: any) => {
      // Use external_bot_id for deletion
      const botIdToDelete = bot.external_bot_id || bot.bot_name;
      await api.deleteBot(botIdToDelete);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-bots"] });
      toast({
        title: "בוט נמחק",
        description: "הבוט נמחק בהצלחה מהמערכת",
      });
      setBotToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה במחיקת בוט",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddBot = () => {
    if (!newBotName.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין שם לבוט",
        variant: "destructive",
      });
      return;
    }

    const maxBots = profile?.max_bots || 5;
    if (bots.length >= maxBots) {
      toast({
        title: "הגעת למגבלה",
        description: `ניתן להוסיף עד ${maxBots} בוטים. צור קשר עם התמיכה להגדלת המכסה.`,
        variant: "destructive",
      });
      return;
    }

    addBotMutation.mutate(newBotName);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500">מחובר</Badge>;
      case "disconnected":
        return <Badge variant="destructive">מנותק</Badge>;
      case "pending":
        return <Badge variant="secondary">ממתין לחיבור</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const maxBots = profile?.max_bots || 5;
  const canAddBot = bots.length < maxBots;

  // Show error state if query failed
  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">שגיאה בטעינת הבוטים</p>
                  <p className="text-sm">{error instanceof Error ? error.message : "אירעה שגיאה לא ידועה"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">הבוטים שלי</h1>
            <p className="text-muted-foreground mt-2">
              נהל את הבוטים שלך ({bots.length}/{maxBots})
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} disabled={!canAddBot} className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף בוט חדש
          </Button>
        </div>

        {!canAddBot && (
          <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <p className="text-sm">הגעת למכסה המקסימלית של בוטים. צור קשר עם התמיכה להגדלת המכסה.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">טוען בוטים...</p>
          </div>
        ) : bots.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">אין בוטים עדיין</p>
              <p className="text-muted-foreground mb-4">התחל על ידי הוספת הבוט הראשון שלך</p>
              <Button onClick={() => setIsAddDialogOpen(true)} disabled={!canAddBot}>
                <Plus className="h-4 w-4 ml-2" />
                הוסף בוט
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <Card key={bot.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{bot.bot_name}</CardTitle>
                    {getStatusBadge(bot.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">מספר טלפון:</span>
                      <span className="font-medium">{bot.phone_number || "לא מוגדר"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">מחובר מאז:</span>
                      <span className="font-medium">
                        {bot.connected_at ? new Date(bot.connected_at).toLocaleDateString("he-IL") : "לא מחובר"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">פעיל לאחרונה:</span>
                      <span className="font-medium">
                        {bot.last_active ? new Date(bot.last_active).toLocaleDateString("he-IL") : "אף פעם"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!bot.external_bot_id) {
                          toast({
                            title: "שגיאה",
                            description: "מזהה בוט חיצוני חסר. אנא צור קשר עם התמיכה.",
                            variant: "destructive",
                          });
                          return;
                        }
                        try {
                          const qrData = await api.getBotQR(bot.external_bot_id);
                          setQrCodeUrl(qrData.qr_code);
                          setCurrentBotExternalId(bot.external_bot_id);
                          setCurrentBotStatus(bot.status);
                          setIsQrDialogOpen(true);
                        } catch (error) {
                          toast({
                            title: "שגיאה בטעינת QR",
                            description: "לא ניתן לטעון את קוד ה-QR",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!bot.external_bot_id}
                    >
                      <QrCode className="h-4 w-4" />
                      הצג QR
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!bot.external_bot_id) {
                          toast({
                            title: "שגיאה",
                            description: "מזהה בוט חיצוני חסר",
                            variant: "destructive",
                          });
                          return;
                        }

                        try {
                          const statusData = await api.getBotStatus(bot.external_bot_id);
                          toast({
                            title: "סטטוס בוט",
                            description: `הבוט כרגע ${statusData.status === "connected" ? "מחובר" : "לא מחובר"}`,
                          });
                          queryClient.invalidateQueries({ queryKey: ["client-bots"] });
                        } catch (error) {
                          toast({
                            title: "שגיאה בבדיקת סטטוס",
                            description: "לא ניתן לבדוק את סטטוס הבוט",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      בדוק סטטוס
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setBotToDelete(bot)}>
                      <Trash2 className="h-4 w-4 ml-2" />
                      מחק
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Bot Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוסף בוט חדש</DialogTitle>
              <DialogDescription>הזן את פרטי הבוט החדש שברצונך להוסיף</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bot-name">שם הבוט *</Label>
                <Input
                  id="bot-name"
                  placeholder="שם הבוט"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleAddBot} disabled={addBotMutation.isPending}>
                {addBotMutation.isPending ? "מוסיף..." : "הוסף בוט"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!botToDelete} onOpenChange={() => setBotToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
              <AlertDialogDescription>פעולה זו תמחק את הבוט לצמיתות. לא ניתן לבטל פעולה זו.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => botToDelete && deleteBotMutation.mutate(botToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* QR Code Dialog */}
        <Dialog open={isQrDialogOpen} onOpenChange={(open) => {
          setIsQrDialogOpen(open);
          if (!open) {
            setCurrentBotExternalId(null);
            setCurrentBotStatus(null);
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>קוד QR להתחברות</DialogTitle>
              <DialogDescription>
                סרוק את הקוד הזה עם WhatsApp כדי לחבר את הבוט
                {currentBotStatus === "pending" && (
                  <span className="block mt-2 text-sm text-muted-foreground">
                    {isRefreshingQr ? "מרענן QR..." : "מתרענן אוטומטית כל 30 שניות"}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center p-6 relative">
              {qrCodeUrl ? (
                <>
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                  {isRefreshingQr && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-muted rounded">
                  <p className="text-muted-foreground">אין קוד QR זמין</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default ClientBotsManagement;
