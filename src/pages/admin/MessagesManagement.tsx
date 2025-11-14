import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { MessageSquare, Bot, FolderKanban, Calendar, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Message = Tables<"messages">;

interface MessageWithDetails extends Message {
  groups: { group_name: string } | null;
  bots: { bot_name: string } | null;
}

const MessagesManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithDetails | null>(null);

  // Fetch all messages with related data
  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          groups(group_name),
          bots(bot_name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as MessageWithDetails[];
    },
  });

  // Fetch groups for filter
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, group_name")
        .order("group_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Apply filters
  const filteredMessages = messages?.filter((message) => {
    if (statusFilter !== "all" && message.status !== statusFilter) return false;
    if (typeFilter !== "all" && message.message_type !== typeFilter) return false;
    if (groupFilter !== "all" && message.group_id !== groupFilter) return false;
    return true;
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast({
        title: "ההודעה נמחקה",
        description: "ההודעה הוסרה מהמערכת בהצלחה",
      });
      setIsDeleteDialogOpen(false);
      setSelectedMessage(null);
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה במחיקת הודעה",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openDeleteDialog = (message: MessageWithDetails) => {
    setSelectedMessage(message);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 ml-1" />נשלח</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />נכשל</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 ml-1" />ממתין</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels = {
      text: "טקסט",
      image: "תמונה",
      video: "וידאו",
      document: "מסמך",
    };
    return <Badge variant="outline">{typeLabels[type as keyof typeof typeLabels] || type}</Badge>;
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ניהול הודעות</h1>
            <p className="text-muted-foreground">צפייה וניהול כל ההודעות במערכת</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">סינון הודעות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">סטטוס</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="כל הסטטוסים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="pending">ממתין</SelectItem>
                    <SelectItem value="sent">נשלח</SelectItem>
                    <SelectItem value="failed">נכשל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">סוג הודעה</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="כל הסוגים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסוגים</SelectItem>
                    <SelectItem value="text">טקסט</SelectItem>
                    <SelectItem value="image">תמונה</SelectItem>
                    <SelectItem value="video">וידאו</SelectItem>
                    <SelectItem value="document">מסמך</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">קבוצה</label>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="כל הקבוצות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הקבוצות</SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.group_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">טוען הודעות...</p>
              </CardContent>
            </Card>
          ) : filteredMessages && filteredMessages.length > 0 ? (
            filteredMessages.map((message) => (
              <Card key={message.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(message.status)}
                          {getTypeBadge(message.message_type)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            <span>בוט: {message.bots?.bot_name || "לא ידוע"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4" />
                            <span>קבוצה: {message.groups?.group_name || "לא ידוע"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-start">
                        <div className="text-left text-sm text-muted-foreground space-y-1">
                          {message.scheduled_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>תזמון: {new Date(message.scheduled_at).toLocaleString("he-IL")}</span>
                            </div>
                          )}
                          {message.sent_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              <span>נשלח: {new Date(message.sent_at).toLocaleString("he-IL")}</span>
                            </div>
                          )}
                          <div>נוצר: {new Date(message.created_at).toLocaleString("he-IL")}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(message)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  {messages?.length === 0 ? "אין הודעות במערכת" : "לא נמצאו הודעות מתאימות לסינון"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary */}
        {filteredMessages && filteredMessages.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center">
                מציג {filteredMessages.length} מתוך {messages?.length || 0} הודעות
              </p>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את ההודעה לצמיתות. לא ניתן לבטל פעולה זו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setSelectedMessage(null); }}>
                ביטול
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedMessage && deleteMessageMutation.mutate(selectedMessage.id)}
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

export default MessagesManagement;
