import { markdownToPlainText } from '../utils/format';
import { OmAgent } from 'openmcp-sdk/service/sdk';

export async function summaryWebsite(url: string): Promise<string> {
    const agent = new OmAgent();
    agent.loadMcpConfig('./openmcp/crawl4ai.mcp.json');
    const prompt = await agent.getPrompt('summary-website', { url });
    const result = await agent.ainvoke({ messages: prompt });
    return markdownToPlainText(result.toString());
}
