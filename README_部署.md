# 快速开始指南

## 🚀 本地运行（5分钟）

### 1. 安装Node.js

确保已安装 Node.js 18+：
```bash
node --version
```

### 2. 安装后端依赖

```bash
cd backend
npm install
```

### 3. 启动后端服务器

```bash
npm start
```

后端会运行在 `http://localhost:3000`

### 4. 打开前端页面

直接双击打开 `样式预览/index.html`，或在浏览器中打开。

或者使用本地服务器：

```bash
# 使用Python
cd 样式预览
python -m http.server 8080

# 然后访问 http://localhost:8080
```

## 📝 功能说明

### 已实现的功能

✅ **文件上传**
- 支持拖拽上传
- 支持多文件选择
- 自动生成缩略图（图片）
- 支持图片和视频

✅ **时间线查看**
- 按时间倒序显示所有媒体
- 显示标签、上传者、时间

✅ **分类查看**
- 按标签分类浏览
- 标签云展示

✅ **标签管理**
- 创建标签
- 上传时选择标签

### 数据库

- 使用SQLite（无需额外安装）
- 数据库文件：`backend/database.db`
- 自动创建默认用户：user1/password1, user2/password2

### 文件存储

- 本地存储：`backend/uploads/`
- 缩略图：`backend/uploads/thumbnails/`
- 支持格式：JPG, PNG, GIF, WebP, MP4, WebM, MOV

## 🌐 部署到公网

### 最简单的方式：Railway

1. 访问 https://railway.app
2. 注册账号（使用GitHub）
3. 创建新项目
4. 连接GitHub仓库
5. 选择 `backend` 目录
6. Railway自动部署

详细步骤见 `部署指南.md`

## 📚 更多文档

- [部署指南.md](./部署指南.md) - 详细的部署方案
- [技术方案.md](./技术方案.md) - 技术架构
- [任务拆分.md](./任务拆分.md) - 开发任务拆分

## ❓ 常见问题

**Q: 上传失败怎么办？**
A: 检查文件大小（最大50MB）和文件类型是否支持

**Q: 图片无法显示？**
A: 确保后端服务器正在运行，检查 `script.js` 中的API地址

**Q: 如何修改API地址？**
A: 编辑 `样式预览/script.js`，修改 `API_BASE_URL`

---

**开始使用**：运行 `npm start` 启动后端，然后打开前端页面！

