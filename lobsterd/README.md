# lobsterd

A tiny TypeScript daemon that lets you use your home machine ("lobster")
through the cloud Life Dashboard without exposing it to the public internet.

> **Use lobsterd when your machine cannot accept inbound SSH** — i.e. it
> lives behind home NAT, a captive Wi-Fi, a firewall, or a residential
> ISP that blocks port 22.
>
> If your machine is a cloud VM with a public IP (AWS/Aliyun/Tencent/
> DigitalOcean/Hetzner/Linode/etc.), you almost certainly want the
> default **Add cloud server** flow instead — it runs an SSH client in
> your browser tab and proxies raw TCP through a Cloudflare Worker.
> Nothing to install on the server. See the project README's
> "Connecting Claw to your machines" section for the comparison.

```
   browser  ──WSS──▶  lobster-relay  ◀──WSS──  lobsterd  ──127.0.0.1:22──▶  sshd
                       (Cloudflare DO)         (your box)                     (your box)
```

The relay sees only ciphertext frames; lobsterd terminates the SSH
connection on `127.0.0.1:22` (or talks directly to your shell via PTY in
future iterations). Nothing about your home network is exposed to the cloud.

## Install

```bash
git clone <this repo>
cd <this repo>
npm install
```

## Pair with your cloud account

1. In the cloud Life Dashboard, open Claw → "Add lobster". You'll get a
   6-digit code (valid for 5 minutes).
2. On the machine you want to use as a lobster, run:

```bash
npm run lobsterd -- pair 123456 \
  --cloud-url https://YOUR-DEPLOY.vercel.app \
  --relay-url wss://lobster-relay.YOUR-WORKER.workers.dev
```

That call exchanges public keys with the cloud server and stores a
long-lived `agentJwt` in `~/.lobsterd/config.json`. You only need to pair
once per lobster.

## Run the daemon

```bash
npm run lobsterd -- serve
```

`lobsterd serve` opens an outbound WSS to the relay using the stored
`agentJwt`. When the browser-side peer connects, lobsterd opens
`net.connect("127.0.0.1", 22)` and pipes raw bytes back and forth — same
shape as `ssh -W 127.0.0.1:22 user@lobster` would do over a stable tunnel.

You can run lobsterd under any process supervisor (`pm2`, `systemd`,
`launchctl`). It auto-reconnects with backoff on relay disconnect.

## Why outbound only?

- No router config, no port forwarding, no dynamic DNS.
- Same trust model as cloud sync clients (Dropbox, 1Password) you already
  trust on this machine.
- The relay never sees plaintext; it can be compromised without leaking
  your shell session.
