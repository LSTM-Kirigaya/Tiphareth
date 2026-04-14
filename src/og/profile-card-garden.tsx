import React from 'react';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';

export interface ProfileCardData {
    name: string;
    username: string;
    avatar: string;
    title: string;
    platforms: {
        name: string;
        handle: string;
        icon: 'messageCircle' | 'helpCircle' | 'rss' | 'github' | 'user' | 'globe';
    }[];
}

// 配色：黑白极简 + 波尔多红 & 马尔斯绿主题色
const COLORS = {
    background: 'transparent',
    black: '#000000',
    text: '#333333',
    textLight: '#444444',
    textMuted: '#999999',
    border: '#000000',
    accent: '#333333',
    bordeauxRed: '#4C0009',
    marsGreen: '#01847F',
    highlight: '#01847F',
};

// Lucide Icon Components
const MessageCircleIcon = ({ size = 18, color = COLORS.black }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'flex' }}>
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const HelpCircleIcon = ({ size = 18, color = COLORS.black }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'flex' }}>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
);

const RssIcon = ({ size = 18, color = COLORS.black }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'flex' }}>
        <path d="M4 11a9 9 0 0 1 9 9" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 4a16 16 0 0 1 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="5" cy="19" r="1" fill={color} />
    </svg>
);

const GithubIcon = ({ size = 16, color = COLORS.textMuted }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'flex' }}>
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const UserIcon = ({ size = 16, color = COLORS.textMuted }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'flex' }}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
);

const GlobeIcon = ({ size = 14, color = COLORS.textMuted }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'flex' }}>
        <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.5" />
        <line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.5" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
);

const MailIcon = ({ size = 16, color = COLORS.textMuted }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'flex' }}>
        <rect width="20" height="16" x="2" y="4" rx="2" fill="none" stroke={color} strokeWidth="1.5" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const QuoteIcon = ({ size = 20, color = '#555' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'flex' }}>
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconMap = {
    messageCircle: MessageCircleIcon,
    helpCircle: HelpCircleIcon,
    rss: RssIcon,
    github: GithubIcon,
    user: UserIcon,
    globe: GlobeIcon,
    mail: MailIcon,
};

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

/**
 * 生成极简黑白风格名片
 */
