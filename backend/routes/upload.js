import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { getDatabase, saveDatabase } from '../database.js';
import fs from 'fs';
import { cosClient, cosConfig, getMediaUrl } from '../config/cos.js';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // 规范化命名：YYYYMMDD_HHMMSS_原始文件名_随机字符.扩展名
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // 清理原始文件名（移除特殊字符，只保留中文、英文、数字、下划线、连字符）
    const cleanName = file.originalname.replace(/\.[^/.]+$/, ''); // 移除扩展名
    const sanitizedName = cleanName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    const shortName = sanitizedName.length > 20 ? sanitizedName.substring(0, 20) : sanitizedName;
    const randomStr = uuidv4().substring(0, 8);
    
    const filename = `${year}${month}${day}_${hours}${minutes}${seconds}_${shortName}_${randomStr}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: fileFilter
});

// 生成缩略图
async function generateThumbnail(filePath, outputPath) {
  try {
    await sharp(filePath)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error('生成缩略图失败:', error);
    return false;
  }
}

// 获取图片尺寸
async function getImageDimensions(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    return { width: null, height: null };
  }
}

// 上传文件到COS
async function uploadToCOS(localFilePath, cosKey) {
  return new Promise((resolve, reject) => {
    cosClient.putObject({
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
      Key: cosKey,
      Body: fs.createReadStream(localFilePath),
    }, (err, data) => {
      if (err) {
        console.error('上传到COS失败:', err);
        reject(err);
      } else {
        console.log('上传到COS成功:', cosKey);
        resolve(data);
      }
    });
  });
}

// 上传文件（需要登录）
router.post('/', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    // 检查COS配置
    if (!cosConfig.SecretId || !cosConfig.SecretKey || !cosConfig.Bucket) {
      console.warn('⚠️ COS配置不完整，使用本地存储');
    }

    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    const userId = req.user.id; // 从认证中间件获取用户ID
    const description = req.body.description || '';

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
      let thumbnailPath = null;
      let width = null;
      let height = null;
      let fileUrl = `/uploads/${file.filename}`; // 默认本地路径
      let thumbnailUrl = null;

      // 如果是图片，生成缩略图和获取尺寸
      if (fileType === 'image') {
        const thumbnailFilename = `thumb_${file.filename}`;
        const thumbnailFullPath = path.join(__dirname, '../uploads/thumbnails', thumbnailFilename);
        
        const thumbnailSuccess = await generateThumbnail(file.path, thumbnailFullPath);
        const dimensions = await getImageDimensions(file.path);
        width = dimensions.width;
        height = dimensions.height;

        // 如果配置了COS，上传到COS
        if (cosConfig.SecretId && cosConfig.SecretKey && cosConfig.Bucket) {
          try {
            // 上传主文件到COS
            const cosKey = `uploads/${file.filename}`;
            await uploadToCOS(file.path, cosKey);
            console.log(`[上传] 文件已上传到COS: ${cosKey}`);
            // 保存COS Key而不是完整URL，这样后续可以根据配置重新生成URL
            fileUrl = cosKey;

            // 上传缩略图到COS
            if (thumbnailSuccess) {
              const thumbnailKey = `uploads/thumbnails/${thumbnailFilename}`;
              await uploadToCOS(thumbnailFullPath, thumbnailKey);
              console.log(`[上传] 缩略图已上传到COS: ${thumbnailKey}`);
              // 保存COS Key
              thumbnailUrl = thumbnailKey;

              // 删除本地临时缩略图
              try {
                fs.unlinkSync(thumbnailFullPath);
              } catch (err) {
                console.warn('删除本地缩略图失败:', err);
              }
            }

            // 删除本地临时文件
            try {
              fs.unlinkSync(file.path);
            } catch (err) {
              console.warn('删除本地文件失败:', err);
            }
          } catch (cosError) {
            console.error('上传到COS失败，使用本地存储:', cosError);
            // COS上传失败，使用本地存储
            if (thumbnailSuccess) {
              thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
            }
          }
        } else {
          // 未配置COS，使用本地存储
          if (thumbnailSuccess) {
            thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
          }
        }
      } else {
        // 视频文件：如果配置了COS，上传到COS
        if (cosConfig.SecretId && cosConfig.SecretKey && cosConfig.Bucket) {
          try {
            const cosKey = `uploads/${file.filename}`;
            await uploadToCOS(file.path, cosKey);
            console.log(`[上传] 视频已上传到COS: ${cosKey}`);
            // 保存COS Key而不是完整URL
            fileUrl = cosKey;

            // 删除本地临时文件
            try {
              fs.unlinkSync(file.path);
            } catch (err) {
              console.warn('删除本地文件失败:', err);
            }
          } catch (cosError) {
            console.error('上传到COS失败，使用本地存储:', cosError);
          }
        }
      }

      // 保存到数据库（使用COS URL或本地路径）
      const db = getDatabase();
      const result = db.prepare(`
        INSERT INTO media (user_id, filename, original_name, file_path, thumbnail_path, file_type, mime_type, file_size, width, height, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        file.filename,
        file.originalname,
        fileUrl, // 使用COS URL或本地路径
        thumbnailUrl, // 使用COS URL或本地路径
        fileType,
        file.mimetype,
        file.size,
        width,
        height,
        description
      );

      const mediaId = result.lastInsertRowid;

      // 关联标签
      if (tags && tags.length > 0) {
        const insertTag = db.prepare('INSERT OR IGNORE INTO media_tags (media_id, tag_id) VALUES (?, ?)');
        for (const tagId of tags) {
          insertTag.run(mediaId, tagId);
        }
      }

      uploadedFiles.push({
        id: mediaId,
        filename: file.filename,
        originalName: file.originalname,
        filePath: fileUrl,
        thumbnailPath: thumbnailUrl,
        fileType: fileType,
        fileSize: file.size,
        width: width,
        height: height
      });
    }

    saveDatabase();

    res.json({
      success: true,
      message: `成功上传 ${uploadedFiles.length} 个文件`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as uploadRouter };

