import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Lock, Bell, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().min(2, "השם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"],
});

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    notes: "",
    avatar_url: "",
  });

  // Password state
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    bot_disconnected: true,
    bot_error: true,
    new_message: true,
    email_notifications: false,
  });

  // Fetch user profile
  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          notes: data.notes || "",
          avatar_url: data.avatar_url || "",
        });

        if (data.notification_preferences) {
          setNotificationPrefs(data.notification_preferences as any);
        }
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = profileSchema.parse(profile);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: validated.full_name,
          phone: validated.phone,
          notes: validated.notes,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "הפרופיל עודכן",
        description: "הפרטים שלך עודכנו בהצלחה",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לעדכן את הפרופיל",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = passwordSchema.parse(passwords);

      const { error } = await supabase.auth.updateUser({
        password: validated.newPassword,
      });

      if (error) throw error;

      toast({
        title: "הסיסמה שונתה",
        description: "הסיסמה שלך עודכנה בהצלחה",
      });

      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לשנות את הסיסמה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPrefsUpdate = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: notificationPrefs,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "העדפות עודכנו",
        description: "העדפות ההתראות שלך עודכנו בהצלחה",
      });
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את ההעדפות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-6" dir="rtl">
        <div>
          <h1 className="text-4xl font-bold mb-2">הגדרות</h1>
          <p className="text-muted-foreground text-lg">
            נהל את הפרופיל וההעדפות שלך
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              פרופיל
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              אבטחה
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              התראות
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="h-4 w-4" />
              העדפות
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>פרטי פרופיל</CardTitle>
                <CardDescription>
                  עדכן את המידע האישי שלך
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>
                        {profile.full_name?.substring(0, 2).toUpperCase() || "UN"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">תמונת פרופיל</p>
                      <p className="text-sm text-muted-foreground">
                        JPG, GIF או PNG. מקסימום 1MB
                      </p>
                      <Button variant="outline" size="sm" type="button">
                        העלה תמונה
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">שם מלא</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        placeholder="שם מלא"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">אימייל</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="050-1234567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">הערות</Label>
                    <Textarea
                      id="notes"
                      value={profile.notes}
                      onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                      placeholder="הערות נוספות..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? "שומר..." : "שמור שינויים"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>שינוי סיסמה</CardTitle>
                <CardDescription>
                  עדכן את הסיסמה שלך לחשבון
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">סיסמה חדשה</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      placeholder="הכנס סיסמה חדשה"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">אימות סיסמה</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      placeholder="הכנס סיסמה שוב"
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? "משנה סיסמה..." : "שנה סיסמה"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>העדפות התראות</CardTitle>
                <CardDescription>
                  בחר אילו התראות תרצה לקבל
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>בוט מתנתק</Label>
                      <p className="text-sm text-muted-foreground">
                        קבל התראה כאשר בוט מתנתק מהמערכת
                      </p>
                    </div>
                    <Switch
                      checked={notificationPrefs.bot_disconnected}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, bot_disconnected: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>שגיאות בוט</Label>
                      <p className="text-sm text-muted-foreground">
                        קבל התראה כאשר בוט נתקל בשגיאה
                      </p>
                    </div>
                    <Switch
                      checked={notificationPrefs.bot_error}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, bot_error: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>הודעות חדשות</Label>
                      <p className="text-sm text-muted-foreground">
                        קבל התראה כאשר נוצרת הודעה חדשה
                      </p>
                    </div>
                    <Switch
                      checked={notificationPrefs.new_message}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, new_message: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>התראות במייל</Label>
                      <p className="text-sm text-muted-foreground">
                        קבל התראות גם באימייל
                      </p>
                    </div>
                    <Switch
                      checked={notificationPrefs.email_notifications}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, email_notifications: checked })
                      }
                    />
                  </div>
                </div>

                <Button onClick={handleNotificationPrefsUpdate} disabled={loading}>
                  {loading ? "שומר..." : "שמור העדפות"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>הגדרות כלליות</CardTitle>
                <CardDescription>
                  נהל את ההגדרות הכלליות של החשבון
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>שפה</Label>
                    <p className="text-sm text-muted-foreground">עברית</p>
                  </div>

                  <div className="space-y-2">
                    <Label>אזור זמן</Label>
                    <p className="text-sm text-muted-foreground">
                      Jerusalem (GMT+2)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>מספר בוטים מקסימלי</Label>
                    <p className="text-sm text-muted-foreground">
                      5 בוטים
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Button variant="destructive">מחק חשבון</Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    פעולה זו תמחק את החשבון שלך לצמיתות ולא ניתן לבטלה
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
