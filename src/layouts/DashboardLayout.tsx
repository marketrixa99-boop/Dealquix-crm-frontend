import { Outlet } from "react-router";
import TeamChat from "@/features/teamChat/TeamChat";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { useSidebarStore } from "@/store/sidebar.store";
import { ActiveContestPopup } from "@/features/contests/components/ActiveContestPopup";
import { DailyReportReminder } from "@/features/dailyReports";

const DashboardLayout = () => {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <ActiveContestPopup />

      {/* Employees only: floating reminder while today's report is due */}
      <DailyReportReminder />
      <TeamChat />

      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <div className="p-lg">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
