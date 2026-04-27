[中文版](./INSTALL.zh-CN.md)

# Life Dashboard — Install Guide (for first-time users)

This guide is written for someone who has never opened a terminal before. It walks you, step by step, from a brand-new computer to a running dashboard at `http://localhost:3000`.

It works on **Windows 10/11** and **macOS**. Pick the section for your operating system in each step.

> **Just want to try it without installing anything?** Open the hosted version at **https://lifedashboard.app** (or whichever URL is pinned in this repo's "About"), click **Sign in**, and use your email for a magic-link login. The hosted version doesn't have the live OpenBB market data, the embedded SSH terminal, or a built-in LLM — those are all in this local install. See [`README.md`](./README.md) for the side-by-side comparison.

---

## Step 1. Install the two programs you need

You only need two free programs. Install both, then close and reopen any terminal windows so they pick up the new programs.

### 1a. Node.js (required)

Node.js is what runs the dashboard. The dashboard needs **version 20 or higher**.

1. Open your web browser and go to https://nodejs.org/
2. Click the big green button labelled **"LTS"** (Long Term Support). At the time of writing it is "LTS — Recommended for Most Users".
3. Run the installer you just downloaded.
   - **Windows**: keep clicking "Next" and accept the defaults. When asked about "Tools for Native Modules", **leave that box checked** — it saves you trouble later.
   - **macOS**: open the `.pkg` file and click through the installer.
4. After the installer finishes, **close every terminal window you have open**. Open a fresh one (see Step 3 below for how) and type:

   ```
   node -v
   ```

   You should see something like `v22.11.0`. If you see "command not found", restart your computer and try again.

### 1b. Git (required)

Git is what downloads the project from GitHub.

- **Windows**: download from https://git-scm.com/ and run the installer. Keep all the defaults.
- **macOS**: open the Terminal app (press Cmd+Space, type "Terminal", press Enter) and type:

  ```
  git --version
  ```

  If macOS pops up a window offering to install the "Command Line Developer Tools", click **Install** and wait for it to finish. That includes Git.

### 1c. Python (optional — only if you want stock market data)

The dashboard's **Personal Finance** features work without Python. Python is only needed if you also want **Market Intelligence** (live stock, crypto, and economic data via OpenBB).

If you want it: install Python **3.9 to 3.12** from https://www.python.org/. On Windows, **check the box** that says "Add python.exe to PATH" on the first installer screen.

You can skip this for now and add it later.

---

## Step 2. Download the project

Pick **one** of the three options below. They all give you the same result.

### Option A — Using Git (recommended)

