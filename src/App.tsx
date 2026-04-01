import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import AppLayout from "@/components/AppLayout";
import AdminLayout from "@/components/admin/AdminLayout";
import PageLoader from "@/components/PageLoader";

// Auth pages — keep static (critical path)
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// Lazy-loaded pages
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Checkouts = lazy(() => import("@/pages/Checkouts"));
const Pedidos = lazy(() => import("@/pages/Pedidos"));
const Leads = lazy(() => import("@/pages/Leads"));
const Conversas = lazy(() => import("@/pages/Conversas"));
const Fluxos = lazy(() => import("@/pages/Fluxos"));
const Vozes = lazy(() => import("@/pages/Vozes"));
const Disparos = lazy(() => import("@/pages/Disparos"));
const WhatsAppCloud = lazy(() => import("@/pages/WhatsAppCloud"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const Suporte = lazy(() => import("@/pages/Suporte"));
const Upgrade = lazy(() => import("@/pages/Upgrade"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const CheckoutPublic = lazy(() => import("@/pages/CheckoutPublic"));
const HomePub = lazy(() => import("@/pages/Home"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Admin — separate chunk
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminAssinantes = lazy(() => import("@/pages/admin/AdminAssinantes"));
const AdminPlanos = lazy(() => import("@/pages/admin/AdminPlanos"));
const AdminCobrancas = lazy(() => import("@/pages/admin/AdminCobrancas"));
const AdminTokens = lazy(() => import("@/pages/admin/AdminTokens"));
const AdminIntegracoes = lazy(() => import("@/pages/admin/AdminIntegracoes"));
const AdminLogs = lazy(() => import("@/pages/admin/AdminLogs"));
const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/c/:slug" element={<CheckoutPublic />} />
              <Route path="/" element={<HomePub />} />
              <Route path="/home" element={<HomePub />} />
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
                <Route path="/suporte" element={<Suporte />} />
                <Route path="/upgrade" element={<Upgrade />} />
                <Route path="/subscription" element={<Subscription />} />
              </Route>
              <Route element={<AuthGuard><AdminGuard><AdminLayout /></AdminGuard></AuthGuard>}>
                <Route path="/admin" element={<AdminOverview />} />
                <Route path="/admin/assinantes" element={<AdminAssinantes />} />
                <Route path="/admin/planos" element={<AdminPlanos />} />
                <Route path="/admin/cobrancas" element={<AdminCobrancas />} />
                <Route path="/admin/tokens" element={<AdminTokens />} />
                <Route path="/admin/integracoes" element={<AdminIntegracoes />} />
                <Route path="/admin/home" element={<AdminHome />} />
                <Route path="/admin/logs" element={<AdminLogs />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
