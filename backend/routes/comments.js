import express from 'express';
import { getDatabase, saveDatabase } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 获取某个媒体的所有评论
router.get('/media/:mediaId', (req, res) => {
  try {
    const db = getDatabase();
    const mediaId = parseInt(req.params.mediaId);

    const comments = db.prepare(`
      SELECT c.*, u.nickname as user_nickname, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.media_id = ?
      ORDER BY c.created_at ASC
    `).all(mediaId);

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error('获取评论错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 创建评论（需要登录）
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const { mediaId, content } = req.body;
    const userId = req.user.id; // 从认证中间件获取用户ID

    if (!mediaId || !content || !content.trim()) {
      return res.status(400).json({ error: '媒体ID和评论内容不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO comments (media_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(mediaId, userId, content.trim());

    // 获取刚创建的评论（包含用户信息）
    const comment = db.prepare(`
      SELECT c.*, u.nickname as user_nickname, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    saveDatabase();

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('创建评论错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除评论
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const id = parseInt(req.params.id);
    const userId = parseInt(req.query.userId); // 可选：检查是否是评论作者

    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    // 如果提供了userId，检查是否是作者
    if (userId && comment.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(id);
    saveDatabase();

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as commentRouter };

