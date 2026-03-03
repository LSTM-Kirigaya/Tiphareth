#!/usr/bin/env node

// 早上问候脚本
import { execSync } from 'child_process';

// 获取当前时间
const now = new Date();
const hour = now.getHours();

// 根据时间选择问候语
let greeting;
if (hour >= 5 && hour < 9) {
  greeting = '早上好！新的一天开始了，祝大家有个美好的早晨！';
} else if (hour >= 9 && hour < 12) {
  greeting = '上午好！工作学习加油！';
} else if (hour >= 12 && hour < 14) {
  greeting = '中午好！记得吃午饭哦~';
} else if (hour >= 14 && hour < 18) {
  greeting = '下午好！继续努力！';
} else if (hour >= 18 && hour < 22) {
  greeting = '晚上好！放松一下，享受夜晚时光~';
} else {
  greeting = '夜深了，早点休息，晚安~';
}

try {
  console.log(`正在发送问候 (${hour}:${now.getMinutes().toString().padStart(2, '0')})...`);
  const result = execSync(`openclaw message send --channel onebot --target group:1046693162 --message "${greeting}"`, {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  console.log('发送成功:', result);
} catch (error) {
  console.error('发送失败:', error.message);
  process.exit(1);
}