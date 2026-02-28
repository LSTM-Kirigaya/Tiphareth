import '../plugins/image';

import { mapper, plugins, LagrangeContext, PrivateMessage } from 'lagrange.onebot'

console.log('activate ' + __filename);

export class Impl {
    @mapper.onPrivateUser(1193466151)
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
                    await getNews(c);
                    break;
            
                default:
                    break;
            }
        }

        // c.sendMessage([{
        //     type: 'image',
        //     data: {
        //         file: 'file:///data/zhelonghuang/project/rag-llm/images/bird.png',
        //         timeout: 10000
        //     }
        // }])
        c.finishSession();
    }

    // @mapper.onGroup(956419963, { at: false })
    // async handleTestGroup(c: LagrangeContext<GroupMessage>) {
    //     const texts = [];
    //     const message = c.message;
    //     for (const msg of message.message) {
    //         if (msg.type === 'text') {
    //             texts.push(msg.data.text);
    //         }
    //     }
    //     const reply: Send.Default[] = [];
    //     const axiosRes = await apiGetIntentRecogition({ query: texts.join('\n') });
    //     const res = axiosRes.data;
    //     if (res.code == 200) {
    //         const intentResult = res.data;

    //         // 如果 不确定性 太高，就将意图修改为 
    //         if (intentResult.uncertainty >= 0.33) {
    //             intentResult.name = 'others';
    //         }
            
    //         const uncertainty = Math.round(intentResult.uncertainty * 1000) / 1000;
    //         const intentDebug = `【意图: ${intentResult.name} 不确定度: ${uncertainty}】`;
    //         const anwser = await handleGroupIntent(c, intentResult);
    //         if (anwser === undefined) {
    //             c.sendMessage('拒答' + '\n' + intentDebug);
    //         } else {
    //             c.sendMessage(anwser + '\n' + intentDebug);
    //         }

    //     } else {
    //         c.sendMessage('RAG 系统目前离线');
    //     }
    // }
}


async function getNews(c: LagrangeContext<PrivateMessage>) {
    const { getNewsFromHackNews } = await import('./news');
    const message = await getNewsFromHackNews();
    console.log('message', message);

    if (message) {
        c.sendMessage(message);
    }
}


async function getFile(c: LagrangeContext<PrivateMessage>) {
    c.sendMessage([
        // {
        //     type: 'text',
        //     data: {
        //         file: 'file:///data/zhelonghuang/project/rag-llm/images/bird.png',
        //         timeout: 10000
        //     }
        // }
    ])
}


async function publishOpenMCP(c: LagrangeContext<PrivateMessage>) {
    const { getNewsFromHackNews } = await import('./news');
    const message = await getNewsFromHackNews();
    console.log('message', message);

    if (message) {
        c.sendMessage(message);
    }
}
