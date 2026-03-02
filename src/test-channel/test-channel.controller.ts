import '../plugins/image';

import { mapper, plugins, LagrangeContext, PrivateMessage, GroupMessage, ApproveMessage, Message } from 'lagrange.onebot';
import { sendNewsToJinhui, publishOpenMCP } from './test-channel.service';
import { qq_groups, qq_users } from '../global';
import { qqAgentLoop } from '../services/qq-agent';
import { getReplyMessage } from '../utils/reply';
import { exportTodayGroupMessagesPdf } from '../utils/historyMessages';

export class TestChannel {

    @mapper.onPrivateUser(qq_users.JIN_HUI)
    @plugins.use('echo')
    @plugins.use('pm')
    @plugins.use('wget-image')
    async handleJinhui(c: LagrangeContext<PrivateMessage>) {
        
        const text = c.getRawText();
        console.log('[receive] ' + text);

        if (text.startsWith(':')) {
            const command = text.substring(1);
            switch (command) {
                case 'news':
                    await sendNewsToJinhui(c);
                    break;
                
                case 'ping':
                    c.sendMessage('ping');
                    break;

                case 'pub':
                    await publishOpenMCP(c);
                    break;

                case 'openmcp-sum':
                    await exportTodayGroupMessagesPdf(c, qq_groups.OPENMCP_DEV, qq_groups.OPENMCP_DEV);
                    break;

                default:
                    break;
            }
        }

        c.finishSession();
    }

    @mapper.onGroup(qq_groups.TEST_CHANNEL, { at: true })
    async handleTestChannel(c: LagrangeContext<GroupMessage>) {
        const commonMessages = c.message.message.filter(m => m.type !== 'at' && m.type !== 'reply');
        const groupId = c.message.group_id;
        const content = commonMessages.map(m => JSON.stringify(m.data)).join('');
        const reference = await getReplyMessage(c) || 'none';

        console.log(c.message);
        
        
        await qqAgentLoop(groupId, content, reference);
    }

    @mapper.onGroup(qq_groups.AGENT_PRACTICE, { at: true })
    async handleAgentPracticeChannel(c: LagrangeContext<GroupMessage>) {
        const commonMessages = c.message.message.filter(m => m.type !== 'at' && m.type !== 'reply');
        const groupId = c.message.group_id;
        const content = commonMessages.map(m => JSON.stringify(m.data)).join('');
        const reference = await getReplyMessage(c) || 'none';

        await qqAgentLoop(groupId, content, reference);
    }

    @mapper.onGroupIncrease(qq_groups.TEST_CHANNEL)
    async handleTestChannelIncrease(c: LagrangeContext<ApproveMessage>) {
        c.setGroupAddRequest('', c.message.sub_type, true, '');
    }

    @mapper.createTimeSchedule('0 0 22 * * *')
    async handleTestChannelSchedule(c: LagrangeContext<Message>) {

        c.sendGroupMsg(qq_groups.TEST_CHANNEL, '定时器测试，现在 22:00');
    }
}