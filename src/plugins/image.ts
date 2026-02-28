import { plugins, LagrangeContext, Message } from 'lagrange.onebot';

export class Impl {

    @plugins.register('wget-image')
    async wgetImage(c: LagrangeContext<Message>) {
        // 判断一下，只解析 message 类型的数据
        if (c.message.post_type === 'message') {
            const text = c.message.raw_message;
            if (text.startsWith('\\wget-image')) {
                const url = text.substring('\\wget-image'.length).trim();
                c.sendMessage([
                    {
                        type: 'image',
                        data: {
                            file: url,
                            timeout: 10000
                        }
                    }
                ]);

                // 插件中使用 finishSession 会让被装饰的事务函数不再被执行，直接结束对话
                c.finishSession();
            }
        }
    }

}