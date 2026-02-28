import { OmAgent } from 'openmcp-sdk/service/sdk';

export async function qqAgentLoop(
    groupId: number,
    content: string,
    reference: string
): Promise<void> {
    const agent = new OmAgent();

    agent.loadMcpConfig('./openmcp/lagrange.onebot.mcp.json');

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
            saveDir: './dataset/tip'
        }
    });
}
