import { OmAgent } from 'openmcp-sdk/service/sdk';
import { getSkillMdPath } from 'lagrange.onebot/mcp/extraTool';

const mcpHost = process.env.MCP_HOST;
const mcpPort = Number(process.env.MCP_PORT);
const mcpUrl = 'http://' + mcpHost + ':' + mcpPort + '/mcp';

export async function qqAgentLoop(
    groupId: number,
    content: string,
    reference: string
): Promise<void> {
    const agent = new OmAgent();

    console.log(mcpUrl);

    agent.loadMcp({
        mcpServers: {
            'L.Bot MCP': {
                url: mcpUrl,
                type: 'http'
            }
        },
        defaultLLM: {
            baseURL: process.env.OPENAI_BASE_URL,
            model: process.env.OPENAI_MODEL,
            apiToken: '1321321321'
        },
        skillPath: getSkillMdPath()
    });

    const systemPrompt = await agent.getPrompt('at-message', {
        groupId: groupId.toString()
    });

    const queryPrompt = await agent.getPrompt('at-query', {
        content: content.toString(),
        reference: reference.toString(),
    });

    await agent.ainvoke({
        messages: [systemPrompt, queryPrompt].join('\n'),
        reflux: {
            enabled: true,
            saveDir: './dataset/chat'
        }
    });
}
