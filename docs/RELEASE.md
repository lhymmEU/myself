# Releasing Life Dashboard (macOS)

## Overview

Releases are automated via GitHub Actions. When you push a Git tag starting with
`v`, the **Release macOS** workflow builds `.dmg` and `.zip` installers for both
**Intel (x64)** and **Apple Silicon (arm64)**, then uploads them as a **draft**
GitHub Release.

---

## Quick release (step by step)

### 1. Bump the version

Edit `package.json`:

```jsonc
"version": "0.2.0"   // was "0.1.0"
```

Commit the change:

```bash
git add package.json
git commit -m "bump version to 0.2.0"
```

### 2. Tag and push

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin main --follow-tags
```

This triggers the workflow.

### 3. Wait for CI

Go to **Actions** tab on GitHub and watch the **Release macOS** workflow. It
builds two matrix jobs (x64 + arm64). Typical runtime: 10–15 minutes.

### 4. Publish the release

Once CI is green, go to **Releases** on GitHub. You'll see a new **draft**
release with the attached files:

- `Life Dashboard-X.Y.Z-arm64.dmg`
- `Life Dashboard-X.Y.Z-arm64-mac.zip`
- `Life Dashboard-X.Y.Z.dmg` (x64)
- `Life Dashboard-X.Y.Z-mac.zip` (x64)
- `SHASUMS256.txt`

Edit the release notes (or click "Generate release notes"), then **Publish**.

---

## Building locally (without CI)

```bash
npm ci
npm run electron:build:mac
```

Outputs land in `dist-electron/`. This builds for **your host architecture
only** (arm64 on Apple Silicon, x64 on Intel Mac).

---

## Notes

### Draft releases

The workflow creates releases as **drafts** so you can review and write release
notes before publishing. Change `draft: true` to `draft: false` in the workflow
if you prefer automatic publishing.

### Code signing & notarization

The current workflow produces **unsigned** builds. Users will need to
right-click → Open on first launch.

To add signing, set these repository secrets and update `electron-builder.yml`:

| Secret                        | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `CSC_LINK`                    | Base64-encoded `.p12` certificate              |
| `CSC_KEY_PASSWORD`            | Certificate password                           |
| `APPLE_ID`                    | Apple ID email for notarization                |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password (appleid.apple.com)      |
| `APPLE_TEAM_ID`               | 10-char team ID from developer.apple.com       |

Then pass them as env vars in the "Build Electron app" step.

### Pre-releases

Tag with a pre-release suffix (e.g. `v0.2.0-beta.1`) and check
**"Set as pre-release"** when publishing on GitHub.

### Adding Windows builds

A separate workflow (or an added job in this one) can target
`runs-on: windows-latest` with `npm run electron:build:win`.

### Linking to the latest release

Use this URL in your README:

```
https://github.com/<owner>/<repo>/releases/latest
```
