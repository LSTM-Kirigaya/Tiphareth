/**
 * 每日 GitHub 热榜定时任务
 * 复用 Tiphareth src/services/github-trending + src/og/github-og 逻辑
 *
 * OpenClaw cron 配置示例：
 * openclaw cron add --name "每日GitHub热榜" --cron "0 9 * * *" --tz "Asia/Shanghai" \
 *   --session isolated \
 *   --message "请调用 onebot_run_script，scriptPath 为 ./Tiphareth/src/openclaw/cron/github-trending.ts，groupIds 为 [782833642,1046693162]" \
 *   --announce --channel onebot --to "group:782833642"
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

export default async function (ctx: { onebot: any; groupIds: number[] }) {
  process.chdir(projectRoot);
  dotenv.config({ path: path.join(projectRoot, ".env") });

  const { getGithubTrendingImage } = await import("../../services/github-trending.js");
  const imagePath = await getGithubTrendingImage();

  if (!imagePath) {
    const msg = "今日 GitHub 热榜获取失败";
    for (const gid of ctx.groupIds) {
      await ctx.onebot.sendGroupMsg(gid, msg);
    }
    return msg;
  }

  for (const gid of ctx.groupIds) {
    await ctx.onebot.sendGroupImage(gid, imagePath);
  }
  return `已向 ${ctx.groupIds.length} 个群发送今日 GitHub 热榜`;
}
