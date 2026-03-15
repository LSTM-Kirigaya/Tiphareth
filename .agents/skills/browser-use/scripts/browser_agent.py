#!/usr/bin/env python3
"""
Browser Use Agent 脚本 - 执行单个浏览器自动化任务

用法:
    python browser_agent.py "你的任务描述"
    python browser_agent.py "在 GitHub 搜索 browser-use" --headed
    python browser_agent.py "获取 example.com 的标题" --cloud
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# 加载项目 .env 文件
def load_env():
    project_root = Path(__file__).parent.parent.parent.parent
    env_file = project_root / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip().strip('"\''))

load_env()

from browser_use import Agent, Browser, ChatBrowserUse, ChatOpenAI


async def run_task(task: str, headed: bool = False, use_cloud: bool = False):
    """运行浏览器任务"""
    
    # 配置浏览器
    browser_config = {
        "headed": headed,
    }
    if use_cloud:
        browser_config["use_cloud"] = True
    
    browser = Browser(**browser_config)
    
    # 配置 LLM - 优先使用环境变量中的 OpenAI，否则使用 BrowserUse
    if os.getenv("OPENAI_API_KEY"):
        llm = ChatOpenAI(model="gpt-4o-mini")
        print(f"🤖 使用 OpenAI GPT-4o-mini")
    else:
        llm = ChatBrowserUse()
        print(f"🤖 使用 BrowserUse 默认 LLM")
    
    # 创建 Agent
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
    )
    
    print(f"\n🎯 任务: {task}")
    print(f"🌐 浏览器: {'有头模式' if headed else '无头模式'}")
    print(f"☁️  Cloud: {'是' if use_cloud else '否'}\n")
    
    try:
        result = await agent.run()
        print(f"\n✅ 任务完成！")
        print(f"📊 结果:\n{result}")
        return result
    except Exception as e:
        print(f"\n❌ 任务失败: {e}")
        raise
    finally:
        await browser.close()


def main():
    parser = argparse.ArgumentParser(description="Browser Use Agent")
    parser.add_argument("task", help="要执行的任务描述")
    parser.add_argument("--headed", action="store_true", help="显示浏览器窗口")
    parser.add_argument("--cloud", action="store_true", help="使用 Browser Use Cloud")
    
    args = parser.parse_args()
    
    try:
        asyncio.run(run_task(args.task, args.headed, args.cloud))
    except KeyboardInterrupt:
        print("\n\n⚠️  任务被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
