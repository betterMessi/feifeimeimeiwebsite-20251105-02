import express from 'express';
import { getDatabase, saveDatabase } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 获取所有标签
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const query = `
      SELECT t.*, COUNT(mt.media_id) as media_count
      FROM tags t
      LEFT JOIN media_tags mt ON t.id = mt.tag_id
      GROUP BY t.id
      ORDER BY t.name
    `;

    const tags = db.prepare(query).all();

    res.json({
      success: true,
      data: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || '#4A90E2',
        mediaCount: tag.media_count || 0,
        createdAt: tag.created_at
      }))
    });
  } catch (error) {
    console.error('获取标签错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 创建标签（需要登录）
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: '标签名称不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO tags (name, color)
      VALUES (?, ?)
    `).run(name, color || '#4A90E2');

    saveDatabase();

    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        name: name,
        color: color || '#4A90E2'
      }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '标签名称已存在' });
    }
    console.error('创建标签错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新标签（需要登录）
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const id = parseInt(req.params.id);
    const { name, color } = req.body;

    // 如果提供了新名称，检查是否与其他标签冲突
    if (name) {
      const existing = db.prepare('SELECT * FROM tags WHERE name = ? AND id != ?').get(name, id);
      if (existing) {
        return res.status(400).json({ error: '标签名称已存在' });
      }
    }

    const result = db.prepare(`
      UPDATE tags
      SET name = COALESCE(?, name),
          color = COALESCE(?, color)
      WHERE id = ?
    `).run(name, color, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }

    saveDatabase();

    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新标签错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除标签（需要登录）
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const id = parseInt(req.params.id);

    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }

    saveDatabase();

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除标签错误:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as tagRouter };

