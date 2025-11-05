// 初始化标签脚本
import { initDatabase, getDatabase, saveDatabase } from './database.js';

// 创建默认标签
const defaultTags = [
  { name: '肥肥美美', color: '#FF6B9D' },
  { name: '狗娃儿之家', color: '#4ECDC4' },
  { name: '证件照', color: '#95E1D3' },
  { name: '旅游', color: '#4A90E2' },
  { name: '吃吃喝喝', color: '#F39C12' },
  { name: '花花', color: '#E74C3C' },
  { name: '公主的眼影', color: '#9B59B6' },
  { name: '日常', color: '#3F51B5' }
];

async function initTags() {
  try {
    console.log('开始初始化数据库...');
    // 先初始化数据库
    await initDatabase();
    
    console.log('开始初始化标签...');
    const db = getDatabase();

    for (const tag of defaultTags) {
      try {
        db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)')
          .run(tag.name, tag.color);
        console.log(`✅ 创建标签: ${tag.name}`);
      } catch (error) {
        if (error.message && error.message.includes('UNIQUE')) {
          console.log(`⚠️ 标签 ${tag.name} 已存在`);
        } else {
          console.error(`❌ 创建标签 ${tag.name} 失败:`, error.message);
        }
      }
    }

    // 保存数据库
    saveDatabase();
    console.log('✅ 标签初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

// 运行初始化
initTags();

