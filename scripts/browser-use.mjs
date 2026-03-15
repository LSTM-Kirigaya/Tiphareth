#!/usr/bin/env node
/**
 * Browser Use 快捷命令
 * 
 * 用法:
 *   npm run browser -- "任务描述"
 *   node scripts/browser-use.mjs "任务描述"
 *   node scripts/browser-use.mjs --headed "任务描述"
 * 
 * 或者使用 npx 直接运行:
 *   npx browser-use task "任务描述"
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// 解析参数
const args = process.argv.slice(2);
const useHeaded = args.includes('--headed') || args.includes('-h');
const useCloud = args.includes('--cloud') || args.includes('-c');
const useScraper = args.includes('--scrape') || args.includes('-s');

// 过滤掉选项，只保留任务描述
const taskArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
const task = taskArgs.join(' ');

if (!task && !useScraper) {
    console.log(`
🌐 Browser Use 快捷命令

用法:
  npm run browser -- "你的任务描述"
  node scripts/browser-use.mjs "你的任务描述"
  
选项:
  --headed, -h     显示浏览器窗口
  --cloud, -c      使用 Browser Use Cloud
  --scrape, -s     使用网页抓取模式

示例:
  npm run browser -- "查找 browser-use GitHub 仓库的 star 数量"
  npm run browser -- --headed "访问 example.com"
  npm run browser -- --scrape "https://news.ycombinator.com" "获取前10条新闻"

或者直接使用 browser-use CLI:
  browser-use task "你的任务"
  browser-use open https://github.com
  browser-use --help
`);
    process.exit(0);
}

// 确定要运行的脚本
let command;
let commandArgs;

if (useScraper) {
    // 网页抓取模式
    const url = taskArgs[0];
    const instruction = taskArgs.slice(1).join(' ');
    if (!url || !instruction) {
        console.error('❌ 网页抓取模式需要 URL 和指令');
        console.error('   示例: npm run browser -- --scrape https://example.com "提取标题"');
        process.exit(1);
    }
    command = 'python3';
    commandArgs = [
        resolve(projectRoot, '.agents/skills/browser-use/scripts/web_scraper.py'),
        url,
        instruction,
        ...(useHeaded ? ['--headed'] : [])
    ];
} else {
    // 普通 Agent 模式
    command = 'python3';
    commandArgs = [
        resolve(projectRoot, '.agents/skills/browser-use/scripts/browser_agent.py'),
        task,
        ...(useHeaded ? ['--headed'] : []),
        ...(useCloud ? ['--cloud'] : [])
    ];
}

console.log(`\n🚀 启动 Browser Use...`);
console.log(`📋 任务: ${task}\n`);

// 运行脚本
const child = spawn(command, commandArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
    }
});

child.on('close', (code) => {
    process.exit(code);
});
