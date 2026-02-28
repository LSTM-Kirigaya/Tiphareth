import * as fs from 'fs';
import { OmAgent } from 'openmcp-sdk/service/sdk';

export async function qqGroupSummaryPdf(json: any): Promise<{ pdfPath: string; imagePath: string }> {
    const agent = new OmAgent();
    agent.loadMcpConfig('./openmcp/qq-group-summary.mcp.json');

    let pdfPath = '';
    let imagePath = '';
    const agentLoop = await agent.getLoop();

    agentLoop.registerOnToolCalled(result => {
        const text = result.content[0]?.text;
        if (text && fs.existsSync(text)) {
            pdfPath = result.content[0]?.text;
            imagePath = result.content[1]?.text;
            agentLoop.abort();
        }
        return result;
    });

    const prompt = await agent.getPrompt('lead_summary', {});
    json = typeof json === 'string' ? json : JSON.stringify(json);
    await agent.ainvoke({ messages: prompt + json });

    return { pdfPath, imagePath };
}
