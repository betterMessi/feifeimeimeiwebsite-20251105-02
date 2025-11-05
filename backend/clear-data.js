import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 清空上传文件
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  console.log('正在清空上传文件...');
  const files = fs.readdirSync(uploadsDir);
  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    if (fs.statSync(filePath).isDirectory()) {
      // 删除子目录中的文件
      const subFiles = fs.readdirSync(filePath);
      subFiles.forEach(subFile => {
        fs.unlinkSync(path.join(filePath, subFile));
      });
      fs.rmdirSync(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  });
  console.log('✅ 上传文件已清空');
}

// 删除数据库文件
const dbPath = path.join(__dirname, 'database.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ 数据库文件已删除');
}

console.log('✅ 数据清空完成！请重新运行 node backend/init-tags.js 初始化数据库');

