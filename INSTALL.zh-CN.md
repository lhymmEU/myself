[English](./INSTALL.md)

# Life Dashboard — 安装指南（零基础用户专用）

本指南面向**从未打开过命令行终端**的用户。它会一步一步带你从一台全新的电脑，走到浏览器里能打开 `http://localhost:3000` 的运行中的面板。

适用于 **Windows 10/11** 和 **macOS**。每一步都会按操作系统分别给出说明，挑你自己用的那一段看就行。

---

## 第 1 步：安装两个必备程序

你只需要安装两个免费程序。装完后，**关闭并重新打开**所有的终端窗口，让系统识别新装的程序。

### 1a. Node.js（必装）

Node.js 是运行面板的引擎。本面板要求 **20 及以上版本**。

1. 在浏览器里打开 https://nodejs.org/
2. 点击中间那个绿色大按钮 **"LTS"**（长期支持版）。当前应该写着 "LTS — Recommended for Most Users"。
3. 双击下载好的安装包：
   - **Windows**：一路点 "Next"，全部用默认值。看到 "Tools for Native Modules" 这一项时，**保持默认勾选**，可以省掉后续不少麻烦。
   - **macOS**：双击 `.pkg` 文件，按提示完成安装。
4. 安装完成后，**关闭所有已打开的终端窗口**，再开一个新的（开终端的方法见下面第 3 步）。在新终端里输入：

   ```
   node -v
   ```

   如果显示类似 `v22.11.0` 就说明成功了。如果提示 "command not found"，重启电脑后再试一次。

### 1b. Git（必装）

Git 用来从 GitHub 下载项目源代码。

- **Windows**：从 https://git-scm.com/ 下载并安装，全部使用默认选项。
- **macOS**：按 Cmd+空格，搜索 "终端" 并打开，输入：

  ```
  git --version
  ```

  如果系统弹窗提示安装 "命令行开发者工具"，点击 **安装**，等待安装完成即可（其中已经包含 Git）。

---

## 第 2 步：下载项目

下面三种方式三选一即可，结果完全一样。

### 方式 A — 使用 Git（推荐）

1. 在你想存放项目的文件夹里打开终端（放桌面也可以）。
   - **Windows**：用文件资源管理器进入目标文件夹，在顶部地址栏里输入 `cmd` 然后回车。
   - **macOS**：在 Finder 里进入目标文件夹，**右键**该文件夹，选择 **"在文件夹位置打开新建终端窗口"**。（如果右键里没这个菜单，到 系统设置 → 键盘 → 键盘快捷键 → 服务 里把它打开。）
2. 输入下面两行，按回车执行：

   ```
   git clone https://github.com/lhymmEU/myself.git
   cd myself
   ```

### 方式 B — 下载 ZIP 压缩包

1. 浏览器打开 https://github.com/lhymmEU/myself
2. 点击绿色的 **"Code"** 按钮，再点 **"Download ZIP"**。
3. 解压后会得到一个名为 `myself-main` 的文件夹。**把它重命名为 `myself`**，方便后续命令对照。
4. 用方式 A 第 1 步的右键技巧，在这个文件夹里打开终端。

### 方式 C — GitHub Desktop

1. 从 https://desktop.github.com/ 安装 GitHub Desktop。
2. 在 GitHub Desktop 中选择 **File → Clone repository → URL**，粘贴 `https://github.com/lhymmEU/myself`。
3. 选定本地保存路径后点击 **Clone**。
4. 在左侧仓库列表中右键，选择 **"Open in Terminal"**（macOS）或 **"Open in Command Prompt"**（Windows）。

第 2 步结束时，你的终端**当前位置**应该在 `myself` 文件夹里。可以输入 `dir`（Windows）或 `ls`（macOS）确认 —— 应该能看到 `package.json`、`setup.sh` 这些文件。

---

## 第 3 步：运行安装脚本

