#!/usr/bin/env node
/**
 * 环境依赖检查与安装脚本
 * 用法: node scripts/check-env.mjs [--install]
 * 加 --install 时会尝试自动安装缺失项（需确认）
 */

import { execSync } from 'child_process';
import { platform } from 'os';

const isWindows = platform() === 'win32';
const withInstall = process.argv.includes('--install');

const checks = [
    {
        name: 'Node.js',
        cmd: 'node',
        args: ['-e', '1'],
        required: true,
        install: '从 https://nodejs.org 安装',
        usedBy: '项目运行',
    },
    {
        name: 'npm',
        cmd: 'npm',
        args: ['-v'],
        required: true,
        install: '随 Node.js 一并安装',
        usedBy: '依赖管理',
    },
    {
        name: 'git',
        cmd: 'git',
        args: ['--version'],
        required: false,
        install: 'https://git-scm.com 或系统包管理器',
        usedBy: 'OpenMCP 发布（openmcp-publish）',
    },
    {
        name: 'vsce',
        cmd: 'vsce',
        args: ['--version'],
        required: false,
        install: 'npm install -g @vscode/vsce',
        usedBy: '发布 OpenMCP 到 VSCode 商城',
    },
    {
        name: 'ovsx',
        cmd: 'ovsx',
        args: ['--version'],
        required: false,
        install: 'npm install -g ovsx',
        usedBy: '发布 OpenMCP 到 Open VSX',
    },
    {
        name: 'gh',
        cmd: 'gh',
        args: ['--version'],
        required: false,
        install: 'https://cli.github.com 或 winget install GitHub.cli',
        usedBy: '发布 OpenMCP 到 GitHub Release',
    },
    ...(!isWindows
        ? [
              {
                  name: 'lsof',
                  cmd: 'lsof',
                  args: ['-v'],
                  required: false,
                  install: '系统通常自带（Linux/macOS）',
                  usedBy: 'TIP 端口占用检测（hook/util.ts）',
              },
          ]
        : []),
];

function check(c) {
    try {
        const cmd = [c.cmd, ...c.args].join(' ');
        execSync(cmd, { stdio: 'pipe', timeout: 5000, windowsHide: true });
        return true;
    } catch (e) {
        // ENOENT = 命令未找到
        if (e.code === 'ENOENT') return false;
        // status 存在表示命令已执行但返回了非 0
        if (typeof e.status === 'number') return true;
        // Windows: 'xxx' 不是内部或外部命令
        if (e.message && /不是内部或外部命令|'.*' is not recognized/.test(e.message)) return false;
        return true;
    }
}

function runInstall(c) {
    if (c.install.startsWith('npm install')) {
        const pkg = c.install.replace('npm install -g ', '').trim();
        try {
            execSync(`npm install -g ${pkg}`, { stdio: 'inherit' });
            return true;
        } catch (e) {
            return false;
        }
    }
    if (c.install.startsWith('pip install')) {
        const parts = c.install.split(' && ');
        for (const cmd of parts) {
            try {
                execSync(cmd, { stdio: 'inherit', shell: true });
            } catch (e) {
                return false;
            }
        }
        return true;
    }
    return false;
}

console.log('🔍 Lagrange.RagBot 环境依赖检查\n');

let allOk = true;
const missing = [];

for (const c of checks) {
    const { ok } = check(c);
    const status = ok ? '✅' : '❌';
    console.log(`${status} ${c.name.padEnd(12)} ${c.usedBy}`);

    if (!ok) {
        allOk = false;
        missing.push(c);
        console.log(`   └─ 安装: ${c.install}`);
        if (withInstall && (c.install.startsWith('npm install') || c.install.startsWith('pip install'))) {
            console.log('   └─ 正在尝试自动安装...');
            if (runInstall(c)) {
                console.log('   └─ 安装成功 ✅');
            } else {
                console.log('   └─ 自动安装失败，请手动执行上述命令');
            }
        }
    }
}

console.log('');

if (allOk) {
    console.log('✅ 所有依赖已就绪');
} else {
    console.log('❌ 存在缺失依赖，请按上述说明安装');
    if (!withInstall) {
        console.log('\n提示: 使用 node scripts/check-env.mjs --install 尝试自动安装可自动安装的项');
    }
}

process.exit(allOk ? 0 : 1);
