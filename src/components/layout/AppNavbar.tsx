import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationsCenter } from "@/components/NotificationsCenter";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Separator } from "@/components/ui/separator";

export const AppNavbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1 max-w-xl">
          <GlobalSearch />
        </div>
        <div className="mr-auto flex items-center gap-2">
          <NotificationsCenter />
        </div>
      </div>
    </header>
  );
};
