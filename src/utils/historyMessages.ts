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
    chunkSize = 50,
    limit = 3000,
): Promise<QueryMessageDto> {

    const now = Date.now() / 1000;
    const startTime = now - hours * 60 * 60;

    let messageId: number | undefined = undefined;

    const allMessages: GetMsgResponse[] = [];
    const seenMessageIds = new Set<number>();

    let stopLoop = false;

    while (!stopLoop) {
        const res = await context.getGroupMsgHistory({
            group_id: groupId,
            message_id: messageId,
            count: chunkSize,
        });

        if (res instanceof Error || !res.data?.messages?.length) {
            break;
        }

        const batchMessages = res.data.messages;

        for (const msg of batchMessages) {
            // 去重
            if (seenMessageIds.has(msg.message_id)) {
                continue;
            }
            seenMessageIds.add(msg.message_id);

            // 超出今天 → 直接停止
            if (msg.time < startTime) {
                console.log((new Date(msg.time * 1000)).toLocaleString());
                console.log((new Date(startTime * 1000)).toLocaleString());

                stopLoop = true;
            } else {
                allMessages.push(msg);
            }
        }

        // 下一页：用“最早”的那条 message_id
        const oldest = batchMessages[0];
        messageId = oldest?.message_id;

        // 防止死循环
        if (!messageId) {
            break;
        }

        if (allMessages.length >= limit) {
            break;
        }
    }

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

    console.log('message Count', messageCount);
    console.log('word Count', wordCount);

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