import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
let db = null;
let SQL = null;

// 初始化 SQL.js
async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

// 兼容层：模拟 better-sqlite3 的 prepare API
class PreparedStatement {
  constructor(db, query) {
    this.db = db;
    this.query = query;
    this.stmt = null;
  }

  run(...params) {
    if (!this.stmt) {
      this.stmt = this.db.prepare(this.query);
    }
    if (params.length > 0) {
      this.stmt.bind(params);
    }
    this.stmt.step();
    const lastIdResult = this.db.exec('SELECT last_insert_rowid() as id');
    const result = {
      lastInsertRowid: lastIdResult.length > 0 && lastIdResult[0].values.length > 0 
        ? lastIdResult[0].values[0][0] 
        : null,
      changes: 1
    };
    this.stmt.reset();
    saveDatabase();
    return result;
  }

  get(...params) {
    if (!this.stmt) {
      this.stmt = this.db.prepare(this.query);
    }
    if (params.length > 0) {
      this.stmt.bind(params);
    }
    const stepped = this.stmt.step();
    const result = stepped ? this.stmt.getAsObject() : null;
    this.stmt.reset();
    return result;
  }

  all(...params) {
    if (!this.stmt) {
      this.stmt = this.db.prepare(this.query);
    }
    if (params.length > 0) {
      this.stmt.bind(params);
    }
    const results = [];
    while (this.stmt.step()) {
      results.push(this.stmt.getAsObject());
    }
    this.stmt.reset();
    return results;
  }

  free() {
    if (this.stmt) {
      this.stmt.free();
      this.stmt = null;
    }
  }
}

// 数据库包装器
class DatabaseWrapper {
  constructor(db) {
    this.db = db;
  }

  prepare(query) {
    return new PreparedStatement(this.db, query);
  }

  exec(query) {
    const result = this.db.exec(query);
    saveDatabase();
    return result;
  }

  pragma(query) {
    // sql.js 不支持 pragma，忽略
    return;
  }
}

// 保存数据库到文件
function saveDatabase() {
  if (db && dbPath && db.db) {
    try {
      // db.db 是实际的 SQL.js Database 实例
      const data = db.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (error) {
      console.error('保存数据库失败:', error);
    }
  }
}

export async function initDatabase() {
  // 初始化 SQL.js
  await initSQL();
  
  // 如果数据库文件存在，加载它；否则创建新数据库
  let sqlDb;
  if (fs.existsSync(dbPath)) {
    try {
      const buffer = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(buffer);
    } catch (error) {
      console.log('⚠️ 数据库文件损坏，创建新数据库');
      sqlDb = new SQL.Database();
    }
  } else {
    sqlDb = new SQL.Database();
  }

  // 包装数据库
  db = new DatabaseWrapper(sqlDb);

  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      file_type TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      description TEXT,
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#4A90E2',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      UNIQUE(media_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
    CREATE INDEX IF NOT EXISTS idx_media_upload_time ON media(upload_time);
    CREATE INDEX IF NOT EXISTS idx_media_file_type ON media(file_type);
    CREATE INDEX IF NOT EXISTS idx_media_tags_media_id ON media_tags(media_id);
    CREATE INDEX IF NOT EXISTS idx_media_tags_tag_id ON media_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_memos_user_id ON memos(user_id);
    CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos(created_at);
    CREATE INDEX IF NOT EXISTS idx_comments_media_id ON comments(media_id);
    CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
  `);

  // 创建默认用户（肥肥和美美）
  const password = '05240126';
  
  // 检查并创建"肥肥"用户
  const feifeiUser = db.prepare('SELECT * FROM users WHERE username = ?').get('肥肥');
  if (!feifeiUser) {
    db.prepare(`
      INSERT INTO users (username, password, nickname)
      VALUES (?, ?, ?)
    `).run('肥肥', password, '肥肥');
    console.log('✅ 已创建用户: 肥肥');
  }
  
  // 检查并创建"美美"用户
  const meimeiUser = db.prepare('SELECT * FROM users WHERE username = ?').get('美美');
  if (!meimeiUser) {
    db.prepare(`
      INSERT INTO users (username, password, nickname)
      VALUES (?, ?, ?)
    `).run('美美', password, '美美');
    console.log('✅ 已创建用户: 美美');
  }
  
  // 如果用户存在但密码不对，更新密码
  if (feifeiUser && feifeiUser.password !== password) {
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(password, '肥肥');
    console.log('✅ 已更新用户密码: 肥肥');
  }
  
  if (meimeiUser && meimeiUser.password !== password) {
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(password, '美美');
    console.log('✅ 已更新用户密码: 美美');
  }
  
  saveDatabase();

  // 创建上传目录
  const uploadsDir = path.join(__dirname, 'uploads');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }

  console.log('✅ 数据库初始化完成');
  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 await initDatabase()');
  }
  return db;
}

export { saveDatabase };
