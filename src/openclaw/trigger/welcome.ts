#!/usr/bin/env -S npx tsx
/**
 * 新成员入群欢迎 - 命令行脚本
 *
 * 调用方注入参数：--userId, --username, --groupId（优先于环境变量）
 *
 * 配置（openclaw.json）：
 *   "channels": { "onebot": { "groupIncrease": {
 *     "enabled": true,
 *     "command": "npx tsx src/openclaw/trigger/welcome.ts",
 *     "cwd": "C:/path/to/Tiphareth"
 *   } } }
 */
import path from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    const found = process.argv.find((a) => a.startsWith(prefix));
    if (found) return found.slice(prefix.length);
    const idx = process.argv.indexOf(`--${name}`);
    if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
    return undefined;
}

async function main() {
    const stripQuotes = (s: string) => {
        const t = s.trim();
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
            return t.slice(1, -1);
        return t;
    };
    const groupId = stripQuotes(parseArg("groupId") ?? process.env.GROUP_ID ?? "");
    const groupName = process.env.GROUP_NAME ?? "";
    const userId = stripQuotes(parseArg("userId") ?? process.env.USER_ID ?? "");
    const userName = stripQuotes(parseArg("username") ?? process.env.USER_NAME ?? userId);
    const avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`;

    if (!groupId) {
        console.error("[welcome] GROUP_ID required");
        process.exit(1);
    }

    const tipharethRoot = path.resolve(__dirname, "..", "..", "..");
    process.chdir(tipharethRoot);

    const welcomeOgUrl = pathToFileURL(path.join(__dirname, "..", "..", "og", "welcome-og.tsx")).href;
    const { generateWelcomeOG } = await import(welcomeOgUrl);

    function formatJoinDate(): string {
        const d = new Date();
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    }

    const imagePath = await generateWelcomeOG({
        memberName: userName,
        memberAvatar: avatarUrl,
        joinDate: formatJoinDate(),
        groupName,
        resources: [
            {
                name: "OpenMCP 文档",
                desc: "MCP 开发指南",
                qrCode: "./assets/images/openmcp-document-qr.png"
            },
            {
                name: "GitHub",
                desc: "开源项目源码",
                qrCode: "./assets/images/openmcp-github-qr.png"
            },
            {
                name: "安树社区",
                desc: "独立技术社区",
                qrCode: "./assets/images/anzutree-qr.png"
            }
        ]
    });

    if (!imagePath) {
        console.error("[welcome] generateWelcomeOG failed");
        process.exit(1);
    }

    const absPath = path.isAbsolute(imagePath) ? imagePath : path.resolve(process.cwd(), imagePath);
    const text = `欢迎 ${userName} 加入 ${groupName}`;

    if (process.env.DRY_RUN === "1") {
        console.log(JSON.stringify({ text, imagePath: absPath }));
        return;
    }

    const args = [
        "message", "send",
        "--channel", "onebot",
        "--target", `group:${groupId}`,
        "--media", '"' + absPath + '"',
        "--message", '"' + text + '"',
    ];

    console.log(args);
    

    const r = spawnSync("openclaw", args, {
        stdio: "inherit",
        shell: true,
    });

    if (r.status !== 0) {
        console.error("[welcome] openclaw message send failed, exit:", r.status);
        process.exit(r.status ?? 1);
    }
}

main().catch((e) => {
    console.error("[welcome] error:", e);
    process.exit(1);
});
