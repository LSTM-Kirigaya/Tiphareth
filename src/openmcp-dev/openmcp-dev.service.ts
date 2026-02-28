import '../plugins/image';

import { LagrangeContext, PrivateMessage, GroupMessage } from 'lagrange.onebot'
import { getNewsFromHackNews } from '../services/news';

export async function getNews(c: LagrangeContext<PrivateMessage | GroupMessage>) {
    const message = await getNewsFromHackNews();
    console.log('message', message);

    if (message) {
        c.sendMessage(message);
    }
}

