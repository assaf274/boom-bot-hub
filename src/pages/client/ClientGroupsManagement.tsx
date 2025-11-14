import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FolderKanban, Plus, Trash2, Edit, Users } from "lucide-react";
import { useState } from "react";
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

interface GroupFormData {
  group_name: string;
  whatsapp_id: string;
  participants_count: number;
  max_participants: number;
}

const ClientGroupsManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    group_name: "",
    whatsapp_id: "",
    participants_count: 0,
    max_participants: 256,
  });

  // Fetch user's groups
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["client-groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("user_id", user.id)
        .order("group_order", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const addGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      if (!user?.id) throw new Error("אין משתמש מחובר");
      
      const { data: result, error } = await supabase
        .from("groups")
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-groups"] });
      toast({
        title: "קבוצה נוספה בהצלחה",
        description: "הקבוצה נוספה למערכת",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בהוספת קבוצה",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GroupFormData> }) => {
      const { error } = await supabase
        .from("groups")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-groups"] });
      toast({
        title: "קבוצה עודכנה",
        description: "הקבוצה עודכנה בהצלחה",
      });
      setIsEditDialogOpen(false);
      setEditingGroup(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בעדכון קבוצה",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-groups"] });
      toast({
        title: "קבוצה נמחקה",
        description: "הקבוצה נמחקה בהצלחה מהמערכת",
      });
      setGroupToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה במחיקת קבוצה",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      group_name: "",
      whatsapp_id: "",
      participants_count: 0,
      max_participants: 256,
    });
  };

  const handleAddGroup = () => {
    if (!formData.group_name.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין שם לקבוצה",
        variant: "destructive",
      });
      return;
    }

    addGroupMutation.mutate(formData);
  };

  const handleEditGroup = () => {
    if (!editingGroup || !formData.group_name.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין שם לקבוצה",
        variant: "destructive",
      });
      return;
    }

    updateGroupMutation.mutate({
      id: editingGroup.id,
      data: formData,
    });
  };

  const openEditDialog = (group: any) => {
    setEditingGroup(group);
    setFormData({
      group_name: group.group_name,
      whatsapp_id: group.whatsapp_id || "",
      participants_count: group.participants_count || 0,
      max_participants: group.max_participants || 256,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">קבוצות WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              נהל את הקבוצות שלך ({groups.length} קבוצות)
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף קבוצה חדשה
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">טוען קבוצות...</p>
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderKanban className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">אין קבוצות עדיין</p>
              <p className="text-muted-foreground mb-4">
                התחל על ידי הוספת הקבוצה הראשונה שלך
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                הוסף קבוצה
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                    {group.group_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">מזהה WhatsApp:</span>
                      <span className="font-medium">{group.whatsapp_id || "לא מוגדר"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">משתתפים:</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">
                          {group.participants_count || 0}/{group.max_participants || 256}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">נוצר בתאריך:</span>
                      <span className="font-medium">
                        {group.created_at
                          ? new Date(group.created_at).toLocaleDateString("he-IL")
                          : "לא ידוע"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(group)}
                    >
                      <Edit className="h-4 w-4 ml-2" />
                      ערוך
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => setGroupToDelete(group.id)}
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      מחק
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Group Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוסף קבוצה חדשה</DialogTitle>
              <DialogDescription>
                הזן את פרטי הקבוצה החדשה
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">שם הקבוצה *</Label>
                <Input
                  id="group-name"
                  placeholder="שם הקבוצה"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp-id">מזהה WhatsApp</Label>
                <Input
                  id="whatsapp-id"
                  placeholder="מזהה הקבוצה ב-WhatsApp"
                  value={formData.whatsapp_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_id: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="participants">מספר משתתפים</Label>
                  <Input
                    id="participants"
                    type="number"
                    placeholder="0"
                    value={formData.participants_count}
                    onChange={(e) => setFormData({ ...formData, participants_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-participants">מקסימום משתתפים</Label>
                  <Input
                    id="max-participants"
                    type="number"
                    placeholder="256"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 256 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                ביטול
              </Button>
              <Button onClick={handleAddGroup} disabled={addGroupMutation.isPending}>
                {addGroupMutation.isPending ? "מוסיף..." : "הוסף קבוצה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ערוך קבוצה</DialogTitle>
              <DialogDescription>
                עדכן את פרטי הקבוצה
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-group-name">שם הקבוצה *</Label>
                <Input
                  id="edit-group-name"
                  placeholder="שם הקבוצה"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-whatsapp-id">מזהה WhatsApp</Label>
                <Input
                  id="edit-whatsapp-id"
                  placeholder="מזהה הקבוצה ב-WhatsApp"
                  value={formData.whatsapp_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_id: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-participants">מספר משתתפים</Label>
                  <Input
                    id="edit-participants"
                    type="number"
                    placeholder="0"
                    value={formData.participants_count}
                    onChange={(e) => setFormData({ ...formData, participants_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-max-participants">מקסימום משתתפים</Label>
                  <Input
                    id="edit-max-participants"
                    type="number"
                    placeholder="256"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 256 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingGroup(null); resetForm(); }}>
                ביטול
              </Button>
              <Button onClick={handleEditGroup} disabled={updateGroupMutation.isPending}>
                {updateGroupMutation.isPending ? "מעדכן..." : "עדכן קבוצה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את הקבוצה לצמיתות. לא ניתן לבטל פעולה זו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => groupToDelete && deleteGroupMutation.mutate(groupToDelete)}
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

export default ClientGroupsManagement;
