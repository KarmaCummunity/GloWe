# mock-login (local Supabase only)

Dev-only Edge Function that creates or refreshes a test user for local KC development.

- `role: "admin"` grants `super_admin` via `admin_role_grants`.
- Default password: `KcLocal!2026`

Do not deploy or enable on hosted Supabase projects.
