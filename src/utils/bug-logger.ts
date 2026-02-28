import { GroupMessage, LagrangeContext, mapper } from "lagrange.onebot";
import * as fs from 'fs';
import { indexDocument } from "../hook/es";
import { es_db } from "../global";
import { SizedQueue } from "lagrange.onebot/util";

export interface WalkTalkStatus {
    enabled: boolean;
}

export const groupWalkTalkStatus = new Map<number, WalkTalkStatus>();

export function walktalk(c: LagrangeContext<GroupMessage>, index: string, retainSize?: string) {
    const queue = mapper.getMemoryStorage(c);
    if (!queue) {
        console.error('装饰器 memorySize 请设置为大于 0 的数值');
        return;
    }

    // 查看当前 walktalk 系统状态
    if (!groupWalkTalkStatus.has(c.message.group_id)) {
        groupWalkTalkStatus.set(c.message.group_id, { enabled: false });
    }
    const status = groupWalkTalkStatus.get(c.message.group_id);
    if (!status.enabled) {
        // 关闭 -> 开启：清空 queue 非最后人信息
        clearQueueNonRelative(queue);
        c.sendMessage('walktalk 采集系统 enable, current size: ' + queue.size());

    } else {
        // 开启 -> 关闭：搜集数据，并且进行存储
        const items = queue.items;
        const filename = Date.now() + '.json';
        const document = {
            content: items,
            time: Date.now()
        };

        indexDocument(index, document);

        c.sendMessage('walktalk 采集系统 shutdown, collected size: ' + queue.size());
        queue.clear();
    }

    status.enabled = !status.enabled;

}

function clearQueueNonRelative(queue: SizedQueue<GroupMessage>) {
    if (queue.size() < 2) {
        return;
    }

    const items = queue.items;
    const lastMessage = items.at(-1); // 获取队列的最后一个元素
    if (!lastMessage) {
        return;
    }

    const lastUserId = lastMessage.user_id; // 获取最后一个元素的 user_id

    let currentIndex = items.length - 2;
    while (currentIndex >= 0) {
        const message = items[currentIndex]; // 获取当前元素
        if (message.user_id !== lastUserId) {
            break;
        }
        currentIndex --;
    }

    const retainItems = items.splice(currentIndex + 1);
    queue.items = retainItems;
}