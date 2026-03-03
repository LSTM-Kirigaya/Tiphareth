#!/usr/bin/env node

// 早上问候脚本
const { execSync } = require('child_process');

try {
  console.log('正在发送早上问候...');
  const result = execSync('openclaw message send --channel onebot --target group:1046693162 --message "你好"', {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  console.log('发送成功:', result);
} catch (error) {
  console.error('发送失败:', error.message);
  process.exit(1);
}