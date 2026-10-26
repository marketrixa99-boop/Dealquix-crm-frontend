import { createBrowserRouter, Navigate } from "react-router";
import DashboardLayout from "@/layouts/DashboardLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import GuestRoute from "@/routes/GuestRoute";
import PermissionRoute from "./routes/PermissionRoute";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFoundPage from "./pages/NotFoundPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import AuditLogPage from "./features/logs/pages/AuditLogPage";
import LeadDetailPage from "./features/leads/pages/LeadDetailPage";
import ContestDetailsPage from "./features/contests/pages/ContestDetailsPage";
import ContestFormPage from "./features/contests/pages/ContestFormPage";
import { LateCheckInApprovalsPage } from "./features/attendance/pages/LateCheckInApprovalsPage";
import { DashboardDispatcher } from "@/features/dashboard";
import {
  EmployeeFormPage,
  EmployeeListPage,
  UserProfilePage,
} from "@/features/employees";
import {
  BranchDetailPage,
  BranchFormPage,
  BranchListPage,
} from "@/features/branches";
import { LoginPage, ProfilePage } from "@/features/auth";
import { LeadListPage } from "@/features/leads";
import {
  AttendanceDispatcher,
  AttendanceReportPage,
  LateCheckInHistoryPage,
  TeamAttendancePage,
} from "@/features/attendance";
import { TaskListPage, TaskFormPage, TaskDetailPage } from "@/features/tasks";
import { CallHistoryPage, DialerPage, StringeeNumbersPage } from "./features/dialer";
import { PerformanceDispatcher } from "./features/performance";
import {
  LeaveApprovalsPage,
  LeaveBalancesPage,
  LeavePolicyPage,
  MyLeavePage,
} from "./features/leave";
import { CreateRevenuePage, RevenuePage } from "./features/revenue";
import { ContestListPage, LiveContestsPage } from "./features/contests";
import {
  DailyReportsReviewPage,
  MyDailyReportHistoryPage,
  MyDailyReportPage,
} from "./features/dailyReports";
import {
  GeneratePayoutPage,
  MyPayoutsPage,
  MyPayslipPage,
  PayoutDetailPage,
  SalaryPage,
} from "./features/salary";
import {
  ConnectIntegrationPage,
  IntegrationDetailPage,
  SettingsPage,
} from "./features/integrations";
import { ROUTES } from "./config/routes";
import { PERMISSIONS } from "./types/auth";
import { lazy, Suspense } from "react";
const ChatPage = lazy(() => import("./features/chat/ChatPage"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <GuestRoute />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "/dashboard", element: <DashboardDispatcher /> },
          { path: "/chat", element: <Suspense fallback={<p>Loading team chat…</p>}><ChatPage /></Suspense> },

          /* Employees */
          {
            element: <PermissionRoute permission={PERMISSIONS.USER_VIEW} />,
            children: [
              { path: "/employees", element: <EmployeeListPage /> },
              { path: "/employees/:id/profile", element: <UserProfilePage /> },
            ],
          },
          {
            element: <PermissionRoute permission={PERMISSIONS.USER_CREATE} />,
            children: [
              { path: "/employees/onboard", element: <EmployeeFormPage /> },
            ],
          },
          {
            element: <PermissionRoute permission={PERMISSIONS.USER_UPDATE} />,
            children: [
              { path: "/employees/:id/edit", element: <EmployeeFormPage /> },
            ],
          },

          /* Revenue */
          {
            element: <PermissionRoute permission={PERMISSIONS.REVENUE_VIEW} />,
            children: [
              { path: "/revenue", element: <RevenuePage /> },
              { path: "/revenue/create", element: <CreateRevenuePage /> },
            ],
          },

          /* Branches */
          {
            element: <PermissionRoute permission={PERMISSIONS.BRANCH_VIEW} />,
            children: [
              { path: "/branches", element: <BranchListPage /> },
              { path: "/branches/:id", element: <BranchDetailPage /> },
            ],
          },
          {
            element: <PermissionRoute permission={PERMISSIONS.BRANCH_CREATE} />,
            children: [{ path: "/branches/new", element: <BranchFormPage /> }],
          },
          {
            element: <PermissionRoute permission={PERMISSIONS.BRANCH_UPDATE} />,
            children: [
              { path: "/branches/:id/edit", element: <BranchFormPage /> },
            ],
          },

          /* Leads */
          {
            element: <PermissionRoute permission={PERMISSIONS.LEAD_VIEW} />,
            children: [
              { path: "/leads", element: <LeadListPage /> },
              { path: "/leads/:leadId", element: <LeadDetailPage /> },
            ],
          },

          /* Profile & Logs */
          { path: "/profile", element: <ProfilePage /> },
          {
            element: <PermissionRoute permission={PERMISSIONS.AUDIT_VIEW} />,
            children: [{ path: "/logs", element: <AuditLogPage /> }],
          },

          /* Tasks */
          {
            element: <PermissionRoute permission={PERMISSIONS.TASK_VIEW} />,
            children: [
              { path: "/tasks", element: <TaskListPage /> },
              { path: "/tasks/:id", element: <TaskDetailPage /> },
            ],
          },
          {
            element: <PermissionRoute permission={PERMISSIONS.TASK_CREATE} />,
            children: [{ path: "/tasks/new", element: <TaskFormPage /> }],
          },

          /* Attendance */
          {
            element: <PermissionRoute permission={PERMISSIONS.ATTENDANCE_VIEW} />,
            children: [
              // Own attendance. Head/Admin have none, so the dispatcher
              // forwards them to the org-wide report instead.
              { path: "/attendance", element: <AttendanceDispatcher /> },
              {
                path: "/attendance/late-history",
                element: <LateCheckInHistoryPage />,
              },
            ],
          },
          {
            element: (
              <PermissionRoute permission={PERMISSIONS.ATTENDANCE_REPORT} />
            ),
            children: [
              { path: "/attendance/team", element: <TeamAttendancePage /> },
              { path: "/attendance/report", element: <AttendanceReportPage /> },
            ],
          },
          {
            // Backend gates approval on LATE_CHECKIN_APPROVE, which Manager
            // holds but ATTENDANCE_MANAGE does not cover.
            element: (
              <PermissionRoute permission={PERMISSIONS.LATE_CHECKIN_APPROVE} />
            ),
            children: [
              {
                path: "/attendance/late-approvals",
                element: <LateCheckInApprovalsPage />,
              },
            ],
          },

          /* Leave */
          {
            element: <PermissionRoute permission={PERMISSIONS.LEAVE_VIEW} />,
            children: [{ path: "/leave", element: <MyLeavePage /> }],
          },
          {
            element: (
              <PermissionRoute
                permission={[PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.LEAVE_REJECT]}
              />
            ),
            children: [
              { path: "/leave/approvals", element: <LeaveApprovalsPage /> },
            ],
          },
          {
            element: (
              <PermissionRoute permission={PERMISSIONS.LEAVE_POLICY_VIEW} />
            ),
            children: [
              { path: "/leave/policies", element: <LeavePolicyPage /> },
            ],
          },
          {
            element: (
              <PermissionRoute permission={PERMISSIONS.LEAVE_BALANCE_VIEW} />
            ),
            children: [
              { path: "/leave/balances", element: <LeaveBalancesPage /> },
            ],
          },

          /* Daily Reports */
          {
            element: (
              <PermissionRoute permission={PERMISSIONS.DAILY_REPORT_CREATE} />
            ),
            children: [
              { path: ROUTES.dailyReport, element: <MyDailyReportPage /> },
              {
                path: ROUTES.dailyReportHistory,
                element: <MyDailyReportHistoryPage />,
              },
            ],
          },
          {
            element: (
              <PermissionRoute permission={PERMISSIONS.DAILY_REPORT_VIEW} />
            ),
            children: [
              { path: ROUTES.dailyReports, element: <DailyReportsReviewPage /> },
            ],
          },

          /* Own payslips: any signed-in user; the API returns only their own line */
          { path: ROUTES.myPayouts, element: <MyPayoutsPage /> },
          { path: ROUTES.myPayslip, element: <MyPayslipPage /> },

          /* Salary (Head): payouts, deductions, rules */
          {
            element: (
              <PermissionRoute permission={PERMISSIONS.SALARY_MANAGE} />
            ),
            children: [
              { path: ROUTES.salary, element: <SalaryPage /> },
              { path: ROUTES.payoutNew, element: <GeneratePayoutPage /> },
              { path: ROUTES.payoutDetail, element: <PayoutDetailPage /> },
            ],
          },

          /* Performance & Other Modules */
          {
            element: (
              <PermissionRoute permission={PERMISSIONS.PERFORMANCE_VIEW} />
            ),
            children: [
              { path: "/performance", element: <PerformanceDispatcher /> },
            ],
          },
          {
            path: "/achievements",
            element: <ComingSoonPage featureName="Achievements" />,
          },
          /* Settings → Integrations (Head) */
          {
            element: (
              <PermissionRoute permission={PERMISSIONS.INTEGRATION_VIEW} />
            ),
            children: [
              { path: ROUTES.settings, element: <SettingsPage /> },
              { path: ROUTES.integrationConnect, element: <ConnectIntegrationPage /> },
              { path: ROUTES.integrationDetail, element: <IntegrationDetailPage /> },
            ],
          },

          /* Dialer */
          {
            element: <PermissionRoute permission={PERMISSIONS.CALL_INITIATE} />,
            children: [
              { path: "/dialer", element: <DialerPage /> },
              { path: "/dialer/history", element: <CallHistoryPage /> },
            ],
          },
          {
            element: <PermissionRoute permission={PERMISSIONS.STRINGEE_NUMBER_VIEW} />,
            children: [
              { path: "/dialer/numbers", element: <StringeeNumbersPage /> },
            ],
          },

          /* Contests */
          {
            element: <PermissionRoute permission={PERMISSIONS.CONTEST_VIEW_ALL} />,
            children: [{ path: "/contests", element: <ContestListPage /> }],
          },
          {
            element: <PermissionRoute permission={PERMISSIONS.CONTEST_CREATE} />,
            children: [{ path: "/contest/new", element: <ContestFormPage /> }],
          },
          // Ungated like /contest/:id: GET /contest/my-branch is scoped to the
          // caller's own branch.
          { path: "/contests/live", element: <LiveContestsPage /> },
          // Intentionally ungated: GET /contest/:id has no authorize() either —
          // it is branch-scoped in the handler so employees can open their own
          // branch's contest from ActiveContestPopup.
          { path: "/contest/:id", element: <ContestDetailsPage /> },
          {
            element: <PermissionRoute permission={PERMISSIONS.CONTEST_UPDATE} />,
            children: [
              { path: "/contest/:id/edit", element: <ContestFormPage /> },
            ],
          },

          /* Catch-all & Errors */
          { path: "/unauthorized", element: <UnauthorizedPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
