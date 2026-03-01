import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { OmAgent } from 'openmcp-sdk/service/sdk';

export const OPENMCP_CLIENT = os.homedir() + '/project/openmcp-client';

export async function updateOpenMCP(): Promise<void> {
    const stashResult = execSync('git stash', { cwd: OPENMCP_CLIENT, env: process.env });
    console.log(stashResult.toString());

    const updateResult = execSync('git pull origin main', { cwd: OPENMCP_CLIENT, env: process.env });
    console.log(updateResult.toString());

    const installResult = execSync('npm i', { cwd: OPENMCP_CLIENT });
    console.log(installResult.toString());
}

export async function buildOpenMCP(): Promise<string> {
    const commands = [
        'rm -rf openmcp-sdk',
        'npm run build:news',
        'rm -f *.vsix',
        'npm run build:plugin'
    ];

    for (const command of commands) {
        const result = execSync(command, { cwd: OPENMCP_CLIENT });
        console.log(result.toString());
    }

    const vsixFile = fs.readdirSync(OPENMCP_CLIENT).find(file => file.endsWith('.vsix'));
    if (!vsixFile) {
        throw new Error('No vsix file found');
    }
    const vsixPath = path.join(OPENMCP_CLIENT, vsixFile);

    return vsixPath;
}

export function getLastChangeLog(): string {
    const changelog = fs.readFileSync(path.join(OPENMCP_CLIENT, 'CHANGELOG.md'), { encoding: 'utf-8' });
    const newContent = changelog.split('## [main]')[1];
    const version = newContent.split('\n')[0];
    const updateContent = newContent.split('\n').slice(1).join('\n');
    return `✴️ openmcp client ${version} 更新内容\n\n` + updateContent.trim() + '\n\n在 vscode/trae/cursor 等编辑器的插件商城搜索【openmcp】就可以下载最新的版本了！';
}

export function getVersion(): string {
    const changelog = fs.readFileSync(path.join(OPENMCP_CLIENT, 'CHANGELOG.md'), { encoding: 'utf-8' });
    const newContent = changelog.split('## [main]')[1];
    const version = newContent.split('\n')[0];
    return version.trim();
}

async function getChangeLogEnglish(updateContent: string): Promise<string> {
    const agent = new OmAgent();
    agent.setDefaultLLM({
        baseURL: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        apiToken: process.env.OPENAI_MODEL
    });

    const message = '请将下面的更新日志翻译成 GitHub release 风格的英文说明，请只返回翻译后的结果，不要出现任何多余的前缀：\n' + updateContent;

    try {
        const result = await agent.ainvoke({ messages: message });
        return result.toString();
    } catch (error) {
        return updateContent;
    }
}

export async function publishVsix(vsix: string, tool: string): Promise<string> {
    if (!fs.existsSync(vsix)) {
        throw new Error('vsix 文件不存在');
    }

    const buffer = execSync(tool + ' publish -i ' + vsix, { cwd: OPENMCP_CLIENT });
    return buffer.toString('utf-8').trim();
}

export async function publishGithubRelease(vsix: string): Promise<string> {
    if (!fs.existsSync(vsix)) {
        throw new Error('vsix 文件不存在');
    }

    const changelog = fs.readFileSync(path.join(OPENMCP_CLIENT, 'CHANGELOG.md'), { encoding: 'utf-8' });
    const newContent = changelog.split('## [main]')[1];
    const version = newContent.split('\n')[0].trim();
    const tag = 'v' + version;
    const updateContent = newContent.split('\n').slice(1).join('\n');
    const notes = await getChangeLogEnglish(updateContent);
    const escapedNotes = notes
        .replace(/"/g, '\\"')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

    const toolCmd = `gh release create ${tag} ${vsix} --title "openmcp client ${tag}" --notes "${escapedNotes}"`;

    const buffer = execSync(toolCmd, { cwd: OPENMCP_CLIENT });
    return buffer.toString('utf-8').trim();
}
