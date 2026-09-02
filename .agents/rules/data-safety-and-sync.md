---
trigger: always_on
---

# Data Safety & Cloud Synchronization Rules

- **Irreversible Actions**: Never delete or overwrite `.local-*.json` snapshot files without creating a timestamped backup copy or validating the destination payload.
- **Sync Code Management**: Transfer codes (`.local-sync-codes.json`) must maintain cryptographic uniqueness and record device source metadata.
- **Atomic File Writing**: When saving JSON states in scripts or handlers, write to a temporary file (`.tmp`) first and atomically rename/replace the target to avoid corrupting data during sudden interrupts.
- **Environment Isolation**: Never commit live secrets or `.env.local` keys into public repository branches.