安装脚本会检查环境、安装所有依赖、编译应用。一般需要 1–3 分钟。

### macOS / Linux

在第 2 步打开的那个终端里输入：

```
chmod +x setup.sh
./setup.sh
```

第一行授予脚本执行权限，第二行运行脚本。

### Windows — 命令提示符（CMD）

```
setup.bat
```

### Windows — PowerShell

PowerShell 默认会拦截未签名的脚本。**必须**用下面这种方式启动：

```
powershell -ExecutionPolicy Bypass -File setup.ps1
```

如果最后看到绿色的 **"Setup complete!"** 就成功了。如果看到红色错误，跳到下面的 **第 5 步 — 常见错误**。

---

## 第 4 步：启动面板

在同一个终端里输入：

```
npm run dev
```

几秒钟后会看到类似输出：

```
- Local:        http://localhost:3000
- Ready in 2.3s
```

打开浏览器访问 **http://localhost:3000**，面板就跑起来了。第一次访问时，本地数据库会自动创建，无需额外配置。

要停止面板，回到终端按 **Ctrl+C**（Windows 和 Mac 都一样）。下次想再启动，进入 `myself` 文件夹再次执行 `npm run dev` 即可。

---

## 第 5 步：常见错误及解决方法

### "Cannot resolve module '@noble/hashes/scrypt'"

这是旧版本项目的打包问题，当前版本已经修复。如果你仍然遇到：

1. 确保项目代码是最新的。用 Git 的话执行 `git pull`；用 ZIP 包的话重新下载并替换文件夹。
2. 删除构建缓存和依赖文件夹：
   - **Windows**：`rmdir /s /q .next` 和 `rmdir /s /q node_modules`
   - **macOS / Linux**：`rm -rf .next node_modules`
3. 重新执行第 3 步的安装脚本。

### Windows 下安装时报 "node-gyp" 或 "better-sqlite3" 错误

面板用到一个体积很小的本地数据库驱动，需要 Microsoft 免费的 C++ 编译器。

1. 从 https://visualstudio.microsoft.com/visual-cpp-build-tools/ 下载 **Visual Studio Build Tools**。
2. 运行安装器。在 **"工作负荷"** 选项卡里**勾选** "使用 C++ 的桌面开发"，点击安装。
3. 重启终端，重新运行 `setup.bat`（或 `setup.ps1`）。

如果不想装 Visual Studio Build Tools，更省事的做法是改用 **Node.js v22 LTS** 安装包（https://nodejs.org/），它自带预编译的数据库驱动。

### PowerShell 提示 "running scripts is disabled on this system"

你直接 `./setup.ps1` 运行了。请改用绕过策略的写法：

```
powershell -ExecutionPolicy Bypass -File setup.ps1
```

### "Port 3000 is already in use"（端口被占用）

3000 端口被其他程序占用。换个端口启动：

```
npm run dev -- -p 3001
```

然后访问 http://localhost:3001 即可。

### `npm install` 极慢或卡住不动

很可能是网络较慢或被墙。先换网络再试。如果在公司内网，向 IT 询问代理地址，然后执行：

```
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
```

（地址替换成 IT 给你的真实值。）

### 安装完 Node.js 后输入 node 仍然提示 "command not found"

务必**完全关闭**所有已打开的终端，再开一个新窗口。Windows 上有时需要注销重登或重启电脑，环境变量才会刷新。

---

## 接下来读什么

- 想了解面板里**每个功能怎么用**，请看 **[USER_MANUAL.zh-CN.md](./USER_MANUAL.zh-CN.md)**。
- 想看面向开发者的技术 README，请看 [README.zh-CN.md](./README.zh-CN.md)。

如果遇到本指南没覆盖的问题，欢迎在 GitHub 提 Issue，包含：
- 卡在了哪一步，
- 完整的错误信息，
- 你的操作系统（例如 "Windows 11"）。
