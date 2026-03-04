/**
 * 群聊话题关系图定时任务
 * 获取过去 N 小时消息 → LLM 总结 → 生成关系图
 *
 * 用法:
 *   npx tsx src/openclaw/cron/message-summary.ts --group 782833642 --sendTo 1046693162 [--lastHour 24]
 *
 * 参数:
 *   --group <群号>    要总结消息的群（必填）
 *   --sendTo <群号>  将结果图片发送到的群（可多次指定多个群）
 *   --lastHour <N>   统计过去 N 小时消息，默认 24
 *
 * 或通过 onebot_run_script 调用（传入 ctx.onebot、ctx.groupIds；groupIds[0]=总结群，groupIds[1..]=发送目标群）
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TIPHARETH_ROOT = path.resolve(__dirname, "../../..");

function loadEnv() {
    const envPaths = [
        path.join(TIPHARETH_ROOT, ".env"),
        path.join(TIPHARETH_ROOT, ".env.local"),
    ];
    for (const p of envPaths) {
        if (existsSync(p)) {
            dotenv.config({ path: p });
            break;
        }
    }
}

function parseArgs(): { group?: number; sendTo: number[]; lastHour: number } {
    const args = process.argv.slice(2);
    let group: number | undefined;
    const sendTo: number[] = [];
    let lastHour = 24;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--group" && args[i + 1]) {
            group = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === "--sendTo" && args[i + 1]) {
            const g = parseInt(args[i + 1], 10);
            if (!isNaN(g)) sendTo.push(g);
            i++;
        } else if (args[i] === "--lastHour" && args[i + 1]) {
            lastHour = parseInt(args[i + 1], 10) || 24;
            i++;
        } else if (args[i].startsWith("--group=")) {
            group = parseInt(args[i].slice(8), 10);
        } else if (args[i].startsWith("--sendTo=")) {
            const g = parseInt(args[i].slice(9), 10);
            if (!isNaN(g)) sendTo.push(g);
        } else if (args[i].startsWith("--lastHour=")) {
            lastHour = parseInt(args[i].slice(11), 10) || 24;
        }
    }
    return { group, sendTo, lastHour };
}

/** 将 openclaw-onebot 客户端适配为 historyMessages.getLastNHoursGroupMessages 所需的 context 接口 */
function createContextAdapter(onebot: {
    getGroupMsgHistory: (gid: number, opts: { message_id?: number; count: number }) => Promise<any[]>;
    getGroupInfo: (gid: number) => Promise<{ group_name?: string; member_count?: number } | null>;
    getGroupMemberInfo: (gid: number, uid: number) => Promise<{ nickname?: string; card?: string } | null>;
}) {
    return {
        getGroupMsgHistory: async (params: { group_id: number; message_id?: number; count: number }) => {
            const msgs = await onebot.getGroupMsgHistory(params.group_id, {
                message_id: params.message_id,
                count: params.count,
            });
            return msgs?.length ? { data: { messages: msgs } } : new Error("无消息");
        },
        getGroupInfo: async (groupId: number) => {
            const info = await onebot.getGroupInfo(groupId);
            return info ? { data: { group_name: info.group_name, member_count: info.member_count } } : new Error("获取失败");
        },
        getGroupMemberInfo: async (groupId: number, userId: number) => {
            const info = await onebot.getGroupMemberInfo(groupId, userId);
            return info ? { data: { card: info.card, nickname: info.nickname } } : new Error("获取失败");
        },
    };
}

