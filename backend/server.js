import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initDatabase } from './database.js';
import { uploadRouter } from './routes/upload.js';
import { mediaRouter } from './routes/media.js';
import { tagRouter } from './routes/tags.js';
import { memoRouter } from './routes/memos.js';
import { commentRouter } from './routes/comments.js';
import { authRouter } from './routes/auth.js';
import { mediaProxyRouter } from './routes/media-proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库（异步）
let dbInitialized = false;
initDatabase().then(() => {
  dbInitialized = true;
  console.log('✅ 数据库已就绪');
}).catch(err => {
  console.error('❌ 数据库初始化失败:', err);
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 提供上传的图片和视频
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// 路由
app.use('/api/upload', uploadRouter);
app.use('/api/media', mediaRouter);
app.use('/api/media-proxy', mediaProxyRouter); // 图片代理（解决CORS）
app.use('/api/tags', tagRouter);
app.use('/api/memos', memoRouter);
app.use('/api/comments', commentRouter);
app.use('/api/auth', authRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务器运行正常' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📁 上传文件存储目录: ${uploadsDir}`);
});

