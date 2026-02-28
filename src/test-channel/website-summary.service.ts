import { LagrangeContext, PrivateMessage, GroupMessage } from 'lagrange.onebot';
import { summaryWebsite as doSummaryWebsite } from '../services/web-summary';

export async function summaryWebsite(c: LagrangeContext<PrivateMessage | GroupMessage>, url?: string) {
    if (!url || (typeof url === 'string' && !url.startsWith('http'))) {
        c.sendMessage('拒绝执行 summaryWebsite ❌，原因：为给出有效的 http 连接');
        return;
    }

    try {
        const summary = await doSummaryWebsite(url);
        c.sendMessage('消息聚合成功 ✅\n' + summary);
    } catch (e) {
        c.sendMessage('消息聚合失败 ❌\n' + (e as Error).message);
    }
}
