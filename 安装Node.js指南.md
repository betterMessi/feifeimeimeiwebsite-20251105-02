# Node.js 安装指南

## 🔍 问题诊断

如果看到错误：`npm : 无法将"npm"项识别为 cmdlet...`，说明 Node.js 没有安装。

## 📥 方法一：官方安装（推荐）

### 1. 下载 Node.js

访问 Node.js 官网：https://nodejs.org/zh-cn/

**推荐下载 LTS 版本**（长期支持版本，更稳定）

- 点击下载 Windows 安装包（.msi 文件）
- 选择 64-bit 版本（如果你的系统是 64 位）

### 2. 安装 Node.js

1. 双击下载的 `.msi` 安装包
2. 点击"下一步"，按照向导安装
3. **重要**：确保勾选 "Add to PATH" 选项（自动添加到环境变量）
4. 完成安装

### 3. 验证安装

打开 PowerShell（或新的命令行窗口），运行：

```powershell
node --version
npm --version
```

如果显示版本号（如 `v18.17.0`），说明安装成功！

## 📦 方法二：使用包管理器安装

### 使用 Chocolatey（如果已安装）

```powershell
choco install nodejs-lts
```

### 使用 Winget（Windows 10/11 自带）

```powershell
winget install OpenJS.NodeJS.LTS
```

## ✅ 安装完成后

### 1. 重启 PowerShell

安装完成后，**关闭当前的 PowerShell 窗口**，重新打开一个新的 PowerShell 窗口。

这是为了确保环境变量生效。

### 2. 验证安装

```powershell
node --version
npm --version
```

### 3. 安装项目依赖

```powershell
cd backend
npm install
```

## 🚨 常见问题

### 问题1：安装后仍然无法识别 npm

**解决方案**：
1. 重启电脑（让环境变量完全生效）
2. 或者手动添加环境变量：
   - 右键"此电脑" → 属性 → 高级系统设置
   - 环境变量 → 系统变量 → Path
   - 添加 Node.js 安装路径（通常是 `C:\Program Files\nodejs\`）

### 问题2：权限问题

如果遇到权限错误，可以：
- 以管理员身份运行 PowerShell
- 或使用用户目录安装：`npm config set prefix "$env:USERPROFILE\.npm-global"`

### 问题3：npm 安装很慢

**解决方案**：使用国内镜像

```powershell
npm config set registry https://registry.npmmirror.com
```

## 📝 快速检查清单

- [ ] 已下载 Node.js LTS 版本
- [ ] 已安装 Node.js（勾选了 Add to PATH）
- [ ] 已重启 PowerShell
- [ ] `node --version` 能显示版本
- [ ] `npm --version` 能显示版本
- [ ] 已进入 backend 目录
- [ ] `npm install` 执行成功

---

**安装完成后，继续按照 `快速开始.md` 的步骤操作！**

