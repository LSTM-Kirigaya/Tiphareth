import { z } from "zod";
import React from 'react';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import QRCode from 'qrcode';

export const GithubRepoSchema = z.object({
    repoName: z.string().describe("仓库全名，例如 'facebook/react'"),
    description: z.string().describe("用中文总结仓库的核心功能，不超过 80 字"),
    language: z.string().describe("主要编程语言，如 TypeScript, Rust, Go 等"),
    stars: z.string().describe("当前总 Star 数，如 12.5k"),
    starsToday: z.string().describe("今日增长的 Star 数，如 +420 stars today"),
    author: z.string().describe("开发者或组织名称"),
    link: z.string().url().describe("仓库的完整 GitHub URL")
});

export type GithubRepo = z.infer<typeof GithubRepoSchema>;

const BLACK = '#000000';
const QR_SIZE = 52;
const PATTERN_HEIGHT = 48;
const AUTHOR_MAX = 10;
const REPO_NAME_LINE_HEIGHT = 1.25;
const DESC_LINE_HEIGHT = 1.5;
const REPO_NAME_FONT_SIZE = 28;
const DESC_FONT_SIZE = 16;

const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + '…' : s);

const getBase64Image = (imagePath: string): string => {
    try {
        const data = readFileSync(imagePath);
        return `data:image/png;base64,${data.toString('base64')}`;
    } catch {
        return '';
    }
};

const FOOTER_RESOURCES = [
    { name: 'OpenMCP 文档', desc: 'MCP 开发指南', qrCode: './assets/images/openmcp-document-qr.png' },
    { name: 'GitHub', desc: '开源项目源码', qrCode: './assets/images/openmcp-github-qr.png' },
    { name: '安树社区', desc: '独立技术社区', qrCode: './assets/images/anzutree-qr.png' },
];

const QuarterCirclePattern = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', width: `${PATTERN_HEIGHT}px`, height: `${PATTERN_HEIGHT}px` }}>
        <div style={{ display: 'flex', width: '24px', height: '24px', borderRadius: '0 100% 0 0', backgroundColor: BLACK }} />
        <div style={{ display: 'flex', width: '24px', height: '24px', borderRadius: '0 100% 0 0', backgroundColor: BLACK }} />
        <div style={{ display: 'flex', width: '24px', height: '24px', borderRadius: '0 100% 0 0', backgroundColor: BLACK }} />
        <div style={{ display: 'flex', width: '24px', height: '24px', borderRadius: '0 100% 0 0', backgroundColor: BLACK }} />
    </div>
);

const GeometricAccent = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: '10px',
        marginTop: '8px',
        height: `${PATTERN_HEIGHT}px`,
        flexShrink: 0,
    }}>
        <QuarterCirclePattern />
    </div>
);

const linkToQR = async (url: string): Promise<string> => {
    try {
        return await QRCode.toDataURL(url, { width: QR_SIZE, margin: 1 });
    } catch {
        return '';
    }
};

