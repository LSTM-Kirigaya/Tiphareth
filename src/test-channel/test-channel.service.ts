import '../plugins/image';

import { LagrangeContext, PrivateMessage, GroupMessage } from 'lagrange.onebot'
import path from 'path';
import { sendMessageToDiscord, wait } from '../hook/util';

import { OmPipe } from 'ompipe';
import { qq_groups, qq_users } from '../global';
import { getNewsFromHackNews } from '../services/news';
import { updateOpenMCP, getVersion, buildOpenMCP, getLastChangeLog, publishVsix, publishGithubRelease } from '../services/openmcp-publish';

export async function sendNewsToJinhui(c: LagrangeContext<PrivateMessage | GroupMessage>) {
    const imagePath = await getNewsFromHackNews();
    if (imagePath) {
        await c.sendPrivateMsg(qq_users.JIN_HUI, [{
            type: 'image',
            data: {
                file: 'file://' + imagePath
            }
        }]);
    }
}

export async function publishOpenMCP(c: LagrangeContext<GroupMessage | PrivateMessage>) {
    try {
        await updateOpenMCP();
    } catch (e) {
        c.sendGroupMsg(qq_groups.OPENMCP_DEV, '无法拉取最新代码 ❌\n' + (e as Error).message);
        return;
    }

    let version: string;
    try {
        version = getVersion();
    } catch (e) {
        c.sendGroupMsg(qq_groups.OPENMCP_DEV, '无法获取版本 ❌\n' + (e as Error).message);
        return;
    }
    const pipe = new OmPipe(version);

    pipe.add('build-openmcp', async () => {
        try {
            const vsix = await buildOpenMCP();
            const content = getLastChangeLog();
            c.sendGroupMsg(qq_groups.OPENMCP_DEV, 'openmcp 完成编译');
            return { vsix, content };
        } catch (e) {
            c.sendGroupMsg(qq_groups.OPENMCP_DEV, '编译失败 ❌\n' + (e as Error).message);
            throw new Error('x');
        }
    }, { critical: true });


    pipe.add('publish-vscode', async store => {
        const { vsix } = store.getTaskResult('build-openmcp');

        try {
            await publishVsix(vsix, 'vsce');
            c.sendGroupMsg(qq_groups.OPENMCP_DEV, 'vscode 平台发布成功 ✅ https://marketplace.visualstudio.com/items?itemName=kirigaya.openmcp');
        } catch (e) {
            c.sendGroupMsg(qq_groups.OPENMCP_DEV, 'vscode 平台发布失败 ❌\n' + (e as Error).message);
            throw new Error((e as Error).message);
        }
    }, { retryInterval: 200, maxRetryCount: 3 });


    pipe.add('publish-open-vsx', async store => {
        const { vsix } = store.getTaskResult('build-openmcp');

        try {
            await publishVsix(vsix, 'ovsx');
            c.sendGroupMsg(qq_groups.OPENMCP_DEV, 'openvsx 平台发布成功 ✅ https://open-vsx.org/extension/kirigaya/openmcp');
        } catch (e) {
            c.sendGroupMsg(qq_groups.OPENMCP_DEV, 'openvsx 平台发布失败 ❌\n' + (e as Error).message);
            throw new Error((e as Error).message);
        }
    }, { retryInterval: 200, maxRetryCount: 3 });


    pipe.add('publish-github-release', async store => {
        const { vsix } = store.getTaskResult('build-openmcp');

        try {
            const msg = await publishGithubRelease(vsix);
            c.sendGroupMsg(qq_groups.OPENMCP_DEV, 'github release 发布成功 ✅ ' + msg);
        } catch (e) {
            c.sendGroupMsg(qq_groups.OPENMCP_DEV, 'github release 发布失败 ❌\n' + (e as Error).message);
            throw new Error((e as Error).message);
        }
    }, { retryInterval: 200, maxRetryCount: 3 });


    pipe.add('publish-qq', async store => {
        const { vsix, content } = store.getTaskResult('build-openmcp');

        await c.sendGroupNotice(qq_groups.OPENMCP_DEV, content!);
        await wait(2000);
        await c.uploadGroupFile(qq_groups.OPENMCP_DEV, vsix, path.basename(vsix));
        await sendMessageToDiscord(content);
    });

    await pipe.start();
}
