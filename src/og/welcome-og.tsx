import React from 'react';
import { z } from "zod";
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';

// 配置 Schema
export const WelcomeOGSchema = z.object({
    memberName: z.string().describe("新成员昵称"),
    memberAvatar: z.string().describe("新成员头像URL或Base64"),
    joinDate: z.string().describe("入群日期"),
    groupName: z.string().describe("群组名称"),
    resources: z.array(z.object({
        name: z.string(),
        qrCode: z.string().describe("二维码图片路径"),
        desc: z.string()
    })).max(3).describe("资源二维码，最多3个")
});

export type WelcomeOGData = z.infer<typeof WelcomeOGSchema>;

// 模拟数据
const welcomeData: WelcomeOGData = {
    memberName: "羊皮纸",
    memberAvatar: "https://q1.qlogo.cn/g?b=qq&nk=3108424075&s=640",
    joinDate: "2026.02.28",
    groupName: "AnzuLeaf",
    resources: [
        {
            name: "OpenMCP 文档",
            desc: "MCP 开发指南",
            qrCode: "./assets/images/openmcp-document-qr.png"
        },
        {
            name: "GitHub",
            desc: "开源项目源码",
            qrCode: "./assets/images/openmcp-github-qr.png"
        },
        {
            name: "安树社区",
            desc: "独立技术社区",
            qrCode: "./assets/images/anzutree-qr.png"
        }
    ]
};

const getBase64Image = (imagePath: string): string => {
    try {
        const data = readFileSync(imagePath);
        return `data:image/png;base64,${data.toString('base64')}`;
    } catch (e) {
        console.warn(`无法加载图片: ${imagePath}`);
        return "";
    }
};

const BLACK = '#000000';

const PATTERN_HEIGHT = 48;

// 1. 四个四分之一圆 2×2 堆叠（每个 1/4 圆的有效区域在所在格的右上角）
const QuarterCirclePattern = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', width: `${PATTERN_HEIGHT}px`, height: `${PATTERN_HEIGHT}px` }}>
        <div style={{ display: 'flex', width: '24px', height: '24px', borderRadius: '0 100% 0 0', backgroundColor: BLACK }} />
        <div style={{ display: 'flex', width: '24px', height: '24px', borderRadius: '0 100% 0 0', backgroundColor: BLACK }} />
        <div style={{ display: 'flex', width: '24px', height: '24px', borderRadius: '0 100% 0 0', backgroundColor: BLACK }} />
        <div style={{ display: 'flex', width: '24px', height: '24px', borderRadius: '0 100% 0 0', backgroundColor: BLACK }} />
    </div>
);

// 几何装饰 - 四分之一圆 + 线条花朵 + 线条波浪，一排，等高
const GeometricAccent = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: '10px',
        marginTop: '8px',
        height: `${PATTERN_HEIGHT}px`,
    }}>
        <QuarterCirclePattern />
    </div>
);

// 禁止符号组件
const ForbiddenMark = () => (
    <div style={{
        display: 'flex',
        width: '8px',
        height: '8px',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    }}>
        <div style={{
            display: 'flex',
            position: 'absolute',
            width: '8px',
            height: '2px',
            backgroundColor: '#000000',
            transform: 'rotate(45deg)',
        }} />
    </div>
);

