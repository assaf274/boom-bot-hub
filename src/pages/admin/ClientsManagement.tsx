import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit, Trash2, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  max_bots: number;
  created_at: string;
  bots_count: number;
  groups_count: number;
}

interface ClientFormData {
  full_name: string;
  email: string;
  phone: string;
  notes: string;
  max_bots: number;
  password: string;
}

const ClientsManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    full_name: "",
    email: "",
    phone: "",
    notes: "",
    max_bots: 5,
    password: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch bots count for each client
      const { data: bots, error: botsError } = await supabase
        .from("bots")
        .select("user_id");

      if (botsError) throw botsError;

      // Fetch groups count for each client
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("user_id");

      if (groupsError) throw groupsError;

      // Count bots and groups per user
      const botsCount = bots?.reduce((acc, bot) => {
        acc[bot.user_id] = (acc[bot.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const groupsCount = groups?.reduce((acc, group) => {
        acc[group.user_id] = (acc[group.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Combine data
      const clientsData = profiles?.map((profile) => ({
        ...profile,
        bots_count: botsCount[profile.id] || 0,
        groups_count: groupsCount[profile.id] || 0,
      })) || [];

      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את נתוני הלקוחות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    try {
      // Call the edge function to create the client using Admin API
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("לא מחובר למערכת");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            notes: formData.notes,
            max_bots: formData.max_bots,
            password: formData.password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "שגיאה ביצירת לקוח");
      }

      toast({
        title: "לקוח נוסף בהצלחה",
        description: "הלקוח החדש נוסף למערכת",
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן להוסיף לקוח",
        variant: "destructive",
      });
    }
  };

  const handleEditClient = async () => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          notes: formData.notes,
          max_bots: formData.max_bots,
        })
        .eq("id", selectedClient.id);

      if (error) throw error;

      toast({
        title: "הלקוח עודכן בהצלחה",
        description: "הפרטים עודכנו במערכת",
      });
      
      setIsEditDialogOpen(false);
      setSelectedClient(null);
      resetForm();
      fetchClients();
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לעדכן את הלקוח",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    try {
      // Delete profile (this will cascade delete related data)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedClient.id);

      if (error) throw error;

      toast({
        title: "הלקוח נמחק בהצלחה",
        description: "הלקוח הוסר מהמערכת",
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן למחוק את הלקוח",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      full_name: client.full_name,
      email: client.email,
      phone: client.phone || "",
      notes: client.notes || "",
      max_bots: client.max_bots,
      password: "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      notes: "",
      max_bots: 5,
      password: "",
    });
  };

  const filteredClients = clients.filter((client) =>
    client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-8 space-y-8" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">ניהול לקוחות</h1>
            <p className="text-muted-foreground text-lg">
              נהל את כל הלקוחות במערכת
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                הוסף לקוח חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>הוספת לקוח חדש</DialogTitle>
                <DialogDescription>
                  מלא את הפרטים להוספת לקוח חדש למערכת
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">שם מלא</Label>
                    <Input id="name" placeholder="שם הלקוח" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">שם משתמש</Label>
                    <Input id="username" placeholder="שם משתמש" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">אימייל</Label>
                    <Input id="email" type="email" placeholder="email@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון</Label>
                    <Input id="phone" placeholder="050-1234567" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">סיסמה</Label>
                    <Input id="password" type="password" placeholder="סיסמה" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bots">כמות בוטים</Label>
                    <Input id="bots" type="number" placeholder="5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">הערות</Label>
                  <Textarea id="notes" placeholder="הערות נוספות..." />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  ביטול
                </Button>
                <Button onClick={handleAddClient}>
                  הוסף לקוח
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>רשימת לקוחות</CardTitle>
              <div className="relative w-80">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לקוח..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">טלפון</TableHead>
                  <TableHead className="text-right">בוטים</TableHead>
                  <TableHead className="text-right">קבוצות</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      טוען...
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      אין לקוחות להצגה
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {client.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {client.phone || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{client.bots_count} בוטים</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{client.groups_count} קבוצות</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.bots_count >= client.max_bots ? "destructive" : "default"}>
                          {client.max_bots}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(client)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(client)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת לקוח</DialogTitle>
              <DialogDescription>
                ערוך את פרטי הלקוח במערכת
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">שם מלא</Label>
                  <Input
                    id="edit-name"
                    placeholder="שם הלקוח"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">אימייל</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">טלפון</Label>
                <Input
                  id="edit-phone"
                  placeholder="050-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-bots">מספר בוטים מקסימלי</Label>
                <Input
                  id="edit-max-bots"
                  type="number"
                  min="1"
                  value={formData.max_bots}
                  onChange={(e) => setFormData({ ...formData, max_bots: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">הערות</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="הערות נוספות..."
                  className="min-h-[100px]"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedClient(null); resetForm(); }}>
                ביטול
              </Button>
              <Button onClick={handleEditClient}>עדכן</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את הלקוח {selectedClient?.full_name} ואת כל הבוטים, הקבוצות וההודעות שלו. 
                לא ניתן לבטל פעולה זו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setSelectedClient(null); }}>
                ביטול
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default ClientsManagement;
