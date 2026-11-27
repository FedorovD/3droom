# Security Specification — Shared 3D Apartment Scenes

## 1. Data Invariants
1. **No PII**: `/sharedScenes/{shareId}` stores strictly non-personal 3D scene configuration (finishes, furniture enums, numeric 3D coordinates, camera pose). No email, phone, user profile, or token data is ever stored.
2. **Immutable Snapshots**: Once a snapshot is created at `/sharedScenes/{shareId}`, it can NEVER be updated or deleted (`allow update, delete: if false;`).
3. **No Enumeration (Anti-Scraping)**: `allow list: if false;` on `/sharedScenes` prevents scraping or enumerating shared links. Only direct `get` by exact 8–16 character alphanumeric `shareId` is permitted.
4. **Strict Schema & Bounds (Anti-DoW / Anti-Shadow-Fields)**:
   - Top-level keys must strictly equal `['version', 'createdAt', 'state', 'camera']`.
   - `version` must equal `1`.
   - `createdAt` must equal `request.time` (server timestamp).
   - `state` and `state.designConfig` allowlist exact keys, enum values, booleans, and string length limits (`<= 32`).
   - `state.objectEdits` is a map strictly capped at `<= 120` entries.
   - `camera` allows only optional `orbit` (exact keys `position` [3 numbers], `target` [3 numbers], `fov` [20..90]) and optional `walk` (exact keys `x`, `z`, `yaw`, `pitch` within architectural bounds).
5. **Path Hardening**: `shareId` must match `^[a-zA-Z0-9]{8,16}$` (rejects short guessable IDs, oversized strings, or path-poisoning characters).
6. **Global Default Deny**: `match /{document=**} { allow read, write: if false; }` is the first rule block.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Shadow Field Injection (Top-Level)**: `{ version: 1, createdAt: serverTimestamp, state: validState, camera: {}, isAdmin: true }`
2. **Shadow Field Injection (Nested designConfig)**: `state.designConfig` contains extra key `role: 'admin'`.
3. **ID Poisoning (Too Short / Invalid Chars)**: `create` at `/sharedScenes/ab` or `/sharedScenes/bad$id!`.
4. **ID Poisoning (Oversized ID)**: `create` at `/sharedScenes/` + 200-char string.
5. **Timestamp Forgery**: `createdAt` set to a client-supplied past/future Timestamp instead of `request.time`.
6. **Schema Version Tampering**: `version: 2` or `version: "1"`.
7. **Denial-of-Wallet Oversized String**: `state.activePreset` set to a 50KB string.
8. **Invalid Enum Injection**: `state.lightingMode: "malicious_mode"` or `state.viewMode: "xray"`.
9. **Oversized ObjectEdits Map**: `state.objectEdits` containing > 120 entries.
10. **Camera FOV / Array Tampering**: `camera.orbit.fov: 999` or `camera.orbit.position` with 4 elements or non-numeric entries.
11. **Immutable Snapshot Overwrite / Deletion**: `update` or `delete` on an existing `/sharedScenes/{shareId}` document.
12. **Collection Enumeration Attack**: `list` query on `/sharedScenes` (`getDocs(collection(db, 'sharedScenes'))`).