export async function generateWelcomeOG(data: WelcomeOGData) {
    try {
        const fontData = readFileSync('./assets/fonts/NotoSansSC-Regular.ttf');
        const fontBold = readFileSync('./assets/fonts/NotoSansSC-Bold.ttf');

        const avatarBase64 = (data.memberAvatar?.startsWith('http')
            ? data.memberAvatar
            : getBase64Image(data.memberAvatar)) || '';

        const resourcesWithQR = data.resources.map(r => ({
            ...r,
            qrBase64: getBase64Image(r.qrCode)
        }));

        const dateParts = String(data.joinDate ?? '').split('.');
        const year = dateParts[0] || '2026';
        const month = dateParts[1] || '02';
        const day = dateParts[2] || '28';
        const monthDay = `${month}/${day}`;

        const groupName = String(data.groupName ?? 'AnzuLeaf');
        const rawName = String(data.memberName ?? '');
        const displayName = rawName.length > 5 ? rawName.slice(0, 5) + '...' : rawName || '.';

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
                {/* 左上角：标题（仿 github-og 的 AnzuLeaf 风格） */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: '24px',
                    flexShrink: 0,
                }}>
                    <div style={{
                        display: 'flex',
                        fontSize: '80px',
                        fontWeight: 900,
                        lineHeight: '0.9',
                        letterSpacing: '-4px',
                        color: '#000000',
                        marginBottom: '12px',
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
                            fontSize: '80px',
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
                        }}>
                            <div style={{
                                display: 'flex',
                                fontSize: '12px',
                                color: '#666666',
                                letterSpacing: '1px',
                                lineHeight: '1.6',
                                textAlign: 'right',
                            }}>
                                {`技术交流 · ${groupName}`}
                            </div>
                            <div style={{
                                display: 'flex',
                                fontSize: '13px',
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

                {/* 中部：成员信息区 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                    marginBottom: '16px',
                }}>
                    {/* WELCOME 行 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            display: 'flex',
                            fontSize: '14px',
                            color: '#999999',
                            letterSpacing: '3px',
                        }}>
                            WELCOME
                        </div>
                        <div style={{
                            display: 'flex',
                            width: '30px',
                            height: '1px',
                            backgroundColor: '#CCCCCC',
                        }} />
                        <div style={{
                            display: 'flex',
                            fontSize: '14px',
                            color: '#999999',
                            letterSpacing: '3px',
                        }}>
                            NEW MEMBER
                        </div>
                    </div>

                    {/* 成员名 + 头像（同行等高） */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '20px',
                        marginBottom: '16px',
                    }}>
                        <div style={{
                            display: 'flex',
                            fontSize: '100px',
                            fontWeight: 900,
                            lineHeight: '1',
                            letterSpacing: '-2px',
                            color: '#000000',
                        }}>
                            {displayName}
                        </div>
                        <div style={{
                            display: 'flex',
                            width: '100px',
                            height: '100px',
                            backgroundColor: '#F5F5F5',
                            overflow: 'hidden',
                            flexShrink: 0,
                        }}>
                            {avatarBase64 ? (
                                <img
                                    src={avatarBase64}
                                    style={{
                                        display: 'flex',
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        // 去除黑白滤镜，保留头像原始颜色
                                        filter: 'none',
                                    }}
                                />
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    width: '100%',
                                    height: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#EEEEEE',
                                }}>
                                    <span style={{ display: 'flex', fontSize: '28px', color: '#CCCCCC' }}>?</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 几何装饰 */}
                    <GeometricAccent />

                    {/* 社群介绍 - 无序列表 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '24px',
                        paddingTop: '16px',
                        borderTop: '1px solid #EEEEEE',
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '10px',
                        }}>
                            <div style={{
                                display: 'flex',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#000000',
                            }} />
                            <div style={{
                                display: 'flex',
                                fontSize: '11px',
                                color: '#999999',
                                letterSpacing: '2px',
                            }}>
                                ABOUT
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ display: 'flex', marginTop: '6px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#000000', flexShrink: 0 }} />
                                <div style={{ display: 'flex', fontSize: '13px', color: '#666666', lineHeight: 1.5, letterSpacing: '0.5px' }}>
                                    Agent 前沿技术交流 · 开放式项目合作
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ display: 'flex', marginTop: '6px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#000000', flexShrink: 0 }} />
                                <div style={{ display: 'flex', fontSize: '13px', color: '#666666', lineHeight: 1.5, letterSpacing: '0.5px' }}>
                                    OpenMCP → AnzuLeaf 技术交流群
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ display: 'flex', marginTop: '6px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#000000', flexShrink: 0 }} />
                                <div style={{ display: 'flex', fontSize: '13px', color: '#666666', lineHeight: 1.5, letterSpacing: '0.5px' }}>
                                    AI 理论、应用、产品、设计均可讨论
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ display: 'flex', marginTop: '6px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#000000', flexShrink: 0 }} />
                                <div style={{ display: 'flex', fontSize: '13px', color: '#666666', lineHeight: 1.5, letterSpacing: '0.5px' }}>
                                    学习资源或技术疑问欢迎 @TIP 提问
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 群规区 - 极简形式 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '20px',
                        paddingTop: '16px',
                        borderTop: '1px solid #EEEEEE',
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px',
                        }}>
                            <div style={{
                                display: 'flex',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#000000',
                            }} />
                            <div style={{
                                display: 'flex',
                                fontSize: '11px',
                                color: '#999999',
                                letterSpacing: '2px',
                            }}>
                                FORBIDDEN
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                        }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <ForbiddenMark />
                                <div style={{
                                    display: 'flex',
                                    fontSize: '13px',
                                    color: '#666666',
                                    letterSpacing: '0.5px',
                                }}>
                                    技术问题饭圈化
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <ForbiddenMark />
                                <div style={{
                                    display: 'flex',
                                    fontSize: '13px',
                                    color: '#666666',
                                    letterSpacing: '0.5px',
                                }}>
                                    无关技术话题
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <ForbiddenMark />
                                <div style={{
                                    display: 'flex',
                                    fontSize: '13px',
                                    color: '#666666',
                                    letterSpacing: '0.5px',
                                }}>
                                    情绪化常识争论
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 底部：日期（左）+ 二维码组（右，仿 github-og） */}
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
                        {/* 左侧：艺术日期 */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                        }}>
                            <div style={{
                                display: 'flex',
                                fontSize: '72px',
                                fontWeight: 900,
                                color: '#000000',
                                letterSpacing: '-2px',
                                lineHeight: '1',
                            }}>
                                {monthDay}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', fontSize: '15px', fontWeight: 700, color: '#000000', letterSpacing: '2px' }}>{year}</span>
                                <span style={{ display: 'flex', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#CCCCCC', marginTop: '6px' }} />
                                <span style={{ display: 'flex', fontSize: '13px', color: '#666666', letterSpacing: '4px', fontWeight: 600 }}>Raspberry Pi 5</span>
                                <span style={{ display: 'flex', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#CCCCCC', marginTop: '6px' }} />
                                <span style={{ display: 'flex', fontSize: '12px', color: '#AAAAAA', letterSpacing: '1px' }}>DESIGNER 锦恢</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                width: '24px',
                                height: '3px',
                                backgroundColor: '#000000',
                                marginTop: '12px',
                            }} />
                        </div>

                        {/* 右侧：三个二维码 */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '12px',
                        }}>
                            {resourcesWithQR.map((resource, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                }}>
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
                                            <img
                                                src={resource.qrBase64}
                                                style={{
                                                    display: 'flex',
                                                    width: '70px',
                                                    height: '70px',
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                display: 'flex',
                                                width: '70px',
                                                height: '70px',
                                                backgroundColor: '#E0E0E0',
                                            }} />
                                        )}
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: '#000000',
                                        marginBottom: '2px',
                                        letterSpacing: '0.5px',
                                    }}>
                                        {String(resource.name ?? '')}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        fontSize: '9px',
                                        color: '#999999',
                                        letterSpacing: '0.5px',
                                    }}>
                                        {String(resource.desc ?? '')}
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

        const fileName = `welcome-${data.memberName}.png`;
        const pngBuffer = resvg.render().asPng();

        writeFileSync(fileName, pngBuffer);
        const absolutePath = path.resolve(fileName);

        console.log(`🎉 极简欢迎卡片已生成: ${absolutePath}`);
        return absolutePath;

    } catch (err) {
        console.error('生成失败:', err);
        return null;
    }
}

// 直接运行
if (process.argv[1]?.includes('welcome-og')) {
    generateWelcomeOG(welcomeData);
}