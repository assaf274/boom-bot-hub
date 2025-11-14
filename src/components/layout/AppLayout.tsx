import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppNavbar } from "./AppNavbar";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <div className="flex-1 flex flex-col">
          <AppNavbar />
          <main className="flex-1 bg-muted/30">
            {children}
          </main>
        </div>
        <AppSidebar />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
