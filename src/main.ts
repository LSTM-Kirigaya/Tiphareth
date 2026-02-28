import 'dotenv/config';

import { LagrangeFactory } from 'lagrange.onebot';

import { TestChannel } from './test-channel/test-channel.controller';
import { OpenMcpChannel } from './openmcp-dev/openmcp-dev.controller';
import { qq_users } from './global';
import { registerTipHttpServer } from './hook/http-server';

// 注册的模块
const server = LagrangeFactory.create([
    TestChannel,
    OpenMcpChannel
]);

server.onMounted(c => {    
    c.sendPrivateMsg(qq_users.JIN_HUI, 'Successfully Login, TIP online');
    registerTipHttpServer(c);
});

const type = process.env.LAGRANGE_WS_TYPE || 'forward-websocket';
const host = process.env.LAGRANGE_WS_HOST || '127.0.0.1';
const port = process.env.LAGRANGE_WS_PORT || 3001;
const access_token = process.env.LAGRANGE_WS_ACCESS_TOKEN;
const pathRoute = process.env.LAGRANGE_WS_PATH;

server.launch({
    type,
    host,
    port: Number(port),
    ...(access_token ? { access_token } : {}),
    ...(type === 'backward-websocket' && pathRoute ? { path: pathRoute } : {}),

    mcp: true,
    mcpOption: {
        enableMemory: true,
        enableWebsearch: true,
        host: '0.0.0.0',
        port: 3010,
    }
});