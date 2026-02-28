import axios from "axios";

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function checkAndKillProcessOnPort(port: number) {
    try {
        // 查找占用端口的进程
        const { stdout } = await execAsync(`lsof -i :${port}`);
        const lines = stdout.trim().split('\n');
        
        if (lines.length > 1) {
            // 第一行是标题行，第二行是进程信息
            const processInfo = lines[1].split(/\s+/);
            const pid = processInfo[1];
            
            console.log(`Killing process with PID ${pid} on port ${port}`);
            await execAsync(`kill -9 ${pid}`);
            console.log(`Process with PID ${pid} killed successfully.`);
        } else {
            console.log(`No process found on port ${port}.`);
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('command not found')) {
            console.error('lsof command not found. Please install lsof to use this script.');
        }
    }
}

export function parseCommand(text: string) {
    if (text.startsWith(':')) {
        text = text.substring(1);
    } else {
        return;
    }

    const command = text.split(' ')[0];
    const args = text.split(' ').slice(1);
    return {
        command,
        args
    }
}

export function wait(timeout: number) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(void 0);
        }, timeout);
    })
}


export async function sendMessageToDiscord(message: string) {
    const ip = process.env['OMCP_DISCORD_SERVER_IP'];
    const port = process.env['OMCP_DISCORD_SERVER_PORT'];
    const token = process.env['OMCP_DISCORD_TOKEN'];
    try {
        const response = await axios({
            method: 'post',
            url: `http://${ip}:${port}/api/message`,
            headers: {
                'Authorization': token,
                'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'Host': `${ip}:${port}`,
                'Connection': 'keep-alive'
            },
            data: {
                content: message,
                channel: '1368185363549651107'
            }
        });

        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}