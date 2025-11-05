# 腾讯云COS配置步骤（私有读写）

## 📋 配置步骤

### 第一步：创建Bucket

1. **登录腾讯云控制台**
   - 访问 https://console.cloud.tencent.com
   - 登录你的账号

2. **进入对象存储COS**
   - 在控制台搜索"对象存储"或"COS"
   - 点击进入COS控制台

3. **创建存储桶**
   - 点击"创建存储桶"
   - 配置信息：
     - **名称**：`photo-sharing`（或你喜欢的名字，必须唯一）
     - **所属地域**：选择离你最近的（如：北京 ap-beijing）
     - **访问权限**：**私有读写** ✅
     - **存储类型**：标准存储
     - **多AZ**：关闭（免费）
     - **服务端加密**：关闭（可选）
   - 点击"创建"

### 第二步：配置CORS（跨域访问）

1. **进入Bucket设置**
   - 点击你创建的Bucket名称
   - 进入"安全管理" → "跨域访问CORS设置"

2. **添加CORS规则**
   - 点击"添加规则"
   - 配置：
     ```
     来源Origin: *
     操作Methods: GET, PUT, POST, DELETE, HEAD
     允许Headers: *
     暴露Headers: ETag, Content-Length
     超时Max-Age: 3600
     ```
   - 点击"保存"

### 第三步：获取访问密钥

1. **进入访问管理**
   - 在控制台搜索"访问管理"或"CAM"
   - 点击进入

2. **创建API密钥**
   - 点击左侧"API密钥管理"
   - 如果已有密钥，直接使用
   - 如果没有，点击"新建密钥"
   - 保存以下信息：
     - **SecretId**：如 `AKIDxxxxxxxxxxxxxxxxxxxxx`
     - **SecretKey**：如 `xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **重要**：SecretKey只显示一次，请妥善保存！

### 第四步：配置后端环境变量

在Render项目设置中添加以下环境变量：

```
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_REGION=ap-beijing
COS_BUCKET_NAME=你的Bucket名称
COS_ACCESS_TYPE=private
```

**示例**：
```
COS_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxxx
COS_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
COS_REGION=ap-beijing
COS_BUCKET_NAME=photo-sharing-1234567890
COS_ACCESS_TYPE=private
```

---

## 🔧 地域代码对照表

| 地域 | 代码 |
|------|------|
| 北京 | ap-beijing |
| 上海 | ap-shanghai |
| 广州 | ap-guangzhou |
| 成都 | ap-chengdu |
| 重庆 | ap-chongqing |
| 新加坡 | ap-singapore |
| 香港 | ap-hongkong |

---

## 📝 注意事项

### 1. 私有读写的签名URL

- ✅ 每次访问都会生成新的签名URL
- ✅ 签名URL有效期：1小时（可在代码中调整）
- ✅ 过期后需要重新生成

### 2. 性能优化建议

- 前端可以缓存签名URL（1小时内有效）
- 考虑使用CDN加速（腾讯云COS支持）
- 批量获取媒体时，可以并行生成签名URL

### 3. 安全性

- ✅ 不要将SecretId和SecretKey提交到GitHub
- ✅ 使用环境变量存储敏感信息
- ✅ 定期轮换密钥

---

## ✅ 配置检查清单

- [ ] 创建Bucket（私有读写）
- [ ] 配置CORS规则
- [ ] 获取SecretId和SecretKey
- [ ] 在Render中设置环境变量
- [ ] 测试文件上传
- [ ] 测试文件访问（签名URL）

---

## 🆘 常见问题

### Q1: 上传失败怎么办？

**检查**：
1. SecretId和SecretKey是否正确
2. Bucket名称是否正确
3. 地域代码是否正确
4. 查看后端日志

### Q2: 签名URL过期怎么办？

**解决**：
- 前端检测到403错误时，重新请求后端获取新URL
- 或增加签名URL有效期（不推荐，安全性降低）

### Q3: 如何切换到公共读？

**解决**：
1. 在COS控制台修改Bucket权限为"公共读私有写"
2. 修改环境变量：`COS_ACCESS_TYPE=public`
3. 重新部署后端

---

## 🎯 下一步

完成配置后：
1. 安装依赖：`cd backend && npm install`
2. 测试本地上传功能
3. 部署到Render
4. 测试云端上传和访问

