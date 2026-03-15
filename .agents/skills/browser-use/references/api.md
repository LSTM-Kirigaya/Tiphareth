# Browser Use API 参考

## Python API

### Agent 类

```python
from browser_use import Agent

agent = Agent(
    task="任务描述",
    llm=llm_instance,
    browser=browser_instance,
    tools=tools_instance,  # 可选
)
result = await agent.run()
```

### Browser 类

```python
from browser_use import Browser

# 无头模式（默认）
browser = Browser()

# 有头模式（显示窗口）
browser = Browser(headed=True)

# 使用 Cloud
browser = Browser(use_cloud=True)

# 使用特定配置文件
browser = Browser(profile="/path/to/chrome/profile")

# 关闭浏览器
await browser.close()
```

### LLM 类

```python
from browser_use import ChatBrowserUse, ChatOpenAI, ChatAnthropic, ChatGoogle

# Browser Use 自带 LLM（推荐）
llm = ChatBrowserUse()

# 指定模型
llm = ChatBrowserUse(model="browser-use/bu-30b-a3b-preview")

# OpenAI
llm = ChatOpenAI(model="gpt-4o")

# Anthropic
llm = ChatAnthropic(model="claude-sonnet-4-6")

# Google
llm = ChatGoogle(model="gemini-2-flash")
```

### Tools 类

```python
from browser_use import Tools

tools = Tools()

@tools.action(description='工具描述')
def my_tool(param: str) -> str:
    return f"Result: {param}"

agent = Agent(task="...", llm=llm, browser=browser, tools=tools)
```

## CLI 命令完整列表

### 基础命令

| 命令 | 说明 |
|------|------|
| `browser-use install` | 安装 Chromium |
| `browser-use init` | 生成模板代码 |
| `browser-use doctor` | 诊断环境问题 |
| `browser-use setup` | 交互式设置 |

### 浏览器控制

| 命令 | 说明 | 示例 |
|------|------|------|
| `open <url>` | 打开网页 | `browser-use open https://google.com` |
| `state` | 显示可交互元素 | `browser-use state` |
| `click <index>` | 点击元素 | `browser-use click 3` |
| `type <text>` | 输入文本 | `browser-use type "Hello"` |
| `input <index> <text>` | 在特定元素输入 | `browser-use input 5 "search"` |
| `scroll <direction>` | 滚动页面 | `browser-use scroll down` |
| `back` | 返回上一页 | `browser-use back` |
| `screenshot <file>` | 截图 | `browser-use screenshot page.png` |
| `close` | 关闭浏览器 | `browser-use close` |

### 高级操作

| 命令 | 说明 | 示例 |
|------|------|------|
| `switch <index>` | 切换标签页 | `browser-use switch 1` |
| `close-tab` | 关闭当前标签页 | `browser-use close-tab` |
| `eval <js>` | 执行 JavaScript | `browser-use eval "document.title"` |
| `extract <instruction>` | 提取数据 | `browser-use extract "所有链接"` |
| `hover <index>` | 鼠标悬停 | `browser-use hover 5` |
| `dblclick <index>` | 双击 | `browser-use dblclick 3` |
| `rightclick <index>` | 右键点击 | `browser-use rightclick 3` |
| `select <index> <value>` | 选择下拉选项 | `browser-use select 2 "option1"` |
| `cookies` | 获取 cookies | `browser-use cookies` |
| `wait <seconds>` | 等待 | `browser-use wait 3` |
| `keys <key>` | 按键 | `browser-use keys Enter` |

### 任务执行

| 命令 | 说明 | 示例 |
|------|------|------|
| `task <description>` | 执行完整任务 | `browser-use task "搜索 news"` |
| `run <file>` | 运行脚本文件 | `browser-use run script.py` |
| `python <code>` | 执行 Python 代码 | `browser-use python "print(1)"` |
| `get <url>` | GET 请求 | `browser-use get https://api.example.com` |

### 会话管理

| 命令 | 说明 |
|------|------|
| `session` | 显示当前会话 |
| `sessions` | 列出所有会话 |
| `close` | 关闭当前会话 |

### 服务器模式

| 命令 | 说明 |
|------|------|
| `server` | 启动 MCP 服务器 |
| `tunnel` | 创建隧道 |

## 全局选项

```bash
--session SESSION       # 指定会话名称
--browser {chromium,real,remote}  # 浏览器类型
--headed               # 有头模式
--profile PROFILE      # 使用浏览器配置文件
--json                 # JSON 输出格式
--api-key API_KEY      # Browser Use Cloud API Key
--mcp                  # 启用 MCP 模式
```

## 模板类型

- `default` - 基础模板
- `advanced` - 高级配置
- `tools` - 自定义工具示例
