#!/usr/bin/env python3
"""
网页抓取脚本 - 从指定 URL 提取结构化数据

用法:
    python web_scraper.py "https://example.com" "提取所有文章标题"
    python web_scraper.py "https://news.ycombinator.com" "获取前10条新闻的标题和链接" --output news.json
"""

import argparse
import asyncio
import json
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
from pydantic import BaseModel
from typing import List, Optional


class ScrapedItem(BaseModel):
    """抓取的数据项"""
    title: str
    url: Optional[str] = None
    description: Optional[str] = None


class ScrapedData(BaseModel):
    """抓取结果"""
    items: List[ScrapedItem]
    summary: Optional[str] = None


async def scrape_url(url: str, instruction: str, output_file: Optional[str] = None):
    """抓取网页数据"""
    
    browser = Browser(headed=False)
    
    # 配置 LLM
    if os.getenv("OPENAI_API_KEY"):
        llm = ChatOpenAI(model="gpt-4o-mini")
    else:
        llm = ChatBrowserUse()
    
    # 构建任务
    task = f"""
访问 {url}，然后{instruction}。

请以 JSON 格式返回结果，包含以下字段：
- items: 数组，每个元素包含 title, url（可选）, description（可选）
- summary: 对整个页面的简要总结（可选）

如果页面需要滚动加载更多内容，请适当滚动。
"""
    
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
    )
    
    print(f"\n🌐 目标 URL: {url}")
    print(f"📝 抓取指令: {instruction}\n")
    
    try:
        result = await agent.run()
        
        # 尝试解析 JSON 结果
        try:
            # 查找 JSON 内容
            import re
            json_match = re.search(r'\{.*\}', result, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = {"raw_result": result}
        except json.JSONDecodeError:
            data = {"raw_result": result}
        
        # 输出结果
        formatted = json.dumps(data, indent=2, ensure_ascii=False)
        print(f"\n📊 抓取结果:\n{formatted}")
        
        # 保存到文件
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(formatted)
            print(f"\n💾 结果已保存到: {output_file}")
        
        return data
        
    except Exception as e:
        print(f"\n❌ 抓取失败: {e}")
        raise
    finally:
        await browser.close()


def main():
    parser = argparse.ArgumentParser(description="Web Scraper using Browser Use")
    parser.add_argument("url", help="要抓取的网页 URL")
    parser.add_argument("instruction", help="抓取指令（如：提取所有文章标题）")
    parser.add_argument("--output", "-o", help="输出文件路径（JSON格式）")
    parser.add_argument("--headed", action="store_true", help="显示浏览器窗口（调试用）")
    
    args = parser.parse_args()
    
    try:
        asyncio.run(scrape_url(args.url, args.instruction, args.output))
    except KeyboardInterrupt:
        print("\n\n⚠️  抓取被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
