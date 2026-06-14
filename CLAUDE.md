# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目说明

KZCode 是 [opencode](https://github.com/anomalyco/opencode) 的个人 fork，用于中文用户，主要改动：品牌名 OpenCode → KZCode、全量中文翻译、粉色默认主题、额外内置配色方案。

## 开发命令

```bash
bun install                              # 安装依赖
bun dev                                  # 运行 CLI（含 TUI）
bun dev <目录>                           # 对指定目录运行
bun dev serve                            # 启动无头 API 服务器（端口 4096）
bun dev web                              # 启动 Web UI
bun dev:desktop                          # 启动 Electron 桌面应用
bun lint                                 # oxlint 检查
bun typecheck                            # 全包 TypeScript 检查（Turbo）

# 单包开发
bun run --cwd packages/app dev           # Web UI（http://localhost:5173）
bun run --cwd packages/desktop dev       # Electron 开发模式

# 构建
bun run script/build.ts                  # 构建独立 CLI
bun run script/build.ts --single         # 单平台可执行文件

# 测试（在具体包目录下运行）
bun test
bun test --only-failures
bun test --watch
bun run test:e2e                         # Playwright E2E（packages/app 下）
```

## Monorepo 架构

```
packages/
├── opencode/      CLI 入口（yargs），含所有子命令
├── core/          核心业务逻辑、SQLite 存储、会话管理
├── llm/           LLM 提供商抽象层（Vercel AI SDK，支持 10+ provider）
├── tui/           终端 UI（SolidJS + OpenTUI）
├── app/           浏览器 Web UI（SolidJS，含 i18n）
├── desktop/       Electron 桌面应用（包装 packages/app）
├── ui/            共享组件库（Web 与桌面共用）
├── server/        REST API 服务（Hono）
├── sdk/           对外 TypeScript SDK
├── plugin/        插件系统（@opencode-ai/plugin，已发布 npm）
├── console/       SaaS 控制台（Stripe、AWS、多租户）
├── web/           营销/文档站（Astro）
└── script/        构建与打包脚本
```

### 数据流

```
CLI (opencode) → Core Session Runner → LLM Provider Router → AI SDK (Anthropic/OpenAI/...)
TUI (tui)  ──────────────↗ 使用 Core + SDK，SolidJS 渲染
Web (app)  → API Server (server) → Core Logic
Desktop    → 嵌入 packages/app（Electron）
```

### 关键技术

- **运行时 / 包管理**：Bun 1.3.14+，Turbo 用于 monorepo 编排
- **UI 框架**：SolidJS（细粒度响应式，无虚拟 DOM）
- **函数式并发**：Effect-ts 4.x（错误处理、结构化并发）
- **数据库**：Drizzle ORM + SQLite（Bun/Node 两套条件导出）
- **样式**：Tailwind CSS 4.x
- **HTTP**：Hono
- **Lint**：oxlint（Rust 实现）+ Prettier（semi: false, printWidth: 120）

## KZCode 定制化说明

### 需要同步修改的文件对

添加/修改任何面向用户的字符串时，**必须**同时更新：
- `packages/app/src/i18n/en.ts`
- `packages/app/src/i18n/zh.ts`

### 品牌相关文件

| 文件 | 内容 |
|------|------|
| `packages/tui/src/logo.ts` | KZCode ASCII logo |
| `packages/desktop/electron-builder.config.ts` | APP ID、productName、scheme、构建产物名 |
| `packages/app/src/utils/persist.ts` | localStorage 键名前缀（`kzcode.*`） |
| `packages/app/src/desktop-menu.ts` | macOS 菜单标签 |
| `packages/tui/src/app.tsx` | 终端标题、更新提示文案 |

### 主题文件

| 文件 | 作用 |
|------|------|
| `packages/ui/src/theme/themes/kzcode.json` | 默认粉色主题（dark #f72585 / light #d00060） |
| `packages/ui/src/theme/themes/kzcode-ocean.json` | 蓝/青主题 |
| `packages/ui/src/theme/themes/kzcode-forest.json` | 绿色主题 |
| `packages/ui/src/theme/themes/kzcode-midnight.json` | 深紫主题 |
| `packages/ui/src/theme/default-themes.ts` | 注册上述主题 |
| `packages/ui/src/theme/context.tsx` | 默认主题 ID = `"kzcode"` |
| `packages/tui/src/theme/assets/opencode.json` | TUI 粉色调色板 |
| `packages/tui/src/theme/index.ts` | `kzcode` 别名 → `opencode` |
| `packages/tui/src/context/theme.tsx` | TUI 默认主题 = `"kzcode"` |

### 有意保留不变的上游标识

- npm 包名 `@opencode-ai/*`（改动需修改 200+ import）
- CLI 二进制名 `opencode`（由 `OPENCODE_CLI_NAME` 环境变量在构建时覆盖）
- 配置路径 `.opencode/`、`~/.config/opencode/`（后端深度依赖）
- 其他 16 种语言文件（bs.ts、de.ts、fr.ts 等）中的 "OpenCode" 字符串
- GitHub workflow URL、Docker 镜像名

## 代码规范

- 格式化：Prettier，`semi: false`，`printWidth: 120`
- 条件导出：SQLite、PTY 等 native 模块有 Bun / Node.js 两套实现，修改时注意两路都覆盖
- Effect-ts 用于所有异步/错误处理密集的 Core 逻辑；新增 Core 功能应遵循此模式
