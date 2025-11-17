import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/api";

interface BotDistributionGroupsProps {
  botId: number;
  botName: string;
}

export const BotDistributionGroups = ({ botId, botName }: BotDistributionGroupsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any | null>(null);
  const [newGroupId, setNewGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  // Fetch distribution groups
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["bot-distribution-groups", botId],
    queryFn: () => api.getBotDistributionGroups(botId),
    enabled: !!botId,
  });

  // Add group mutation
  const addGroupMutation = useMutation({
    mutationFn: () => api.addBotDistributionGroup(botId, newGroupId, newGroupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-distribution-groups", botId] });
      toast({
        title: "קבוצה נוספה",
        description: "קבוצת ההפצה נוספה בהצלחה",
      });
      setIsAddDialogOpen(false);
      setNewGroupId("");
      setNewGroupName("");
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בהוספת קבוצה",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.deleteBotDistributionGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-distribution-groups", botId] });
      toast({
        title: "קבוצה נמחקה",
        description: "קבוצת ההפצה נמחקה בהצלחה",
      });
      setIsDeleteDialogOpen(false);
      setGroupToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה במחיקת קבוצה",
        variant: "destructive",
      });
    },
  });

  const handleAddGroup = () => {
    if (!newGroupId.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין מזהה קבוצה",
        variant: "destructive",
      });
      return;
    }
    addGroupMutation.mutate();
  };

  const handleDeleteGroup = () => {
    if (groupToDelete) {
      deleteGroupMutation.mutate(groupToDelete.id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>קבוצות הפצה - {botName}</CardTitle>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
          >
            <Plus className="ml-2 h-4 w-4" />
            הוסף קבוצה
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">טוען...</p>
          ) : groups.length === 0 ? (
            <p className="text-muted-foreground">
              לא הוגדרו קבוצות הפצה לבוט זה
            </p>
          ) : (
            <div className="space-y-2">
              {groups.map((group: any) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {group.group_name || "ללא שם"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {group.group_id}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setGroupToDelete(group);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Group Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוסף קבוצת הפצה</DialogTitle>
            <DialogDescription>
              הוסף קבוצת WhatsApp לרשימת ההפצה של הבוט
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupId">מזהה קבוצה (Group ID) *</Label>
              <Input
                id="groupId"
                value={newGroupId}
                onChange={(e) => setNewGroupId(e.target.value)}
                placeholder="לדוגמה: 120363123456789012@g.us"
                dir="ltr"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                ניתן למצוא את מזהה הקבוצה ב-WhatsApp Web
              </p>
            </div>
            <div>
              <Label htmlFor="groupName">שם קבוצה (אופציונלי)</Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="לדוגמה: לקוחות VIP"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewGroupId("");
                setNewGroupName("");
              }}
            >
              ביטול
            </Button>
            <Button
              onClick={handleAddGroup}
              disabled={addGroupMutation.isPending}
            >
              {addGroupMutation.isPending ? "מוסיף..." : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם למחוק את הקבוצה?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תסיר את הקבוצה "{groupToDelete?.group_name || groupToDelete?.group_id}" מרשימת ההפצה.
              הבוט לא יפיץ יותר הודעות לקבוצה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroupToDelete(null)}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
