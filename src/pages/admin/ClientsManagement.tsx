import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit, Trash2, Eye, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ClientsManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Mock data - יוחלף בנתונים אמיתיים מ-Lovable Cloud
  const clients = [
    {
      id: 1,
      name: "ישראל כהן",
      email: "israel@example.com",
      phone: "050-1234567",
      bots: 5,
      groups: 45,
      status: "פעיל",
    },
    {
      id: 2,
      name: "דוד לוי",
      email: "david@example.com",
      phone: "052-9876543",
      bots: 3,
      groups: 28,
      status: "פעיל",
    },
    {
      id: 3,
      name: "שרה מזרחי",
      email: "sara@example.com",
      phone: "054-5555555",
      bots: 8,
      groups: 92,
      status: "פעיל",
    },
  ];

  const handleAddClient = () => {
    toast({
      title: "לקוח נוסף בהצלחה",
      description: "הלקוח החדש נוסף למערכת",
    });
    setIsAddDialogOpen(false);
  };

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
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {client.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {client.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client.bots}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client.groups}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ClientsManagement;
