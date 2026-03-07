import * as path from 'path';
import { GroupMessage, LagrangeContext, PrivateMessage } from 'lagrange.onebot';
import { qqGroupSummaryPdf } from '../services/group-summary';
import fs from 'fs';
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
 * @description 获取过去24小时的消息
 * @param context 
 * @param groupId 
 * @param chunkSize 
 * @param limit 
 * @returns 
 */
export async function getLast24HGroupMessages(
    context: LagrangeContext<any>,
    groupId: number,
    chunkSize = 100,
    limit = 3000,
): Promise<any> {

    const now = Date.now() / 1000;
    const startTime = now - 24 * 60 * 60;

    let messageSeq: number | undefined = undefined;

    const allMessages: GetMsgResponse[] = [];
    const seenMessageIds = new Set<number>();

    let stopLoop = false;
    let pageCount = 0;

    while (!stopLoop) {
        pageCount++;
        
        // 使用新的 API 签名：(group_id, message_seq?, count?, reverse_order?)
        // reverse_order = true 表示从旧到新返回，可以用 message_seq 向前翻页
        const res = await context.getGroupMsgHistory(
            groupId,
            messageSeq,
            chunkSize,
            true
        );

        if (res instanceof Error) {
            console.log('[getLast24HGroupMessages] API 错误:', res.message);
            break;
        }
        
        if (!res.data?.messages?.length) {
            console.log('[getLast24HGroupMessages] 无消息返回, seq=', messageSeq);
            break;
        }

        const batchMessages = res.data.messages;
        const prevCount = allMessages.length;
        
        // 添加延迟避免频率限制
        await new Promise(resolve => setTimeout(resolve, 500));

        for (const msg of batchMessages) {
            // 去重
            if (seenMessageIds.has(msg.message_id)) {
                continue;
            }
            seenMessageIds.add(msg.message_id);

            // 超出时间范围 -> 停止
            if (msg.time < startTime) {
                stopLoop = true;
            } else {
                allMessages.push(msg);
            }
        }
        
        const added = allMessages.length - prevCount;
        console.log(`[getLast24HGroupMessages] 第${pageCount}页: 新增${added}条, 累计${allMessages.length}条`);

        // 下一页：用最早的那条的 message_seq
        const oldest = batchMessages[0];
        const nextSeq = (oldest as any)?.message_seq ?? oldest?.message_id;
        
        // 防止死循环：如果 seq 没有变化，停止
        if (!nextSeq || nextSeq === messageSeq) {
            console.log('[getLast24HGroupMessages] 游标未变化，停止分页');
            break;
        }
        messageSeq = nextSeq;

        if (allMessages.length >= limit) {
            console.log('[getLast24HGroupMessages] 达到上限，停止');
            break;
        }
    }

    console.log(`[getLast24HGroupMessages] 共获取 ${allMessages.length} 条消息`);

    const userMap: Record<number, any> = {};
    const queryMessageDto: any = {
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
