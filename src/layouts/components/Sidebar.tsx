import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router";

import { ROUTES } from "@/config/routes";
import { useSidebarStore } from "@/store/sidebar.store";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS, ROLES, type Permission, type Role } from "@/types/auth";
import { useAuthStore } from "@/store/auth.store";
import { usePendingLateCheckInCount } from "@/features/attendance/api/lateCheckInApi";
import { useReportWindow } from "@/features/dailyReports";
import { DAILY_REPORT_WINDOW_STATE } from "@/types/dailyReport";

/**
 * `roles` narrows visibility, it never grants it — an entry that also declares
 * `permissions` must still pass them. Granting here would only produce links
 * that land on /unauthorized, since PermissionRoute still guards the route.
 * Use it for entries permissions can't express, e.g. a path with no backing
 * permission (Settings) or a group that should stay role-scoped (SYSTEM).
 */
export interface NavChild {
  label: string;
  path: string;
  roles?: Role[];
  permissions?: Permission[];
  permissionMode?: "any" | "all";
  badgeCount?: number;
}

export interface NavItem {
  label: string;
  path?: string;
  icon: string;
  roles?: Role[];
  permissions?: Permission[];
  permissionMode?: "any" | "all";
  children?: NavChild[];
}

export interface NavGroup {
  title: string;
  roles?: Role[];
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "MAIN",
    items: [
      {
        label: "Dashboard",
        path: ROUTES.dashboard,
        icon: "dashboard",
      },
      {
        label: "Leads",
        icon: "group",
        permissions: [PERMISSIONS.LEAD_VIEW],
        children: [
          {
            label: "All Leads",
            path: ROUTES.leads,
            permissions: [PERMISSIONS.LEAD_VIEW],
          },
          {
            label: "My Leads",
            path: `${ROUTES.leads}?view=mine`,
            permissions: [PERMISSIONS.LEAD_VIEW],
            roles: [ROLES.EMPLOYEE]
          },
          {
            label: "Follow-ups",
            path: `${ROUTES.leads}?view=followups`,
            permissions: [PERMISSIONS.LEAD_FOLLOWUP_VIEW],
            roles: [ROLES.EMPLOYEE, ROLES.HEAD]
          },
        ],
      },
      {
        label: "Dialer",
        icon: "call",
        permissions: [PERMISSIONS.CALL_INITIATE],
        children: [
          {
            label: "Dialer",
            path: "/dialer",
            permissions: [PERMISSIONS.CALL_INITIATE],
            roles: [ROLES.HEAD, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]
          },
          {
            label: "History",
            path: "/dialer/history",
            permissions: [PERMISSIONS.CALL_LOG_VIEW],
          },
          {
            label: "Numbers",
            path: "/dialer/numbers",
            permissions: [PERMISSIONS.STRINGEE_NUMBER_VIEW],
          },
        ],
      },
      {
        label: "Tasks",
        path: "/tasks",
        icon: "check_circle",
        permissions: [PERMISSIONS.TASK_VIEW],
      },
      {
        label: "Attendance",
        icon: "calendar_today",
        permissions: [PERMISSIONS.ATTENDANCE_VIEW],
        children: [
          {
            // Head/Admin don't punch in, so they get the report instead.
            label: "My Attendance",
            path: ROUTES.attendance,
            roles: [ROLES.EMPLOYEE],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW],
            
          },
          {
            label: "Team Attendance",
            path: "/attendance/team",
            roles: [ROLES.MANAGER],
            permissions: [PERMISSIONS.ATTENDANCE_REPORT],
          },
          {
            label: "Attendance Report",
            path: "/attendance/report",
            roles: [ROLES.HEAD, ROLES.ADMIN],
            permissions: [PERMISSIONS.ATTENDANCE_REPORT],
          },
          {
            label: "Late Approvals",
            path: "/attendance/late-approvals",
            permissions: [PERMISSIONS.LATE_CHECKIN_APPROVE],
          },
          {
            // Own submitted requests — Head/Admin never file these.
            label: "My Late Requests",
            path: "/attendance/late-history",
            roles: [ROLES.EMPLOYEE],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW],
          },
        ],
      },
      {
        label: "Leave",
        icon: "event_busy",
        permissions: [PERMISSIONS.LEAVE_VIEW],
        children: [
          {
            // Head/Admin don't take leave through the system, so they get the
            // approval queue instead — same split as My Attendance.
            label: "My Leave",
            path: "/leave",
            roles: [ROLES.EMPLOYEE],
            permissions: [PERMISSIONS.LEAVE_VIEW],
          },
          {
            label: "Leave Approvals",
            path: "/leave/approvals",
            roles: [ROLES.HEAD, ROLES.ADMIN, ROLES.MANAGER],
            permissions: [PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.LEAVE_REJECT],
          },
          {
            label: "Leave Balances",
            path: "/leave/balances",
            permissions: [PERMISSIONS.LEAVE_BALANCE_VIEW],
            roles: [ROLES.ADMIN, ROLES.HEAD, ROLES.MANAGER, ROLES.EMPLOYEE],
          },
          {
            label: "Leave Policies",
            path: "/leave/policies",
            permissions: [PERMISSIONS.LEAVE_POLICY_VIEW],
             roles: [ROLES.HEAD, ROLES.ADMIN],
          },
        ],
      },
      {
        label: "Daily Report",
        icon: "assignment",
        permissions: [
          PERMISSIONS.DAILY_REPORT_CREATE,
          PERMISSIONS.DAILY_REPORT_VIEW,
        ],
        children: [
          {
            label: "Today's Report",
            path: ROUTES.dailyReport,
            roles: [ROLES.EMPLOYEE],
            permissions: [PERMISSIONS.DAILY_REPORT_CREATE],
          },
          {
            label: "My Reports",
            path: ROUTES.dailyReportHistory,
            roles: [ROLES.EMPLOYEE],
            permissions: [PERMISSIONS.DAILY_REPORT_CREATE],
          },
          {
            label: "Team Reports",
            path: ROUTES.dailyReports,
            roles: [ROLES.HEAD, ROLES.ADMIN, ROLES.MANAGER],
            permissions: [PERMISSIONS.DAILY_REPORT_VIEW],
          },
        ],
      },
      {
        label: "Performance",
        path: "/performance",
        icon: "show_chart",
        permissions: [PERMISSIONS.PERFORMANCE_VIEW],
      },
      {
        label: "Revenue",
        path: "/revenue",
        icon: "payments",
        permissions: [PERMISSIONS.REVENUE_VIEW],
      },
      // {
      //   label: "Achievements",
      //   path: "/achievements",
      //   icon: "military_tech",
      //   permissions: [PERMISSIONS.ACHIEVEMENT_VIEW],
      // },
      {
        label: "Contests",
        path: "/contests",
        icon: "military_tech",
        permissions: [PERMISSIONS.CONTEST_VIEW_ALL],
      },
      {
        // Employees/managers lack contest:view-all, so they get their
        // branch's running contests instead.
        label: "Live Contests",
        path: "/contests/live",
        icon: "emoji_events",
        roles: [ROLES.EMPLOYEE, ROLES.MANAGER],
      },
    ],
  },
  {
    title: "SYSTEM",
    // Employees hold USER_VIEW and BRANCH_VIEW, so permissions alone would
    // expose this group to them.
    roles: [ROLES.HEAD, ROLES.ADMIN, ROLES.MANAGER],
    items: [
      {
        label: "Employees",
        path: ROUTES.employees,
        icon: "badge",
        permissions: [PERMISSIONS.USER_VIEW],
      },
      {
        label: "Branches",
        path: ROUTES.branches,
        icon: "domain",
        permissions: [PERMISSIONS.BRANCH_VIEW],
      },
      // {
      //   // Integrations (lead sources) and future system settings: Head only.
      //   label: "Settings",
      //   path: ROUTES.settings,
      //   icon: "settings",
      //   roles: [ROLES.HEAD],
      //   permissions: [PERMISSIONS.INTEGRATION_VIEW],
      // },
      {
        // Payouts span every branch and show everyone's salary: Head only.
        label: "Salary",
        path: ROUTES.salary,
        icon: "payments",
        roles: [ROLES.HEAD],
        permissions: [PERMISSIONS.SALARY_MANAGE],
      },
      {
        label: "Logs",
        path: ROUTES.logs,
        icon: "timer",
        permissions: [PERMISSIONS.AUDIT_VIEW],
      },
      
      // {
      //   label: "Settings",
      //   path: ROUTES.settings,
      //   icon: "settings",
      //   // No settings:view permission exists in the backend matrix.
      //   roles: [ROLES.HEAD, ROLES.ADMIN],
      // },
    ],
  },
];

