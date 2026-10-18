# User management and RBAC foundation

This release adds secure user-management tables and extends the existing `users` table without deleting or rewriting legacy business records.

## Added tables

- `roles`, `permissions`, and `role_permissions` for built-in and custom role definitions.
- `user_permissions` for explicit per-user overrides.
- `user_sessions` for server-side session revocation and expiry.
- `login_activities` for successful, failed, and locked sign-in attempts.
- `password_resets` for hashed, expiring, single-use reset tokens.
- `audit_logs` for structured, sensitive-operation history.
- `security_settings` for password, lockout, session, invitation, and notification policy.

## Extended users fields

The startup migration adds profile, role, lifecycle, lockout, password-rotation, login metadata, and soft-delete columns to `users`. It also creates partial unique indexes for active `username` and `employee_id` values.

The application startup hook seeds the five built-in roles and permission catalog, maps legacy roles (`Staff` → `Manager`, `Administrator` → `Admin`), and preserves the existing seeded accounts and invoice/customer history.

## Security notes

- Passwords are stored only as bcrypt hashes.
- JWTs carry an opaque session id; the session registry is checked on every authenticated request.
- Audit payloads filter password, hash, token, secret, answer, and credential fields.
- Password reset and invitation delivery still require the deployment’s mail provider; the API never returns reset tokens to a public request.
