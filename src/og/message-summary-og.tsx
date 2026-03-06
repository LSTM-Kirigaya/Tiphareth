import React from 'react';
import path from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TIPHARETH_ROOT = path.resolve(__dirname, '../..');

// --- 主题色配置 (强制黑白) ---
const COLORS = {
    bg: '#0A0A0B',
    fg: '#FFFFFF',
    muted: '#666666',
    subtle: '#333333',
    line: '#888888',  // 比 subtle 更明显的线条颜色，用于连接线和边框
    accent: '#FFFFFF',
};

const WIDTH = 1600;
const HEIGHT = 1200;
const PADDING = 80;

// 注意：computeLayout 使用的坐标是全局的
const GRAPH_LEFT = PADDING + 60;
const GRAPH_TOP = 200;
// 布局坐标需要转换为局部坐标
const GRAPH_OFFSET_X = GRAPH_LEFT - 60;
const GRAPH_OFFSET_Y = 24;  // 垂直偏移量，用于修正节点显示位置
// 注意：computeLayout 返回的是全局坐标，SVG viewBox 使用局部坐标，需要平移
const GRAPH_WIDTH = WIDTH - PADDING * 2 - 120;
const GRAPH_HEIGHT = HEIGHT - 340 - GRAPH_TOP;

// 调试用：显示连接线端点，设为 true 时显示
const DEBUG_LINE_ENDPOINTS = false;

// --- 四分之一圆形图案组件 ---
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

// 节点半径：用户节点和话题菱形的大小
const USER_NODE_RADIUS = 24;
const TOPIC_DIAMOND_RADIUS = 54;  // 话题菱形半径

