import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";
import { MobileSidebarProvider } from "@/contexts/MobileSidebarContext";

const AppLayout = () => {
  return (
    <MobileSidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 md:px-6 lg:px-8 md:pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
};

export default AppLayout;