export async function generateGithubTrendingCard(data: GithubRepo[]): Promise<string | null> {
    try {
        const fontData = readFileSync('./assets/fonts/NotoSansSC-Regular.ttf');
        const fontBold = readFileSync('./assets/fonts/NotoSansSC-Bold.ttf');
        const footerWithQR = FOOTER_RESOURCES.map(r => ({ ...r, qrBase64: getBase64Image(r.qrCode) }));
        const reposWithQR = await Promise.all(data.map(async (repo) => ({
            ...repo,
            qrDataUrl: await linkToQR(repo.link),
        })));
        const date = new Date();
        const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

        const svg = await satori(
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: 800,
                height: 1200,
                backgroundColor: '#FFFFFF',
                fontFamily: 'Noto Sans SC',
                color: '#000000',
                padding: '50px',
            }}>
                {/* 顶部：紧凑排版 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: '32px',
                    flexShrink: 0,
                }}>
                    <div style={{
                        display: 'flex',
                        fontSize: '72px',
                        fontWeight: 900,
                        lineHeight: '0.9',
                        letterSpacing: '-4px',
                        color: '#000000',
                        marginBottom: '16px',
                    }}>
                        Anz
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                    }}>
                        <div style={{
                            display: 'flex',
                            fontSize: '72px',
                            fontWeight: 900,
                            lineHeight: '0.9',
                            letterSpacing: '-4px',
                            color: '#000000',
                        }}>
                            uLeaf.
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            maxWidth: '280px',
                            marginBottom: '10px',
                        }}>
                            <div style={{
                                display: 'flex',
                                fontSize: '11px',
                                color: '#666666',
                                letterSpacing: '1px',
                                lineHeight: '1.6',
                                textAlign: 'right',
                            }}>
                                开源项目 · GITHUB TRENDING
                            </div>
                            <div style={{
                                display: 'flex',
                                fontSize: '10px',
                                color: '#999999',
                                letterSpacing: '0.5px',
                                marginTop: '6px',
                            }}>
                                FACE THE FEAR, CREATE THE FUTURE
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', width: '100%', height: '2px', backgroundColor: '#000000', marginTop: '10px' }} />
                </div>

                {/* 中部：仓库列表 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                    marginBottom: '24px',
                }}>
                    {reposWithQR.length > 0 ? reposWithQR.map((repo, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            flexDirection: 'row',
                            paddingBottom: i < reposWithQR.length - 1 ? '16px' : 0,
                            marginBottom: i < reposWithQR.length - 1 ? '16px' : 0,
                            borderBottom: i < reposWithQR.length - 1 ? '1px solid #EEEEEE' : 'none',
                            gap: '16px',
                            alignItems: 'flex-start',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                <div style={{
                                    display: 'flex',
                                    fontSize: `${REPO_NAME_FONT_SIZE}px`,
                                    fontWeight: 900,
                                    color: '#000000',
                                    letterSpacing: '-1px',
                                    marginBottom: '8px',
                                    lineHeight: REPO_NAME_LINE_HEIGHT,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {repo.repoName}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    fontSize: `${DESC_FONT_SIZE}px`,
                                    color: '#666666',
                                    lineHeight: DESC_LINE_HEIGHT,
                                    marginBottom: '8px',
                                    overflow: 'hidden',
                                    maxHeight: `${Math.ceil(DESC_FONT_SIZE * DESC_LINE_HEIGHT * 2)}px`,
                                }}>
                                    {repo.description}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: '16px',
                                    fontSize: '14px',
                                    color: '#999999',
                                }}>
                                    <span>{repo.language}</span>
                                    <span>{repo.stars}</span>
                                    <span style={{ fontWeight: 'bold', color: '#000000' }}>{repo.starsToday}</span>
                                    <span style={{ maxWidth: '80px', overflow: 'hidden' }}>{truncate(repo.author, AUTHOR_MAX)}</span>
                                </div>
                            </div>
                            {repo.qrDataUrl ? (
                                <img src={repo.qrDataUrl} style={{ display: 'flex', width: `${QR_SIZE}px`, height: `${QR_SIZE}px`, flexShrink: 0 }} />
                            ) : null}
                        </div>
                    )) : (
                        <div style={{ display: 'flex', fontSize: '16px', color: '#999999' }}>暂无数据</div>
                    )}
                </div>

                <GeometricAccent />

                {/* 底部：日期（左）+ 二维码组（右） */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 'auto',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', width: '100%', height: '2px', backgroundColor: '#000000', marginBottom: '16px' }} />
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', fontSize: '48px', fontWeight: 900, color: '#000000', letterSpacing: '-2px', lineHeight: '1' }}>
                                {monthDay}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', fontSize: '14px', fontWeight: 700, color: '#000000', letterSpacing: '2px' }}>{date.getFullYear()}</span>
                                <span style={{ display: 'flex', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#CCCCCC', marginTop: '6px' }} />
                                <span style={{ display: 'flex', fontSize: '12px', color: '#666666', letterSpacing: '4px', fontWeight: 600 }}>Raspberry Pi 5</span>
                                <span style={{ display: 'flex', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#CCCCCC', marginTop: '6px' }} />
                                <span style={{ display: 'flex', fontSize: '11px', color: '#AAAAAA', letterSpacing: '1px' }}>DESIGNER 锦恢</span>
                            </div>
                            <div style={{ display: 'flex', width: '24px', height: '3px', backgroundColor: '#000000', marginTop: '12px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
                            {footerWithQR.map((resource, index) => (
                                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{
                                        display: 'flex',
                                        width: '80px',
                                        height: '80px',
                                        backgroundColor: '#F5F5F5',
                                        marginBottom: '8px',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {resource.qrBase64 ? (
                                            <img src={resource.qrBase64} style={{ display: 'flex', width: '70px', height: '70px' }} />
                                        ) : (
                                            <div style={{ display: 'flex', width: '70px', height: '70px', backgroundColor: '#E0E0E0' }} />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', fontSize: '10px', fontWeight: 'bold', color: '#000000', marginBottom: '2px', letterSpacing: '0.5px' }}>
                                        {resource.name}
                                    </div>
                                    <div style={{ display: 'flex', fontSize: '8px', color: '#999999', letterSpacing: '0.5px' }}>
                                        {resource.desc}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>, 
            {
                width: 800,
                height: 1200,
                fonts: [
                    { name: 'Noto Sans SC', data: fontData, weight: 400 },
                    { name: 'Noto Sans SC', data: fontBold, weight: 700 },
                ],
            }
        );

        const resvg = new Resvg(svg, {
            background: '#FFFFFF',
            fitTo: { mode: 'width', value: 2400 },
        });

        const fileName = 'github-trending.png';
        writeFileSync(fileName, resvg.render().asPng());
        return path.resolve(fileName);

    } catch (err) {
        console.error('生成失败:', err);
        return null;
    }
}

// 直接运行测试
const mockRepos: GithubRepo[] = [
    {
        repoName: 'facebook/react',
        description: '用于构建用户界面的 JavaScript 库',
        language: 'JavaScript',
        stars: '220k',
        starsToday: '+420 stars today',
        author: 'meta',
        link: 'https://github.com/facebook/react',
    },
    {
        repoName: 'vercel/next.js',
        description: 'React 全栈框架，支持 SSR 与静态导出',
        language: 'TypeScript',
        stars: '120k',
        starsToday: '+256 stars today',
        author: 'vercel',
        link: 'https://github.com/vercel/next.js',
    },
    {
        repoName: 'vercel/next.js',
        description: 'React 全栈框架，支持 SSR 与静态导出',
        language: 'TypeScript',
        stars: '120k',
        starsToday: '+256 stars today',
        author: 'vercel',
        link: 'https://github.com/vercel/next.js',
    },
    {
        repoName: 'vercel/next.js',
        description: 'React 全栈框架，支持 SSR 与静态导出',
        language: 'TypeScript',
        stars: '120k',
        starsToday: '+256 stars today',
        author: 'vercel',
        link: 'https://github.com/vercel/next.js',
    },
        {
        repoName: 'vercel/next.js',
        description: 'React 全栈框架，支持 SSR 与静态导出',
        language: 'TypeScript',
        stars: '120k',
        starsToday: '+256 stars today',
        author: 'vercel',
        link: 'https://github.com/vercel/next.js',
    },
    {
        repoName: 'vercel/next.js',
        description: 'React 全栈框架，支持 SSR 与静态导出',
        language: 'TypeScript',
        stars: '120k',
        starsToday: '+256 stars today',
        author: 'vercel',
        link: 'https://github.com/vercel/next.js',
    },
];
if (process.argv[1]?.includes('github-og')) {
    generateGithubTrendingCard(mockRepos).then(p => p && console.log('🎉 已生成:', p));
}
