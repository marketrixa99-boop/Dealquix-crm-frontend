import React, { Suspense } from "react";
import BranchRevenueTargets from "@/features/tasks/components/BranchRevenueTargets";
import { useAuthStore } from "@/store/auth.store";
import DashboardSkeleton from "../components/ui/skeleton/DashboardSkeleton";
import ManagerDashboard from "./ManagerDashboard";

// Lazy-load dashboard components for optimal code-splitting
const HeadDashboardPage = React.lazy(() => import("./HeadDashboardPage"));
const EmployeeDashboardPage = React.lazy(
  () => import("./EmployeeDashboardPage"),
);
const AdminDashboardPage = React.lazy(() => import("./AdminDashboardPage"));

export const DashboardDispatcher = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <>
      <div className="mb-6">
        <BranchRevenueTargets compact />
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        {user?.role === "admin" ? (
          <AdminDashboardPage />
        ) : user?.role === "head" ? (
          <HeadDashboardPage />
        ) : user?.role === "manager" ? (
          <ManagerDashboard />
        ) : (
          <EmployeeDashboardPage />
        )}
      </Suspense>
    </>
  );
};
