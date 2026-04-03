import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";
import { MobileSidebarProvider } from "@/contexts/MobileSidebarContext";
import { useNotificationPush } from "@/hooks/useNotificationPush";

const AppLayout = () => {
  return (
    <MobileSidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        {/* Skip link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Pular para o conteúdo principal
        </a>
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 md:ml-[220px]">
          <TopBar />
          <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-6 pb-6 md:px-6 lg:px-8 md:pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
};

export default AppLayout;
