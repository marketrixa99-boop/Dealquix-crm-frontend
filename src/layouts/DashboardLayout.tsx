import { Outlet } from "react-router";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { useSidebarStore } from "@/store/sidebar.store";
import { ActiveContestPopup } from "@/features/contests/components/ActiveContestPopup";
import { ActiveCallPopup } from "@/features/dialer/components/ActiveCallPopup";
import { DailyReportReminder } from "@/features/dailyReports";

const DashboardLayout = () => {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <ActiveContestPopup />

      {/* Hidden WebRTC Audio elements bound to Stringee stream events */}
      <audio id="stringee-remote-audio" autoPlay playsInline className="hidden" />
      <audio id="stringee-local-audio" autoPlay playsInline muted className="hidden" />

      {/* Floating Call Bar for navigate-away active calls */}
      <ActiveCallPopup />

      {/* Employees only: floating reminder while today's report is due */}
      <DailyReportReminder />

      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <div className="crm-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;