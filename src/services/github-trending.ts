import OpenAI from 'openai';
import Instructor from '@instructor-ai/instructor';
import { z } from "zod";
import { generateGithubTrendingCard, GithubRepoSchema } from '../og/github-og';
import { crawlUrlToMarkdown } from '../utils/websearch';
import type { GithubRepo } from '../og/github-og';

const openai = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
});

const client = Instructor({ client: openai, mode: "TOOLS" });

export async function getGithubTrendingDetailed(): Promise<GithubRepo[]> {
    const trendingUrl = "https://github.com/trending";
    const finalRepos: GithubRepo[] = [];

    try {
        const mainMarkdown = await crawlUrlToMarkdown(trendingUrl);

        const IndexSchema = z.object({
            items: z.array(z.object({
                name: z.string(),
                link: z.string().url(),
                starsToday: z.string()
            })).max(10)
        });

        const indexResult = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o",
            messages: [
                { role: "system", content: "你是一个 GitHub 数据分析官。请从 Markdown 中提取今日 Trending 列表的项目名、链接和今日增长星数。" },
                { role: "user", content: mainMarkdown }
            ],
            response_model: { schema: IndexSchema, name: "GithubIndex" }
        });

        let successCount = 0;
        for (const item of indexResult.items) {
            if (successCount >= 4) break;

            try {
                const detailMarkdown = await crawlUrlToMarkdown(item.link);

                const repoDetail = await client.chat.completions.create({
                    model: process.env.OPENAI_MODEL || "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: "请根据提供的 GitHub 仓库详情 Markdown，提取并总结项目信息。注意：务必通过描述或提及的内容推断出编程语言的占比情况。"
                        },
                        {
                            role: "user",
                            content: `项目：${item.name}\n今日增长：${item.starsToday}\n链接：${item.link}\n内容详情：\n${detailMarkdown}`
                        }
                    ],
                    response_model: { schema: GithubRepoSchema, name: "GithubDetail" },
                    max_retries: 2
                });

                if (repoDetail) {
                    finalRepos.push(repoDetail);
                    successCount++;
                    console.log(`[GITHUB] 已成功处理: ${repoDetail.repoName}`);
                }
            } catch (err) {
                console.warn(`[GITHUB] 抓取项目 ${item.name} 失败，尝试下一个...`);
            }
        }

        return finalRepos;
    } catch (error) {
        console.error("[GITHUB ERROR]", error);
        return [];
    }
}

export async function getGithubTrendingImage(): Promise<string | null> {
    const items = await getGithubTrendingDetailed();
    return await generateGithubTrendingCard(items);
}