export async function generateProfileCard(data: ProfileCardData): Promise<string | null> {
    try {
        // 加载字体
        const fontRegular = readFileSync('./assets/fonts/NotoSansSC-Regular.ttf');
        const fontBlack = readFileSync('./assets/fonts/NotoSansSC-Black.ttf');
        const fontBebas = readFileSync('./assets/fonts/BebasNeue.ttf');
        const fontMontserrat = readFileSync('./assets/fonts/Montserrat-Regular.ttf');
        const fontCinzel = readFileSync('./assets/fonts/Cinzel-Regular.ttf');
        const fontDancingScript = readFileSync('./assets/fonts/DancingScript-Regular.ttf');

        const avatarBase64 = getBase64Image(data.avatar);

        const svg = await satori(
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                width: 1200,
                height: 630,
                backgroundColor: 'transparent',
                fontFamily: 'Noto Sans SC',
                color: COLORS.black,
                borderRadius: '20px',
                border: '1px solid #000000',
                overflow: 'hidden',
            }}>
                {/* 左侧黑色竖条带 */}
                <div style={{
                    display: 'flex',
                    width: '120px',
                    height: '100%',
                    backgroundColor: COLORS.black,
                    flexShrink: 0,
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}>
                    {/* 竖直文字 LSTM-Kirigaya */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: 'rotate(-90deg)',
                        whiteSpace: 'nowrap',
                        height: '100%',
                        width: '100%'
                    }}>
                        <span style={{
                            display: 'flex',
                            fontSize: '55px',
                            fontFamily: 'Bebas Neue',
                            color: '#FFFFFF',
                            fontWeight: 900,
                            justifyContent: 'center',
                            letterSpacing: '15px',
                        }}>{data.username}</span>
                    </div>
                </div>

                {/* 主内容区域 - 白色背景带光泽渐变 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    padding: '45px 50px',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(175deg, #FFFFFF 0%, #ffffff 50%, #fff 100%)',
                    position: 'relative',
                }}>
                    {/* 柔和光泽 - 从左上到右下 */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(150deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.3) 80%, rgba(255,255,255,0.7) 100%)',
                        pointerEvents: 'none',
                    }} />
                    {/* 顶部边缘光 */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '120px',
                        background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
                        pointerEvents: 'none',
                    }} />
                    {/* 上部：头像 + 姓名 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '35px',
                    }}>
                        {/* 头像 */}
                        <div style={{
                            display: 'flex',
                            width: '110px',
                            height: '110px',
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

                        {/* 姓名区域 */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            <div style={{
                                display: 'flex',
                                fontSize: '64px',
                                fontWeight: 900,
                                fontFamily: 'Noto Sans SC',
                                color: COLORS.black,
                                letterSpacing: '4px',
                                marginBottom: '8px',
                            }}>
                                {data.name}
                            </div>
                            <div style={{
                                display: 'flex',
                                fontSize: '18px',
                                fontWeight: 400,
                                fontFamily: 'Noto Sans SC',
                                color: COLORS.textLight,
                                letterSpacing: '2px',
                            }}>
                                {data.title}
                            </div>
                        </div>
                    </div>

                    {/* 座右铭 - 带图标 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '6px',
                    }}>
                        <div style={{
                            display: 'flex',
                            fontSize: '30px',
                            color: '#555555',
                            letterSpacing: '2px',
                            fontWeight: 400,
                            fontFamily: 'Bebas Neue',
                        }}>
                            Stay Hungry, Stay Foolish
                        </div>
                    </div>
                    <div style={{
                        display: 'flex',
                        width: '60px',
                        height: '2px',
                        backgroundColor: COLORS.black,
                        opacity: 0.2,
                        margin: '6px 0 0 0',
                    }} />

                    {/* 下部：联系方式 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                    }}>
                        {/* 左侧：文章发布平台 + 联系方式 */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}>
                            {/* 文章发布地点 - 带图标，放大字体，彩色主题 */}
                            {data.platforms.slice(0, 3).map((platform, i) => {
                                const IconComponent = IconMap[platform.icon];
                                const themeColor = i === 0 ? COLORS.bordeauxRed : i === 1 ? COLORS.marsGreen : COLORS.bordeauxRed;
                                return (
                                    <div key={i} style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        gap: '12px',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '170px'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                width: '20px',
                                                height: '20px',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                <IconComponent size={18} color={themeColor} />
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                fontSize: '24px',
                                                fontWeight: 400,
                                                color: themeColor,
                                                minWidth: '100px',
                                                letterSpacing: '1px',
                                            }}>
                                                {platform.name}
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            fontSize: '24px',
                                            color: COLORS.black,
                                            letterSpacing: '0.5px',
                                            maxWidth: '520px',
                                            flexWrap: 'wrap',
                                        }}>
                                            {platform.name === '微信公众号' ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>搜一搜<span style={{ color: COLORS.bordeauxRed }}>「汇尘轩」</span></div>
                                            ) : platform.name === '知乎' ? (
                                                <span style={{ color: COLORS.marsGreen }}>@锦恢</span>
                                            ) : platform.name === '订阅博客' ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>浏览器搜索<span style={{ color: COLORS.bordeauxRed }}>「汇尘轩/锦恢的博客」</span> / 访问 kirigaya.cn，点击右上角的订阅</div>
                                            ) : (
                                                platform.handle
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* 分隔线 */}
                            <div style={{
                                display: 'flex',
                                width: '60px',
                                height: '2px',
                                backgroundColor: COLORS.black,
                                opacity: 0.2,
                                margin: '8px 0',
                            }} />

                            {/* 联系方式 - 较小字体，带图标 */}
                            {data.platforms.slice(3).map((platform, i) => {
                                const IconComponent = IconMap[platform.icon];
                                return (
                                    <div key={i} style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: '12px',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            width: '20px',
                                            height: '20px',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <IconComponent size={16} color={COLORS.textLight} />
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            fontSize: '15px',
                                            fontWeight: 400,
                                            color: COLORS.textLight,
                                            minWidth: '100px',
                                            letterSpacing: '0.5px',
                                        }}>
                                            {platform.name}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            fontSize: '14px',
                                            color: COLORS.textMuted,
                                            letterSpacing: '0.3px',
                                        }}>
                                            {platform.handle}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 右下角品牌 - 水平和垂直居中 */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <div style={{
                                display: 'flex',
                                fontSize: '36px',
                                fontWeight: 900,
                                fontFamily: 'Noto Sans SC',
                                color: COLORS.black,
                                letterSpacing: '4px',
                            }}>
                                汇尘轩
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '8px',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    fontSize: '13px',
                                    color: COLORS.textMuted,
                                    letterSpacing: '4px',
                                }}>
                                    KIRIGAYA.CN
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>,
            {
                width: 1200,
                height: 630,
                fonts: [
                    { name: 'Noto Sans SC', data: fontRegular, weight: 400 },
                    { name: 'Noto Sans SC', data: fontBlack, weight: 900 },
                    { name: 'Bebas Neue', data: fontBebas, weight: 400 },
                    { name: 'Bebas Neue', data: fontBebas, weight: 700 },
                    { name: 'Montserrat', data: fontMontserrat, weight: 400 },
                    { name: 'Cinzel', data: fontCinzel, weight: 400 },
                    { name: 'Dancing Script', data: fontDancingScript, weight: 400 },
                ],
            }
        );

        const resvg = new Resvg(svg, {
            fitTo: { mode: 'width', value: 2400 },
        });

        const fileName = 'profile-card-garden.png';
        const pngBuffer = resvg.render().asPng();

        writeFileSync(fileName, pngBuffer);
        const absolutePath = path.resolve(fileName).replace(/\\/g, '/');

        console.log(`🎉 极简黑白名片已生成: ${absolutePath}`);

        return absolutePath;

    } catch (err) {
        console.error('生成失败:', err);
        return null;
    }
}

// 测试数据
const mockData: ProfileCardData = {
    name: '锦恢',
    username: 'LSTM-Kirigaya',
    avatar: './assets/jinhui/头像.jpeg',
    title: '算法 & 全栈 & UX 设计',
    platforms: [
        { name: '微信公众号', handle: '搜一搜「汇尘轩」', icon: 'messageCircle' },
        { name: '知乎', handle: '@锦恢', icon: 'helpCircle' },
        { name: '订阅博客', handle: '浏览器搜索「汇尘轩/锦恢的博客」/ 访问 kirigaya.cn，点击右上角的订阅', icon: 'rss' },
        { name: 'GitHub', handle: 'github.com/LSTM-Kirigaya', icon: 'github' },
        { name: '与我联系', handle: 'zhelonghuang@qq.com', icon: 'mail' },
    ],
};

if (process.argv[1]?.includes('profile-card-garden')) {
    generateProfileCard(mockData).then(p => p && console.log('🎉 已生成:', p));
}
