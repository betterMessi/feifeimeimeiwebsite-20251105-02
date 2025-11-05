import { getDatabase } from '../database.js';

// 认证中间件：检查用户是否已登录
export function requireAuth(req, res, next) {
  try {
    const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: '未登录，请先登录',
        code: 'UNAUTHORIZED'
      });
    }

    // 验证用户是否存在
    const db = getDatabase();
    const user = db.prepare('SELECT id, username, nickname FROM users WHERE id = ?').get(parseInt(userId));
    
    if (!user) {
      return res.status(401).json({ 
        error: '用户不存在，请重新登录',
        code: 'USER_NOT_FOUND'
      });
    }

    // 将用户信息添加到请求对象中
    req.user = user;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({ 
      error: '认证失败',
      code: 'AUTH_ERROR'
    });
  }
}

// 可选认证中间件：如果提供了userId则验证，否则继续
export function optionalAuth(req, res, next) {
  try {
    const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
    
    if (userId) {
      const db = getDatabase();
      const user = db.prepare('SELECT id, username, nickname FROM users WHERE id = ?').get(parseInt(userId));
      
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不影响请求
    next();
  }
}