1. Open a terminal in the folder where you want the project to live (Desktop is fine).
   - **Windows**: open File Explorer, browse to the folder, then in the address bar at the top type `cmd` and press Enter.
   - **macOS**: open Finder, browse to the folder, right-click the folder, and choose **"New Terminal at Folder"**. (If you don't see that option, turn it on in System Settings → Keyboard → Keyboard Shortcuts → Services → "New Terminal at Folder".)
2. Type this and press Enter:

   ```
   git clone https://github.com/lhymmEU/myself.git
   cd myself
   ```

### Option B — Download a ZIP

1. In your browser, go to https://github.com/lhymmEU/myself
2. Click the green **"Code"** button, then **"Download ZIP"**.
3. Unzip the file. You will get a folder called `myself-main`. **Rename it to `myself`** to match the rest of this guide.
4. Open a terminal inside that folder using the right-click trick from Option A, step 1.

### Option C — GitHub Desktop

1. Install GitHub Desktop from https://desktop.github.com/
2. In GitHub Desktop, choose **File → Clone repository → URL** and paste `https://github.com/lhymmEU/myself`.
3. Pick a folder on disk and click **Clone**.
4. Right-click the repository in the sidebar and choose **"Open in Terminal"** (Mac) or **"Open in Command Prompt"** (Windows).

By the end of Step 2, your terminal should be **inside** the `myself` folder. You can confirm by typing `dir` (Windows) or `ls` (macOS) — you should see files like `package.json` and `setup.sh`.

---

## Step 3. Run the setup script

The setup script checks your environment, installs everything the dashboard needs, and builds the app. It usually takes 1–3 minutes.

### macOS / Linux

In the terminal you opened in Step 2, type:

```
chmod +x setup.sh
./setup.sh
```

The first line gives the script permission to run; the second line runs it.

### Windows — Command Prompt

```
setup.bat
```

### Windows — PowerShell

PowerShell blocks unsigned scripts by default. Use this exact command instead:

```
powershell -ExecutionPolicy Bypass -File setup.ps1
```

You should finish with a green message that says **"Setup complete!"** If you see an error, jump to **Step 6 — Common errors** below.

---

## Step 4. Start the dashboard

In the same terminal, type:

```
npm run dev
```

After a few seconds you will see something like:

```
- Local:        http://localhost:3000
- Ready in 2.3s
```

Open your browser and go to **http://localhost:3000**. The dashboard loads. The local database is created automatically on the first launch — there is nothing else to configure.

To stop the dashboard, return to the terminal and press **Ctrl+C** (on both Windows and Mac). To start it again later, just run `npm run dev` from inside the `myself` folder.

---

## Step 5. Optional — Live market data (OpenBB)

Skip this section unless you specifically want the **Market Intelligence** view inside the Finance page.

1. Install OpenBB. In a terminal type:

   ```
   pip3 install "openbb[all]"
   ```

   (On Windows you may need `pip` instead of `pip3`.)

2. Open a **second** terminal and start the OpenBB API. Leave this terminal open while you use market data:

   ```
   openbb-api --host 127.0.0.1 --port 6900
   ```

3. Back in the dashboard, go to **Settings → OpenBB** and confirm the host/port match (`127.0.0.1` and `6900`).

4. Some data providers require a free API key. Go to **Settings → Finance Data Providers**, click the registration link next to a provider (Alpha Vantage, FRED, Polygon, etc.), copy the key it gives you, and paste it into the matching field. Modules that use Yahoo Finance, SEC, and the Federal Reserve work without any key.

---

## Step 6. Common errors and how to fix them

### "Cannot resolve module '@noble/hashes/scrypt'"

This was a packaging mistake in older copies of the project. It is fixed in the current version. If you still see it:

1. Make sure your project files are up to date. If you used Git: `git pull`. If you downloaded a ZIP: download the ZIP again and replace the folder.
2. Delete the build cache and dependency folder:
   - **Windows**: `rmdir /s /q .next` and `rmdir /s /q node_modules`
   - **macOS / Linux**: `rm -rf .next node_modules`
3. Run the setup script again (Step 3).

### "node-gyp" or "better-sqlite3" errors during install (Windows)

The dashboard uses a small native database driver that needs Microsoft's free C++ compiler.

1. Download **Visual Studio Build Tools** from https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Run the installer. On the **"Workloads"** tab, **check the box** for "Desktop development with C++". Click Install.
3. Restart your terminal and run `setup.bat` (or `setup.ps1`) again.

If you would rather not install Visual Studio Build Tools, the easier alternative is to switch to the **Node.js v22 LTS** installer (https://nodejs.org/), which includes a prebuilt copy of the database driver.

### PowerShell says "running scripts is disabled on this system"

You ran `./setup.ps1` directly. Use the bypass form instead:

```
powershell -ExecutionPolicy Bypass -File setup.ps1
```

### "Port 3000 is already in use"

Another program is using port 3000. Start the dashboard on a different port:

```
npm run dev -- -p 3001
```

Then open http://localhost:3001 instead.

### `npm install` is extremely slow or hangs

You may be on a slow or filtered network. Try again on a different connection. If you are behind a corporate proxy, ask your IT team for the proxy settings, then run:

```
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
```

(Replace with the values your IT team gives you.)

### "node: command not found" after installing Node.js

You need to **fully close** every terminal window after installing Node.js, then open a fresh one. On Windows, sometimes you have to sign out and back in (or restart) for the `PATH` change to take effect.

---

## Where to go next

- For a tour of every feature inside the dashboard, see **[USER_MANUAL.md](./USER_MANUAL.md)**.
- For the technical README aimed at developers, see [README.md](./README.md).

If you get stuck at a step that this guide does not cover, please open an issue on GitHub with:
- which step you were on,
- the exact error message you saw,
- your operating system (e.g. "Windows 11").
