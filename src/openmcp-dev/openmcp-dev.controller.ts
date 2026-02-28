import '../plugins/image';
import * as path from 'path';
import * as fs from 'fs';

import { mapper, LagrangeContext, GroupMessage, ApproveMessage, Message, PrivateMessage } from 'lagrange.onebot';
import { qq_groups } from '../global';
import { qqAgentLoop } from '../services/qq-agent';
import { getNewsFromHackNews } from '../services/news';
import { getGithubTrendingImage } from '../services/github-trending';
import { generateWelcomeOG } from '../og/welcome-og';
import type { WelcomeOGData } from '../og/welcome-og';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exportTodayGroupMessagesPdf } from '../utils/historyMessages';
import { getReplyMessage } from '../utils/reply';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log('activate ' + path.basename(__filename));

const visitCache = new Map<string, number>();
let groupIncreaseCache = 0;

/** AnzuLeaf 迎新 OG 图静态配置（基于 IDENTITY / RESOURCES） */
const ANZULEAF_WELCOME_CONFIG: Omit<WelcomeOGData, 'memberName' | 'memberAvatar' | 'joinDate' | 'groupName'> = {
    resources: [
        { name: 'OpenMCP 官网', desc: 'MCP 开发指南', qrCode: './assets/images/openmcp-document-qr.png' },
        { name: 'OpenMCP', desc: 'GitHub 开源项目', qrCode: './assets/images/openmcp-github-qr.png' },
        { name: '独立社区安树', desc: '正在筹备施工中 ...', qrCode: './assets/images/anzutree-qr.png' },
    ],
};

export class OpenMcpChannel {

    @mapper.onGroup(qq_groups.OPENMCP_DEV, { memorySize: 50, at: true })
    async handleOpenMcpChannel(c: LagrangeContext<GroupMessage>) {

        // if (c.message.user_id === qq_users.JIN_HUI) {
        //     const now = Date.now();
        //     const lastVisit = visitCache.get(c.message.user_id.toString());

        //     const info = await c.getGroupMemberInfo(c.message.group_id, c.message.user_id);
        //     const role = info['data'].role;
        //     const name = info['data'].nickname;

        //     if (!lastVisit || (now - lastVisit) > 10 * 60 * 1000) {
        //         // c.sendMessage('检测到超级管理员，TIP 系统允许访问，正在执行 ' + JSON.stringify(commandResult));
        //         visitCache.set(c.message.user_id.toString(), now);
        //     }
        // } else {
        //     c.sendMessage('非法请求，TIP 系统拒绝访问');
        //     return;
        // }


        const commonMessages = c.message.message.filter(m => m.type !== 'at' && m.type !== 'reply');
        const groupId = c.message.group_id;
        const content = commonMessages.map(m => JSON.stringify(m.data)).join('');
        const reference = await getReplyMessage(c) || 'none';

        await qqAgentLoop(groupId, content, reference);

    }

    @mapper.onGroupIncrease(qq_groups.OPENMCP_DEV)
    async handleGroupIncrease(c: LagrangeContext<ApproveMessage>) {
        console.log('group increase', c.message.group_id, 'new user', c.message.user_id);
        c.setGroupAddRequest('', c.message.sub_type, true, '');

        const now = Date.now();
        if ((now - groupIncreaseCache) < 30 * 1000) {
            return;
        }
        groupIncreaseCache = now;

        const groupId = c.message.group_id;
        const userId = c.message.user_id;
        const joinDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');

        let memberName = String(userId);
        let groupName = 'AnzuLeaf';

        const memberInfo = await c.getGroupMemberInfo(groupId, userId);
        if (!(memberInfo instanceof Error) && memberInfo.data) {
            memberName = memberInfo.data.card || memberInfo.data.nickname || String(userId);
        }

        const groupInfo = await c.getGroupInfo(groupId);
        if (!(groupInfo instanceof Error) && groupInfo.data?.group_name) {
            groupName = groupInfo.data.group_name;
        }

        const welcomeData: WelcomeOGData = {
            ...ANZULEAF_WELCOME_CONFIG,
            memberName,
            memberAvatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`,
            joinDate,
            groupName,
        };

        const imagePath = await generateWelcomeOG(welcomeData);
        if (imagePath) {
            await c.sendGroupMsg(groupId, [
                { type: 'at', data: { qq: userId.toString() } },
                { type: 'image', data: { file: 'file://' + imagePath } },
            ]);
            // 10s 后删除图片
            setTimeout(() => {
                fs.unlinkSync(imagePath);
            }, 10 * 1000);

        } else {
            c.sendGroupMsg(groupId, [
                { type: 'at', data: { qq: userId.toString() } },
                { type: 'text', data: { text: '欢迎加入 AnzuLeaf！有什么学习资源或技术疑问，欢迎 @我 提问。' } },
            ]);
        }
    }

    @mapper.createTimeSchedule('0 0 10 * * *')
    async publishNewsTimer(c: LagrangeContext<Message>) {
        const imagePath = await getNewsFromHackNews();
        if (imagePath) {
            await c.sendGroupMsg(qq_groups.OPENMCP_DEV, [{
                type: 'image',
                data: {
                    file: 'file://' + imagePath
                }
            }]);
        }
    }

    @mapper.createTimeSchedule('0 0 12 * * *')
    async publishGithubTrendingTimer(c: LagrangeContext<Message>) {
        const imagePath = await getGithubTrendingImage();
        if (imagePath) {
            await c.sendGroupMsg(qq_groups.OPENMCP_DEV, [{
                type: 'image',
                data: {
                    file: 'file://' + imagePath
                }
            }]);
        }
    }

    @mapper.createTimeSchedule('0 0 23 * * *')
    async groupSummaryTimer(c: LagrangeContext<GroupMessage | PrivateMessage>) {
        await exportTodayGroupMessagesPdf(c, qq_groups.OPENMCP_DEV, qq_groups.OPENMCP_DEV);
    }
}
