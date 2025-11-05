# 腾讯云COS集成指南

## 📋 COS配置建议

### 推荐配置：公共读私有写

**优点**：
- ✅ 所有用户都可以查看照片（无需签名）
- ✅ 只有授权用户可以上传（通过后端验证）
- ✅ 实现简单，性能好
- ✅ 适合照片共享场景

**配置步骤**：
1. 在腾讯云COS控制台创建Bucket
2. 权限设置选择：**公共读私有写**
3. 开启跨域访问（CORS）

### 私有读写（如果选择）

**优点**：
- ✅ 更安全，所有访问都需要授权
- ✅ 可以控制访问权限

**缺点**：
- ❌ 需要实现签名URL生成
- ❌ 每次访问都需要签名，性能略低
- ❌ 实现更复杂

---

## 🚀 集成步骤

### 第一步：安装依赖

```bash
cd backend
npm install cos-nodejs-sdk-v5
```

### 第二步：创建COS配置文件

创建 `backend/config/cos.js`：

```javascript
import COS from 'cos-nodejs-sdk-v5';

// 腾讯云COS配置
export const cosConfig = {
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
  Region: process.env.COS_REGION || 'ap-beijing', // 你的Bucket地域
  Bucket: process.env.COS_BUCKET_NAME, // 你的Bucket名称
  Domain: process.env.COS_DOMAIN || '', // 自定义域名（可选）
};

// 初始化COS客户端
export const cosClient = new COS({
  SecretId: cosConfig.SecretId,
  SecretKey: cosConfig.SecretKey,
});

// 生成文件URL（公共读模式）
export function getFileUrl(key) {
  if (cosConfig.Domain) {
    // 使用自定义域名
    return `https://${cosConfig.Domain}/${key}`;
  }
  // 使用默认域名
  return `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${key}`;
}

// 生成签名URL（私有读写模式，有效期1小时）
export function getSignedUrl(key, expires = 3600) {
  return cosClient.getObjectUrl({
    Bucket: cosConfig.Bucket,
    Region: cosConfig.Region,
    Key: key,
    Expires: expires,
    Sign: true,
  }, (err, data) => {
    if (err) {
      console.error('生成签名URL失败:', err);
      return null;
    }
    return data.Url;
  });
}

// 同步生成签名URL（用于私有读写）
export async function getSignedUrlSync(key, expires = 3600) {
  return new Promise((resolve, reject) => {
    cosClient.getObjectUrl({
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
      Key: key,
      Expires: expires,
      Sign: true,
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Url);
      }
    });
  });
}

export default cosClient;
```

### 第三步：修改上传路由

修改 `backend/routes/upload.js`：

```javascript
import { cosClient, cosConfig, getFileUrl, getSignedUrlSync } from '../config/cos.js';
import path from 'path';
import fs from 'fs';

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
        console.log('上传到COS成功:', data);
        resolve(data);
      }
    });
  });
}

