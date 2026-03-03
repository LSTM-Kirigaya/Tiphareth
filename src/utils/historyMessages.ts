import * as path from 'path';
import { GroupMessage, LagrangeContext, PrivateMessage } from 'lagrange.onebot';
import { qqGroupSummaryPdf } from '../services/group-summary';
import fs from 'fs';
import { QueryMessageDto, UserInfo } from 'lagrange.onebot/util/realm.dto';
import { GetMsgResponse } from 'lagrange.onebot/core/type';
export async function exportTodayGroupMessagesPdf(
    c: LagrangeContext<GroupMessage | PrivateMessage>,
    sourceGroupId: number,
    targetGroupId: number
) {
    const json = await getLast24HGroupMessages(c, sourceGroupId);

    if (!json) {
        c.sendMessage('无法从 realm 数据库中获取信息，请求技术支持');
        return;
    }

    const date = new Date();
    const formatted = date.toISOString().split('T')[0];
    fs.writeFileSync(`./log/${sourceGroupId}_${formatted}.json`, JSON.stringify(json, null, 2));

    try {
        const { pdfPath, imagePath } = await qqGroupSummaryPdf(json);

        await new Promise(resolve => setTimeout(resolve, 1500));
        await c.uploadGroupFile(targetGroupId, pdfPath, path.basename(pdfPath));
    await new Promise(resolve => setTimeout(resolve, 1500));
        await c.sendGroupMsg(targetGroupId, [{
            type: 'image',
            data: {
                file: 'file://' + imagePath
            }
        }]);
    } catch (e) {
        c.sendMessage('群消息摘要生成失败 ❌\n' + (e as Error).message);
    }
}

/**
 * @description 获取过去 N 小时的消息
 * @param context 
 * @param groupId 
 * @param hours 小时数，默认 24
 * @param chunkSize 
 * @param limit 
 * @returns 
 */
