import express from 'express';
import { getMediaUrl, cosConfig } from '../config/cos.js';
import { getDatabase } from '../database.js';

const router = express.Router();

// 代理COS图片（解决CORS问题）
router.get('/image/:mediaId', async (req, res) => {
  try {
    const mediaId = parseInt(req.params.mediaId);
    const db = getDatabase();
    
    // 获取媒体信息
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
    if (!media) {
      return res.status(404).json({ error: '媒体文件不存在' });
    }

    // 获取文件路径
    let filePath = media.file_path;
    
    // 如果是COS文件，生成签名URL并重定向
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
        const signedUrl = await getMediaUrl(cosKey);
        // 重定向到COS签名URL
        return res.redirect(signedUrl);
      } catch (error) {
        console.error('生成COS签名URL失败:', error);
        return res.status(500).json({ error: '无法生成图片URL' });
      }
    }

    // 如果是本地文件，直接返回
    if (filePath.startsWith('/uploads/')) {
      // 这里应该返回本地文件，但Render上可能没有本地文件
      return res.status(404).json({ error: '文件不存在（仅COS存储）' });
    }

    // 如果是公共URL，重定向
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return res.redirect(filePath);
    }

    return res.status(404).json({ error: '无法获取文件' });
  } catch (error) {
    console.error('代理图片错误:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as mediaProxyRouter };

