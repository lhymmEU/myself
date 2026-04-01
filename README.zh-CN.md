[English](./README.md)

# Life Dashboard — 个人生活管理面板

一个模块化、AI 就绪的个人生活管理面板。在一个界面中管理生活的方方面面 — 完全本地运行，数据完全属于你。

## 功能

- **思维导图** — 交互式的人生可视化地图。添加分类（健康、职业、财务等）和条目，自由拖拽、连接、组织。
- **智能待办** — 根据思维导图自动生成，无需手动创建。
- **财务终端** — 个人财务管理 + [OpenBB](https://github.com/OpenBB-finance/OpenBB) 驱动的市场数据。涵盖股票、加密货币、经济指标和财经新闻。
- **计划** — 富文本编辑器，用于记录想法、计划和笔记。
- **Claw** — 内置 AI 助手，能理解你的面板数据。
- **发票** — 轻松向客户开具发票。
- **保险箱** — 在本地设备上管理你的密钥和敏感信息。
- **设置** — 通过界面配置 API 密钥、偏好和外观。无需 `.env` 文件。

---

## 安装指南

### 第 1 步 — 安装前置依赖

开始之前，你的电脑需要安装以下软件：

| 软件 | 是否必需？ | 版本要求 | 下载地址 |
|------|-----------|---------|---------|
| **Node.js** | 是 | v18 或更高 | [nodejs.org](https://nodejs.org/) — 选择 **LTS** 版本 |
| **Git** | 是 | 任意版本 | [git-scm.com](https://git-scm.com/) |
| **Python** | 可选 | 3.9–3.12 | [python.org](https://www.python.org/) — 仅在需要财务市场数据时安装 |

**检查是否已安装：**

```bash
node -v     # 应输出 v18.x.x 或更高版本
git --version
```

### 第 2 步 — 下载项目

打开终端（Mac 上的 Terminal，Windows 上的命令提示符或 PowerShell），运行：

```bash
git clone https://github.com/lhymmEU/myself.git
cd myself
```

### 第 3 步 — 安装依赖并构建

**方式 A：一键安装（推荐）**

macOS / Linux：
```bash
./setup.sh
```

Windows：
```
setup.bat
```

脚本会检查你的环境、安装所有依赖并构建应用。

**方式 B：手动安装**

```bash
npm install
```

### 第 4 步 — 启动面板

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。就这么简单 — 数据库会在首次启动时自动创建。

### 第 5 步 — 财务市场数据（可选）

财务页面有两个模式：**个人财务**（立即可用，无需配置）和 **市场资讯**（需要 OpenBB）。

#### 5a. 安装 OpenBB

```bash
pip3 install "openbb[all]"
```

#### 5b. 启动 OpenBB API

在一个 **单独的终端** 中运行：

```bash
openbb-api --host 127.0.0.1 --port 6900
```

使用财务功能时请保持此终端运行。

#### 5c. 配置数据提供商 API 密钥

部分市场数据模块需要数据提供商的免费 API 密钥。未配置密钥时，模块会显示提示信息，告知你需要哪个密钥。

进入 **设置 → 财务数据提供商** 输入你的密钥。每个提供商的注册链接都直接显示在设置面板中。

| 提供商 | 解锁的功能 | 有免费额度？ |
|-------|-----------|------------|
| [BizToc](https://api.biztoc.com) | 全球新闻 | 有 |
| [Benzinga](https://www.benzinga.com/apis) | 公司新闻 | 有 |
| [Financial Modeling Prep](https://financialmodelingprep.com) | ETF 数据、股票筛选器 | 有 |
| [Tradier](https://developer.tradier.com) | 期权链 | 有（沙盒模式） |
| [Polygon.io](https://polygon.io) | 额外市场数据 | 有 |
| [Alpha Vantage](https://www.alphavantage.co) | 股票和外汇数据 | 有 |
| [FRED](https://fred.stlouisfed.org/docs/api/api_key.html) | 美联储经济数据 | 有 |

使用免费提供商（Yahoo Finance、SEC、美联储）的模块无需任何 API 密钥即可正常工作。

#### 运行总览

| 进程 | 命令 | 端口 | 用途 |
|------|-----|------|------|
| Next.js | `npm run dev` | 3000 | 面板主程序 |
| OpenBB *（可选）* | `openbb-api --host 127.0.0.1 --port 6900` | 6900 | 市场数据 API |

---

## Agent API

面板支持 AI Agent 调用。所有功能都通过 `/api/agent` 端点暴露为工具：

```bash
# 列出所有可用工具
curl http://localhost:3000/api/agent

# 执行一个工具
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"name": "createTodo", "arguments": {"title": "买菜"}}'
```

覆盖所有模块的工具（思维导图、待办、财务、计划、设置）。

## 架构

每个功能都是 `lib/modules/<feature>/` 下的独立模块：

```
schema.ts   — Drizzle ORM 数据表定义
actions.ts  — 数据访问函数（增删改查）
tools.ts    — Agent 可调用的工具定义
types.ts    — TypeScript 接口
events.ts   — 事件总线常量
index.ts    — 模块注册
```

核心基础设施（`lib/core/`）：
- **模块注册中心** — 自动发现和初始化模块
- **工具注册中心** — 注册 Agent 可调用的工具，使用 Zod 校验
- **事件总线** — 类型安全的发布/订阅，用于跨模块通信
- **LLM 客户端** — OpenAI SDK 封装，通过 OpenRouter 调用
- **数据库** — SQLite + Drizzle ORM 连接

## 技术栈

- **Next.js 16**（App Router, Turbopack）
- **shadcn/ui** + Tailwind CSS v4 + Lucide React
- **SQLite**，基于 better-sqlite3 + Drizzle ORM（本地运行，零配置）
- **OpenRouter** 提供 LLM 集成（OpenAI SDK）
- **Recharts** 用于财务数据可视化
- **[OpenBB](https://github.com/OpenBB-finance/OpenBB)** 提供市场数据（Python 侧车服务）

## 路线图

查看 [ROADMAP.md](./ROADMAP.md) 了解计划中的功能和即将发布的版本。

## 许可证

[AGPL-3.0](./LICENSE)
