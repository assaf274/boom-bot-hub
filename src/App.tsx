import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientsManagement from "./pages/admin/ClientsManagement";
import BotsManagement from "./pages/admin/BotsManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/clients" element={<ClientsManagement />} />
          <Route path="/admin/bots" element={<BotsManagement />} />
          <Route path="/admin/groups" element={<div>קבוצות - בקרוב</div>} />
          <Route path="/admin/schedules" element={<div>תזמונים - בקרוב</div>} />
          <Route path="/admin/ads" element={<div>פרסומות - בקרוב</div>} />
          <Route path="/admin/screenshots" element={<div>צילומי מסך - בקרוב</div>} />
          <Route path="/admin/settings" element={<div>הגדרות - בקרוב</div>} />
          
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/client/bots" element={<div>הבוטים שלי - בקרוב</div>} />
          <Route path="/client/groups" element={<div>קבוצות - בקרוב</div>} />
          <Route path="/client/schedules" element={<div>תזמונים - בקרוב</div>} />
          <Route path="/client/ads" element={<div>פרסומות - בקרוב</div>} />
          <Route path="/client/screenshots" element={<div>צילומי מסך - בקרוב</div>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
