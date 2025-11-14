import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationsCenter } from "@/components/NotificationsCenter";
import { Separator } from "@/components/ui/separator";

export const AppNavbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        <SidebarTrigger className="ml-auto" />
        <Separator orientation="vertical" className="h-6" />
        <NotificationsCenter />
      </div>
    </header>
  );
};
