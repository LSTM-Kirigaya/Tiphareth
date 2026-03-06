import React from 'react';
import path from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TIPHARETH_ROOT = path.resolve(__dirname, '../..');

// --- 极简黑白配色 (深色模式) ---
const COLORS = {
    bg: '#0A0A0B',
    fg: '#FFFFFF',
    muted: '#666666',
    subtle: '#333333',
    line: '#888888',  // 连线颜色，比 subtle 更亮以便与背景区分
    accent: '#FFFFFF',
};

const WIDTH = 1600;
const HEIGHT = 1200;
const PADDING = 80;

// 图区域（与 computeLayout 一致，用于渲染坐标转换）
const GRAPH_LEFT = PADDING + 60;
const GRAPH_TOP = 200;
// 主视觉区内，图区域左上角相对偏移
const GRAPH_OFFSET_X = GRAPH_LEFT - 60;
const GRAPH_OFFSET_Y = 24;  // 标题区高度后，图区与主视觉顶部的间距
// 渲染内边距：避免贴边连线描边被裁剪，起点终点逻辑不变，仅整体平移
const RENDER_PADDING = 20;

// --- 极简几何装饰组件 ---
const QuarterCirclePattern = () => (
    <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        width: 48,
        height: 48,
        opacity: 0.8
    }}>
        <div style={{
            display: 'flex',
            width: 24,
            height: 24,
            borderRadius: '0 100% 0 0',
            backgroundColor: COLORS.fg
        }} />
        <div style={{
            display: 'flex',
            width: 24,
            height: 24,
            borderRadius: '0 100% 0 0',
            backgroundColor: COLORS.fg
        }} />
        <div style={{
            display: 'flex',
            width: 24,
            height: 24,
            borderRadius: '0 100% 0 0',
            backgroundColor: COLORS.fg
        }} />
        <div style={{
            display: 'flex',
            width: 24,
            height: 24,
            borderRadius: '0 100% 0 0',
            backgroundColor: COLORS.fg
        }} />
    </div>
);

// 用户节点：头像圆半径；话题节点：菱形半宽（中心到顶点）
const USER_NODE_RADIUS = 24;
const TOPIC_DIAMOND_RADIUS = 54;  // 增大话题节点尺寸

