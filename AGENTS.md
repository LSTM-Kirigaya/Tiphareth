# AGENTS.md - Lagrange.RagBot (Tiphareth)

> 本文档为 AI 编程助手准备，用于快速理解项目架构和开发规范。

## 项目概述

**Lagrange.RagBot**（内部代号 Tiphareth/TIP）是一个基于 QQ 协议的 RAG (Retrieval-Augmented Generation) LLM 机器人。该项目连接 Lagrange.Core (QQ 协议实现) 和 OneBot 标准，提供智能群聊问答、定时消息推送、新成员欢迎等功能。

### 核心功能

- **智能问答**: 基于意图识别和向量数据库的 RAG 问答系统
- **Agent 对话**: 集成 OpenMCP SDK 的智能 Agent 循环
- **定时任务**: 每日科技新闻、GitHub Trending 推送
- **新成员欢迎**: 自动生成极简设计风格的欢迎卡片 (OG 图)
- **群消息管理**: 群聊历史消息导出与总结

## 技术栈

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js (ES Modules) |
| 语言 | TypeScript 5.8+ |
| 框架 | lagrange.onebot (OneBot V11 协议 SDK) |
| HTTP 服务 | Express 5.x |
| 图像生成 | Satori + Resvg (React JSX → SVG → PNG) |
| 网页抓取 | Playwright + Turndown |
| 数据库 | Realm (读取 Lagrange.Core 消息存储) |
| LLM 集成 | OpenAI API / Instructor (结构化输出) |
| 定时任务 | node-schedule (通过装饰器注册) |

## 项目结构

```
Tiphareth/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── global.ts                  # 全局常量 (QQ群/用户/ES索引)
│   │
│   ├── api/                       # 外部 API 封装
│   │   ├── llm.ts                 # 大模型 API (ErineLLM - 已废弃)
│   │   ├── request.ts             # 向量数据库请求配置
│   │   └── vecdb.ts               # 向量数据库接口类型定义
│   │
│   ├── hook/                      # 框架级钩子与中间件
│   │   ├── http-server.ts         # TIP HTTP 服务 (端口 3021)
│   │   ├── middleware.ts          # Express 认证中间件
│   │   ├── storage.ts             # 存储相关
│   │   ├── es.ts                  # Elasticsearch 连接
│   │   ├── util.ts                # 端口占用检测工具
│   │   └── command.ts             # 命令处理
│   │
│   ├── services/                  # 业务服务层
│   │   ├── qq-agent.ts            # QQ Agent 主循环 (OmAgent)
│   │   ├── intent.ts              # 意图识别服务 (RAG)
│   │   ├── news.ts                # 科技新闻抓取与总结
│   │   ├── github-trending.ts     # GitHub Trending 抓取
│   │   ├── chat-summary.ts        # 聊天总结服务
│   │   ├── group-summary.ts       # 群组消息总结
│   │   ├── web-summary.ts         # 网页内容总结
│   │   ├── openmcp.ts             # OpenMCP 相关服务
│   │   └── test.ts                # 测试服务
│   │
│   ├── test-channel/              # 测试频道控制器
│   │   ├── test-channel.controller.ts
│   │   ├── test-channel.service.ts
│   │   └── website-summary.service.ts
│   │
│   ├── openmcp-dev/               # OpenMCP 开发群控制器
│   │   ├── openmcp-dev.controller.ts   # 主控制器 (新闻/ Trending/欢迎)
│   │   └── openmcp-dev.service.ts      # 服务实现
│   │
│   ├── openclaw/                  # OpenClaw 定时任务脚本
│   │   ├── cron/
│   │   │   ├── daily-news.ts      # 每日新闻定时任务
│   │   │   ├── github-trending.ts # GitHub Trending 定时任务
│   │   │   ├── message-summary.ts # 消息总结定时任务
│   │   │   └── run-test.ts        # 测试运行器
│   │   └── trigger/
│   │       └── welcome.ts         # 欢迎消息触发器
│   │
│   ├── og/                        # Open Graph 图像生成 (Satori)
│   │   ├── welcome-og.tsx         # 新成员欢迎卡片 (800×1200)
│   │   └── daily-og.tsx           # 每日新闻卡片
│   │
│   ├── plugins/                   # lagrange.onebot 插件
│   │   └── image.ts               # 图片下载插件
│   │
│   └── utils/                     # 工具函数
│       ├── websearch.ts           # 网页抓取 (Playwright)
│       ├── reply.ts               # 消息回复工具
│       ├── format.ts              # 格式化工具
│       ├── historyMessages.ts     # 历史消息处理
│       └── bug-logger.ts          # Bug 日志记录
│
├── scripts/                       # 运维脚本
│   ├── check-env.mjs              # 环境依赖检查
│   ├── gen-cron-cmd.mjs           # 生成定时任务命令
│   └── ...
│
├── test/                          # 独立测试项目 (Realm 数据库测试)
│   ├── src/
│   │   └── export-today-group-messages.ts  # 导出群消息
│   └── package.json
│
├── assets/                        # 静态资源
│   ├── fonts/                     # 中文字体 (NotoSansSC)
│   └── images/                    # 二维码图片
│
└── .openmcp/                      # OpenMCP 配置文件
    ├── connection.json
    └── tabs.crawl4ai-mcp.json
```

