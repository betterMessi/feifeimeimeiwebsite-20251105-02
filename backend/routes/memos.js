import express from 'express';
import { getDatabase, saveDatabase } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 获取所有备忘录
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const query = `
      SELECT m.*, u.nickname as user_nickname
      FROM memos m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.updated_at DESC
    `;

    const memos = db.prepare(query).all();

    res.json({
      success: true,
      data: memos.map(memo => ({
        id: memo.id,
        title: memo.title,
        content: memo.content,
        userId: memo.user_id,
        user: {
          id: memo.user_id,
          nickname: memo.user_nickname
        },
        createdAt: memo.created_at,
        updatedAt: memo.updated_at
      }))
    });
  } catch (error) {
    console.error('获取备忘录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取单个备忘录
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const id = parseInt(req.params.id);

    const query = `
      SELECT m.*, u.nickname as user_nickname
      FROM memos m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `;

    const memo = db.prepare(query).get(id);

    if (!memo) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    res.json({
      success: true,
      data: {
        id: memo.id,
        title: memo.title,
        content: memo.content,
        userId: memo.user_id,
        user: {
          id: memo.user_id,
          nickname: memo.user_nickname
        },
        createdAt: memo.created_at,
        updatedAt: memo.updated_at
      }
    });
  } catch (error) {
    console.error('获取备忘录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 创建备忘录（需要登录）
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const { title, content } = req.body;
    const userId = req.user.id; // 从认证中间件获取用户ID

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO memos (user_id, title, content)
      VALUES (?, ?, ?)
    `).run(userId, title, content);

    saveDatabase(); // 保存数据库

    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        title: title,
        content: content
      }
    });
  } catch (error) {
    console.error('创建备忘录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新备忘录（需要登录）
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const id = parseInt(req.params.id);
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const result = db.prepare(`
      UPDATE memos
      SET title = ?,
          content = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    saveDatabase(); // 保存数据库

    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新备忘录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除备忘录（需要登录）
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const id = parseInt(req.params.id);

    const result = db.prepare('DELETE FROM memos WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    saveDatabase(); // 保存数据库

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除备忘录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as memoRouter };

