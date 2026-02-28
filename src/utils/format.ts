import { spawn, SpawnOptions } from 'child_process';

export function executeCommand(
    command: string,
    cwd?: string
): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve, reject) => {
        const [cmd, ...args] = command.match(/(?:[^\s"']+|['"][^'"]*['"])+/g) || [];

        if (!cmd) {
            reject(new Error('Empty command'));
            return;
        }

        const processedArgs = args.map(arg =>
            arg.replace(/^['"](.*)['"]$/, '$1')
        );

        if (cwd && cwd.startsWith('~')) {
            cwd = cwd.replace('~', process.env.HOME || '');
        }

        const options: SpawnOptions = {
            cwd,
            stdio: 'pipe',
            shell: process.platform === 'win32',
            env: { ...process.env }
        };

        const child = spawn(cmd, processedArgs, options);

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                code,
            });
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}

export function markdownToPlainText(markdown: string): string {
    let plainText = markdown.replace(/^#+\s*/gm, '');
    plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    plainText = plainText.replace(/\*\*([^*]+)\*\*/g, '$1');
    plainText = plainText.replace(/\*([^*]+)\*/g, '$1');
    plainText = plainText.replace(/`([^`]+)`/g, '$1');
    plainText = plainText.replace(/^-{3,}/gm, '');
    plainText = plainText.replace(/\n{3,}/g, '\n\n');
    return plainText.trim();
}

export function getFormatedTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
}
