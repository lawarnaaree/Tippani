# Production & Distribution Guide

This guide explains how to build, sign, and release **Tippani** to production.

## 1. Prerequisites

### Tools
- **Rust & Cargo**: Latest stable.
- **Node.js**: v22+ and npm.
- **Tauri CLI**: `npm install -g @tauri-apps/cli@latest`.

### Assets
- **Signing Key**: Required for auto-updates.
- **Code Signing Certificate**: Recommended for Windows (.msi) and macOS (.app) to prevent security warnings from SmartScreen/Gatekeeper.

---

## 2. Setting Up the Auto-Updater

Tauri requires update bundles to be signed with a private key.

### Generate Keys
Run the following command:
```bash
npx tauri signer generate
```
This will output a **Public Key** and a **Private Key**.

1. **Public Key**: Copy this into `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
2. **Private Key**: Store this securely. For CI/CD, add it to your GitHub Repository Secrets.

### GitHub Secrets
Add the following secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):
- `TAURI_SIGNING_PRIVATE_KEY`: Your generated private key.
- `TAURI_SIGNING_PASSWORD`: The password you set for the key (if any).
- `GITHUB_TOKEN`: This is provided automatically by GitHub Actions, but ensure the workflow has "Write" permissions.

---

## 3. Building for Production

### Local Build
To build the application on your machine:
```bash
npm run tauri build
```
The installers will be generated in:
`src-tauri/target/release/bundle/msi/` (Windows)
`src-tauri/target/release/bundle/dmg/` (macOS)

### CI/CD Release (Recommended)
Tippani is configured with GitHub Actions to handle cross-platform builds automatically.

1. **Update Version**: Change the version in `package.json` and `src-tauri/tauri.conf.json`.
2. **Commit & Push**:
   ```bash
   git add .
   git commit -m "Release v0.1.1"
   git push origin main
   ```
3. **Tag & Push**:
   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```
This will trigger the `Release` workflow. It will:
- Build for Windows, macOS, and Linux.
- Create a draft release on GitHub.
- Upload the installers and the `latest.json` for the auto-updater.

---

## 4. Installation

### Windows
- Install the `.msi` package.
- If you haven't signed the app with a commercial certificate, Windows SmartScreen will show a warning. Click **"More info"** and then **"Run anyway"**.

### macOS
- Open the `.dmg` and drag Tippani to your Applications folder.
- If not signed, you may need to right-click and select **"Open"** the first time, or allow it in `System Settings > Privacy & Security`.

### Linux
- Install the `.deb` or use the `.AppImage`.

---

## 5. Environment Variables

If you need to pass secrets during build time, use a `.env` file in the root (ignored by git).
Example `.env`:
```bash
TAURI_SIGNING_PRIVATE_KEY=...
TAURI_SIGNING_PASSWORD=...
```
