import { mapper, plugins, LagrangeContext, PrivateMessage, GroupMessage, Send, logger } from 'lagrange.onebot';

console.log('activate ' + __filename);

export class Impl {
    @mapper.onGroup(782833642)
    @plugins.use('echo')
    @plugins.use('pm')
    @plugins.use('wget-image')
    async handleOpenMCP(c: LagrangeContext<GroupMessage>) {
        const text = c.getRawText();
        console.log('[receive] ' + text);

        if (c.qq) {

        }

        if (text.startsWith(':')) {
            const command = text.substring(1);
            switch (command) {
                case 'news':
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
}
