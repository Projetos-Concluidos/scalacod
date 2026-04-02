import { Suspense } from "react";
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
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Auth pages — keep static (critical path)
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// Lazy-loaded pages with auto-retry on chunk errors
const Dashboard = lazyWithRetry(() => import("@/pages/Dashboard"));
const Checkouts = lazyWithRetry(() => import("@/pages/Checkouts"));
const Pedidos = lazyWithRetry(() => import("@/pages/Pedidos"));
const Leads = lazyWithRetry(() => import("@/pages/Leads"));
const Conversas = lazyWithRetry(() => import("@/pages/Conversas"));
const Fluxos = lazyWithRetry(() => import("@/pages/Fluxos"));
const Vozes = lazyWithRetry(() => import("@/pages/Vozes"));
const Disparos = lazyWithRetry(() => import("@/pages/Disparos"));
const WhatsAppCloud = lazyWithRetry(() => import("@/pages/WhatsAppCloud"));
const Configuracoes = lazyWithRetry(() => import("@/pages/Configuracoes"));
const Suporte = lazyWithRetry(() => import("@/pages/Suporte"));
const Upgrade = lazyWithRetry(() => import("@/pages/Upgrade"));
const Subscription = lazyWithRetry(() => import("@/pages/Subscription"));
const CheckoutPublic = lazyWithRetry(() => import("@/pages/CheckoutPublic"));
const HomePub = lazyWithRetry(() => import("@/pages/Home"));
const Funcionalidades = lazyWithRetry(() => import("@/pages/Funcionalidades"));
const PlanosPage = lazyWithRetry(() => import("@/pages/Planos"));
const FaqPage = lazyWithRetry(() => import("@/pages/Faq"));
const AjudaPage = lazyWithRetry(() => import("@/pages/Ajuda"));
const StatusPage = lazyWithRetry(() => import("@/pages/StatusPage"));
const TermosPage = lazyWithRetry(() => import("@/pages/Termos"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));

// Admin — separate chunk
const AdminOverview = lazyWithRetry(() => import("@/pages/admin/AdminOverview"));
const AdminAssinantes = lazyWithRetry(() => import("@/pages/admin/AdminAssinantes"));
const AdminPlanos = lazyWithRetry(() => import("@/pages/admin/AdminPlanos"));
const AdminCobrancas = lazyWithRetry(() => import("@/pages/admin/AdminCobrancas"));
const AdminTokens = lazyWithRetry(() => import("@/pages/admin/AdminTokens"));
const AdminIntegracoes = lazyWithRetry(() => import("@/pages/admin/AdminIntegracoes"));
const AdminLogs = lazyWithRetry(() => import("@/pages/admin/AdminLogs"));
const AdminHome = lazyWithRetry(() => import("@/pages/admin/AdminHome"));

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
