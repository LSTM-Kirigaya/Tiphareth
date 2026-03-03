import React from 'react';
import { z } from "zod";
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import QRCode from 'qrcode';

export const NewsItemSchema = z.object({
    title: z.string().describe("文章的标题，需简炼且吸引人"),
    summary: z.string().describe("文章的核心内容摘要，控制在 100 字左右"),
    author: z.string().describe("原作者姓名或来源机构名称"),
    tag: z.string().describe("文章的分类标签，例如：AI、前端、架构等"),
    link: z.string().url().describe("文章的原始来源 URL 链接")
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

const BLACK = '#000000';
const QR_SIZE = 52;
const AUTHOR_MAX = 8;
const TITLE_LINE_HEIGHT = 1.25;
const SUMMARY_LINE_HEIGHT = 1.45;
const TITLE_FONT_SIZE = 28;
const SUMMARY_FONT_SIZE = 16;

const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + '…' : s);

/** 防止 Windows 路径等含反斜杠的文本在 JSON 解析时破坏（如 LLM 返回的 "C:\" 等） */
const sanitizeForRender = (s: string) => String(s ?? '').replace(/\\/g, '/');

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

const linkToQR = async (url: string): Promise<string> => {
    try {
        return await QRCode.toDataURL(url, { width: QR_SIZE, margin: 1 });
    } catch {
        return '';
    }
};
const PATTERN_HEIGHT = 48;

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

export async function generatePremiumCard(data: NewsItem[]): Promise<string | null> {
    try {
        const fontData = readFileSync('./assets/fonts/NotoSansSC-Regular.ttf');
        const fontBold = readFileSync('./assets/fonts/NotoSansSC-Bold.ttf');
        const footerWithQR = FOOTER_RESOURCES.map(r => ({ ...r, qrBase64: getBase64Image(r.qrCode) }));
        const itemsWithQR = await Promise.all(data.map(async (item) => ({
            ...item,
            title: sanitizeForRender(item.title),
            summary: sanitizeForRender(item.summary),
            author: sanitizeForRender(item.author),
            tag: sanitizeForRender(item.tag),
            qrDataUrl: await linkToQR(item.link),
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
                                AI & CS 技术分享 · 精选阅读
                            </div>
                            <div style={{
                                display: 'flex',
                                fontSize: '10px',
                                color: '#999999',
                                letterSpacing: '0.5px',
                                marginTop: '6px',
                            }}>
                                ANZULEAF DAILY SHARE
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', width: '100%', height: '2px', backgroundColor: '#000000', marginTop: '10px' }} />
                </div>

                {/* 中部：文章列表，固定高度防溢出 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    marginBottom: '24px',
                    overflow: 'hidden',
                }}>
                    {itemsWithQR.length > 0 ? itemsWithQR.map((news, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            flexDirection: 'row',
                            paddingBottom: i < itemsWithQR.length - 1 ? '16px' : 0,
                            marginBottom: i < itemsWithQR.length - 1 ? '16px' : 0,
                            borderBottom: i < itemsWithQR.length - 1 ? '1px solid #EEEEEE' : 'none',
                            gap: '12px',
                            alignItems: 'flex-start',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                <div style={{
                                    display: 'flex',
                                    fontSize: `${TITLE_FONT_SIZE}px`,
                                    fontWeight: 900,
                                    color: '#000000',
                                    letterSpacing: '-1px',
                                    marginBottom: '8px',
                                    lineHeight: TITLE_LINE_HEIGHT,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {news.title}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    fontSize: `${SUMMARY_FONT_SIZE}px`,
                                    color: '#666666',
                                    lineHeight: SUMMARY_LINE_HEIGHT,
                                    overflow: 'hidden',
                                    maxHeight: `${Math.ceil(SUMMARY_FONT_SIZE * SUMMARY_LINE_HEIGHT * 2)}px`,
                                }}>
                                    {news.summary}
                                </div>
                            </div>
                            {news.qrDataUrl ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                    <img src={news.qrDataUrl} style={{ display: 'flex', width: `${QR_SIZE}px`, height: `${QR_SIZE}px` }} />
                                    <div style={{
                                        display: 'flex',
                                        fontSize: '12px',
                                        color: '#999999',
                                        letterSpacing: '1px',
                                        marginTop: '6px',
                                        textAlign: 'center',
                                        maxWidth: '80px',
                                        overflow: 'hidden',
                                    }}>
                                        {news.tag} - {truncate(news.author, AUTHOR_MAX)}
                                    </div>
                                </div>
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
                                <span style={{ display: 'flex', fontSize: '11px', color: '#AAAAAA', letterSpacing: '1px' }}>192.168.10.1</span>
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

        const fileName = 'daily-news.png';
        const pngBuffer = resvg.render().asPng();

        writeFileSync(fileName, pngBuffer);
        // 使用正斜杠，避免 Windows 路径中的 \ 在 JSON 解析时导致 ParseError
        const absolutePath = path.resolve(fileName).replace(/\\/g, '/');

        console.log(`🎉 今日文章卡片已生成: ${absolutePath}`);

        return absolutePath;

    } catch (err) {
        console.error('生成失败:', err);
        return null;
    }
}

// 直接运行测试
const mockNews: NewsItem[] = [
    {
        title: '大模型推理加速：从 FlashAttention 到 Sparse Attention',
        summary: '深入解析注意力机制优化技术，介绍稀疏注意力与高效计算的实践方法。',
        author: '某技术博客',
        tag: 'AI',
        link: 'https://github.com/facebook/react',
    },
    {
        title: 'TypeScript 5.0 新特性一览',
        summary: '汇总 TypeScript 5.0 带来的装饰器、泛型与类型推断等重要更新。',
        author: '技术社区',
        tag: '前端',
        link: 'https://github.com/vercel/next.js',
    },
    {
        title: 'Rust 异步运行时 Tokio 实战指南',
        summary: '从零开始理解 Tokio 的调度模型与 Future 执行流程，并构建高并发网络服务。',
        author: 'Rust 周刊',
        tag: '后端',
        link: 'https://github.com/tokio-rs/tokio',
    },
    {
        title: '微服务架构下的分布式追踪实践',
        summary: '基于 OpenTelemetry 实现全链路追踪，提升系统可观测性与故障定位效率。',
        author: '架构师手册',
        tag: '架构',
        link: 'https://github.com/open-telemetry/opentelemetry-js',
    },
];
if (process.argv[1]?.includes('daily-og')) {
    generatePremiumCard(mockNews).then(p => p && console.log('🎉 已生成:', p));
}
