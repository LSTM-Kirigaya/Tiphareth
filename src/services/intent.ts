import { mapper, plugins, LagrangeContext, PrivateMessage, GroupMessage, Send, logger } from 'lagrange.onebot'
import { llm } from '../api/llm';
import { apiQueryVecdb, apiQueryVecdbDataItem } from '../api/vecdb';

interface IntentResult {
    id: number,
    name: string,
    uncertainty: number
}

function makePrompt(messages: apiQueryVecdbDataItem[]): string {
    const texts = ['你是一个很聪明的AI，下面是你的知识库和参考内容，请根据参考内容回答上述的问题：'];
    for (const msg of messages) {
        texts.push(msg.content);
    }
    return texts.join('\n');
}

async function useRagLLM(c: LagrangeContext<GroupMessage>, intentResult: IntentResult) {
    const texts = [];
    for (const msg of c.message.message) {
        if (msg.type === 'text') {
            texts.push(msg.data.text);
        }
    }
    const query = texts.join(' ').trim();
    if (query.length === 0) {
        return undefined;
    }
    const { data } = await apiQueryVecdb({ query, k: 3 });
    if (data.code === 200) {
        const messages: apiQueryVecdbDataItem[] = data.data.filter(m => m.score <= 0.7);
        if (messages.length === 0) {
            return '未在数据库中检索到相关内容。';
        } else {
            const query = makePrompt(messages);
            const res = await llm.answer([
                {
                    role: 'user',
                    content: query
                }
            ]);
            if (typeof res === 'string') {
                const links = messages.map(m => m.source);
                const linkSet = new Set<string>(links);
                const reference = ['参考链接：', ...linkSet].join('\n');
                const anwser = res + '\n\n' + reference;
                return anwser;
            }
        }

    } else {
        logger.error('apiQueryVecdb 接口访问失败: ' + JSON.stringify(data));
        return undefined;
    }
}

export async function handleGroupIntent(c: LagrangeContext<GroupMessage>, intentResult: IntentResult) {
    switch (intentResult.name) {
        case 'usage':
            return await useRagLLM(c, intentResult);
            break;
        case 'bug':
            return await useRagLLM(c, intentResult);
            break;

        case 'others':
            break;
        
        default:
            break;
    }
}