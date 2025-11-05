# 详细部署教程 - Vercel + Render + 腾讯云COS

## 📋 部署方案概述

本教程将指导您将照片视频共享系统部署到云端，使用以下服务：

- **Vercel**：前端部署（免费）
- **Render**：后端部署（免费额度750小时/月）
- **腾讯云COS**：云存储（50GB免费额度6个月）

---

## 🎯 第一步：准备腾讯云COS

### 1.1 注册腾讯云账号

1. 访问 https://cloud.tencent.com
2. 注册账号并完成实名认证
3. 进入控制台

### 1.2 创建COS存储桶

1. 在控制台搜索"对象存储COS"或访问 https://console.cloud.tencent.com/cos
2. 点击"创建存储桶"
3. 配置参数：

   - **名称**：自定义（如：`photo-sharing-bucket`）
   - **所属地域**：选择离您最近的地域（如：北京 `ap-beijing`）
   - **访问权限**：**选择"私有读写"**（更安全，文件需要签名URL才能访问）
   - **存储类型**：标准存储
   - **其他选项**：保持默认
4. 点击"创建"完成

### 1.3 获取访问密钥

1. 在控制台右上角点击头像 → "访问管理"
2. 进入"API密钥管理"
3. 点击"新建密钥"或使用现有密钥
4. 记录以下信息：
   - **SecretId**
   - **SecretKey**（只显示一次，请妥善保存）

### 1.4 配置CORS（跨域）

1. 进入您创建的存储桶
2. 点击"安全管理" → "跨域访问CORS设置"
3. 点击"新增规则"，配置：
   ```
   来源Origin：*
   操作Methods：GET, POST, PUT, DELETE, HEAD
   允许Headers：*
   暴露Headers：ETag, x-cos-request-id
   超时MaxAge：3600
   ```
4. 点击"确定"保存

### 1.5 配置访问权限说明

**推荐使用"私有读写"模式**，原因：

- ✅ 更安全：文件不能直接通过URL访问
- ✅ 需要签名URL：后端生成临时访问链接（1小时有效期）
- ✅ 防止未授权访问

**如果选择"公有读私有写"模式**：

- ✅ 文件可以直接访问（访问速度快）
- ⚠️ 安全性较低：知道URL的人可以直接访问
- ⚠️ 需要配置防盗链等安全措施

---

## 🚀 第二步：部署后端到Render

### 2.1 准备代码仓库

1. 在GitHub创建新仓库（如果还没有）
2. 将本地代码推送到GitHub：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/betterMessi/feifeimeimeiwebsite.git
   git push -u origin main
   ```

### 2.2 在Render创建Web服务

1. 访问 https://render.com
2. 使用GitHub账号登录
3. 点击"New" → "Web Service"
4. 连接您的GitHub仓库
5. 配置服务：
   - **Name**：`photo-sharing-backend`（自定义）
   - **Root Directory**：`backend`
   - **Environment**：`Node`
   - **Build Command**：`npm install`
   - **Start Command**：`npm start`
   - **Plan**：选择"Free"（免费计划）

### 2.3 设置环境变量

在Render项目设置中，点击"Environment"标签，添加以下环境变量：

```
PORT=3000
NODE_ENV=production

# 腾讯云COS配置
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_REGION=ap-beijing
COS_BUCKET_NAME=你的Bucket名称
COS_DOMAIN=（可选，留空）
COS_ACCESS_TYPE=private
```

**重要**：

- `COS_ACCESS_TYPE=private` 表示使用私有读写模式
- 如果使用公有读私有写，设置为 `COS_ACCESS_TYPE=public`

### 2.4 部署并获取后端URL

1. 点击"Create Web Service"开始部署
2. 等待部署完成（约5-10分钟）
3. 部署成功后，Render会提供URL，格式如：`https://your-app.onrender.com`
4. 记录这个URL，后续前端会用到

### 2.5 测试后端

在浏览器访问：`https://your-app.onrender.com/api/health`

应该看到：

```json
{
  "status": "ok",
  "message": "服务器运行正常"
}
```

---

## 🎨 第三步：部署前端到Vercel

### 3.1 在Vercel创建项目

1. 访问 https://vercel.com
2. 使用GitHub账号登录
3. 点击"Add New..." → "Project"
4. 导入您的GitHub仓库

### 3.2 配置项目

1. **Root Directory**：点击"Edit"，设置为 `样式预览`
2. **Framework Preset**：选择"Other"或"Vite"
3. **Build Command**：留空（因为是静态文件）
4. **Output Directory**：`.`

### 3.3 设置环境变量

