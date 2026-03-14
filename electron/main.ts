import { app, BrowserWindow } from "electron";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import net from "net";

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

const isDev = !app.isPackaged;
const DEV_SERVER_URL = "http://localhost:3000";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const addr = srv.address();
      if (addr && typeof addr !== "string") {
        srv.close(() => resolve(addr.port));
      } else {
        reject(new Error("Failed to get free port"));
      }
    });
    srv.on("error", reject);
  });
}

function startServer(port: number): Promise<void> {
  const serverScript = path.join(
    process.resourcesPath,
    "standalone",
    "server.js"
  );

  return new Promise((resolve) => {
    const standaloneDir = path.join(process.resourcesPath, "standalone");
    const nodePath = path.join(standaloneDir, "_node_modules");

    serverProcess = spawn(process.execPath, [serverScript], {
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: "localhost",
        ELECTRON_RUN_AS_NODE: "1",
        NODE_PATH: nodePath,
        DATA_DIR: app.getPath("userData"),
      },
      cwd: standaloneDir,
      stdio: "pipe",
    });

    serverProcess.stdout?.on("data", (chunk: Buffer) => {
      const msg = chunk.toString();
      process.stdout.write(`[next] ${msg}`);
      if (msg.includes("Ready") || msg.includes("started server")) {
        resolve();
      }
    });

    serverProcess.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(`[next] ${chunk.toString()}`);
    });

    setTimeout(resolve, 8000);
  });
}

function createWindow(url: string) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Life Dashboard",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(url);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", async () => {
  if (isDev) {
    createWindow(DEV_SERVER_URL);
  } else {
    const port = await getFreePort();
    await startServer(port);
    createWindow(`http://localhost:${port}`);
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && isDev) {
    createWindow(DEV_SERVER_URL);
  }
});
