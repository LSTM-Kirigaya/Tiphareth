# Scripts

## check-env.mjs

环境依赖检查与安装脚本，用于验证项目运行所需的外部命令行工具是否就绪。

### 用法

```bash
# 仅检查
npm run check-env
# 或
node scripts/check-env.mjs

# 检查并尝试自动安装缺失项（npm/pip 可安装的）
npm run check-env:install
# 或
node scripts/check-env.mjs --install
```

### 检查的依赖

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| Node.js | 项目运行 | [nodejs.org](https://nodejs.org) |
| npm | 依赖管理 | 随 Node.js 安装 |
| git | OpenMCP 发布时拉取更新 | [git-scm.com](https://git-scm.com) |
| vsce | 发布到 VSCode 商城 | `npm install -g @vscode/vsce` |
| ovsx | 发布到 Open VSX | `npm install -g ovsx` |
| gh | 发布 GitHub Release | [cli.github.com](https://cli.github.com) |
| lsof | TIP 端口占用检测（仅 Linux/macOS） | 系统通常自带 |

### 使用场景

- **核心运行**：Node.js、npm 必需
- **新闻/GitHub 功能**：使用内部 Playwright+Turndown 实现，需先执行 `npx playwright install chromium`
- **OpenMCP 发布**：需 git、vsce、ovsx、gh