async function ensureOneBotConnection(conn: {
    connectForward: (config: any) => Promise<any>;
    setWs: (ws: any) => void;
    setupEchoHandler?: (ws: any) => void;
}): Promise<void> {
    const type = process.env.LAGRANGE_WS_TYPE || process.env.ONEBOT_WS_TYPE || "forward-websocket";
    const host = process.env.LAGRANGE_WS_HOST || process.env.ONEBOT_WS_HOST || "127.0.0.1";
    const port = parseInt(process.env.LAGRANGE_WS_PORT || process.env.ONEBOT_WS_PORT || "3001", 10);
    const accessToken = process.env.LAGRANGE_WS_ACCESS_TOKEN || process.env.ONEBOT_WS_ACCESS_TOKEN;
    const wsPath = process.env.LAGRANGE_WS_PATH || process.env.ONEBOT_WS_PATH || "/onebot/v11/ws";
    const pathNorm = wsPath.startsWith("/") ? wsPath : `/${wsPath}`;
    const wsUrl = `ws://${host}:${port}${pathNorm}`;

    console.log("⏳ 正在连接 OneBot 后端...");

    const config = {
        type,
        host,
        port,
        accessToken,
        path: pathNorm,
    };

    const ws = await conn.connectForward(config);
    conn.setWs(ws);
    if (conn.setupEchoHandler) conn.setupEchoHandler(ws);

    console.log("✅ WebSocket 连接成功，可进行后续操作");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

export default async function run(ctx?: { onebot?: any; groupIds?: number[] }) {
    process.chdir(TIPHARETH_ROOT);
    loadEnv();

    const { group: groupArg, sendTo: sendToArg, lastHour } = parseArgs();
    const groupId = groupArg ?? ctx?.groupIds?.[0];
    const sendToGroups =
        sendToArg.length > 0
            ? sendToArg
            : ctx?.groupIds?.length === 1
              ? ctx.groupIds
              : ctx?.groupIds && ctx.groupIds.length > 1
                ? ctx.groupIds.slice(1)
                : ctx?.groupIds ?? [];

    if (!groupId) {
        console.error("❌ 请指定 --group <群号>（要总结的群）");
        process.exit(1);
    }

    let onebot: {
        getGroupMsgHistory: (gid: number, opts: { message_id?: number; count: number }) => Promise<any[]>;
        getGroupInfo: (gid: number) => Promise<any>;
        getGroupMemberInfo: (gid: number, uid: number) => Promise<any>;
        sendGroupImage?: (gid: number, imagePath: string) => Promise<any>;
    };

    let stopConnection: (() => void) | undefined;

    if (ctx?.onebot?.getGroupMsgHistory) {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ 使用已建立的 OneBot 连接（来自 onebot_run_script）");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        onebot = ctx.onebot;
    } else {
        const connPath = path.join(TIPHARETH_ROOT, "..", "openclaw-onebot", "dist", "connection.js");
        const connMod = await import(pathToFileURL(connPath).href);
        const {
            connectForward,
            setWs,
            getGroupMsgHistory,
            getGroupInfo,
            getGroupMemberInfo,
            sendGroupImage,
            handleEchoResponse,
        } = connMod;
        stopConnection = connMod.stopConnection;

        let ws = connMod.getWs?.();
        if (!ws || ws.readyState !== 1) {
            await ensureOneBotConnection({
                connectForward,
                setWs,
                setupEchoHandler: (socket: any) => {
                    socket.on("message", (data: Buffer) => {
                        try {
                            handleEchoResponse(JSON.parse(data.toString()));
                        } catch {}
                    });
                },
            });
        } else {
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("✅ WebSocket 已连接，跳过连接步骤");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        }

        onebot = { getGroupMsgHistory, getGroupInfo, getGroupMemberInfo, sendGroupImage };
    }

    const context = createContextAdapter(onebot);
    const { getLastNHoursGroupMessages } = await import("../../utils/historyMessages.js");

    if (sendToGroups.length > 0) {
        console.log(`📤 结果将发送到群: ${sendToGroups.join(", ")}`);
    }
    console.log(`📥 获取群 ${groupId} 过去 ${lastHour} 小时消息...`);
    const rawJson = await getLastNHoursGroupMessages(context as any, groupId, lastHour);
    console.log(`   消息数: ${rawJson.messageCount}, 字数: ${rawJson.wordCount}`);

    if (rawJson.messageCount === 0) {
        console.error("❌ 无消息可总结");
        if (stopConnection) {
            stopConnection();
            console.log("🔌 WebSocket 已断开");
        }
        process.exit(1);
    }

    const { summarizeChatToTopics, summarizeUsersFromRaw } = await import("../../services/chat-summary.js");
    const chatTopics = await summarizeChatToTopics(rawJson);
    const userTitles = summarizeUsersFromRaw(rawJson);

    const reportDir = path.join(TIPHARETH_ROOT, "report");
    mkdirSync(reportDir, { recursive: true });

    const chatPath = path.join(reportDir, "summarize_chat.json");
    const userPath = path.join(reportDir, "summarize_user.json");
    writeFileSync(chatPath, JSON.stringify({ messages: chatTopics }, null, 2), "utf-8");
    writeFileSync(userPath, JSON.stringify({ titles: userTitles }, null, 2), "utf-8");
    console.log(`📄 已写入: ${chatPath} 和 ${userPath}`);

    const { generateRelationGraph } = await import("../../og/message-summary-og");
    const outputPath = path.join(TIPHARETH_ROOT, "message-summary-og.png");
    await generateRelationGraph(chatPath, userPath, outputPath);
    console.log(`✅ 已生成: ${outputPath}`);

    if (sendToGroups.length > 0) {
        const sender = ctx?.onebot?.sendGroupImage ?? onebot.sendGroupImage;
        if (sender) {
            for (const gid of sendToGroups) {
                await sender(gid, outputPath);
                console.log(`📤 已发送到群 ${gid}`);
            }
        } else {
            console.warn("⚠️ 无法发送：无 OneBot 发送能力");
        }
    }

    if (stopConnection) {
        stopConnection();
        console.log("🔌 WebSocket 已断开，释放连接");
    }

    if (sendToGroups.length > 0) {
        return `已向 ${sendToGroups.length} 个群发送话题关系图`;
    }
    return outputPath;
}

run()
    .then((result) => {
        console.log(result);
        process.exit(0);
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });