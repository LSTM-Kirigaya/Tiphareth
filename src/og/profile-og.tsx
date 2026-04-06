import React from 'react';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';

export interface ProfileOGData {
    /** 名称 */
    name: string;
    /** ID/用户名 */
    username: string;
    /** 头像路径 */
    avatar: string;
    /** 个人简介 */
    bio: string;
    /** 专注领域标签 */
    tags: string[];
    /** 平台联系方式 */
    platforms: {
        name: string;
        handle: string;
        url?: string;
    }[];
}

const BLACK = '#000000';

const getBase64Image = (imagePath: string): string => {
    try {
        const data = readFileSync(imagePath);
        const ext = imagePath.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                        ext === 'webp' ? 'image/webp' : 'image/png';
        return `data:${mimeType};base64,${data.toString('base64')}`;
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

/**
 * 生成自媒体账号介绍 OG 卡片
 * 基于 daily-og.tsx 的极简黑白风格
 */
export async function generateProfileCard(data: ProfileOGData): Promise<string | null> {
    try {
        const fontData = readFileSync('./assets/fonts/NotoSansSC-Regular.ttf');
        const fontBold = readFileSync('./assets/fonts/NotoSansSC-Bold.ttf');
        
        // 读取头像
        const avatarBase64 = getBase64Image(data.avatar);

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
                {/* 顶部：名称 + ID */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: '28px',
                    flexShrink: 0,
                }}>
                    <div style={{
                        display: 'flex',
                        fontSize: '72px',
                        fontWeight: 900,
                        lineHeight: '0.9',
                        letterSpacing: '-4px',
                        color: '#000000',
                        marginBottom: '12px',
                    }}>
                        {data.name}
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{
                            display: 'flex',
                            fontSize: '32px',
                            fontWeight: 700,
                            lineHeight: '1',
                            letterSpacing: '-1px',
                            color: '#333333',
                            fontFamily: 'monospace',
                        }}>
                            {data.username}
                        </div>
                        <div style={{
                            display: 'flex',
                            fontSize: '11px',
                            color: '#666666',
                            letterSpacing: '1px',
                        }}>
                            技术创作者 · 知识分享
                        </div>
                    </div>
                    <div style={{ display: 'flex', width: '100%', height: '2px', backgroundColor: '#000000', marginTop: '16px' }} />
                </div>

                {/* 头像 + 平台联系方式区域 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '32px',
                    marginBottom: '28px',
                    flexShrink: 0,
                }}>
                    {/* 头像 */}
                    <div style={{
                        display: 'flex',
                        width: '160px',
                        height: '160px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '3px solid #000000',
                        flexShrink: 0,
                    }}>
                        {avatarBase64 ? (
                            <img src={avatarBase64} style={{ display: 'flex', width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#F0F0F0' }} />
                        )}
                    </div>

                    {/* 平台联系方式 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        justifyContent: 'center',
                    }}>
                        <div style={{
                            display: 'flex',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#000000',
                            letterSpacing: '2px',
                            marginBottom: '14px',
                            textTransform: 'uppercase',
                        }}>
                            FIND ME ON
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}>
                            {data.platforms.map((platform, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: '10px',
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: '#000000',
                                        minWidth: '70px',
                                    }}>
                                        {platform.name}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        fontSize: '13px',
                                        color: '#555555',
                                        fontFamily: 'monospace',
                                    }}>
                                        {platform.handle}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 中部：个人简介 + 专注领域 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    marginBottom: '20px',
                    overflow: 'hidden',
                }}>
                    {/* 简介区域 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginBottom: '24px',
                    }}>
                        <div style={{
                            display: 'flex',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#000000',
                            letterSpacing: '2px',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                        }}>
                            ABOUT ME
                        </div>
                        <div style={{
                            display: 'flex',
                            fontSize: '17px',
                            color: '#333333',
                            lineHeight: '1.7',
                            letterSpacing: '0.3px',
                        }}>
                            {data.bio}
                        </div>
                    </div>

                    {/* 专注领域标签 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginBottom: '24px',
                    }}>
                        <div style={{
                            display: 'flex',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#000000',
                            letterSpacing: '2px',
                            marginBottom: '14px',
                            textTransform: 'uppercase',
                        }}>
                            FOCUS AREAS
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: '10px',
                        }}>
                            {data.tags.map((tag, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    padding: '8px 16px',
                                    backgroundColor: '#000000',
                                    color: '#FFFFFF',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                }}>
                                    {tag}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 技术理念 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: 'auto',
                        padding: '24px',
                        backgroundColor: '#F5F5F5',
                        borderLeft: '4px solid #000000',
                    }}>
                        <div style={{
                            display: 'flex',
                            fontSize: '20px',
                            fontWeight: 700,
                            color: '#000000',
                            letterSpacing: '0.5px',
                            marginBottom: '8px',
                        }}>
                            "Face the fear, create the future."
                        </div>
                        <div style={{
                            display: 'flex',
                            fontSize: '13px',
                            color: '#666666',
                            letterSpacing: '1px',
                        }}>
                            面对恐惧，创造未来 —— 技术探索者的信条
                        </div>
                    </div>
                </div>

                <GeometricAccent />

                {/* 底部 */}
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
                            <div style={{ display: 'flex', fontSize: '28px', fontWeight: 900, color: '#000000', letterSpacing: '-1px', lineHeight: '1' }}>
                                汇尘轩
                            </div>
                            <div style={{ display: 'flex', fontSize: '12px', color: '#666666', letterSpacing: '2px', marginTop: '6px' }}>
                                HUICHENXUAN · TECH SHARE
                            </div>
                            <div style={{ display: 'flex', width: '24px', height: '3px', backgroundColor: '#000000', marginTop: '10px' }} />
                        </div>
                        <div style={{ display: 'flex', fontSize: '11px', color: '#999999', letterSpacing: '1px' }}>
                            技术博客 · 算法 · AI Infra · 智能体
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

        const fileName = 'profile-card.png';
        const pngBuffer = resvg.render().asPng();

        writeFileSync(fileName, pngBuffer);
        const absolutePath = path.resolve(fileName).replace(/\\/g, '/');

        console.log(`🎉 自媒体账号介绍卡片已生成: ${absolutePath}`);

        return absolutePath;

    } catch (err) {
        console.error('生成失败:', err);
        return null;
    }
}

// 直接运行测试
const mockData: ProfileOGData = {
    name: '锦恢',
    username: 'LSTM-Kirigaya',
    avatar: './assets/jinhui/头像.jpeg',
    bio: '这里是锦恢，如果有更多关于大模型算法，AI Infra，智能体开发相关的职业规划、技术咨询和各种杂七杂八的资源指南需求，欢迎关注我的知乎，微信公众号，L 站，欢迎订阅我的个人网站「汇尘轩」获取一手资料。',
    tags: ['大模型算法', 'AI Infra', '智能体开发', '职业规划', '技术咨询'],
    platforms: [
        { name: '微信公众号', handle: '搜一搜「汇尘轩」' },
        { name: '知乎', handle: 'zhihu.com/people/lstm' },
        { name: '个人网站', handle: 'kirigaya.cn/home' },
        { name: 'GitHub', handle: 'github.com/LSTM-Kirigaya' },
    ],
};

if (process.argv[1]?.includes('profile-og')) {
    generateProfileCard(mockData).then(p => p && console.log('🎉 已生成:', p));
}
