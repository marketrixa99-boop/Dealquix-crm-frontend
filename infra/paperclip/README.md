# Paperclip deployment preparation

Status: prepared only; not deployed or connected to GitHub.

Official image release 2026.1023.0, registry manifest verified and pinned by digest.
Blueprint provisions an authenticated public service and a 5GB persistent disk.
This branch is isolated from the CRM production branch.

Before applying:
1. Review current Render compute and disk charges. Only $25/month compute was previously approved; extra paid resources require approval.
2. Supply a dedicated hosted PostgreSQL DATABASE_URL in Render's secret input. Do not use the CRM production database.
3. Supply the actual service HTTPS origin as PAPERCLIP_PUBLIC_URL.
4. Bootstrap the owner using the release CLI auth bootstrap-ceo command in the service shell; keep the one-time invitation private.
5. Verify /api/health and that anonymous visitors cannot access company or agent data.
6. Have the owner create/sign in to their Paperclip account and accept the private owner invitation.
7. Configure the chosen AI provider credential through the secure UI; keep agents paused until budgets and permissions are reviewed.
8. Configure GitHub inside Paperclip. Existing ChatGPT and Render GitHub installations are separate. Limit access to specifically approved repositories. Validate with a known-file read.
9. Keep code changes on feature branches and require human review before production deploys.

This does not activate AI agents, grant GitHub access, or implement a global billing cap. Paperclip model budgets and provider billing limits must be configured before running tasks.
