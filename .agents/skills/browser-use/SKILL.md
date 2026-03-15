---
name: browser-use
description: Browser automation tool for AI agents. Use when needing to automate browser tasks, scrape web pages, interact with websites, take screenshots, fill forms, or perform any web automation. Supports both CLI commands and Python Agent API.
---

# Browser Use - AI 浏览器自动化

Browser Use 是一个让 AI 能够控制浏览器自动化执行任务的工具。

## 已安装命令

全局可用的命令：
- `browser-use` - 主要命令行工具
- `browser-use-tui` - TUI 界面
- `bu` - 快捷命令

## 快速开始

### 1. 安装 Chromium（首次使用）

```bash
browser-use install
```

### 2. 运行第一个任务

```bash
# 使用命令行直接执行
cd /Users/kirigaya/project/qqbot/Tiphareth && browser-use task "查找 browser-use GitHub 仓库的 star 数量"

# 或使用项目中的 Python 脚本
python scripts/browser_agent.py "查找 browser-use GitHub 仓库的 star 数量"
```

### 3. 生成模板代码

```bash
# 默认模板
browser-use init --template default --output ./browser_agent.py

# 高级模板（包含所有配置选项）
browser-use init --template advanced --output ./browser_agent_advanced.py

# 工具扩展示例
browser-use init --template tools --output ./browser_agent_tools.py
```

## CLI 命令参考

### 浏览器控制

```bash
# 打开网页
browser-use open https://github.com/browser-use/browser-use

# 查看当前页面可点击元素
browser-use state

# 点击元素（通过索引）
browser-use click 5

# 输入文本
browser-use type "Hello World"

# 在特定元素输入
browser-use input 3 "搜索内容"

# 截图
browser-use screenshot page.png

# 返回上一页
browser-use back

# 滚动页面
browser-use scroll down
browser-use scroll up

# 关闭浏览器
browser-use close
```

### 任务执行

```bash
# 执行完整任务
browser-use task "在 GitHub 上搜索 browser-use 并获取 README 内容"

# 使用特定会话
browser-use task --session my-session "访问 example.com"

# 使用有头模式（显示浏览器窗口）
browser-use task --headed "访问 example.com"
```

### 其他命令

```bash
# 切换标签页
browser-use switch 1

# 关闭标签页
browser-use close-tab

# 获取 Cookie
browser-use cookies

# 等待页面加载
browser-use wait 3

# 执行 JavaScript
browser-use eval "document.title"

# 提取页面数据
browser-use extract "所有链接"

# 鼠标悬停
browser-use hover 5

# 双击
browser-use dblclick 5

# 右键点击
browser-use rightclick 5
```

## Python API 使用

### 基础示例

```python
from browser_use import Agent, Browser, ChatBrowserUse
import asyncio

async def main():
    browser = Browser()
    agent = Agent(
        task="Find the number of stars of the browser-use repo",
        llm=ChatBrowserUse(),
        browser=browser,
    )
    result = await agent.run()
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

### 使用其他 LLM

```python
from browser_use import ChatOpenAI, ChatAnthropic, ChatGoogle

# OpenAI
llm = ChatOpenAI(model='gpt-4o')

# Anthropic
llm = ChatAnthropic(model='claude-sonnet-4-6')

# Google
llm = ChatGoogle(model='gemini-2-flash')
```

### 使用 Cloud 浏览器

```python
browser = Browser(use_cloud=True)
```

## 环境变量配置

在项目 `.env` 文件中添加：

```bash
# Browser Use Cloud API Key（可选，用于 cloud 模式）
BROWSER_USE_API_KEY=your-api-key

# 其他 LLM API Keys
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx
```

## 项目脚本

项目提供了以下辅助脚本：

### browser_agent.py
基础 Agent 脚本，执行单个任务：

```bash
python scripts/browser_agent.py "你的任务描述"
```

### web_scraper.py
网页抓取专用脚本，提取结构化数据：

```bash
python scripts/web_scraper.py "https://example.com" "提取所有文章标题和链接"
```

## 自定义工具

```python
from browser_use import Tools

tools = Tools()

@tools.action(description='Save data to file')
def save_data(filename: str, content: str) -> str:
    with open(filename, 'w') as f:
        f.write(content)
    return f"Saved to {filename}"

agent = Agent(
    task="Your task",
    llm=llm,
    browser=browser,
    tools=tools,
)
```

## 注意事项

1. **首次使用**：需要先运行 `browser-use install` 安装 Chromium
2. **API Key**：如果使用 Browser Use Cloud，需要设置 `BROWSER_USE_API_KEY`
3. **会话保持**：CLI 命令会保持浏览器会话，可使用 `--session` 指定不同会话
4. **代理设置**：如需代理，可在代码中配置 Browser 实例

## 参考资料

- 官方文档：https://docs.browser-use.com
- GitHub：https://github.com/browser-use/browser-use
- 详细 API 文档见 [references/api.md](references/api.md)
