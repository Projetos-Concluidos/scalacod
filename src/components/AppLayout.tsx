import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";
import { MobileSidebarProvider } from "@/contexts/MobileSidebarContext";

const AppLayout = () => {
  return (
    <MobileSidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col md:ml-[220px]">
          <TopBar />
          <main className="flex-1 px-4 pb-6 md:px-8 md:pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
};

export default AppLayout;
