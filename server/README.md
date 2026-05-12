# server

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

Admin panel:

- Set `ADMIN_EMAILS` in `server/.env` to a comma-separated allowlist.
- Admin UI is at `http://localhost:5173/admin` (after signing in).

Valkey:

- Docker Compose starts `valkey/valkey:8-alpine` on port `6379`.
- Set `VALKEY_URL=redis://localhost:6379` for caching and Socket.IO pub/sub.

This project was created using `bun init` in bun v1.3.12. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
