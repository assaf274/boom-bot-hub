import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Bot,
  FolderKanban,
  Settings,
  Calendar,
  Megaphone,
  Image,
  MessageCircle,
  LogOut,
  Bell,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const adminMenuItems = [
  { title: "דשבורד", url: "/admin", icon: LayoutDashboard },
  { title: "ניהול לקוחות", url: "/admin/clients", icon: Users },
  { title: "ניהול בוטים", url: "/admin/bots", icon: Bot },
  { title: "הודעות", url: "/admin/messages", icon: MessageCircle },
  { title: "התראות", url: "/admin/notifications", icon: Bell },
  { title: "דוחות וניתוח", url: "/admin/reports", icon: BarChart3 },
  { title: "קבוצות", url: "/admin/groups", icon: FolderKanban },
  { title: "תזמונים", url: "/admin/schedules", icon: Calendar },
  { title: "פרסומות", url: "/admin/ads", icon: Megaphone },
  { title: "צילומי מסך", url: "/admin/screenshots", icon: Image },
  { title: "הגדרות", url: "/admin/settings", icon: Settings },
];

const clientMenuItems = [
  { title: "דשבורד", url: "/client", icon: LayoutDashboard },
  { title: "הבוטים שלי", url: "/client/bots", icon: Bot },
  { title: "קבוצות", url: "/client/groups", icon: FolderKanban },
  { title: "תזמונים", url: "/client/schedules", icon: Calendar },
  { title: "הפרסומות שלי", url: "/client/ads", icon: Megaphone },
  { title: "צילומי מסך", url: "/client/screenshots", icon: Image },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, isAdmin, user } = useAuth();
  const menuItems = isAdmin ? adminMenuItems : clientMenuItems;

  return (
    <Sidebar className="border-r" collapsible="icon" side="right">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">BoomBot</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>תפריט ראשי</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {user && (
          <div className="text-sm text-sidebar-foreground px-2 py-1 bg-sidebar-accent/50 rounded">
            <p className="font-medium truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "מנהל מערכת" : "לקוח"}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 ml-2" />
          <span>התנתק</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