export async function getLastNHoursGroupMessages(
    context: LagrangeContext<any>,
    groupId: number,
    hours = 24,
    _chunkSize = 50,
    _limit = 3000,
): Promise<QueryMessageDto> {
    const now = Date.now() / 1000;
    const startTime = now - hours * 60 * 60;
    const fmt = (t: number) => new Date(t * 1000).toLocaleString("zh-CN", { timeZoneName: "short" });

    const INITIAL_FETCH = 1000;
    const MAX_FETCH = 8000;
    const CHUNK_SIZE = 500; // API 可能单次上限约 512，用 500 确保能稳定分页

    console.log(`[getLastNHoursGroupMessages] 群 ${groupId} | 过去 ${hours}h | 倍增搜索 ${INITIAL_FETCH}~${MAX_FETCH}`);
    console.log(`[getLastNHoursGroupMessages] 时间范围: ${fmt(startTime)} ~ ${fmt(now)}`);

    let fetchSize = INITIAL_FETCH;
    let allMessages: GetMsgResponse[] = [];
    let messageId: number | undefined = undefined;

    while (allMessages.length < MAX_FETCH) {
        const requestCount = Math.min(fetchSize, CHUNK_SIZE);
        const res = await context.getGroupMsgHistory({
            group_id: groupId,
            message_id: messageId,
            count: requestCount,
        });

        if (res instanceof Error || !res.data?.messages?.length) {
            console.log(`[getLastNHoursGroupMessages] 请求 ${requestCount} 条: 无消息`);
            break;
        }

        const batch = res.data.messages;
        const prevCount = allMessages.length;
        const seenIds = new Set(allMessages.map((m) => m.message_id));
        for (const msg of batch) {
            if (!seenIds.has(msg.message_id)) {
                allMessages.push(msg);
                seenIds.add(msg.message_id);
            }
        }
        const added = allMessages.length - prevCount;
        allMessages.sort((a, b) => a.time - b.time);

        // 分页游标：API 可能返回从新到旧(batch[last]最老)或从旧到新(batch[0]最老)，取时间戳最小的
        const batchFirst = batch[0];
        const batchLast = batch[batch.length - 1];
        const batchOldest = (batchFirst?.time ?? 0) < (batchLast?.time ?? 0) ? batchFirst : batchLast;
        const oldestTime = batchOldest?.time ?? 0;

        console.log(`[getLastNHoursGroupMessages] 已拉取 ${allMessages.length} 条 (本批新增 ${added}), 本批最老: ${fmt(oldestTime)}`);

        if (oldestTime < startTime) {
            console.log(`[getLastNHoursGroupMessages] 最老消息已超过时间边界，停止`);
            break;
        }

        if (added === 0) {
            console.log(`[getLastNHoursGroupMessages] 本批无新消息，已达历史尽头`);
            break;
        }

        messageId = batchOldest?.message_id;
        if (!messageId) {
            console.log(`[getLastNHoursGroupMessages] 无法获取下一页 message_id`);
            break;
        }

        fetchSize = Math.min(fetchSize * 2, MAX_FETCH);
    }

    if (allMessages.length >= MAX_FETCH) {
        console.log(`[getLastNHoursGroupMessages] 累计已拉取 ${MAX_FETCH} 条，达上限`);
    }

    allMessages = allMessages.filter((m) => m.time >= startTime);
    allMessages.sort((a, b) => a.time - b.time);

    const actualStart = allMessages[0]?.time;
    const actualEnd = allMessages[allMessages.length - 1]?.time;
    const rangeStr = allMessages.length > 0
        ? `${fmt(actualStart!)} ~ ${fmt(actualEnd!)}`
        : "无";
    console.log(`[getLastNHoursGroupMessages] 拉取完成: 共 ${allMessages.length} 条在时间范围内，实际消息时间: ${rangeStr}`);

    const userMap: Record<number, UserInfo> = {};
    const queryMessageDto: QueryMessageDto = {
        groupId,
        exportTime: new Date().toISOString(),
        messageCount: 0,
        wordCount: 0,
        messages: [],
    };

    const groupInfo = await context.getGroupInfo(groupId);
    if (!(groupInfo instanceof Error)) {
        queryMessageDto.groupName = groupInfo.data?.group_name;
        queryMessageDto.memberCount = groupInfo.data?.member_count;
        console.log(`[getLastNHoursGroupMessages] 群信息: ${groupInfo.data?.group_name ?? "?"} (成员 ${groupInfo.data?.member_count ?? "?"})`);
    } else {
        console.log(`[getLastNHoursGroupMessages] 获取群信息失败`);
    }

    let messageCount = 0;
    let wordCount = 0;

    allMessages.sort((a, b) => a.time - b.time);

    for (const msg of allMessages) {
        const senderUin = msg.sender.user_id;

        if (!userMap[senderUin]) {
            const user = await context.getGroupMemberInfo(groupId, senderUin);
            userMap[senderUin] = {
                name: !(user instanceof Error)
                    ? user.data?.card || user.data?.nickname || String(senderUin)
                    : String(senderUin),
                qq: senderUin,
                avatar: `https://q1.qlogo.cn/g?b=qq&nk=${senderUin}&s=640`,
                messageCount: 0,
                wordCount: 0
            };
        }

        let content = '';
        if (typeof msg.message === 'string') {
            content = msg.message;
        } else if (Array.isArray(msg.message)) {
            content = msg.message.map(seg => {
                if (seg.type === 'text') return seg.data.text;
                if (seg.type === 'image') return '[图片]';
                if (seg.type === 'at') return '[at]';
                return '';
            }).join('');
        }

        if (!content.trim()) continue;

        userMap[senderUin].messageCount++;
        userMap[senderUin].wordCount += content.length;

        wordCount += content.length;
        messageCount++;

        queryMessageDto.messages.push({
            sender: userMap[senderUin].name,
            time: new Date(msg.time * 1000).toLocaleString(),
            content: content.trim()
        });
    }

    queryMessageDto.users = userMap;
    queryMessageDto.messageCount = messageCount;
    queryMessageDto.wordCount = wordCount;

    const userCount = Object.keys(userMap).length;
    console.log(`[getLastNHoursGroupMessages] 完成: 有效消息 ${messageCount} 条, 字数 ${wordCount}, 参与用户 ${userCount}`);

    return queryMessageDto;
}

/** @description 获取过去 24 小时的消息（兼容旧调用） */
export async function getLast24HGroupMessages(
    context: LagrangeContext<any>,
    groupId: number,
    chunkSize = 50,
    limit = 3000,
): Promise<QueryMessageDto> {
    return getLastNHoursGroupMessages(context, groupId, 24, chunkSize, limit);
}