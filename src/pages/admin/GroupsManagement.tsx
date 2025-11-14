import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowUp, ArrowDown } from "lucide-react";

interface Group {
  id: string;
  group_name: string;
  whatsapp_id: string | null;
  max_participants: number | null;
  participants_count: number | null;
  group_order: number | null;
  created_at: string | null;
}

interface GroupFormData {
  group_name: string;
  whatsapp_id: string;
  max_participants: number;
  participants_count: number;
}

const GroupsManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    group_name: "",
    whatsapp_id: "",
    max_participants: 256,
    participants_count: 0,
  });

  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("group_order", { ascending: true });
      
      if (error) throw error;
      return data as Group[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (newGroup: GroupFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const maxOrder = groups?.reduce((max, g) => Math.max(max, g.group_order || 0), 0) || 0;

      const { error } = await supabase.from("groups").insert({
        ...newGroup,
        user_id: userData.user.id,
        group_order: maxOrder + 1,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("הקבוצה נוספה בהצלחה");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("שגיאה בהוספת קבוצה: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GroupFormData> }) => {
      const { error } = await supabase
        .from("groups")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("הקבוצה עודכנה בהצלחה");
      setIsEditDialogOpen(false);
      setSelectedGroup(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("שגיאה בעדכון קבוצה: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("הקבוצה נמחקה בהצלחה");
    },
    onError: (error) => {
      toast.error("שגיאה במחיקת קבוצה: " + error.message);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from("groups")
        .update({ group_order: newOrder })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const resetForm = () => {
    setFormData({
      group_name: "",
      whatsapp_id: "",
      max_participants: 256,
      participants_count: 0,
    });
  };

  const handleAdd = () => {
    addMutation.mutate(formData);
  };

  const handleEdit = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      group_name: group.group_name,
      whatsapp_id: group.whatsapp_id || "",
      max_participants: group.max_participants || 256,
      participants_count: group.participants_count || 0,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedGroup) return;
    updateMutation.mutate({ id: selectedGroup.id, data: formData });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק קבוצה זו?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleMoveUp = (group: Group) => {
    const currentIndex = groups?.findIndex((g) => g.id === group.id) || 0;
    if (currentIndex > 0 && groups) {
      const prevGroup = groups[currentIndex - 1];
      reorderMutation.mutate({ id: group.id, newOrder: prevGroup.group_order || 0 });
      reorderMutation.mutate({ id: prevGroup.id, newOrder: group.group_order || 0 });
    }
  };

  const handleMoveDown = (group: Group) => {
    const currentIndex = groups?.findIndex((g) => g.id === group.id) || 0;
    if (groups && currentIndex < groups.length - 1) {
      const nextGroup = groups[currentIndex + 1];
      reorderMutation.mutate({ id: group.id, newOrder: nextGroup.group_order || 0 });
      reorderMutation.mutate({ id: nextGroup.id, newOrder: group.group_order || 0 });
    }
  };

  const filteredGroups = groups?.filter((group) =>
    group.group_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ניהול קבוצות</h1>
            <p className="text-muted-foreground mt-2">נהל את כל קבוצות הוואטסאפ במערכת</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="ml-2 h-4 w-4" />
            הוסף קבוצה חדשה
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>רשימת קבוצות</CardTitle>
            <CardDescription>כל הקבוצות במערכת</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="חפש קבוצה..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">סידור</TableHead>
                  <TableHead className="text-right">שם קבוצה</TableHead>
                  <TableHead className="text-right">מזהה וואטסאפ</TableHead>
                  <TableHead className="text-right">משתתפים</TableHead>
                  <TableHead className="text-right">מקסימום משתתפים</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      טוען...
                    </TableCell>
                  </TableRow>
                ) : filteredGroups && filteredGroups.length > 0 ? (
                  filteredGroups.map((group, index) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(group)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDown(group)}
                            disabled={index === filteredGroups.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{group.group_name}</TableCell>
                      <TableCell>{group.whatsapp_id || "-"}</TableCell>
                      <TableCell>{group.participants_count || 0}</TableCell>
                      <TableCell>{group.max_participants || 256}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(group)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(group.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      לא נמצאו קבוצות
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוסף קבוצה חדשה</DialogTitle>
              <DialogDescription>הזן את פרטי הקבוצה החדשה</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="group_name">שם קבוצה</Label>
                <Input
                  id="group_name"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="whatsapp_id">מזהה וואטסאפ</Label>
                <Input
                  id="whatsapp_id"
                  value={formData.whatsapp_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_id: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="max_participants">מקסימום משתתפים</Label>
                <Input
                  id="max_participants"
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) =>
                    setFormData({ ...formData, max_participants: parseInt(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="participants_count">משתתפים נוכחיים</Label>
                <Input
                  id="participants_count"
                  type="number"
                  value={formData.participants_count}
                  onChange={(e) =>
                    setFormData({ ...formData, participants_count: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleAdd}>הוסף</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ערוך קבוצה</DialogTitle>
              <DialogDescription>ערוך את פרטי הקבוצה</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_group_name">שם קבוצה</Label>
                <Input
                  id="edit_group_name"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_whatsapp_id">מזהה וואטסאפ</Label>
                <Input
                  id="edit_whatsapp_id"
                  value={formData.whatsapp_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_id: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_max_participants">מקסימום משתתפים</Label>
                <Input
                  id="edit_max_participants"
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) =>
                    setFormData({ ...formData, max_participants: parseInt(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit_participants_count">משתתפים נוכחיים</Label>
                <Input
                  id="edit_participants_count"
                  type="number"
                  value={formData.participants_count}
                  onChange={(e) =>
                    setFormData({ ...formData, participants_count: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleUpdate}>עדכן</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default GroupsManagement;