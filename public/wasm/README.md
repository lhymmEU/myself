# gossh-wasm vendored artifacts

This directory holds the prebuilt WebAssembly SSH client used by the
**edge** Claw transport (browser → Cloudflare Worker `/dial` → cloud SSH
server). The browser loads `wasm_exec.js`, instantiates `gossh.wasm`, and
calls `GoSSH.connect({...})` against the Worker proxy URL.

The Worker only sees ciphertext: SSH key exchange, host-key verification,
and authentication all happen in this WASM module. See
[components/claw/edge-terminal.tsx](../../components/claw/edge-terminal.tsx)
for the integration.

## Files

| File | Origin | Notes |
| --- | --- | --- |
| `gossh.wasm` | `make build` from upstream `cmd/gossh/` | ~8 MB, served gzip/brotli to ~2 MB |
| `wasm_exec.js` | `${GOROOT}/lib/wasm/wasm_exec.js` shipped with the Go toolchain used to build `gossh.wasm` | MUST match the Go version used for the wasm |
| `gossh-wasm.LICENSE` | Upstream `LICENSE` (MIT) | Provenance / attribution |

## Upstream

- Repo: <https://github.com/subtermco/gossh-wasm>
- Pinned commit: `39f6990ec800cbb79b349bbec506bd6224da2120` (vendored 2026-04)
- Build toolchain: Go 1.21+ (built here with `go1.26.1 darwin/arm64`)

## Rebuild instructions

```bash
# 1. Clone at the pinned commit
git clone https://github.com/subtermco/gossh-wasm.git /tmp/gossh-wasm
cd /tmp/gossh-wasm
git checkout 39f6990ec800cbb79b349bbec506bd6224da2120

# 2. Build
make build           # → gossh.wasm
# (wasm_exec.js is auto-copied from $GOROOT/lib/wasm/ during build)

# 3. Vendor into the dashboard
cp gossh.wasm     /path/to/myself/public/wasm/gossh.wasm
cp wasm_exec.js   /path/to/myself/public/wasm/wasm_exec.js
cp LICENSE        /path/to/myself/public/wasm/gossh-wasm.LICENSE
```

If you bump to a newer commit, update the "Pinned commit" line above and
redeploy the dashboard. The Worker side does not need changes — the wire
protocol is just raw TCP-over-WebSocket frames.

### Optional: shrink the bundle

```bash
# Requires `binaryen` (brew install binaryen)
make optimize        # tries wasm-opt -Oz; some Go releases produce wasm
                     # features wasm-opt rejects, in which case skip this.
brotli -q 11 -k gossh.wasm   # produces gossh.wasm.br for static serving
```

Vercel / Cloudflare automatically apply Brotli to `.wasm` over the wire,
so committing only the raw `gossh.wasm` is fine.

## Why not npm?

Upstream does not publish an npm package. Vendoring keeps the dashboard
build offline-deterministic — no install-time fetches of a 8 MB binary,
no risk of an unaudited release silently rolling out, and the pinned
commit is provable from this directory alone.

## Security

- The WASM is loaded with `WebAssembly.instantiateStreaming` from a same-
  origin URL, so SRI-style integrity is implicit.
- `gossh-wasm` exposes a global `GoSSH` object after `go.run(instance)`.
  Treat it as untrusted in the sense that any compromise of `gossh.wasm`
  would put SSH credentials at risk — but everything in this directory is
  built from the pinned upstream commit and reviewable.
- Host-key TOFU (the `onHostKey` callback) is the user's last line of
  defence against a malicious Worker. Do not bypass it. The Worker can
  drop bytes, but cannot impersonate a server without breaking SSH's
  asymmetric key exchange.
