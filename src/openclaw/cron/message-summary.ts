/**
 * ???????????
 * ???? N ???? -> LLM ?? -> ?????
 *
 * ??:
 *   npx tsx src/openclaw/cron/message-summary.ts --group 782833642 --sendTo 1046693162 [--lastHour 24]
 *
 * ??:
 *   --group <??>    ???????????
 *   --sendTo <??>  ?????????????????
 *   --lastHour <N>   ???? N ??????? 24
 *
 * ???? (.env): ONEBOT_WS_TYPE, ONEBOT_WS_HOST, ONEBOT_WS_PORT, ONEBOT_WS_ACCESS_TOKEN
 *
 * ??? onebot_run_script ????? ctx.onebot?ctx.groupIds?groupIds[0]=????groupIds[1..]=?????
 */

import path from "path";
import { fileURLToPath } from "url";
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

/** ? onebot_run_script ??? onebot ??? historyMessages ??? context ?? */
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
            return msgs?.length ? { data: { messages: msgs } } : new Error("no messages");
        },
        getGroupInfo: async (groupId: number) => {
            const info = await onebot.getGroupInfo(groupId);
            return info ? { data: { group_name: info.group_name, member_count: info.member_count } } : new Error("getGroupInfo failed");
        },
        getGroupMemberInfo: async (groupId: number, userId: number) => {
            const info = await onebot.getGroupMemberInfo(groupId, userId);
            return info ? { data: { card: info.card, nickname: info.nickname } } : new Error("getGroupMemberInfo failed");
        },
    };
}

async function doSummary(
    context: any,
    groupId: number,
    sendToGroups: number[],
    lastHour: number,
    sendImage: (gid: number, imagePath: string) => Promise<void>
): Promise<string> {
    const { getLast24HGroupMessages } = await import("../../utils/historyMessages.js");

    if (sendToGroups.length > 0) {
        console.log(`[send] target groups: ${sendToGroups.join(", ")}`);
    }
    console.log(`[fetch] group ${groupId} | last ${lastHour}h...`);
    const rawJson = await getLast24HGroupMessages(context, groupId);
    console.log(`   messages: ${rawJson.messageCount}, chars: ${rawJson.wordCount}`);

    if (rawJson.messageCount === 0) {
        throw new Error("no messages to summarize");
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
    console.log(`[write] ${chatPath} & ${userPath}`);

    const { generateRelationGraph } = await import("../../og/message-summary-og");
    const outputPath = path.join(TIPHARETH_ROOT, "message-summary-og.png");
    await generateRelationGraph(chatPath, userPath, outputPath);
    console.log(`[done] ${outputPath}`);

    for (const gid of sendToGroups) {
        await sendImage(gid, outputPath);
        console.log(`[sent] group ${gid}`);
    }

    return sendToGroups.length > 0 ? `sent to ${sendToGroups.length} group(s)` : outputPath;
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
        console.error("[err] --group <id> required");
        process.exit(1);
    }

    if (ctx?.onebot?.getGroupMsgHistory) {
        console.log("[ok] using existing OneBot connection (onebot_run_script)");

        const context = createContextAdapter(ctx.onebot);
        const sendImage = ctx.onebot.sendGroupImage
            ? async (gid: number, imagePath: string) => {
                  await ctx.onebot.sendGroupImage(gid, imagePath);
              }
            : async () => {
                  console.warn("[warn] ctx.onebot has no sendGroupImage");
              };

        return doSummary(context, groupId, sendToGroups, lastHour, sendImage);
    }

    const type = (process.env.ONEBOT_WS_TYPE || "forward-websocket") as
        | "forward-websocket"
        | "backward-websocket";
    const host = process.env.ONEBOT_WS_HOST || "127.0.0.1";
    const port = Number(process.env.ONEBOT_WS_PORT || 3001);
    const accessToken = process.env.ONEBOT_WS_ACCESS_TOKEN;

    const { LagrangeFactory } = await import("lagrange.onebot");
    const server = LagrangeFactory.create([]);

    return new Promise<string>((resolve, reject) => {
        server.onMounted(async (c: any) => {
            try {
                const sendImage = async (gid: number, imagePath: string) => {
                    const absPath = path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath);
                    const normalized = absPath.replace(/\\/g, "/");
                    const fileUrl = normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`;
                    await c.sendGroupMsg(gid, [{ type: "image", data: { file: fileUrl } }]);
                };
                const result = await doSummary(c, groupId, sendToGroups, lastHour, sendImage);
                console.log(result);
                resolve(result);
            } catch (e) {
                console.error(e);
                reject(e);
            }
        });

        server
            .launch({
                type,
                host,
                port,
                accessToken,
                logger: false,
                configPath: path.join(TIPHARETH_ROOT, "__nonexistent_config__.json"),
            })
            .then(() => {})
            .catch((e) => {
                console.error("\n[err] OneBot connect/launch failed:", e?.message ?? e);
                console.error("   hint: lagrange.onebot requires getFriendList/getLoginInfo");
                console.error("   NapCatQQ may not support these APIs");
                reject(e);
            });
    });
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