// 可复现的伪随机（固定种子，布局每次一致）
function seededRandom(seed: number) {
    return function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

// --- Force Directed Layout：自由力导布局 ---
function computeLayout(nodes: any[], edges: any[]) {
    const positions: Record<string, { x: number; y: number }> = {};

    if (nodes.length === 0) return positions;

    const graphTop = GRAPH_TOP;
    const graphBottom = HEIGHT - 340;  // 与底部横线留出更多间距
    const graphLeft = GRAPH_LEFT;
    const graphRight = WIDTH - PADDING - 60;

    const width = graphRight - graphLeft;
    const height = graphBottom - graphTop;

    const area = width * height;
    const k = Math.sqrt(area / nodes.length);

    const iterations = 300;
    const temperatureInitial = width / 10;

    const disp: Record<string, { x: number; y: number }> = {};

    const random = seededRandom(12345);
    nodes.forEach(n => {
        positions[n.id] = {
            x: graphLeft + random() * width,
            y: graphTop + random() * height,
        };
    });

    for (let iter = 0; iter < iterations; iter++) {
        const temperature = temperatureInitial * (1 - iter / iterations);

        nodes.forEach(v => {
            disp[v.id] = { x: 0, y: 0 };
        });

        // --- 斥力 ---
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const v = nodes[i];
                const u = nodes[j];

                const dx = positions[v.id].x - positions[u.id].x;
                const dy = positions[v.id].y - positions[u.id].y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;

                const force = (k * k) / dist;

                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                disp[v.id].x += fx;
                disp[v.id].y += fy;
                disp[u.id].x -= fx;
                disp[u.id].y -= fy;
            }
        }

        // --- 吸引力（边）---
        edges.forEach(e => {
            const v = e.source;
            const u = e.target;

            if (!positions[v] || !positions[u]) return;

            const dx = positions[v].x - positions[u].x;
            const dy = positions[v].y - positions[u].y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;

            const force = (dist * dist) / k;

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            disp[v].x -= fx;
            disp[v].y -= fy;
            disp[u].x += fx;
            disp[u].y += fy;
        });

        // --- 更新位置 ---
        nodes.forEach(v => {
            const dx = disp[v.id].x;
            const dy = disp[v.id].y;

            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            positions[v.id].x += (dx / dist) * Math.min(dist, temperature);
            positions[v.id].y += (dy / dist) * Math.min(dist, temperature);

            // 边界限制
            positions[v.id].x = Math.min(graphRight, Math.max(graphLeft, positions[v.id].x));
            positions[v.id].y = Math.min(graphBottom, Math.max(graphTop, positions[v.id].y));
        });
    }

    return positions;
}
export async function generateRelationGraph(
    chatJsonPath: string,
    userJsonPath: string,
    outputPath: string = 'relation_graph.png'
) {
    try {
        const chatPath = path.isAbsolute(chatJsonPath)
            ? chatJsonPath
            : path.join(TIPHARETH_ROOT, chatJsonPath);
        const userPath = path.isAbsolute(userJsonPath)
            ? userJsonPath
            : path.join(TIPHARETH_ROOT, userJsonPath);

        if (!existsSync(chatPath) || !existsSync(userPath)) {
            throw new Error(`数据文件不存在`);
        }

        const chatData = JSON.parse(readFileSync(chatPath, 'utf-8'));
        const userData = JSON.parse(readFileSync(userPath, 'utf-8'));

        const fontPath = path.join(TIPHARETH_ROOT, 'assets', 'fonts', 'NotoSansSC-Regular.ttf');
        const fontBoldPath = path.join(TIPHARETH_ROOT, 'assets', 'fonts', 'NotoSansSC-Bold.ttf');

        if (!existsSync(fontPath)) throw new Error(`字体不存在: ${fontPath}`);

        const fontData = readFileSync(fontPath);
        const fontBold = existsSync(fontBoldPath) ? readFileSync(fontBoldPath) : fontData;

        const nodes: any[] = [];
        const edges: any[] = [];
        const nodeSet = new Set();
        const userMetaMap = new Map<string, any>();

        (userData.titles || []).forEach((t: any) => {
            if (t?.name) userMetaMap.set(t.name, t);
            if (t?.qq) userMetaMap.set(String(t.qq), t);
        });

        // 规范化：contributor 值 -> 规范节点 id（避免因空格、QQ/昵称混用等产生孤立节点）
        const canonicalUserId = (raw: string): string => {
            const s = String(raw).trim();
            if (!s) return '';
            const meta = userMetaMap.get(s) || userMetaMap.get(String(raw));
            return meta?.name ? String(meta.name).trim() : s;
        };

        (chatData.messages || []).forEach((m: any) => {
            const topicLabel = String(m.topic || '未命名').trim().slice(0, 10);
            const topicId = `topic:${topicLabel}`;

            if (!nodeSet.has(topicId)) {
                nodes.push({
                    id: topicId,
                    type: 'topic',
                    label: topicLabel,
                    weight: (m.contributors || []).length
                });
                nodeSet.add(topicId);
            }

            (m.contributors || []).forEach((c: string) => {
                const name = canonicalUserId(c);
                if (!name) return;

                if (!nodeSet.has(name)) {
                    const meta = userMetaMap.get(name) || userMetaMap.get(String(c).trim());
                    nodes.push({
                        id: name,
                        type: 'user',
                        qq: meta?.qq,
                        meta
                    });
                    nodeSet.add(name);
                }
                edges.push({ source: name, target: topicId });
            });
        });

        const userCount = nodes.filter(n => n.type === 'user').length;
        const topicCount = nodes.filter(n => n.type === 'topic').length;

        if (userCount === 0) throw new Error("未发现 contributors");

        const posMap = computeLayout(nodes, edges);

        // 日志：每个用户连向的话题及连线坐标
        const userToTopics = new Map<string, string[]>();
        edges.forEach(e => {
            const list = userToTopics.get(e.source) || [];
            if (!list.includes(e.target)) list.push(e.target);
            userToTopics.set(e.source, list);
        });
        // console.log('\n--- 用户 → 话题 连线 ---');
        nodes.filter(n => n.type === 'user').forEach(u => {
            const topics = userToTopics.get(u.id) || [];
            // console.log(`用户 [${u.id}] → 话题: ${topics.join(', ') || '(无)'}`);
        });
        // console.log('\n--- 连线坐标 (起点=用户圆心, 终点=话题菱形中心) ---');
        edges.forEach((e, i) => {
            const s = posMap[e.source];
            const t = posMap[e.target];
            if (!s || !t) {
                // console.log(`  [${i}] ${e.source} → ${e.target}: 缺少坐标 (source=${!!s}, target=${!!t})`);
                return;
            }
            const sx = s.x - GRAPH_LEFT;
            const sy = s.y - GRAPH_TOP;
            const tx = t.x - GRAPH_LEFT;
            const ty = t.y - GRAPH_TOP;
            // console.log(`  [${i}] ${e.source} → ${e.target}: 起点(${sx.toFixed(1)}, ${sy.toFixed(1)}) 终点(${tx.toFixed(1)}, ${ty.toFixed(1)})`);
        });
        const date = new Date();
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        const svg = await satori(
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: WIDTH,
                height: HEIGHT,
                backgroundColor: COLORS.bg,
                fontFamily: 'Noto Sans SC, sans-serif',
                color: COLORS.fg,
                padding: '60px',
                position: 'relative',
            }}>
                {/* 顶部标题区 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: '20px',
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '16px' }}>
                            <div style={{
                                display: 'flex',
                                fontSize: '64px',
                                fontWeight: 900,
                                letterSpacing: '-3px',
                                color: COLORS.fg,
                                lineHeight: '1',
                            }}>
                                AnuzLeaf.
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                        }}>
                            <div style={{
                                display: 'flex',
                                fontSize: '12px',
                                color: COLORS.muted,
                                letterSpacing: '2px',
                            }}>
                                群聊话题总结 SUMMARY
                            </div>
                            <div style={{
                                display: 'flex',
                                fontSize: '11px',
                                color: COLORS.muted,
                                letterSpacing: '1px',
                                marginTop: '4px',
                            }}>
                                FACE THE FEAR, CREATE THE FUTURE
                            </div>
                        </div>
                    </div>

                    <svg style={{ width: '100%', height: 2, display: 'block', marginTop: '20px' }}>
                        <defs>
                            <linearGradient id="lineGradTop" x1="0%" y1="0" x2="100%" y2="0">
                                <stop offset="0%" stopColor={COLORS.fg} stopOpacity="0" />
                                <stop offset="50%" stopColor={COLORS.fg} stopOpacity="1" />
                                <stop offset="100%" stopColor={COLORS.fg} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <rect x="0" y="0" width="100%" height="2" fill="url(#lineGradTop)" />
                    </svg>
                </div>

                {/* 主视觉区（与上下分隔线留出间距） */}
                <div style={{
                    display: 'flex',
                    flex: 1,
                    position: 'relative',
                    marginTop: '18px',
                    marginBottom: '28px',
                }}>
                    {/* 图区域容器：加 RENDER_PADDING 避免贴边连线被裁剪，起点终点逻辑不变 */}
                    <div style={{
                        position: 'absolute',
                        left: GRAPH_OFFSET_X - RENDER_PADDING,
                        top: GRAPH_OFFSET_Y - RENDER_PADDING,
                        width: WIDTH - PADDING * 2 - 120 + RENDER_PADDING * 2,
                        height: HEIGHT - 340 - GRAPH_TOP + RENDER_PADDING * 2,
                        display: 'flex',
                    }}>
                        {/* 极简网格背景 */}
                        <svg style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                        }}>
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke={COLORS.subtle} strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />
                        </svg>

                        {/* 连线层（置于节点之下）：圆心→菱形中心，透明度渐变；overflow:visible 避免贴边描边被裁剪 */}
                        <svg style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            overflow: 'visible',
                        }}>
                            <defs>
                                {edges.map((e, i) => {
                                    const s = posMap[e.source];
                                    const t = posMap[e.target];
                                    if (!s || !t) return null;
                                    const sx = s.x - GRAPH_LEFT + RENDER_PADDING;
                                    const sy = s.y - GRAPH_TOP + RENDER_PADDING;
                                    const tx = t.x - GRAPH_LEFT + RENDER_PADDING;
                                    const ty = t.y - GRAPH_TOP + RENDER_PADDING;
                                    return (
                                        <linearGradient key={`grad-${i}`} id={`lineGrad-${i}`} x1={sx} y1={sy} x2={tx} y2={ty} gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor={COLORS.line} stopOpacity="1" />
                                            <stop offset="100%" stopColor={COLORS.line} stopOpacity="0.25" />
                                        </linearGradient>
                                    );
                                })}
                            </defs>
                            {edges.map((e, i) => {
                                const s = posMap[e.source];
                                const t = posMap[e.target];
                                if (!s || !t) return null;

                                const sx = s.x - GRAPH_LEFT + RENDER_PADDING;
                                const sy = s.y - GRAPH_TOP + RENDER_PADDING;
                                const tx = t.x - GRAPH_LEFT + RENDER_PADDING;
                                const ty = t.y - GRAPH_TOP + RENDER_PADDING;

                                const dx = tx - sx;
                                const dy = ty - sy;
                                const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                                // 起点：用户圆几何中心；终点：话题菱形几何中心（整体平移 RENDER_PADDING 避免裁剪）
                                const startX = sx;
                                const startY = sy;
                                const endX = tx;
                                const endY = ty;

                                const curveStrength = 0.04;
                                const mx = (startX + endX) / 2;
                                const my = (startY + endY) / 2;
                                const offsetX = -dy * curveStrength;
                                const offsetY = dx * curveStrength;
                                const cx = mx + offsetX;
                                const cy = my + offsetY;

                                return (
                                    <path
                                        key={i}
                                        d={`M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`}
                                        fill="none"
                                        stroke={`url(#lineGrad-${i})`}
                                        strokeWidth="1.5"
                                    />
                                );
                            })}
                        </svg>

                        {/* 节点层（置于连线之上，DOM 顺序靠后故在上层） */}
                        {nodes.map(node => {
                            const pos = posMap[node.id];
                            if (!pos) return null;
                            const x = pos.x - GRAPH_LEFT + RENDER_PADDING;
                            const y = pos.y - GRAPH_TOP + RENDER_PADDING;

                        if (node.type === 'topic') {
                            const size = TOPIC_DIAMOND_RADIUS * 2;
                            const cx = TOPIC_DIAMOND_RADIUS;
                            const cy = TOPIC_DIAMOND_RADIUS;
                            const pts = `${cx},0 ${size},${cy} ${cx},${size} 0,${cy}`;
                            return (
                                <div
                                    key={node.id}
                                    style={{
                                        position: 'absolute',
                                        left: x - TOPIC_DIAMOND_RADIUS,
                                        top: y - TOPIC_DIAMOND_RADIUS,
                                        width: size,
                                        height: size,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
                                        <polygon
                                            points={pts}
                                            fill={COLORS.bg}
                                            stroke={COLORS.fg}
                                            strokeWidth="1.5"
                                        />
                                    </svg>
                                    <span style={{
                                        position: 'relative',
                                        display: 'flex',
                                        fontSize: '18px',
                                        fontWeight: 600,
                                        color: COLORS.fg,
                                        letterSpacing: '0.5px',
                                        textAlign: 'center',
                                        maxWidth: '100px',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.3,
                                        padding: '18px',
                                    }}>
                                        {node.label}
                                    </span>
                                </div>
                            );
                        } else {
                            const avatarUrl = node.qq
                                ? `https://q1.qlogo.cn/g?b=qq&nk=${node.qq}&s=640`
                                : '';
                            const hasAvatar = !!avatarUrl;
                            const initial = node.id.charAt(0).toUpperCase();

                            // 圆心在 (x, y)，头像 48x48 居中，故 left=x-24, top=y-24
                            return (
                                <div
                                    key={node.id}
                                    style={{
                                        position: 'absolute',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        left: x - 24,
                                        top: y - 24,
                                        alignItems: 'center',
                                        width: 48,
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        border: `2px solid ${COLORS.fg}`,
                                        backgroundColor: hasAvatar ? COLORS.bg : COLORS.subtle,
                                        overflow: 'hidden',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {hasAvatar ? (
                                            <img
                                                src={avatarUrl}
                                                width={48}
                                                height={48}
                                                style={{ objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <span style={{
                                                display: 'flex',
                                                fontSize: '22px',
                                                fontWeight: 700,
                                                color: COLORS.fg,
                                            }}>
                                                {initial}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        marginTop: '6px',
                                        fontSize: '12px',
                                        color: COLORS.muted,
                                        textAlign: 'center',
                                        maxWidth: '70px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        letterSpacing: '0.5px',
                                    }}>
                                        {node.id}
                                    </div>
                                </div>
                            );
                        }
                        })}
                    </div>
                </div>

                {/* 几何装饰 */}
                <div style={{ display: 'flex', marginBottom: '20px' }}>
                    <QuarterCirclePattern />
                </div>

                {/* 底部信息栏 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <svg style={{ width: '100%', height: 2, display: 'block', marginBottom: '24px' }}>
                        <defs>
                            <linearGradient id="lineGradBottom" x1="0%" y1="0" x2="100%" y2="0">
                                <stop offset="0%" stopColor={COLORS.fg} stopOpacity="0" />
                                <stop offset="50%" stopColor={COLORS.fg} stopOpacity="1" />
                                <stop offset="100%" stopColor={COLORS.fg} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <rect x="0" y="0" width="100%" height="2" fill="url(#lineGradBottom)" />
                    </svg>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    }}>
                        {/* 左侧统计 */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                        }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'baseline',
                                gap: '24px',
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{
                                        display: 'flex',
                                        fontSize: '32px',
                                        fontWeight: 900,
                                        color: COLORS.fg,
                                        letterSpacing: '-1px',
                                        lineHeight: '1',
                                    }}>
                                        {String(userCount).padStart(2, '0')}
                                    </span>
                                    <span style={{
                                        display: 'flex',
                                        fontSize: '10px',
                                        color: COLORS.muted,
                                        letterSpacing: '2px',
                                        marginTop: '4px',
                                    }}>
                                        USERS
                                    </span>
                                </div>

                                <div style={{ display: 'flex', width: '1px', height: '40px', backgroundColor: COLORS.subtle }} />

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{
                                        display: 'flex',
                                        fontSize: '32px',
                                        fontWeight: 900,
                                        color: COLORS.fg,
                                        letterSpacing: '-1px',
                                        lineHeight: '1',
                                    }}>
                                        {String(topicCount).padStart(2, '0')}
                                    </span>
                                    <span style={{
                                        display: 'flex',
                                        fontSize: '10px',
                                        color: COLORS.muted,
                                        letterSpacing: '2px',
                                        marginTop: '4px',
                                    }}>
                                        TOPICS
                                    </span>
                                </div>

                                <div style={{ display: 'flex', width: '1px', height: '40px', backgroundColor: COLORS.subtle }} />

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{
                                        display: 'flex',
                                        fontSize: '32px',
                                        fontWeight: 900,
                                        color: COLORS.fg,
                                        letterSpacing: '-1px',
                                        lineHeight: '1',
                                    }}>
                                        {String(edges.length).padStart(2, '0')}
                                    </span>
                                    <span style={{
                                        display: 'flex',
                                        fontSize: '10px',
                                        color: COLORS.muted,
                                        letterSpacing: '2px',
                                        marginTop: '4px',
                                    }}>
                                        LINKS
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '12px',
                                marginTop: '12px',
                            }}>
                                <span style={{
                                    display: 'flex',
                                    fontSize: '11px',
                                    color: COLORS.muted,
                                    letterSpacing: '1px',
                                }}>
                                    {date.getFullYear()}
                                </span>
                                <span style={{
                                    display: 'flex',
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: COLORS.subtle,
                                }} />
                                <span style={{
                                    display: 'flex',
                                    fontSize: '11px',
                                    color: COLORS.muted,
                                    letterSpacing: '1px',
                                }}>
                                    {timeStr}
                                </span>
                                <span style={{
                                    display: 'flex',
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: COLORS.subtle,
                                }} />
                                <span style={{
                                    display: 'flex',
                                    fontSize: '10px',
                                    color: COLORS.muted,
                                    letterSpacing: '0.5px',
                                }}>
                                    DESIGNER 锦恢
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                width: '24px',
                                height: '3px',
                                backgroundColor: COLORS.fg,
                                marginTop: '16px',
                            }} />
                        </div>

                        {/* 右侧品牌 */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '4px',
                        }}>
                            <div style={{
                                display: 'flex',
                                fontSize: '14px',
                                fontWeight: 700,
                                color: COLORS.fg,
                                letterSpacing: '3px',
                            }}>
                                ANUZLEAF
                            </div>
                            <div style={{
                                display: 'flex',
                                fontSize: '10px',
                                color: COLORS.muted,
                                letterSpacing: '1px',
                            }}>
                                Group Chat Analysis
                            </div>
                            <div style={{
                                display: 'flex',
                                fontSize: '9px',
                                color: COLORS.muted,
                                letterSpacing: '0.5px',
                                marginTop: '4px',
                            }}>
                                © {date.getFullYear()} 锦恢
                            </div>
                        </div>
                    </div>
                </div>
            </div>,
            {
                width: WIDTH,
                height: HEIGHT,
                fonts: [
                    { name: 'Noto Sans SC', data: fontData, weight: 400 },
                    { name: 'Noto Sans SC', data: fontBold, weight: 700 },
                ],
            }
        );

        const resvg = new Resvg(svg, {
            background: COLORS.bg,
            fitTo: { mode: 'width', value: WIDTH },
        });

        writeFileSync(outputPath, resvg.render().asPng());
        console.log(`✅ 已生成: ${path.resolve(outputPath)}`);

    } catch (err) {
        console.error('❌ 生成失败:', err);
        throw err;
    }
}

// --- 直接执行时运行（被 import 时不执行）---
const CHAT_JSON = path.join(TIPHARETH_ROOT, "report", "summarize_chat.json");
const USER_JSON = path.join(TIPHARETH_ROOT, "report", "summarize_user.json");
const OUTPUT_PNG = path.join(TIPHARETH_ROOT, "message-summary-og.png");

const _currentFile = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === _currentFile) {
    if (!existsSync(CHAT_JSON) || !existsSync(USER_JSON)) {
        console.error("❌ 请先运行 gen-summarize-json 或 message-summary 脚本");
        process.exit(1);
    }
    generateRelationGraph(CHAT_JSON, USER_JSON, OUTPUT_PNG).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}