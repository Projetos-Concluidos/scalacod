import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="ml-[220px] flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-8 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