// 伪随机数生成器，用于布局初始化
function seededRandom(seed: number) {
    return function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

// --- Force Directed Layout力导向布局算法 ---
function computeLayout(nodes: any[], edges: any[]) {
    const positions: Record<string, { x: number; y: number }> = {};

    if (nodes.length === 0) return positions;

    const graphTop = GRAPH_TOP;
    const graphBottom = HEIGHT - 340;  // 底部留出空间给统计信息
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

        // --- 引力（边约束）---
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
            throw new Error(`找不到输入文件`);
        }

        const chatData = JSON.parse(readFileSync(chatPath, 'utf-8'));
        const userData = JSON.parse(readFileSync(userPath, 'utf-8'));

        const fontPath = path.join(TIPHARETH_ROOT, 'assets', 'fonts', 'NotoSansSC-Regular.ttf');
        const fontBoldPath = path.join(TIPHARETH_ROOT, 'assets', 'fonts', 'NotoSansSC-Bold.ttf');

        if (!existsSync(fontPath)) throw new Error(`字体文件不存在: ${fontPath}`);

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

        // 规范化 contributor 名称 -> 返回统一 id：优先使用用户名，其次是QQ/名称的字符串形式
        const canonicalUserId = (raw: string): string => {
            const s = String(raw).trim();
            if (!s) return '';
            const meta = userMetaMap.get(s) || userMetaMap.get(String(raw));
            return meta?.name ? String(meta.name).trim() : s;
        };

        (chatData.messages || []).forEach((m: any) => {
            const topicLabel = String(m.topic || '未知主题').trim().slice(0, 10);
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

        if (userCount === 0) throw new Error("没有找到 contributors");

        const posMap = computeLayout(nodes, edges);

        // 统计每个话题的连接数（入度），用于计算线粗细和透明度
        const topicInDegree: Record<string, number> = {};
        edges.forEach(e => {
            if (!topicInDegree[e.target]) topicInDegree[e.target] = 0;
            topicInDegree[e.target]++;
        });
        const maxInDegree = Math.max(...Object.values(topicInDegree), 1);

        // 统计每个用户连接的话题列表
        const userToTopics = new Map<string, string[]>();
        edges.forEach(e => {
            const list = userToTopics.get(e.source) || [];
            if (!list.includes(e.target)) list.push(e.target);
            userToTopics.set(e.source, list);
        });
        // console.log('\n--- 用户与话题关系 ---');
        nodes.filter(n => n.type === 'user').forEach(u => {
            const topics = userToTopics.get(u.id) || [];
            // console.log(`用户 [${u.id}] 的 话题: ${topics.join(', ') || '(无)'}`);
        });
        // console.log('\n--- 边坐标映射 (源=全局坐标, 目标=全局坐标) ---');
        edges.forEach((e, i) => {
            const s = posMap[e.source];
            const t = posMap[e.target];
            if (!s || !t) {
                // console.log(`  [${i}] ${e.source} -> ${e.target}: 位置缺失 (source=${!!s}, target=${!!t})`);
                return;
            }
            const sx = s.x - GRAPH_LEFT;
            const sy = s.y - GRAPH_TOP;
            const tx = t.x - GRAPH_LEFT;
            const ty = t.y - GRAPH_TOP;
            // console.log(`  [${i}] ${e.source} -> ${e.target}: 源点(${sx.toFixed(1)}, ${sy.toFixed(1)}) 目标(${tx.toFixed(1)}, ${ty.toFixed(1)})`);
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
                {/* 顶部标题区域 */}
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
                                群聊总结 SUMMARY
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

                {/* 图表区域：使用绝对定位容器包裹内部 SVG + viewBox 实现响应式缩放 */}
                <div style={{
                    display: 'flex',
                    flex: 1,
                    position: 'relative',
                    marginTop: '18px',
                    marginBottom: '28px',
                }}>
                    {/* 力导向图容器：内部使用 SVG + viewBox 实现缩放，外部用百分比定位 */}
                    <div style={{
                        position: 'absolute',
                        left: GRAPH_OFFSET_X,
                        top: GRAPH_OFFSET_Y,
                        width: GRAPH_WIDTH,
                        height: GRAPH_HEIGHT,
                        display: 'flex',
                    }}>
                        <svg
                            viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                            width={GRAPH_WIDTH}
                            height={GRAPH_HEIGHT}
                            preserveAspectRatio="xMidYMid meet"
                            style={{ display: 'block', flexShrink: 0 }}
                        >
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke={COLORS.subtle} strokeWidth="0.5" />
                                </pattern>
                                <clipPath id="avatarClip" clipPathUnits="objectBoundingBox">
                                    <circle cx="0.5" cy="0.5" r="0.5" />
                                </clipPath>
                                {edges.map((e, i) => {
                                    const s = posMap[e.source];
                                    const t = posMap[e.target];
                                    if (!s || !t) return null;
                                    const sx = Math.round(s.x - GRAPH_LEFT);
                                    const sy = Math.round(s.y - GRAPH_TOP);
                                    const tx = Math.round(t.x - GRAPH_LEFT);
                                    const ty = Math.round(t.y - GRAPH_TOP);
                                    // 根据话题热度（入度）计算透明度，范围在0.15-0.9 之间
                                    const inDegree = topicInDegree[e.target] || 0;
                                    const opacity = 0.15 + (inDegree / maxInDegree) * 0.75;
                                    return (
                                        <linearGradient key={`grad-${i}`} id={`lineGrad-${i}`} x1={sx} y1={sy} x2={tx} y2={ty} gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor={COLORS.line} stopOpacity={opacity} />
                                            <stop offset="100%" stopColor={COLORS.line} stopOpacity={opacity * 0.3} />
                                        </linearGradient>
                                    );
                                })}
                            </defs>
                            {/* 背景网格 */}
                            <rect width={GRAPH_WIDTH} height={GRAPH_HEIGHT} fill="url(#grid)" opacity="0.3" />

                            {/* 背景光晕 - 提升视觉层次 */}
                            <g opacity="0.32">
                                <defs>
                                    <filter id="blurHeavy" x="-100%" y="-100%" width="300%" height="300%">
                                        <feGaussianBlur stdDeviation="90" />
                                    </filter>
                                    <radialGradient id="glowGreen1" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
                                        <stop offset="35%" stopColor="#22c55e" stopOpacity="0.28" />
                                        <stop offset="100%" stopColor="#0A0A0B" stopOpacity="0" />
                                    </radialGradient>
                                    <radialGradient id="glowGreen2" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#86efac" stopOpacity="0.8" />
                                        <stop offset="40%" stopColor="#4ade80" stopOpacity="0.22" />
                                        <stop offset="100%" stopColor="#0A0A0B" stopOpacity="0" />
                                    </radialGradient>
                                </defs>

                                {/* 左光晕 - 区域左上 */}
                                <circle cx={GRAPH_WIDTH * 0.22} cy={GRAPH_HEIGHT * 0.35} r={GRAPH_WIDTH * 0.18} fill="url(#glowGreen1)" filter="url(#blurHeavy)" />

                                {/* 右光晕 - 区域右下 */}
                                <circle cx={GRAPH_WIDTH * 0.78} cy={GRAPH_HEIGHT * 0.65} r={GRAPH_WIDTH * 0.2} fill="url(#glowGreen2)" filter="url(#blurHeavy)" />
                            </g>

                            {/* 边：粗细根据话题热度动态调整 0.8px - 2.2px，透明度也已设置 */}
                            {edges.map((e, i) => {
                                const s = posMap[e.source];
                                const t = posMap[e.target];
                                if (!s || !t) return null;
                                const sx = Math.round(s.x - GRAPH_LEFT);
                                const sy = Math.round(s.y - GRAPH_TOP);
                                const tx = Math.round(t.x - GRAPH_LEFT);
                                const ty = Math.round(t.y - GRAPH_TOP);
                                const dx = tx - sx;
                                const dy = ty - sy;
                                const curveStrength = 0.04;
                                const mx = (sx + tx) / 2;
                                const my = (sy + ty) / 2;
                                const cx = mx - dy * curveStrength;
                                const cy = my + dx * curveStrength;
                                const inDegree = topicInDegree[e.target] || 0;
                                const strokeWidth = 0.8 + (inDegree / maxInDegree) * 1.4;
                                return (
                                    <g key={i}>
                                        <path
                                            d={`M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`}
                                            fill="none"
                                            stroke={`url(#lineGrad-${i})`}
                                            strokeWidth={strokeWidth}
                                        />
                                    </g>
                                );
                            })}
                        </svg>
                        {nodes.map(node => {
                            const pos = posMap[node.id];
                            if (!pos) return null;
                            const x = pos.x - GRAPH_LEFT;
                            const y = pos.y - GRAPH_TOP;
                            const leftPct = ((x / GRAPH_WIDTH) * 100).toFixed(4) + '%';
                            const topPct = ((y / GRAPH_HEIGHT) * 100).toFixed(4) + '%';
                            if (node.type === 'topic') {
                                const size = TOPIC_DIAMOND_RADIUS * 2;
                                const half = TOPIC_DIAMOND_RADIUS;
                                const leftPctTopic = (((x - half) / GRAPH_WIDTH) * 100).toFixed(4) + '%';
                                const topPctTopic = (((y - half) / GRAPH_HEIGHT) * 100).toFixed(4) + '%';
                                const wPct = ((size / GRAPH_WIDTH) * 100).toFixed(4) + '%';
                                const hPct = ((size / GRAPH_HEIGHT) * 100).toFixed(4) + '%';
                                const cx = half;
                                const cy = half;
                                const pts = `${cx},0 ${size},${cy} ${cx},${size} 0,${cy}`;
                                return (
                                    <div
                                        key={node.id}
                                        style={{
                                            position: 'absolute',
                                            left: leftPctTopic,
                                            top: topPctTopic,
                                            width: wPct,
                                            height: hPct,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <svg
                                            width="100%"
                                            height="100%"
                                            style={{ position: 'absolute', top: 0, left: 0 }}
                                            preserveAspectRatio="xMidYMid meet"
                                            viewBox={`0 0 ${size} ${size}`}
                                        >
                                            <polygon
                                                points={pts}
                                                fill={COLORS.bg}
                                                stroke={COLORS.line}
                                                strokeWidth="1"
                                            />
                                        </svg>
                                        <span style={{
                                            position: 'relative',
                                            display: 'flex',
                                            fontSize: '16px',
                                            fontWeight: 500,
                                            color: COLORS.fg,
                                            textAlign: 'center',
                                            maxWidth: '88px',
                                            wordBreak: 'break-word',
                                            lineHeight: 1.3,
                                            letterSpacing: '0.5px',
                                        }}>
                                            {node.label}
                                        </span>
                                    </div>
                                );
                            } else {
                                const avatarUrl = node.qq ? `https://q1.qlogo.cn/g?b=qq&nk=${node.qq}&s=640` : '';
                                const hasAvatar = !!avatarUrl;
                                const initial = node.id.charAt(0).toUpperCase();
                                const leftPctUser = (((x - USER_NODE_RADIUS) / GRAPH_WIDTH) * 100).toFixed(4) + '%';
                                const topPctUser = (((y - USER_NODE_RADIUS) / GRAPH_HEIGHT) * 100).toFixed(4) + '%';
                                const sizePctW = ((48 / GRAPH_WIDTH) * 100).toFixed(4) + '%';
                                const sizePctH = ((48 / GRAPH_HEIGHT) * 100).toFixed(4) + '%';
                                return (
                                    <div
                                        key={node.id}
                                        style={{
                                            position: 'absolute',
                                            left: leftPctUser,
                                            top: topPctUser,
                                            width: sizePctW,
                                            height: sizePctH,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '50%',
                                            border: `2px solid ${COLORS.fg}`,
                                            backgroundColor: hasAvatar ? COLORS.bg : COLORS.subtle,
                                            overflow: 'hidden',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            display: 'flex',
                                        }}>
                                            {hasAvatar ? (
                                                <img src={avatarUrl} width={48} height={48} style={{ objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: COLORS.fg }}>{initial}</span>
                                            )}
                                        </div>
                                        <span style={{ marginTop: '6px', fontSize: '12px', color: COLORS.muted, textAlign: 'center', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {node.id}
                                        </span>
                                    </div>
                                );
                            }
                        })}
                    </div>
                </div>

                <div style={{ display: 'flex', marginBottom: '20px' }}>
                    <QuarterCirclePattern />
                </div>

                {/* 底部分隔装饰 */}
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
                                © {date.getFullYear()} 版权所有
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
            // 注意：不需要设置 Satori 的缩放选项，因为我们已经手动计算了 viewBox
        });

        writeFileSync(outputPath, resvg.render().asPng());
        console.log(`✓ 已生成: ${path.resolve(outputPath)}`);

    } catch (err) {
        console.error('生成失败:', err);
        throw err;
    }
}

// --- 如果是直接运行（非 import）则自动执行 ---
const CHAT_JSON = path.join(TIPHARETH_ROOT, "report", "summarize_chat.json");
const USER_JSON = path.join(TIPHARETH_ROOT, "report", "summarize_user.json");
const OUTPUT_PNG = path.join(TIPHARETH_ROOT, "message-summary-og.png");

const _currentFile = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === _currentFile) {
    if (!existsSync(CHAT_JSON) || !existsSync(USER_JSON)) {
        console.error("错误: 请先运行 gen-summarize-json 或 message-summary 生成数据");
        process.exit(1);
    }
    generateRelationGraph(CHAT_JSON, USER_JSON, OUTPUT_PNG).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}