在"Environment Variables"中添加：

```
VITE_API_BASE_URL=https://your-app.onrender.com/api
```

**注意**：将 `your-app.onrender.com` 替换为您的实际Render后端URL

### 3.4 部署

1. 点击"Deploy"开始部署
2. 等待部署完成（约2-3分钟）
3. 部署成功后，Vercel会提供URL，格式如：`https://your-app.vercel.app`

---

## 📝 第四步：更新前端代码（如果需要）

如果前端代码中硬编码了API地址，需要更新：

### 4.1 检查 `样式预览/script.js`

确保API地址配置如下：

```javascript
const API_BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    // 生产环境会自动使用环境变量 VITE_API_BASE_URL
    // 如果使用静态HTML，需要手动替换这里的URL
    return process.env.VITE_API_BASE_URL || 'https://your-backend-url.onrender.com/api';
})();
```

### 4.2 如果使用静态HTML

需要手动替换 `样式预览/script.js` 中的API地址：

```javascript
return 'https://your-backend-url.onrender.com/api'; // 替换为您的Render后端URL
```

---

## ✅ 第五步：测试部署

### 5.1 测试前端

1. 访问Vercel提供的URL
2. 检查页面是否正常加载
3. 尝试登录（用户名：肥肥 或 美美，密码：05240126）

### 5.2 测试上传功能

1. 登录后，进入"上传"页面
2. 选择一张照片上传
3. 检查是否成功上传到腾讯云COS

### 5.3 检查COS文件

1. 登录腾讯云控制台
2. 进入COS存储桶
3. 查看"文件列表"，应该能看到上传的文件

---

## 🔧 常见问题排查

### 问题1：后端无法连接到COS

**检查**：

- 环境变量是否正确设置
- SecretId 和 SecretKey 是否正确
- Bucket名称和地域是否匹配

### 问题2：前端无法访问后端

**检查**：

- Render后端URL是否正确
- CORS配置是否正确
- 前端环境变量 `VITE_API_BASE_URL` 是否设置

### 问题3：文件无法访问（私有读写模式）

**说明**：

- 私有读写模式下，文件需要签名URL才能访问
- 后端会自动生成签名URL（1小时有效期）
- 如果文件无法访问，检查后端日志

### 问题4：Render服务休眠

**说明**：

- Render免费计划会在15分钟无活动后休眠
- 首次访问需要等待约30秒唤醒
- 如需24小时运行，需要升级到付费计划

---

## 📊 成本估算

### 初期（前6个月）

| 服务           | 费用               |
| -------------- | ------------------ |
| Vercel前端     | 免费               |
| Render后端     | 免费（750小时/月） |
| 腾讯云COS      | 免费（50GB存储）   |
| **总计** | **¥0/月**   |

### 6个月后

| 服务           | 费用                        |
| -------------- | --------------------------- |
| Vercel前端     | 免费                        |
| Render后端     | 免费（或$7/月升级）         |
| 腾讯云COS      | 约¥6/月（50GB存储 + 流量） |
| **总计** | **约¥6-50/月**       |

---

## 🎯 部署检查清单

- [ ] 腾讯云账号注册并实名认证
- [ ] 创建COS存储桶（私有读写）
- [ ] 获取SecretId和SecretKey
- [ ] 配置CORS规则
- [ ] GitHub仓库创建并推送代码
- [ ] Render后端部署完成
- [ ] 设置Render环境变量
- [ ] 测试后端健康检查接口
- [ ] Vercel前端部署完成
- [ ] 设置Vercel环境变量
- [ ] 测试前端访问
- [ ] 测试登录功能
- [ ] 测试上传功能
- [ ] 验证文件已上传到COS

---

## 📞 需要帮助？

如果部署遇到问题：

1. **查看日志**：

   - Render：在项目页面查看"Logs"
   - Vercel：在项目页面查看"Deployments" → "View Build Logs"
2. **检查环境变量**：

   - 确保所有环境变量都已正确设置
   - 检查是否有拼写错误
3. **测试API**：

   - 使用Postman或curl测试后端API
   - 检查CORS配置
4. **检查COS配置**：

   - 验证存储桶权限设置
   - 检查CORS配置是否正确

---

## 🎉 部署完成！

恭喜！您的照片视频共享系统已经成功部署到云端。

**访问地址**：

- 前端：`https://your-app.vercel.app`
- 后端API：`https://your-app.onrender.com/api`

**登录信息**：

- 用户名：`肥肥` 或 `美美`
- 密码：`05240126`

享受您的云端照片分享系统吧！📸✨
