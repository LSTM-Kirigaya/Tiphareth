/**
 * 每日科技新闻定时任务
 * 复用 Tiphareth src/services/news + src/og/daily-og 逻辑
 *
 * OpenClaw cron 配置示例：
 * openclaw cron add --name "每日科技新闻" --cron "0 8 * * *" --tz "Asia/Shanghai" \
 *   --session isolated \
 *   --message "请调用 onebot_run_script，scriptPath 为 ./Tiphareth/src/openclaw/cron/daily-news.ts，groupIds 为 [782833642,1046693162]" \
 *   --announce --channel onebot --to "group:782833642"
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

async function main() {
    process.chdir(projectRoot);
    dotenv.config({ path: path.join(projectRoot, ".env") });

    const { getNewsFromHackNews } = await import("../../services/news.js");
    const imagePath = await getNewsFromHackNews();
    console.log('图片生成在: ' + imagePath);
}

main().catch(console.error);