## 架构说明

### 1. 控制器模式 (Channel-based)

项目使用 **lagrange.onebot** 框架，采用装饰器驱动的控制器模式：

```typescript
// src/openmcp-dev/openmcp-dev.controller.ts
export class OpenMcpChannel {
    // 群消息处理 (@机器人时触发)
    @mapper.onGroup(qq_groups.OPENMCP_DEV, { memorySize: 50, at: true })
    async handleOpenMcpChannel(c: LagrangeContext<GroupMessage>) { ... }

    // 新成员入群
    @mapper.onGroupIncrease(qq_groups.OPENMCP_DEV)
    async handleGroupIncrease(c: LagrangeContext<ApproveMessage>) { ... }

    // 定时任务 (Cron 表达式)
    @mapper.createTimeSchedule('0 0 10 * * *')  // 每天 10:00
    async publishNewsTimer(c: LagrangeContext<Message>) { ... }
}
```

### 2. Agent 循环架构

```
QQ Message → qqAgentLoop() → OmAgent → MCP Server → LLM → Response
                ↓
         Skill Prompts (Markdown)
```

- `qqAgentLoop()` 在 `src/services/qq-agent.ts`
- 使用 `openmcp-sdk` 的 `OmAgent` 类
- 通过 MCP (Model Context Protocol) 与外部工具交互

### 3. OG 图像生成流程

```
Data → React JSX (Satori) → SVG → Resvg → PNG
```

- 使用 **Satori** 将 JSX 转换为 SVG
- 使用 **Resvg** 将 SVG 渲染为 PNG
- 字体: `NotoSansSC-Regular.ttf` / `NotoSansSC-Bold.ttf`
- 输出尺寸: 800×1200 (3x 放大至 2400px)

### 4. 新闻抓取流程

```
HackNews → Playwright 抓取 → Turndown 转 Markdown 
    → Instructor + Zod 结构化提取 → daily-og.tsx 生成图片
```

## 环境变量配置

复制 `.env.example` 为 `.env` 并填写：

```bash
# Lagrange 连接 (正向 WebSocket)
LAGRANGE_WS_TYPE=forward-websocket
LAGRANGE_WS_HOST=192.168.10.1
LAGRANGE_WS_PORT=3001

# 授权用户 (逗号分隔)
AUTHORIZED_USERS=1193466151

# TIP HTTP 服务端口
PORT=3021

# MCP 服务
MCP_HOST=0.0.0.0
MCP_PORT=3010

# LLM 配置
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o

# OMCP Discord 同步 (可选)
OMCP_DISCORD_SERVER_IP=
OMCP_DISCORD_SERVER_PORT=
OMCP_DISCORD_TOKEN=
```

## 构建与运行命令

