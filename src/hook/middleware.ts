import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从环境变量获取（推荐使用dotenv配置）
const configPath = path.resolve(__dirname, '..', '..', 'config', 'tip.json');
const VALID_AUTH_TOKEN = JSON.parse(fs.readFileSync(configPath, 'utf-8')).authToken;

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {    
    const authHeader = req.headers['auth'] || 
                      req.headers['Authorization'] || 
                      req.headers['authorization'];

    if (!authHeader) {
        res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Authentication token is required'
        });
        return;  // 明确返回
    }

    const token = authHeader.toString().startsWith('Bearer ') 
        ? authHeader.toString().split(' ')[1] 
        : authHeader.toString();

    if (token !== VALID_AUTH_TOKEN) {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid authentication token'
        });
        return;  // 明确返回
    }

    next();  // 验证通过
};

// 增强版：支持多令牌的白名单验证
export const authenticateWithWhitelist = (tokens: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.toString().replace('Bearer ', '');

        if (!token || !tokens.includes(token)) {
            return res.status(403).json({ 
                error: 'Forbidden',
                message: 'Invalid authentication token' 
            });
        }
        next();
    };
};