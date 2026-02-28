// 配置大模型 请求参数

import axios from "axios";
import { logger } from "lagrange.onebot";

interface LlmMessageItem {
    role: 'user' | 'assistant',
    content: string
}

// 已经废弃
class ErineLLM {
    apiKey: string = process.env.BAIDU_API_KEY;
    secretKey: string = process.env.BAIDU_SECRET_KEY;
    accessToken: string = '';
    constructor() {
        if (this.apiKey === '') {
            throw Error('百度 api_key 为空');
        }

        if (this.secretKey === '') {
            throw Error('百度 secret_key 为空');
        }
        
        // this.getAccessToken();
    }

    public async getAccessToken() {
        const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`;
        const payload = "";
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const { data } = await axios.post(url, payload, { headers });
        const accessToken = data.access_token;
        if (accessToken) {
            this.accessToken = accessToken;
            logger.info('成功获取大模型访问令牌');
        } else {
            logger.error('大模型令牌获取失败：' + JSON.stringify(data))
        }
    }

    public async answer(message: LlmMessageItem[]): Promise<string | undefined> {
        if (message.length % 2 === 0) {
            logger.error('大模型的 message 长度必须是奇数，目前为 ' + message.length);
            return undefined;
        }
        const url = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-lite-8k?access_token=' + this.accessToken;
        
        const payload = {
            messages: message,
            system: '你是锦恢开发的用于进行问答的 QA 机器人。主要负责解决 Digital IDE 用户群的答疑问题'
        }
        const headers = {
            'Content-Type': 'application/json'
        }

        const { data } = await axios.post(url, payload, { headers });
        const result = data.result;
        if (result) {
            return result;
        } else {
            logger.error('大模型返回结果有误： ' + JSON.stringify(data));
            return undefined;
        }
    }
}

export const llm = new ErineLLM();