const Sidebar = () => {
  const { collapsed, mobileOpen, closeMobileSidebar, toggleSidebar } = useSidebarStore();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const { hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  const canApproveLateCheckIn = hasAnyPermission([PERMISSIONS.LATE_CHECKIN_APPROVE]);
  const { data: pendingLateCount = 0 } = usePendingLateCheckInCount(canApproveLateCheckIn);

  // Head holds every permission, so gate on role too: only employees file reports.
  const canSubmitDailyReport =
    user?.role === ROLES.EMPLOYEE &&
    hasAnyPermission([PERMISSIONS.DAILY_REPORT_CREATE]);
  const { data: reportWindow } = useReportWindow(canSubmitDailyReport);
  // A "1" badge while today's report is due and not yet filed.
  const dailyReportDue =
    !!reportWindow &&
    !reportWindow.report &&
    (reportWindow.state === DAILY_REPORT_WINDOW_STATE.OPEN ||
      reportWindow.state === DAILY_REPORT_WINDOW_STATE.LATE)
      ? 1
      : 0;

  const passesRoles = (roles?: Role[]) =>
    !roles?.length || (!!user?.role && roles.includes(user.role as Role));

  const canAccess = (entry: {
    roles?: Role[];
    permissions?: Permission[];
    permissionMode?: "any" | "all";
  }) => {
    if (!passesRoles(entry.roles)) {
      return false;
    }

    if (!entry.permissions?.length) {
      return true;
    }

    return entry.permissionMode === "all"
      ? hasAllPermissions(entry.permissions)
      : hasAnyPermission(entry.permissions);
  };

  const filteredNavGroups = useMemo(() => {
    if (isLoading) {
      return [];
    }

    return NAV_GROUPS.filter((group) => passesRoles(group.roles))
      .map((group) => {
        const items = group.items
          .map((item) => {
            // An explicit `roles` list on a parent gates its whole subtree,
            // so a visible child can't pull a restricted parent back in.
            if (!passesRoles(item.roles)) {
              return null;
            }

            const visibleChildren = item.children
              ?.filter((child) => canAccess(child))
              .map((child) => {
                // Attach dynamic badge count to Late Check-in Approvals child item
                if (child.path === "/attendance/late-approvals") {
                  return { ...child, badgeCount: pendingLateCount };
                }
                if (child.path === ROUTES.dailyReport) {
                  return { ...child, badgeCount: dailyReportDue };
                }
                return child;
              });

            if (!canAccess(item) && !visibleChildren?.length) {
              return null;
            }

            return {
              ...item,
              children: visibleChildren,
            };
          })
          .filter((item) => item !== null);

        return {
          ...group,
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [isLoading, hasAnyPermission, hasAllPermissions, pendingLateCount, dailyReportDue, user?.role]);

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    Leads: true,
    Attendance: true,
    "Daily Report": true,
  });

  const toggleSubmenu = (label: string) => {
    // Collapsed rail has no room for submenus: expand the sidebar and open
    // the one that was clicked instead of silently toggling a hidden list.
    if (collapsed) {
      toggleSidebar();
      setOpenSubmenus((prev) => ({ ...prev, [label]: true }));
      return;
    }
    setOpenSubmenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 crm-sidebar flex h-full flex-col shadow-2xl transition-all duration-300 select-none ${collapsed ? "w-20" : "w-64"
          } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5 shrink-0">
          <div className="flex h-16 shrink-0 items-center justify-center rounded-lg">
            <img
              src="/brand-logo.png"
              className="h-10 w-auto grayscale-100 brightness-0 invert-100"
            />
          </div>

          {!collapsed && (
            <img
              src="/brand-name.png"
              className="h-8 w-auto grayscale-100 brightness-0 invert-100"
            />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {filteredNavGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[11px] font-bold tracking-wider text-on-primary/50 uppercase mb-2">
                  {group.title}
                </p>
              )}

              {group.items.map((item) => {
                const hasChildren = Boolean(item?.children?.length);
                const isExpanded = Boolean(openSubmenus[item?.label]);
                const isChildActive = item?.children?.some(
                  (child) => location.pathname + location.search === child.path,
                );

                // Calculate cumulative total badges for parent item when collapsed
                const totalParentBadgeCount = item?.children?.reduce(
                  (acc, child) => acc + (child.badgeCount || 0),
                  0,
                );

                if (!hasChildren && item?.path) {
                  return (
                    <NavLink
                      key={item.label}
                      to={item.path}
                      onClick={closeMobileSidebar}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${isActive
                          ? "bg-white/15 text-white font-semibold shadow-sm"
                          : "text-on-primary/75 hover:bg-white/10 hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white" />
                          )}

                          <span className="material-symbols-outlined text-xl shrink-0">
                            {item.icon}
                          </span>

                          {!collapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                }

                return (
                  <div key={item?.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleSubmenu(item?.label)}
                      title={collapsed ? item?.label : undefined}
                      className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${isChildActive
                          ? "text-white font-semibold"
                          : "text-on-primary/75 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined text-xl shrink-0">
                            {item?.icon}
                          </span>
                          {Boolean(collapsed && totalParentBadgeCount && totalParentBadgeCount > 0) && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-primary" />
                          )}
                        </div>

                        {!collapsed && <span>{item?.label}</span>}
                      </div>

                      {!collapsed && (
                        <div className="flex items-center gap-2">
                          {Boolean(!isExpanded && totalParentBadgeCount && totalParentBadgeCount > 0) && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              {totalParentBadgeCount}
                            </span>
                          )}
                          <span
                            className={`material-symbols-outlined text-lg transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                              }`}
                          >
                            expand_more
                          </span>
                        </div>
                      )}
                    </button>

                    {!collapsed && isExpanded && item?.children && (
                      <div className="ml-9 space-y-1 border-l border-white/10 pl-3 my-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={closeMobileSidebar}
                            end
                            className={({ isActive }) =>
                              `flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-normal transition-colors ${isActive
                                ? "text-white font-medium bg-white/10"
                                : "text-on-primary/65 hover:text-white hover:bg-white/5"
                              }`
                            }
                          >
                            <span className="truncate">{child.label}</span>
                            {Boolean(child.badgeCount && child.badgeCount > 0) && (
                              <span className="ml-2 shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                {child.badgeCount}
                              </span>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;