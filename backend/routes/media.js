import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { getDatabase, saveDatabase } from '../database.js';
import { cosConfig, getMediaUrl } from '../config/cos.js';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 获取所有媒体（支持分页和筛选）
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const fileType = req.query.fileType; // 'image' or 'video'
    const tagId = req.query.tagId;
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT m.*, u.nickname as user_nickname,
             group_concat(t.id) as tag_ids,
             group_concat(t.name) as tag_names,
             group_concat(t.color) as tag_colors
      FROM media m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN media_tags mt ON m.id = mt.media_id
      LEFT JOIN tags t ON mt.tag_id = t.id
      WHERE 1=1
    `;

    const params = [];

    if (fileType) {
      query += ' AND m.file_type = ?';
      params.push(fileType);
    }

    if (tagId) {
      query += ' AND EXISTS (SELECT 1 FROM media_tags WHERE media_id = m.id AND tag_id = ?)';
      params.push(tagId);
    }

    query += ' GROUP BY m.id ORDER BY m.upload_time DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const media = db.prepare(query).all(...params);

    // 格式化标签数据并处理COS URL
    const formattedMedia = await Promise.all(media.map(async (item) => {
      const tags = [];
      if (item.tag_ids) {
        const tagIds = item.tag_ids.split(',');
        const tagNames = item.tag_names.split(',');
        const tagColors = item.tag_colors.split(',');
        
        for (let i = 0; i < tagIds.length; i++) {
          tags.push({
            id: parseInt(tagIds[i]),
            name: tagNames[i],
            color: tagColors[i] || '#4A90E2'
          });
        }
      }

      // 处理文件URL（如果是COS私有读写，需要生成签名URL）
      let filePath = item.file_path;
      let thumbnailPath = item.thumbnail_path;

      // 检查是否是COS文件（通过URL判断）
      const isCOSFile = filePath && (
        filePath.includes('myqcloud.com') || 
        filePath.includes('qcloud.com') ||
        (cosConfig.AccessType === 'private' && !filePath.startsWith('http://localhost') && !filePath.startsWith('/uploads'))
      );

      if (isCOSFile && cosConfig.AccessType === 'private' && cosConfig.SecretId) {
        try {
          // 从URL中提取COS Key，或从file_path中提取
          let cosKey = filePath;
          if (filePath.includes('.com/')) {
            cosKey = filePath.split('.com/')[1];
          } else if (filePath.startsWith('uploads/')) {
            cosKey = filePath;
          }
          
          // 生成签名URL
          filePath = await getMediaUrl(cosKey);

          if (thumbnailPath) {
            let thumbKey = thumbnailPath;
            if (thumbnailPath.includes('.com/')) {
              thumbKey = thumbnailPath.split('.com/')[1];
            } else if (thumbnailPath.startsWith('uploads/')) {
              thumbKey = thumbnailPath;
            }
            thumbnailPath = await getMediaUrl(thumbKey);
          }
        } catch (error) {
          console.error('生成COS签名URL失败:', error);
          // 如果生成失败，使用原始URL
        }
      }

      return {
        id: item.id,
        filename: item.filename,
        originalName: item.original_name,
        filePath: filePath,
        thumbnailPath: thumbnailPath,
        fileType: item.file_type,
        mimeType: item.mime_type,
        fileSize: item.file_size,
        width: item.width,
        height: item.height,
        description: item.description,
        uploadTime: item.upload_time,
        createdAt: item.created_at,
        user: {
          id: item.user_id,
          nickname: item.user_nickname
        },
        tags: tags
      };
    }));

    // 获取总数
    let countQuery = 'SELECT COUNT(DISTINCT m.id) as total FROM media m WHERE 1=1';
    const countParams = [];

    if (fileType) {
      countQuery += ' AND m.file_type = ?';
      countParams.push(fileType);
    }

    if (tagId) {
      countQuery += ' AND EXISTS (SELECT 1 FROM media_tags WHERE media_id = m.id AND tag_id = ?)';
      countParams.push(tagId);
    }

    const countResult = db.prepare(countQuery).get(...countParams);
    const total = countResult.total;

    res.json({
      success: true,
      data: formattedMedia,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('获取媒体列表错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取时间线（按时间倒序）
router.get('/timeline', async (req, res) => {
  try {
    const db = getDatabase();
    const query = `
      SELECT m.*, u.nickname as user_nickname,
             group_concat(t.id) as tag_ids,
             group_concat(t.name) as tag_names,
             group_concat(t.color) as tag_colors
      FROM media m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN media_tags mt ON m.id = mt.media_id
      LEFT JOIN tags t ON mt.tag_id = t.id
      GROUP BY m.id
      ORDER BY m.upload_time DESC
    `;

    const media = db.prepare(query).all();

    // 格式化数据并处理COS URL（同上）
    const formattedMedia = await Promise.all(media.map(async (item) => {
      const tags = [];
      if (item.tag_ids) {
        const tagIds = item.tag_ids.split(',');
        const tagNames = item.tag_names.split(',');
        const tagColors = item.tag_colors.split(',');
        
        for (let i = 0; i < tagIds.length; i++) {
          tags.push({
            id: parseInt(tagIds[i]),
            name: tagNames[i],
            color: tagColors[i] || '#4A90E2'
          });
        }
      }

      // 处理COS URL（私有读写模式）
      let filePath = item.file_path;
      let thumbnailPath = item.thumbnail_path;

      const isCOSFile = filePath && (
        filePath.includes('myqcloud.com') || 
        filePath.includes('qcloud.com') ||
        (cosConfig.AccessType === 'private' && !filePath.startsWith('http://localhost') && !filePath.startsWith('/uploads'))
      );

      if (isCOSFile && cosConfig.AccessType === 'private' && cosConfig.SecretId) {
        try {
          let cosKey = filePath;
          if (filePath.includes('.com/')) {
            cosKey = filePath.split('.com/')[1];
          } else if (filePath.startsWith('uploads/')) {
            cosKey = filePath;
          }
          filePath = await getMediaUrl(cosKey);

          if (thumbnailPath) {
            let thumbKey = thumbnailPath;
            if (thumbnailPath.includes('.com/')) {
              thumbKey = thumbnailPath.split('.com/')[1];
            } else if (thumbnailPath.startsWith('uploads/')) {
              thumbKey = thumbnailPath;
            }
            thumbnailPath = await getMediaUrl(thumbKey);
          }
        } catch (error) {
          console.error('生成COS签名URL失败:', error);
        }
      }

      return {
        id: item.id,
        filename: item.filename,
        originalName: item.original_name,
        filePath: filePath,
        thumbnailPath: thumbnailPath,
        fileType: item.file_type,
        mimeType: item.mime_type,
        fileSize: item.file_size,
        width: item.width,
        height: item.height,
        description: item.description,
        uploadTime: item.upload_time,
        createdAt: item.created_at,
        user: {
          id: item.user_id,
          nickname: item.user_nickname
        },
        tags: tags
      };
    }));

    res.json({
      success: true,
      data: formattedMedia,
      total: formattedMedia.length
    });
  } catch (error) {
    console.error('获取时间线错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取单个媒体详情
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const id = parseInt(req.params.id);

    const query = `
      SELECT m.*, u.nickname as user_nickname,
             group_concat(t.id) as tag_ids,
             group_concat(t.name) as tag_names,
             group_concat(t.color) as tag_colors
      FROM media m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN media_tags mt ON m.id = mt.media_id
      LEFT JOIN tags t ON mt.tag_id = t.id
      WHERE m.id = ?
      GROUP BY m.id
    `;

    const item = db.prepare(query).get(id);

    if (!item) {
      return res.status(404).json({ error: '媒体文件不存在' });
    }

    const tags = [];
    if (item.tag_ids) {
      const tagIds = item.tag_ids.split(',');
      const tagNames = item.tag_names.split(',');
      const tagColors = item.tag_colors.split(',');
      
      for (let i = 0; i < tagIds.length; i++) {
        tags.push({
          id: parseInt(tagIds[i]),
          name: tagNames[i],
          color: tagColors[i] || '#4A90E2'
        });
      }
    }

    // 处理COS URL（私有读写模式）
    let filePath = item.file_path;
    let thumbnailPath = item.thumbnail_path;

    const isCOSFile = filePath && (
      filePath.includes('myqcloud.com') || 
      filePath.includes('qcloud.com') ||
      (cosConfig.AccessType === 'private' && !filePath.startsWith('http://localhost') && !filePath.startsWith('/uploads'))
    );

    if (isCOSFile && cosConfig.AccessType === 'private' && cosConfig.SecretId) {
      try {
        let cosKey = filePath;
        if (filePath.includes('.com/')) {
          cosKey = filePath.split('.com/')[1];
        } else if (filePath.startsWith('uploads/')) {
          cosKey = filePath;
        }
        filePath = await getMediaUrl(cosKey);

        if (thumbnailPath) {
          let thumbKey = thumbnailPath;
          if (thumbnailPath.includes('.com/')) {
            thumbKey = thumbnailPath.split('.com/')[1];
          } else if (thumbnailPath.startsWith('uploads/')) {
            thumbKey = thumbnailPath;
          }
          thumbnailPath = await getMediaUrl(thumbKey);
        }
      } catch (error) {
        console.error('生成COS签名URL失败:', error);
      }
    }

    res.json({
      success: true,
      data: {
        id: item.id,
        filename: item.filename,
        originalName: item.original_name,
        filePath: filePath,
        thumbnailPath: thumbnailPath,
        fileType: item.file_type,
        mimeType: item.mime_type,
        fileSize: item.file_size,
        width: item.width,
        height: item.height,
        description: item.description,
        uploadTime: item.upload_time,
        createdAt: item.created_at,
        user: {
          id: item.user_id,
          nickname: item.user_nickname
        },
        tags: tags
      }
    });
  } catch (error) {
    console.error('获取媒体详情错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除媒体（需要登录）
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const id = parseInt(req.params.id);

    // 获取文件信息
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
    if (!media) {
      return res.status(404).json({ error: '媒体文件不存在' });
    }

    // 删除文件
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // 删除主文件
    if (media.file_path) {
      const filePath = path.join(uploadsDir, media.file_path.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`已删除文件: ${filePath}`);
        } catch (err) {
          console.error(`删除文件失败: ${filePath}`, err);
        }
      }
    }
    
    // 删除缩略图
    if (media.thumbnail_path) {
      const thumbPath = path.join(uploadsDir, media.thumbnail_path.replace('/uploads/', ''));
      if (fs.existsSync(thumbPath)) {
        try {
          fs.unlinkSync(thumbPath);
          console.log(`已删除缩略图: ${thumbPath}`);
        } catch (err) {
          console.error(`删除缩略图失败: ${thumbPath}`, err);
        }
      }
    }

    // 删除数据库记录（关联的标签会自动删除）
    db.prepare('DELETE FROM media WHERE id = ?').run(id);
    saveDatabase(); // 保存数据库

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除媒体错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 为媒体添加标签（需要登录）
router.post('/:id/tags', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const mediaId = parseInt(req.params.id);
    const { tagIds } = req.body; // 标签ID数组

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({ error: '标签ID数组不能为空' });
    }

    // 检查媒体是否存在
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
    if (!media) {
      return res.status(404).json({ error: '媒体文件不存在' });
    }

    // 添加标签关联
    let addedCount = 0;
    for (const tagId of tagIds) {
      try {
        // 检查标签是否存在
        const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
        if (!tag) {
          console.warn(`标签 ${tagId} 不存在，跳过`);
          continue;
        }

        // 检查是否已存在关联
        const existing = db.prepare('SELECT * FROM media_tags WHERE media_id = ? AND tag_id = ?')
          .get(mediaId, tagId);
        if (existing) {
          continue; // 已存在，跳过
        }

        db.prepare('INSERT INTO media_tags (media_id, tag_id) VALUES (?, ?)')
          .run(mediaId, tagId);
        addedCount++;
      } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
          // 已存在，跳过
          continue;
        }
        console.error(`添加标签 ${tagId} 失败:`, error);
      }
    }

    saveDatabase();

    res.json({
      success: true,
      message: `成功添加 ${addedCount} 个标签`,
      data: { addedCount }
    });
  } catch (error) {
    console.error('添加标签错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除媒体的标签（需要登录）
router.delete('/:id/tags/:tagId', requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const mediaId = parseInt(req.params.id);
    const tagId = parseInt(req.params.tagId);

    const result = db.prepare('DELETE FROM media_tags WHERE media_id = ? AND tag_id = ?')
      .run(mediaId, tagId);

    if (result.changes === 0) {
      return res.status(404).json({ error: '标签关联不存在' });
    }

    saveDatabase();

    res.json({ success: true, message: '删除标签成功' });
  } catch (error) {
    console.error('删除标签错误:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as mediaRouter };