// 在文件上传处理中，添加上传到COS的代码
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    const userId = req.body.userId || 1;
    const description = req.body.description || '';

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
      
      // COS中的文件路径
      const cosKey = `uploads/${file.filename}`;
      
      // 上传到COS
      await uploadToCOS(file.path, cosKey);
      
      // 生成文件URL（根据配置选择）
      let fileUrl;
      let thumbnailUrl = null;
      
      if (process.env.COS_ACCESS_TYPE === 'private') {
        // 私有读写模式：生成签名URL
        fileUrl = await getSignedUrlSync(cosKey, 3600); // 1小时有效期
      } else {
        // 公共读模式：直接使用公共URL
        fileUrl = getFileUrl(cosKey);
      }
      
      // 如果是图片，处理缩略图
      if (fileType === 'image') {
        const thumbnailFilename = `thumb_${file.filename}`;
        const thumbnailKey = `uploads/thumbnails/${thumbnailFilename}`;
        
        // 生成缩略图并上传到COS
        const thumbnailFullPath = path.join(__dirname, '../uploads/thumbnails', thumbnailFilename);
        const thumbnailSuccess = await generateThumbnail(file.path, thumbnailFullPath);
        
        if (thumbnailSuccess) {
          await uploadToCOS(thumbnailFullPath, thumbnailKey);
          
          if (process.env.COS_ACCESS_TYPE === 'private') {
            thumbnailUrl = await getSignedUrlSync(thumbnailKey, 3600);
          } else {
            thumbnailUrl = getFileUrl(thumbnailKey);
          }
          
          // 删除本地临时缩略图
          fs.unlinkSync(thumbnailFullPath);
        }
      }
      
      // 获取图片尺寸
      let width = null;
      let height = null;
      if (fileType === 'image') {
        const dimensions = await getImageDimensions(file.path);
        width = dimensions.width;
        height = dimensions.height;
      }
      
      // 保存到数据库（使用COS URL）
      const db = getDatabase();
      const result = db.prepare(`
        INSERT INTO media (user_id, filename, original_name, file_path, thumbnail_path, file_type, mime_type, file_size, width, height, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        file.filename,
        file.originalname,
        fileUrl, // 使用COS URL
        thumbnailUrl, // 使用COS缩略图URL
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
        for (const tagId of tags) {
          try {
            db.prepare('INSERT INTO media_tags (media_id, tag_id) VALUES (?, ?)')
              .run(mediaId, tagId);
          } catch (error) {
            console.error(`关联标签失败: ${tagId}`, error);
          }
        }
      }
      
      // 删除本地临时文件
      fs.unlinkSync(file.path);
      
      uploadedFiles.push({
        id: mediaId,
        filename: file.filename,
        originalName: file.originalname,
        filePath: fileUrl,
        thumbnailPath: thumbnailUrl,
        fileType: fileType
      });
    }
    
    saveDatabase();
    
    res.json({
      success: true,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 第四步：修改媒体路由（如果使用私有读写）

如果选择私有读写，需要修改 `backend/routes/media.js`，在返回媒体信息时生成签名URL：

```javascript
import { getSignedUrlSync, getFileUrl } from '../config/cos.js';

// 在获取媒体列表时，如果是私有读写，生成签名URL
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    // ... 查询代码 ...
    
    // 处理每个媒体文件
    const processedMedia = media.map(async (item) => {
      // 如果file_path是COS路径，需要生成签名URL
      if (item.file_path && item.file_path.includes('myqcloud.com')) {
        if (process.env.COS_ACCESS_TYPE === 'private') {
          // 从URL中提取COS Key
          const cosKey = item.file_path.split('.com/')[1];
          item.file_path = await getSignedUrlSync(cosKey, 3600);
          
          if (item.thumbnail_path) {
            const thumbKey = item.thumbnail_path.split('.com/')[1];
            item.thumbnail_path = await getSignedUrlSync(thumbKey, 3600);
          }
        }
      }
      return item;
    });
    
    // ... 返回结果 ...
  } catch (error) {
    // ...
  }
});
```

---

## 🔧 环境变量配置

在Render项目设置中添加：

```
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_REGION=ap-beijing
COS_BUCKET_NAME=你的Bucket名称
COS_ACCESS_TYPE=public
```

**如果选择私有读写**：
```
COS_ACCESS_TYPE=private
```

---

## 📋 COS Bucket配置步骤

### 1. 创建Bucket

1. 登录腾讯云控制台
2. 进入对象存储COS
3. 点击"创建存储桶"
4. 配置：
   - **名称**：photo-sharing（或你喜欢的名字）
   - **所属地域**：选择离你最近的（如：北京）
   - **访问权限**：**公共读私有写**（推荐）或 **私有读写**
   - **存储类型**：标准存储

### 2. 配置CORS（跨域）

1. 进入Bucket设置
2. 点击"安全管理" → "跨域访问CORS设置"
3. 添加规则：
   ```
   来源Origin: *
   操作Methods: GET, POST, PUT, DELETE, HEAD
   允许Headers: *
   暴露Headers: ETag
   超时Max-Age: 3600
   ```

### 3. 获取密钥

1. 进入"访问管理" → "API密钥管理"
2. 创建密钥或使用现有密钥
3. 保存：
   - SecretId
   - SecretKey

---

## 🎯 推荐配置

### 方案A：公共读私有写（推荐）

**适合**：照片共享系统，希望所有用户都能查看照片

**配置**：
- Bucket权限：公共读私有写
- 环境变量：`COS_ACCESS_TYPE=public`
- 优点：实现简单，性能好

### 方案B：私有读写

**适合**：需要更严格的访问控制

**配置**：
- Bucket权限：私有读写
- 环境变量：`COS_ACCESS_TYPE=private`
- 需要实现签名URL生成

---

## 💡 建议

**对于你的照片共享系统，我推荐使用"公共读私有写"**，因为：

1. ✅ 所有用户都可以查看照片（符合共享系统的需求）
2. ✅ 上传仍然需要后端验证（安全）
3. ✅ 实现简单，不需要签名URL
4. ✅ 性能更好，访问更快

如果你选择私有读写，我可以帮你实现签名URL的功能。

---

## 🆘 需要帮助？

告诉我你的选择，我可以：
1. 帮你创建完整的集成代码
2. 处理私有读写的签名URL实现
3. 配置环境变量

