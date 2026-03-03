#!/usr/bin/env node
/**
 * 根据当前路径生成 openclaw cron add 命令
 *
 * 用法:
 *   npm run cron:gen [task-name] [options]     # OneBot 内置任务
 *   npm run cron:gen -- [--name --cron ...]    # 通用任务 (WhatsApp/Telegram)
 *   npm run cron:gen -- --list                 # 列出所有 OneBot 任务
 *
 * OneBot 示例:
 *   npm run cron:gen daily-news -- --groupIds 782833642,1046693162
 *   npm run cron:gen github-trending -- --groupIds 782833642 --cron "0 10 * * *"
 *
 * 通用任务示例 (WhatsApp/Telegram):
 *   npm run cron:gen -- --name "Morning status" --cron "0 7 * * *" --tz "America/Los_Angeles" --message "Summarize inbox + calendar for today." --channel whatsapp --to "+15551234567"
 *   npm run cron:gen -- --name "Nightly summary" --cron "0 22 * * *" --tz "America/Los_Angeles" --message "Summarize today; send to the nightly topic." --channel telegram --to "-1001234567890:topic:123"
 */

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tipharethRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(__dirname, "..", "..");

/** 相对于项目根目录的 cron 脚本路径（统一使用 / 便于跨平台） */
function scriptPathFromRoot(name) {
  const rel = path
    .relative(projectRoot, path.join(tipharethRoot, "src/openclaw/cron", name))
    .replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** 脚本绝对路径 */
function scriptPathAbsolute(name) {
  return path.join(tipharethRoot, "src/openclaw/cron", name).replace(/\\/g, "/");
}

/** 相对 Tiphareth 的脚本路径（用于 npx tsx） */
function scriptRelative(name) {
  return `src/openclaw/cron/${name}`.replace(/\\/g, "/");
}

/** 构建消息的上下文 */
function buildMsgCtx(task, opts) {
  const script = opts.script ?? task.script;
  const scriptPath = opts.scriptPath ?? scriptPathFromRoot(script);
  const groupIds = opts.groupIds
    ? String(opts.groupIds)
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter(Number.isFinite)
    : task.defaultGroupIds;
  return {
    scriptPath,
    scriptPathAbsolute: scriptPathAbsolute(script),
    scriptRelative: scriptRelative(script),
    cwdAbsolute: tipharethRoot.replace(/\\/g, "/"),
    groupIds,
  };
}

/** 消息模板：onebot_run_script（脚本路径 + 群组） */
const MSG_ONEBOT_RUN_SCRIPT = (ctx) =>
  `请调用 onebot_run_script，scriptPath 为 ${ctx.scriptPath}，groupIds 为 [${ctx.groupIds.join(",")}]`;

/** 消息模板：执行脚本并仅发送图片（绝对路径 + 参数化） */
const MSG_EXECUTE_SEND_IMAGE = (ctx) =>
  `请在 ${ctx.cwdAbsolute} 执行 npx tsx ${ctx.scriptRelative} 并将生成的图片发送到群聊 ${ctx.groupIds.join(",")}，整个过程只需要发送图片，禁止发送任何文字到群聊中`;

/**
 * OneBot 任务
 * - buildMessage 接收 ctx: { scriptPath, scriptPathAbsolute, scriptRelative, cwdAbsolute, groupIds }
 * - MSG_ONEBOT_RUN_SCRIPT: onebot_run_script 风格
 * - MSG_EXECUTE_SEND_IMAGE: 执行脚本并仅发送图片（使用绝对路径）
 * - 新增任务：复制现有条目，改 script、name 等，选 buildMessage 模板即可
 */
const ONEBOT_TASKS = {
  "daily-news": {
    name: "每日科技新闻",
    cron: "0 8 * * *",
    tz: "Asia/Shanghai",
    script: "daily-news.ts",
    channel: "onebot",
    defaultGroupIds: [782833642, 1046693162],
    buildMessage: MSG_ONEBOT_RUN_SCRIPT,
  },
  "github-trending": {
    name: "每日GitHub热榜",
    cron: "0 9 * * *",
    tz: "Asia/Shanghai",
    script: "github-trending.ts",
    channel: "onebot",
    defaultGroupIds: [782833642, 1046693162],
    buildMessage: MSG_EXECUTE_SEND_IMAGE,
  },
};

/** 解析 --key value 和 --key=value */
function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--list") {
      out.list = true;
      continue;
    }
    if (arg.startsWith("--") && arg.includes("=")) {
      const [k, v] = arg.slice(2).split("=");
      out[k] = v;
      continue;
    }
    if (arg.startsWith("--") && i + 1 < args.length && !args[i + 1].startsWith("--")) {
      out[arg.slice(2)] = args[++i];
      continue;
    }
    if (arg.startsWith("--")) {
      out[arg.slice(2)] = true;
    }
  }
  return out;
}

