import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <AppSidebar />
        <main className="flex-1 bg-muted/30">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
