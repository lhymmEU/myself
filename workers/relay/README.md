# lobster-relay

A Cloudflare Worker + Durable Object that bridges browser tabs in the cloud
Life Dashboard to either a `lobsterd` agent on the user's home machine or
the user's own cloud SSH server. **The Worker never decrypts payloads** —
SSH/E2E negotiation runs on the endpoints; the Worker just shovels bytes.

```
   browser  ──WSS──▶  lobster-relay  ◀──WSS──  lobsterd            (Flavor B / "Home machine")
                          (DO room)
                     pipes raw bytes

   browser  ──WSS──▶  lobster-relay  ──TCP──▶  user's cloud sshd  (Flavor A / "Cloud server")
                       (raw bridge)
                     pipes ciphertext
```

The two flows are independent and run side-by-side from the same Worker.

## Flavor A — Browser SSH via edge worker (`/dial`)

For users whose SSH server has a public IP (cloud VMs on AWS / GCP /
Aliyun / Tencent / DigitalOcean / Hetzner / Linode / etc.).

- Browser loads `gossh-wasm` and opens an SSH session entirely in WASM.
- Worker proxies raw TCP between the browser WebSocket and the user's
  `sshd:22`.
- SSH key exchange, host-key verification, and password/key auth all
  happen between the WASM module and `sshd`. The Worker only sees
  ciphertext.
- Credentials live in the browser-side zero-knowledge vault; the Vercel
  app and the Worker never see plaintext.

### `/dial/:connectionId` flow

1. Vercel `/api/claw/edge-token` mints a 60 s HS256 JWT
   `{ userId, connectionId, host, port, role: "tcp-direct" }`.
2. Worker verifies the JWT, checks the `Origin` against
   `ALLOWED_BROWSER_ORIGINS`, and rejects blocked ports
   (`25/465/587` SMTP).
3. Worker resolves `host` via Cloudflare DNS-over-HTTPS and rejects
   any address that lands in RFC1918, loopback, link-local, the AWS
   metadata IP, or other reserved ranges (see `src/safety.ts`).
4. Worker checks the per-user concurrency cap via the `DialLimiter`
   Durable Object (`DIAL_MAX_CONCURRENT_PER_USER`, default 5). On
   miss it returns `429`.
5. Worker upgrades the WebSocket and `connect()`s a TCP socket to the
   resolved IP+port. Bytes flow in both directions until either side
   closes.

### Per-user concurrency cap

Each user gets a dedicated `DialLimiter` DO instance keyed by `userId`.
It atomically tracks how many `/dial` sessions that user has open. When
the cap is exceeded, new dials get `HTTP 429 { error, active, cap }`.
The slot is released when the WebSocket closes for any reason.

Tune the cap with the `DIAL_MAX_CONCURRENT_PER_USER` `[vars]` entry in
`wrangler.toml`. Workers Free has a generous TCP socket budget but it
*is* finite — the cap protects you from a single tab spinning up
infinite sessions on a hot reload.

### Operational caveats

- Cloudflare blocks outbound SMTP from Workers (port 25). We also
  block 465/587 belt-and-braces.
- Some cloud providers' default security groups deny port 22 from
  Cloudflare egress IPs. Surface a clear error to the user pointing at
  their security-group rules.
- Workers Free has a 5-minute CPU/IO ceiling per request; long
  interactive SSH sessions will hit that and reconnect. We do not
  attempt to suppress reconnects — surface them as user-visible
  "session ended, reconnect?" prompts.

## Flavor B — `lobsterd` pairing (`/pair`)

For users whose lobster lives behind home NAT and can't accept inbound
connections.

- `lobsterd` outbound-connects to the Worker.
- Browser also outbound-connects to the Worker.
- Both peers carry an end-to-end NaCl/X25519 session negotiated during
  pairing; the Worker only sees ciphertext.

### `/pair/:token?role=agent|browser` flow

1. User enters a 6-digit pairing code in the browser; Vercel mints a
   relay JWT `{ userId, pairingToken, role, exp: 60 s }`.
2. Both peers connect with the JWT. Worker verifies, then routes into
   the `RelayRoom` Durable Object keyed by `pairingToken`.
3. First peer parks; second peer triggers two-way byte-pumping. If
   either disconnects the other receives a `peer_disconnected` control
   frame.

## Health & ops

- `GET /health` returns `200 OK`.
- The relay does not log payload bytes — only connect/disconnect and
  rate-limit hits, suitable for ops monitoring.

## Deploy

```bash
npm install
npm run deploy
```

Set the JWT secret (shared with Vercel):

```bash
wrangler secret put RELAY_JWT_SECRET
```

Configure `[vars]` in `wrangler.toml`:

- `ALLOWED_BROWSER_ORIGINS` — comma-separated origins for the
  dashboard (e.g. `https://dashboard.example.com,https://staging.example.com`).
- `DIAL_MAX_CONCURRENT_PER_USER` — concurrent `/dial` cap per user.

## What this Worker is NOT

- Not a proxy: never decrypts payloads, never inspects beyond JWT verify
  + DNS / port safety checks.
- Not a server: no DB, no payload logs, no observability beyond
  connection metadata.
- Not a user app: zero UI, zero billing, zero auth (relies on Vercel
  for identity).
