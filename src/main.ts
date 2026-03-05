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

const type = (process.env.ONEBOT_WS_TYPE as 'forward-websocket' | 'backward-websocket') || 'forward-websocket';
const host = process.env.ONEBOT_WS_HOST || '127.0.0.1';
const port = Number(process.env.ONEBOT_WS_PORT || 3001);
const accessToken = process.env.ONEBOT_WS_ACCESS_TOKEN;
const mcpHost = process.env.MCP_HOST;
const mcpPort = Number(process.env.MCP_PORT);

server.launch({
    type,
    host,
    port,
    accessToken,
    mcpOption: {
        enableMemory: true,
        enableWebsearch: true,
        host: mcpHost,
        port: mcpPort
    }
});