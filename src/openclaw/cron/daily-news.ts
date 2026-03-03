/**
 * 每日科技新闻定时任务
 * 复用 Tiphareth src/services/news + src/og/daily-og 逻辑
 *
 * 用法:
 *   npx tsx src/openclaw/cron/daily-news.ts [--group 782833642] [--group 1046693162]
 *
 * OpenClaw cron 配置示例：
 * openclaw cron add --name "每日科技新闻" --cron "0 8 * * *" --tz "Asia/Shanghai" \
 *   --session isolated \
 *   --message "请调用 onebot_run_script，scriptPath 为 ./Tiphareth/src/openclaw/cron/daily-news.ts，groupIds 为 [782833642,1046693162]" \
 *   --announce --channel onebot --to "group:782833642"
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { execSync } from "child_process";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

function parseArgs(): { groups: number[] } {
    const args = process.argv.slice(2);
    const groups: number[] = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--group" && args[i + 1]) {
            const val = args[i + 1];
            if (val.includes(",")) {
                groups.push(...val.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)));
            } else {
                const n = parseInt(val, 10);
                if (!isNaN(n)) groups.push(n);
            }
            i++;
        } else if (args[i].startsWith("--group=")) {
            const val = args[i].slice(8);
            if (val.includes(",")) {
                groups.push(...val.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)));
            } else {
                const n = parseInt(val, 10);
                if (!isNaN(n)) groups.push(n);
            }
        }
    }
    return { groups };
}

function sendToGroups(imagePath: string, groupIds: number[]) {
    const fileUrl = pathToFileURL(path.resolve(imagePath)).href;
    for (const gid of groupIds) {
        try {
            execSync(
                `openclaw message send --channel onebot --target group:${gid} --media "${fileUrl}"`,
                { encoding: "utf-8", stdio: "pipe" }
            );
            console.log(`✅ 已发送到群 ${gid}`);
        } catch (e: any) {
            console.error(`❌ 发送到群 ${gid} 失败:`, e?.message ?? e);
        }
    }
}

export default async function run(ctx?: { groupIds?: number[] }) {
    process.chdir(projectRoot);
    dotenv.config({ path: path.join(projectRoot, ".env") });

    const { groups } = parseArgs();
    const groupIds = groups.length ? groups : (ctx?.groupIds ?? []);

    const { getNewsFromHackNews } = await import("../../services/news.js");
    const imagePath = await getNewsFromHackNews();
    if (!imagePath) {
        console.error("❌ 图片生成失败");
        return null;
    }

    const absoluteImagePath = path.resolve(projectRoot, imagePath);
    console.log("图片生成在: " + absoluteImagePath);

    if (groupIds.length) {
        sendToGroups(absoluteImagePath, groupIds);
    }

    return absoluteImagePath;
}

if (process.argv[1]?.includes("daily-news")) run().catch(console.error);