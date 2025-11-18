import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, RefreshCw, Trash2, CheckCircle, XCircle, Plus, Edit, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import * as api from "@/lib/api";
import { BotDistributionGroups } from "@/components/BotDistributionGroups";

type Bot = api.Bot;

const BotsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBot, setSelectedBot] = useState<any | null>(null);
  const [editBotName, setEditBotName] = useState("");

  // Fetch all bots from external API
  const { data: bots, isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const botsData = await api.getAllBots();
      
      // Fetch profiles data from Supabase for display (both creators and customers)
      const userIds = [...new Set(botsData.flatMap(bot => [bot.user_id, bot.customer_id].filter(Boolean)))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      // Merge bot data with profile data
      return botsData.map(bot => ({
        ...bot,
        profiles: profiles?.find(p => p.id === (bot.customer_id || bot.user_id)),
        creator_profile: profiles?.find(p => p.id === bot.user_id)
      }));
    },
  });

  // Filter bots by clientId if provided - check both user_id and customer_id
  const filteredBots = clientId 
    ? bots?.filter(bot => bot.user_id === clientId || bot.customer_id === clientId)
    : bots;

  // Get client name if filtering - check both user_id and customer_id
  const filteredClient = clientId 
    ? bots?.find(bot => bot.user_id === clientId || bot.customer_id === clientId)?.profiles
    : null;

  // Setup realtime subscription for bot status updates
  useEffect(() => {
    const channel = supabase
      .channel('bots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bots'
        },
        (payload) => {
          console.log('Bot change received:', payload);
          queryClient.invalidateQueries({ queryKey: ["bots"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  // Add bot mutation using external API
  const addBotMutation = useMutation({
    mutationFn: async ({ botName, userId }: { botName: string; userId: string }) => {
      return await api.createBot(botName, userId);
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

  // Update bot status mutation using external API
  const updateStatusMutation = useMutation({
    mutationFn: async ({ botId, status }: { botId: string; status: "connected" | "disconnected" | "pending" }) => {
      return await api.updateBotStatus(botId, status);
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

  // Edit bot mutation using external API
  const editBotMutation = useMutation({
    mutationFn: async ({ botId, botName }: { botId: string; botName: string }) => {
      return await api.updateBotName(botId, botName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast({
        title: "הבוט עודכן",
        description: "שם הבוט עודכן בהצלחה",
      });
      setIsEditDialogOpen(false);
      setSelectedBot(null);
      setEditBotName("");
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בעדכון בוט",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete bot mutation using external API
  const deleteBotMutation = useMutation({
    mutationFn: async (bot: any) => {
      // If bot has external_bot_id, delete via external API
      if (bot.external_bot_id) {
        await api.deleteBot(bot.external_bot_id);
      } else {
        // Old bot without external_bot_id - delete directly from Supabase
        const { error } = await supabase
          .from('bots')
          .delete()
          .eq('id', bot.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast({
        title: "הבוט נמחק",
        description: "הבוט הוסר מהמערכת בהצלחה",
      });
      setIsDeleteDialogOpen(false);
      setSelectedBot(null);
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה במחיקת בוט",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refresh QR code mutation using external API
  const refreshQrMutation = useMutation({
    mutationFn: async (bot: any) => {
      return await api.refreshBotQR(bot.id);
    },
    onSuccess: (qrData) => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      setQrCodeUrl(qrData.qr_code);
      setIsQrDialogOpen(true);
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
          <Badge className="bg-success/10 text-success border-success">
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
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 ml-1" />
            שגיאה
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 ml-1 animate-pulse" />
            ממתין לחיבור
          </Badge>
        );
    }
  };

  const openEditDialog = (bot: any) => {
    setSelectedBot(bot);
    setEditBotName(bot.bot_name);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (bot: any) => {
    setSelectedBot(bot);
    setIsDeleteDialogOpen(true);
  };

  const handleEditBot = () => {
    if (!editBotName.trim()) {
      toast({
        title: "שדה חסר",
        description: "יש למלא את שם הבוט",
        variant: "destructive",
      });
      return;
    }
    if (selectedBot) {
      editBotMutation.mutate({ botId: selectedBot.id, botName: editBotName });
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
            {filteredClient ? (
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground text-lg">
                  בוטים של: <span className="font-semibold text-foreground">{filteredClient.full_name}</span>
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchParams({})}
                >
                  הצג את כל הבוטים
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-lg">
                נהל את כל הבוטים במערכת
              </p>
            )}
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

        {filteredBots && filteredBots.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {clientId ? "אין בוטים ללקוח זה" : "אין בוטים במערכת. הוסף בוט חדש כדי להתחיל."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots?.map((bot: any) => (
              <Card key={bot.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{bot.bot_name}</span>
                    {getStatusBadge(bot.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">לקוח:</span>
                      <span className="font-medium">{bot.profiles?.full_name || "לא ידוע"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">טלפון:</span>
                      <span className="font-medium">{bot.phone_number || "לא מחובר"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">פעיל לאחרונה:</span>
                      <span className="font-medium text-xs">
                        {bot.last_active
                          ? new Date(bot.last_active).toLocaleString("he-IL", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "אף פעם"}
                      </span>
                    </div>
                    {bot.connected_at && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">התחבר ב:</span>
                        <span className="font-medium text-xs">
                          {new Date(bot.connected_at).toLocaleString("he-IL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
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
                          setSelectedBot(bot);
                          setIsQrDialogOpen(true);
                        } catch (error) {
                          toast({
                            title: "שגיאה בטעינת QR",
                            description: "לא ניתן לטעון את קוד ה-QR",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={refreshQrMutation.isPending || !bot.external_bot_id}
                    >
                      <QrCode className="h-4 w-4 ml-1" />
                      הצג QR
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(bot)}
                    >
                      <Edit className="h-4 w-4" />
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
                          queryClient.invalidateQueries({ queryKey: ["bots"] });
                        } catch (error) {
                          toast({
                            title: "שגיאה בבדיקת סטטוס",
                            description: "לא ניתן לבדוק את סטטוס הבוט",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={updateStatusMutation.isPending || !bot.external_bot_id}
                    >
                      <RefreshCw className={`h-4 w-4 ${updateStatusMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(bot)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* QR Code Dialog */}
        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code - {selectedBot?.bot_name}</DialogTitle>
              <DialogDescription>
                סרוק את הקוד עם WhatsApp כדי לחבר את הבוט
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              {qrCodeUrl || selectedBot?.qr_code ? (
                <>
                  <div className="border-4 border-primary/20 rounded-lg p-4">
                    <img
                      src={qrCodeUrl || selectedBot?.qr_code}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      1. פתח את WhatsApp במכשיר
                    </p>
                    <p className="text-sm text-muted-foreground">
                      2. לחץ על תפריט (⋮) ובחר "מכשירים מקושרים"
                    </p>
                    <p className="text-sm text-muted-foreground">
                      3. לחץ על "קשר מכשיר" וסרוק את הקוד
                    </p>
                  </div>
                  <Button
                    onClick={() => selectedBot && refreshQrMutation.mutate(selectedBot)}
                    variant="outline"
                    disabled={refreshQrMutation.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 ml-2 ${refreshQrMutation.isPending ? 'animate-spin' : ''}`} />
                    רענן QR Code
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">טוען QR Code...</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Bot Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת בוט</DialogTitle>
              <DialogDescription>
                ערוך את שם הבוט
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bot-name">שם הבוט</Label>
                <Input
                  id="edit-bot-name"
                  placeholder="לדוגמה: בוט תמיכה"
                  value={editBotName}
                  onChange={(e) => setEditBotName(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedBot(null);
                    setEditBotName("");
                  }}
                >
                  ביטול
                </Button>
                <Button onClick={handleEditBot} disabled={editBotMutation.isPending}>
                  {editBotMutation.isPending ? "מעדכן..." : "עדכן"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את הבוט "{selectedBot?.bot_name}" ואת כל ההודעות הקשורות אליו.
                לא ניתן לבטל פעולה זו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setSelectedBot(null); }}>
                ביטול
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedBot && deleteBotMutation.mutate(selectedBot)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default BotsManagement;
