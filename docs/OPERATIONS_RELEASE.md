# Non-advertising team workspace

Adds `/workspace` under the existing lead-view route guard and a **Team workspace** sidebar entry using the current CRM theme. The companion backend branch is `feature/crm-operations` in Dealquix-crm-backend.

Sections: due follow-ups, exact duplicate review, old lead callback queue, management batch auto assignment, calling/team summary, support tickets, lead history, and links to existing lead-level WATI messaging.

Data comes from authenticated `/operations/*` endpoints. Records are paginated at 30 items; query caches include the signed-in user. The workspace does not substitute fake data when an API is unavailable. Lead and assignee selection uses names rather than requiring database IDs. Existing lead-list search initializes from the URL so duplicate review links work.

Validation: TypeScript/Vite production build and targeted ESLint passed. Backend has six passing scope, permission, route, assignment and reminder tests with mocked persistence. Browser/phone layout, actual MongoDB transactions, WATI/Stringee integration and production data need staging verification. Browser execution was unavailable in the build environment.

This is a review branch, not a production rollout. Backend GitHub write access returned 403; deploy the companion API before releasing the frontend. The frontend alone cannot deliver the new workflows. Do not combine the paused Marketing module with this release.

Scope limits: allocation is a manual batch, duplicate review does not merge records, reminders are in-app, performance links reuse current revenue/target features, and mobile improvements cover this workspace rather than every legacy page. The separate rate-limit fix is still pending.
