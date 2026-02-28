import { GroupMessage, LagrangeContext } from "lagrange.onebot";

export async function getReplyMessage(c: LagrangeContext<GroupMessage>) {
    const reply = c.message.message.filter(m => m.type === 'reply')[0];
    if (reply) {
        const replyMessageId = parseInt(reply.data.id);
        const replyResponse = await c.getMsg(replyMessageId);
        if (replyResponse instanceof Error) {
            return undefined;
        }

        const replyMessage = JSON.stringify(replyResponse.data.message);
        return replyMessage;
    }

    return undefined;
}