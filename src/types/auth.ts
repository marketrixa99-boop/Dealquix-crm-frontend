export const ROLES = {
  HEAD: "head",
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.HEAD]: "Head",
  [ROLES.ADMIN]: "Administrator",
  [ROLES.MANAGER]: "Manager",
  [ROLES.EMPLOYEE]: "Employee",
};

/**
 * Mirrors the backend's ROLE_HIERARCHY (roleHierarchy.ts) so the UI only ever
 * offers role choices the API will actually accept — the backend remains the
 * source of truth and re-validates on every request.
 */
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [ROLES.HEAD]: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  [ROLES.ADMIN]: [ROLES.MANAGER, ROLES.EMPLOYEE],
  [ROLES.MANAGER]: [ROLES.EMPLOYEE],
  [ROLES.EMPLOYEE]: [],
};

export const getAssignableRoles = (actorRole: Role): Role[] =>
  ROLE_HIERARCHY[actorRole] ?? [];

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  branches: string[];
  createdAt: string;
  updatedAt: string;
}

export const PERMISSIONS = {
  // Users
  USER_VIEW: "user:view",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_ASSIGN_ROLE: "user:assign-role",
  USER_ASSIGN_BRANCH: "user:assign-branch",
  USER_STATUS_UPDATE: "user:status:update",

  // Employees
  EMPLOYEE_VIEW: "employee:view",
  EMPLOYEE_CREATE: "employee:create",
  EMPLOYEE_UPDATE: "employee:update",
  EMPLOYEE_DELETE: "employee:delete",
  EMPLOYEE_DOCUMENT_VIEW: "employee:document:view",
  EMPLOYEE_DOCUMENT_UPDATE: "employee:document:update",
  EMPLOYEE_SALARY_VIEW: "employee:salary:view",
  EMPLOYEE_SALARY_UPDATE: "employee:salary:update",

  // Branches
  BRANCH_VIEW: "branch:view",
  BRANCH_CREATE: "branch:create",
  BRANCH_UPDATE: "branch:update",
  BRANCH_DELETE: "branch:delete",

  // Branch Attendance
  BRANCH_ATTENDANCE_VIEW: "branch-attendance:view",
  BRANCH_ATTENDANCE_UPDATE: "branch-attendance:update",

  // Attendance Config
  ATTENDANCE_CONFIG_VIEW: "attendance-config:view",
  ATTENDANCE_CONFIG_UPDATE: "attendance-config:update",

  // Attendance
  ATTENDANCE_VIEW: "attendance:view",
  ATTENDANCE_CHECK_IN: "attendance:check-in",
  ATTENDANCE_CHECK_OUT: "attendance:check-out",
  ATTENDANCE_MANAGE: "attendance:manage",
  ATTENDANCE_REPORT: "attendance:report",
  ATTENDANCE_EXPORT: "attendance:export",
  LATE_CHECKIN_SUBMIT: "attendance:late-checkin:submit",
  LATE_CHECKIN_APPROVE: "attendance:late-checkin:approve",

  // Holidays
  HOLIDAY_VIEW: "holiday:view",
  HOLIDAY_CREATE: "holiday:create",
  HOLIDAY_UPDATE: "holiday:update",
  HOLIDAY_DELETE: "holiday:delete",

  // Lead Sources
  LEAD_SOURCE_READ: "lead-source:read",
  LEAD_SOURCE_CREATE: "lead-source:create",
  LEAD_SOURCE_UPDATE: "lead-source:update",
  LEAD_SOURCE_DELETE: "lead-source:delete",

  // Leads
  LEAD_VIEW: "lead:view",
  LEAD_CREATE: "lead:create",
  LEAD_UPDATE: "lead:update",
  LEAD_DELETE: "lead:delete",
  LEAD_ASSIGN: "lead:assign",
  LEAD_REASSIGN: "lead:reassign",
  LEAD_IMPORT: "lead:import",
  LEAD_EXPORT: "lead:export",
  LEAD_BULK_UPDATE: "lead:bulk-update",
  LEAD_BULK_ASSIGN: "lead:bulk-assign",
  LEAD_ACTIVITY_VIEW: "lead:activity:view",
  LEAD_ACTIVITY_CREATE: "lead:activity:create",
  LEAD_FOLLOWUP_VIEW: "lead:followup:view",
  LEAD_FOLLOWUP_CREATE: "lead:followup:create",
  LEAD_FOLLOWUP_UPDATE: "lead:followup:update",

  CALL_INITIATE: "call:initiate",
  CALL_LOG_VIEW: "call-log:view",
  CALL_RECORDING_LISTEN: "call-recording:listen",

  DIALER_AGENT_VIEW: "dialer_agent:view",
  DIALER_AGENT_MANAGE: "dialer_agent:manage",
  STRINGEE_NUMBER_CREATE: "stringee_number:create",
  STRINGEE_NUMBER_UPDATE: "stringee_number:update",
  STRINGEE_NUMBER_VIEW: "stringee_number:view",
  STRINGEE_NUMBER_ASSIGN: "stringee_number:assign",
  STRINGEE_NUMBER_DELETE: "stringee_number:delete",

  // Leave Management
  LEAVE_VIEW: "leave:view",
  LEAVE_CREATE: "leave:create",
  LEAVE_UPDATE: "leave:update",
  LEAVE_CANCEL: "leave:cancel",

  LEAVE_APPROVE: "leave:approve",
  LEAVE_REJECT: "leave:reject",

  LEAVE_MANAGE: "leave:manage",

  LEAVE_BALANCE_VIEW: "leave:balance:view",
  LEAVE_BALANCE_MANAGE: "leave:balance:manage",
  LEAVE_BALANCE_TRANSACTION_VIEW: "leave:balance:transaction:view",

  LEAVE_POLICY_VIEW: "leave:policy:view",
  LEAVE_POLICY_CREATE: "leave:policy:create",
  LEAVE_POLICY_UPDATE: "leave:policy:update",
  LEAVE_POLICY_DELETE: "leave:policy:delete",

  LEAVE_REPORT: "leave:report",
  LEAVE_EXPORT: "leave:export",

  // Customers
  CUSTOMER_VIEW: "customer:view",
  CUSTOMER_CREATE: "customer:create",
  CUSTOMER_UPDATE: "customer:update",
  CUSTOMER_DELETE: "customer:delete",

  // Tasks
  TASK_VIEW: "task:view",
  TASK_CREATE: "task:create",
  TASK_UPDATE: "task:update",
  TASK_DELETE: "task:delete",
  TASK_ASSIGN: "task:assign",

  // Activities
  ACTIVITY_VIEW: "activity:view",
  ACTIVITY_CREATE: "activity:create",
  ACTIVITY_UPDATE: "activity:update",
  ACTIVITY_DELETE: "activity:delete",

  // Salary
  SALARY_VIEW: "salary:view",
  SALARY_CREATE: "salary:create",
  SALARY_UPDATE: "salary:update",
  SALARY_DELETE: "salary:delete",
  SALARY_MANAGE: "salary:manage",

  INTEGRATION_VIEW: "integration:view",
  INTEGRATION_MANAGE: "integration:manage",
  LEAD_MESSAGE_SEND: "lead-message:send",

  // Achievements
  ACHIEVEMENT_VIEW: "achievement:view",
  ACHIEVEMENT_CREATE: "achievement:create",
  ACHIEVEMENT_UPDATE: "achievement:update",
  ACHIEVEMENT_DELETE: "achievement:delete",

  // Performance
  PERFORMANCE_VIEW: "performance:view",
  PERFORMANCE_CREATE: "performance:create",
  PERFORMANCE_UPDATE: "performance:update",
  PERFORMANCE_MANAGE: "performance:manage",

  // Incentives
  INCENTIVE_VIEW: "incentive:view",
  INCENTIVE_CREATE: "incentive:create",
  INCENTIVE_UPDATE: "incentive:update",
  INCENTIVE_DELETE: "incentive:delete",
  INCENTIVE_MANAGE: "incentive:manage",

  // Revenue
  REVENUE_VIEW: "revenue:view",
  REVENUE_CREATE: "revenue:create",
  REVENUE_UPDATE: "revenue:update",
  REVENUE_DELETE: "revenue:delete",
  REVENUE_MANAGE: "revenue:manage",

  // Contests
  CONTEST_CREATE: "contest:create",
  CONTEST_UPDATE: "contest:update",
  CONTEST_VIEW_ALL: "contest:view-all",
  CONTEST_JOIN: "contest:join",
  CONTEST_PARTICIPANT_VIEW: "contest:participant:view",
  CONTEST_LEADERBOARD_VIEW: "contest:leaderboard:view",

  // Reports
  REPORT_VIEW: "report:view",
  REPORT_EXPORT: "report:export",

  // Daily reports: CREATE = submit/see own; VIEW/REVIEW/EXPORT = team
  DAILY_REPORT_CREATE: "daily-report:create",
  DAILY_REPORT_VIEW: "daily-report:view",
  DAILY_REPORT_REVIEW: "daily-report:review",
  DAILY_REPORT_EXPORT: "daily-report:export",

  // Audit
  AUDIT_VIEW: "audit:view",
  AUDIT_READ: "audit:read",

  // Activity logs
  ACTIVITY_LOG_VIEW: "activity-log:view",
  ACTIVITY_LOG_EXPORT: "activity-log:export",
  ACTIVITY_LOG_DELETE: "activity-log:delete",

  // Module-specific activity streams
  ACTIVITY_LOG_USER_VIEW: "activity-log:user:view",
  ACTIVITY_LOG_LEAD_VIEW: "activity-log:lead:view",
  ACTIVITY_LOG_STRINGEE_VIEW: "activity-log:stringee:view",
  ACTIVITY_LOG_TASK_VIEW: "activity-log:task:view",
  ACTIVITY_LOG_ATTENDANCE_VIEW: "activity-log:attendance:view",
  ACTIVITY_LOG_LEAVE_VIEW: "activity-log:leave:view",
  ACTIVITY_LOG_REVENUE_VIEW: "activity-log:revenue:view",
} as const;

export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionsByRole = Record<Role, Permission[]>;

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
