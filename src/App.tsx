import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientsManagement from "./pages/admin/ClientsManagement";
import BotsManagement from "./pages/admin/BotsManagement";
import MessagesManagement from "./pages/admin/MessagesManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <ProtectedRoute requireAdmin>
                  <ClientsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bots"
              element={
                <ProtectedRoute requireAdmin>
                  <BotsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/groups"
              element={
                <ProtectedRoute requireAdmin>
                  <div>קבוצות - בקרוב</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute requireAdmin>
                  <MessagesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/schedules"
              element={
                <ProtectedRoute requireAdmin>
                  <div>תזמונים - בקרוב</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ads"
              element={
                <ProtectedRoute requireAdmin>
                  <div>פרסומות - בקרוב</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/screenshots"
              element={
                <ProtectedRoute requireAdmin>
                  <div>צילומי מסך - בקרוב</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <div>הגדרות - בקרוב</div>
                </ProtectedRoute>
              }
            />

            {/* Client Routes */}
            <Route
              path="/client"
              element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/bots"
              element={
                <ProtectedRoute>
                  <div>הבוטים שלי - בקרוב</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/groups"
              element={
                <ProtectedRoute>
                  <div>קבוצות - בקרוב</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/schedules"
              element={
                <ProtectedRoute>
                  <div>תזמונים - בקרוב</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/ads"
              element={
                <ProtectedRoute>
                  <div>פרסומות - בקרוב</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/screenshots"
              element={
                <ProtectedRoute>
                  <div>צילומי מסך - בקרוב</div>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