```bash
# 安装依赖
npm install

# 环境检查
npm run check-env

# 开发运行 (tsx)
npm start
# 或
npx tsx src/main.ts

# 编译 TypeScript
npm run build

# 运行测试
npm test

# 定时任务测试
npm run cron:test-news
npm run cron:test-github
npm run cron:message-summary
```

## 代码规范

### 1. 模块系统
- 使用 **ES Modules** (`"type": "module"` in package.json)
- 导入使用 `.js` 扩展名 (即使源文件是 `.ts`)

### 2. 命名规范
- 类名: `PascalCase` (e.g., `OpenMcpChannel`)
- 方法名: `camelCase` (e.g., `handleGroupIncrease`)
- 常量: `UPPER_SNAKE_CASE` (e.g., `ANZULEAF_WELCOME_CONFIG`)
- 接口名: `PascalCase` (e.g., `WelcomeOGData`)

### 3. 装饰器使用
```typescript
// 群消息处理
@mapper.onGroup(groupId, { at: true, memorySize: 50 })

// 私聊处理
@mapper.onPrivateUser(userId)

// 定时任务 (Cron 语法)
@mapper.createTimeSchedule('0 0 10 * * *')

// 插件注册
@plugins.register('plugin-name')

// 组合使用
@mapper.onPrivateUser(qq_users.JIN_HUI)
@plugins.use('echo')
async handler(c: LagrangeContext<PrivateMessage>) { }
```

### 4. 错误处理
- 使用 `logger.error()` 记录错误 (来自 `lagrange.onebot`)
- 服务层方法返回 `Promise<string | null>` 表示可能失败

### 5. 文件路径处理
```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

## 关键外部依赖

| 依赖 | 用途 |
|------|------|
| `lagrange.onebot` | QQ OneBot V11 协议 SDK |
| `openmcp-sdk` | MCP Agent 框架 |
| `satori` | JSX to SVG 转换 |
| `@resvg/resvg-js` | SVG 渲染为 PNG |
| `playwright` | 网页抓取 |
| `instructor-ai/instructor` | LLM 结构化输出 |
| `zod` | Schema 验证 |
| `realm` | Lagrange 消息数据库读取 |

## 测试策略

- **单元测试**: Mocha (配置在 package.json)
- **集成测试**: test/ 目录下有独立的 TypeScript 项目
- **手动测试**: 通过 `npm run cron:test-*` 运行定时任务

### 测试命令

```bash
# 运行所有测试
npm test

# 测试新闻生成 (不发送)
npm run cron:test-news

# 测试 GitHub Trending
npm run cron:test-github

# 导出群消息 (test 项目)
cd test && npm run export-today
```

## 部署注意事项

1. **Playwright 安装**: 首次运行需执行 `npx playwright install chromium`
2. **字体文件**: 确保 `assets/fonts/` 下的中文字体存在
3. **向量数据库**: 需要独立的 vecdb 服务 (通过 YAML 配置)
4. **Lagrange.Core**: 需独立运行 Lagrange 协议端
5. **端口占用**: TIP HTTP 服务默认使用 3021 端口

## 安全考虑

- HTTP 接口使用 `VALID_AUTH_TOKEN` 进行 Bearer Token 认证
- `.env` 文件包含敏感信息，已加入 `.gitignore`
- QQ 消息中的图片 URL 会进行超时设置 (10秒)
- 群消息导出时会跳过机器人自身发送的消息

## 扩展开发指南

### 添加新的控制器

1. 在 `src/` 下创建新的目录 (e.g., `src/my-channel/`)
2. 创建 `*.controller.ts` 和 `*.service.ts`
3. 在 `src/main.ts` 中注册到 `LagrangeFactory.create([...])`

### 添加新的 OG 模板

1. 在 `src/og/` 创建新的 `.tsx` 文件
2. 使用 Satori + Resvg 模式
3. 字体使用 `NotoSansSC-Regular/Bold.ttf`
4. 导出函数返回 `Promise<string | null>` (PNG 路径)

### 添加新的定时任务

1. 在 `src/openclaw/cron/` 创建脚本
2. 使用 `parseArgs()` 解析命令行参数
3. 支持 `--group` 参数指定目标群
4. 在 package.json 添加运行脚本
