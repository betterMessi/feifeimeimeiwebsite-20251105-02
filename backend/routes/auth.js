import express from 'express';
import { getDatabase, saveDatabase } from '../database.js';

const router = express.Router();

// 用户注册
router.post('/register', (req, res) => {
  try {
    const db = getDatabase();
    const { username, password, nickname } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 检查用户名是否已存在
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 简单的密码存储（实际项目中应该使用bcrypt加密）
    // 这里为了简化，直接存储明文密码（仅用于演示，生产环境必须加密）
    const result = db.prepare(`
      INSERT INTO users (username, password, nickname)
      VALUES (?, ?, ?)
    `).run(username, password, nickname || username);

    const user = db.prepare('SELECT id, username, nickname, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    saveDatabase();

    res.json({
      success: true,
      data: user,
      message: '注册成功'
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 用户登录
router.post('/login', (req, res) => {
  try {
    const db = getDatabase();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?')
      .get(username, password);

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user;

    res.json({
      success: true,
      data: userInfo,
      message: '登录成功'
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取当前用户信息（通过ID）
router.get('/user/:id', (req, res) => {
  try {
    const db = getDatabase();
    const id = parseInt(req.params.id);

    const user = db.prepare('SELECT id, username, nickname, created_at FROM users WHERE id = ?')
      .get(id);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取所有用户（用于显示）
router.get('/users', (req, res) => {
  try {
    const db = getDatabase();
    const users = db.prepare('SELECT id, username, nickname, created_at FROM users ORDER BY created_at DESC')
      .all();

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as authRouter };

