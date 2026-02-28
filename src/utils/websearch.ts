import { chromium } from 'playwright';
import TurndownService from 'turndown';

/**
 * 将指定 URL 的网页内容转换为 Markdown 格式
 * 参考 Lagrange.onebot src/mcp/extraTool.ts 实现，使用 Playwright + Turndown 替代外部 websearch 工具
 *
 * @param url 网页 URL
 * @returns Markdown 格式的网页内容
 */
export async function crawlUrlToMarkdown(url: string): Promise<string> {
    try {
        console.log(`[CRAWLER] Crawling: ${url}`);

        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });

        try {
            const page = await browser.newPage();
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.setExtraHTTPHeaders({
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

            const result = await page.evaluate(() => {
                const title = document.title?.trim() || '';

                let mainContent = '';
                const mainElement =
                    document.querySelector('main') ||
                    document.querySelector('article') ||
                    document.querySelector('[role="main"]') ||
                    document.querySelector('.content') ||
                    document.querySelector('#content') ||
                    document.querySelector('.main') ||
                    document.querySelector('#main');

                if (mainElement) {
                    mainContent = mainElement.innerHTML;
                } else {
                    mainContent = document.body.innerHTML;
                }

                return { title, mainContent };
            });

            const turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
            });

            turndownService.remove(['script', 'style', 'noscript', 'iframe']);

            const markdown = turndownService.turndown(result.mainContent);
            const content = markdown.trim();

            console.log(`[CRAWLER] Finished crawling: ${url}`);
            return content;
        } finally {
            await browser.close();
        }
    } catch (error) {
        console.error(`[CRAWLER ERROR] Failed to crawl ${url}:`, (error as Error).message);
        throw error;
    }
}