function buildOneBotCommand(taskKey, task, opts) {
  const ctx = buildMsgCtx(task, opts);
  const name = opts.name ?? task.name;
  const cron = opts.cron ?? task.cron;
  const tz = opts.tz ?? task.tz;

  const msg = typeof task.buildMessage === "function" ? task.buildMessage(ctx) : task.buildMessage;
  const toParts = ctx.groupIds.map((g) => `group:${g}`);

  const parts = [
    "openclaw cron add",
    `--name "${name}"`,
    `--cron "${cron}"`,
    `--tz "${tz}"`,
    "--session isolated",
    `--message "${msg}"`,
    "--announce",
    `--channel ${task.channel}`,
    ...toParts.flatMap((t) => ["--to", `"${t}"`]),
  ];

  return parts.join(" ");
}

function buildGenericCommand(opts) {
  const { name, cron, tz, message, channel, to } = opts;
  if (!name || !cron || !message || !channel || !to) {
    throw new Error("通用任务需要: --name, --cron, --message, --channel, --to");
  }
  const parts = [
    "openclaw cron add",
    `--name "${name}"`,
    `--cron "${cron}"`,
    `--tz "${tz || "America/Los_Angeles"}"`,
    "--session isolated",
    `--message "${message}"`,
    "--announce",
    `--channel ${channel}`,
    `--to "${to}"`,
  ];
  return parts.join(" ");
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--"); // npm 会传 --
  const opts = parseArgs(args);

  if (opts.list) {
    console.log("可用任务:\n");
    for (const [key, t] of Object.entries(ONEBOT_TASKS)) {
      console.log(`  ${key}`);
      console.log(`    名称: ${t.name}`);
      console.log(`    cron: ${t.cron} (${t.tz})`);
      console.log(`    渠道: ${t.channel}`);
    }
    console.log("\n示例:");
    console.log('  npm run cron:gen daily-news -- --groupIds 782833642,1046693162');
    console.log('  npm run cron:gen github-trending -- --groupIds 782833642 --cron "0 10 * * *"');
    return;
  }

  const taskKey = args.find((a) => !a.startsWith("--") && ONEBOT_TASKS[a]);

  if (opts.name && opts.channel && opts.to && opts.message && opts.cron) {
    console.log("# 通用任务 (WhatsApp/Telegram 等)");
    console.log(buildGenericCommand(opts));
    return;
  }

  if (!taskKey && !opts.name) {
    console.log("用法:");
    console.log("  OneBot:  npm run cron:gen <task-name> -- --groupIds 1,2,3 [--cron \"0 8 * * *\"] [--tz Asia/Shanghai]");
    console.log("  通用:    npm run cron:gen -- --name \"名称\" --cron \"0 7 * * *\" --message \"...\" --channel whatsapp --to \"+15551234567\"");
    console.log("      npm run cron:gen -- --list  # 列出所有 OneBot 任务");
    console.log("\n当前项目根:", projectRoot);
    console.log("当前 Tiphareth:", tipharethRoot);
    return;
  }

  const task = ONEBOT_TASKS[taskKey];
  if (!task) {
    console.error(`未知任务: ${taskKey}`);
    console.error("可用任务:", Object.keys(ONEBOT_TASKS).join(", "));
    process.exit(1);
  }

  console.log("# " + task.name);
  console.log("# 项目根:", projectRoot);
  console.log("# 脚本:", scriptPathFromRoot(task.script));
  console.log();
  console.log(buildOneBotCommand(taskKey, task, opts));
}

main();
