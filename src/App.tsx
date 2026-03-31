import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Checkouts from "@/pages/Checkouts";
import Pedidos from "@/pages/Pedidos";
import Leads from "@/pages/Leads";
import Conversas from "@/pages/Conversas";
import Fluxos from "@/pages/Fluxos";
import Vozes from "@/pages/Vozes";
import Disparos from "@/pages/Disparos";
import WhatsAppCloud from "@/pages/WhatsAppCloud";
import Configuracoes from "@/pages/Configuracoes";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/checkouts" element={<Checkouts />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/conversas" element={<Conversas />} />
              <Route path="/fluxos" element={<Fluxos />} />
              <Route path="/vozes" element={<Vozes />} />
              <Route path="/disparos" element={<Disparos />} />
              <Route path="/whatsapp-cloud" element={<WhatsAppCloud />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
