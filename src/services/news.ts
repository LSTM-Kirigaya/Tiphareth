import { z } from "zod";
import OpenAI from 'openai';
import Instructor from "@instructor-ai/instructor";
import { NewsItem, NewsItemSchema } from '../og/daily-og';
import { crawlUrlToMarkdown } from '../utils/websearch';
import { generatePremiumCard } from '../og/daily-og';

const openai = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
});

const client = Instructor({
    client: openai,
    mode: "TOOLS",
});

async function extractTopNewsHeadlines(markdownContent: string, count: number = 10): Promise<{ title?: string; link?: string }[]> {
    const HeadlineSchema = z.object({
        headlines: z.array(z.object({
            title: z.string().describe("新闻标题"),
            link: z.string().url().describe("新闻链接")
        })).max(count).describe(`从文本中提取前 ${count} 条新闻的标题和链接`)
    });

    try {
        const result = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `你是一个智能新闻提取助手。请从用户提供的Markdown文本中，识别并提取前${count}条最重要的新闻标题和对应的URL链接。请确保链接是完整的、可访问的URL。`
                },
                {
                    role: "user",
                    content: `请从以下文本中提取前${count}条新闻的标题和链接：\n\n${markdownContent}`
                }
            ],
            response_model: { schema: HeadlineSchema, name: "NewsHeadlines" },
            max_retries: 2
        });
        return result.headlines;
    } catch (error) {
        console.error("[INSTRUCTOR ERROR] Failed to extract headlines:", error);
        return [];
    }
}

async function summarizeArticle(markdownContent: string, originalLink: string): Promise<NewsItem | null> {
    try {
        const result = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `你是一个专业的文章总结和分类助手。请根据用户提供的Markdown文章内容，提取文章的标题、摘要（约100字）、作者、最相关的分类标签，并结合原始链接，以JSON格式返回一个结构化的NewsItem。摘要应精准概括文章核心，标签要精炼。`
                },
                {
                    role: "user",
                    content: `请总结这篇文章并提供分类信息：\n\n${markdownContent}\n\n原始链接为: ${originalLink}`
                }
            ],
            response_model: { schema: NewsItemSchema, name: "NewsItem" },
            max_retries: 3
        });
        return result;
    } catch (error) {
        console.error(`[INSTRUCTOR ERROR] Failed to summarize article from ${originalLink}:`, error);
        return null;
    }
}

export async function getStructuredNewsFeed(hackNewsUrl: string = "https://hn.aimaker.dev/category/top"): Promise<NewsItem[]> {
    const finalNewsItems: NewsItem[] = [];

    try {
        const topNewsMarkdown = await crawlUrlToMarkdown(hackNewsUrl);
        const topHeadlines = await extractTopNewsHeadlines(topNewsMarkdown, 10);
        console.log(`[NEWS FEED] Extracted ${topHeadlines.length} top headlines.`);

        let successfulSummaries = 0;
        for (const headline of topHeadlines) {
            if (successfulSummaries >= 4) {
                break;
            }

            try {
                const articleMarkdown = await crawlUrlToMarkdown(headline.link!);
                const summarizedItem = await summarizeArticle(articleMarkdown, headline.link!);

                if (summarizedItem) {
                    finalNewsItems.push(summarizedItem);
                    successfulSummaries++;
                    console.log(`[NEWS FEED] Successfully summarized: ${summarizedItem.title}`);
                } else {
                    console.warn(`[NEWS FEED] Failed to summarize article from ${headline.link}, trying next...`);
                }
            } catch (innerError) {
                console.warn(`[NEWS FEED] Failed to fetch or summarize ${headline.link}, trying next:`, (innerError as Error).message);
            }
        }

        console.log(`[NEWS FEED] Final collected news items: ${finalNewsItems.length}`);
        return finalNewsItems;

    } catch (error) {
        console.error("[NEWS FEED ERROR] Failed to get structured news feed:", error);
        return [];
    }
}

export async function getNewsFromHackNews(): Promise<string | null> {
    const items = await getStructuredNewsFeed();
    const imagePath = await generatePremiumCard(items);
    return imagePath;
}
