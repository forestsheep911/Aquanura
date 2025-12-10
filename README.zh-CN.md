# Kintone插件开发模板

一个现代化、功能完整的Kintone插件开发模板，基于Vite构建，支持热重载、HTTPS开发服务器、AI友好的日志系统和自动化部署。

## ✨ 特性

### 🚀 开发体验
- **热模块替换 (HMR)** - 代码修改即时生效，无需重新上传
- **HTTPS开发服务器** - 自动证书管理
- **开发徽章** - 开发版与生产版的视觉区分
- **可配置的重建模式** - 即时、懒编译与手动热键
- **Monorepo结构** - 插件代码与工具链清晰分离

### 📝 AI友好的日志系统
- **本地JSONL日志** - 日志写入 `logistics/log/dev.log` 供AI分析
- **实时日志流** - 实时查看插件运行日志
- **结构化JSON格式** - 便于人类和AI解析

### 🔧 构建与部署
- **Vite驱动的构建** - 快速、现代化的打包
- **自动化部署** - 一个命令上传到开发/生产环境
- **插件签名** - 使用私钥自动RSA签名
- **开发/生产模式** - 针对不同环境的差异化构建

### 🔐 证书管理
- **自动生成证书** - 用于HTTPS的自签名CA
- **修复脚本** - 一个命令修复证书问题：`pnpm fix-cert`
- **跨平台** - 支持Windows、Mac和Linux

## 🏗️ 项目结构

```
.
├── plugin/                    # 插件源代码
│   ├── src/
│   │   ├── manifest.json     # 插件清单
│   │   ├── logic/            # JavaScript逻辑
│   │   │   ├── desktop/      # 桌面视图
│   │   │   └── config/       # 配置页面
│   │   ├── log/              # 日志客户端
│   │   ├── css/              # 样式表
│   │   ├── html/             # HTML模板
│   │   └── image/            # 资源文件
│   ├── dist/                 # 构建输出
│   ├── package.json
│   └── private.ppk           # RSA私钥（已git忽略）
│
├── logistics/                 # 开发工具链
│   ├── plugin-deploy/        # 构建和部署脚本
│   │   ├── toolkit/          # 核心工具集
│   │   │   ├── cert/         # 证书管理
│   │   │   ├── kintone/      # Kintone API客户端
│   │   │   └── plugin/       # 插件签名和打包
│   │   ├── vite/             # Vite构建脚本
│   │   │   ├── build.js      # 生产构建
│   │   │   └── dev.js        # 开发服务器
│   │   ├── upload-dev.js     # 上传到开发环境
│   │   ├── upload-prod.js    # 上传到生产环境
│   │   ├── fix-cert.js       # 证书修复脚本
│   │   └── .env.example      # 环境变量模板
│   └── log/                  # 运行时日志
│       └── dev.log           # 开发日志（JSONL格式）
│
├── docs/                      # 文档
│   ├── DEVELOPMENT.md        # 开发指南
│   ├── DEPLOYMENT.md         # 部署指南
│   ├── LOG_SYSTEM.md         # 日志系统指南
│   └── TROUBLESHOOTING.md    # 常见问题与解决方案
│
├── pnpm-workspace.yaml       # Monorepo配置
├── package.json              # 根package
└── README.md                 # 本文件
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm 9+
- 一个Kintone开发环境

### 1. 安装依赖

```bash
pnpm install
```

**说明**：这一条命令会自动安装整个项目的所有依赖（根目录、plugin和logistics）。得益于pnpm workspace，你不需要分别进入子目录安装依赖。

### 2. 修复证书（首次运行）

```bash
pnpm fix-cert
```

这会生成并信任用于HTTPS开发的自签名证书。

### 3. 配置环境

```bash
cd logistics/plugin-deploy
cp .env.example .env
# 编辑.env文件，填入你的Kintone凭证
```

最少需要配置：

```env
KINTONE_DEV_BASE_URL=https://your-dev-domain.cybozu.com/
KINTONE_DEV_USERNAME=your-username
KINTONE_DEV_PASSWORD=your-password
```

**重要**：插件上传需要系统管理员权限，必须使用用户名和密码认证。Kintone的API Token是应用级别的，无法用于插件管理。

### 4. 开始开发

```bash
pnpm dev
```

这会启动Vite开发服务器，地址为 `https://localhost:5173`，支持热重载。

首次运行时：
1. 生成代理插件，可以上传到Kintone
2. 所有代码修改将从localhost提供
3. 只需刷新Kintone页面即可看到更改 - 无需重新上传！

### 4.1 重建模式与热键

- **即时模式（默认）**：保存后约200ms内自动重建。
- **懒编译模式**：等待静默窗口（`DEV_LAZY_WINDOW`，默认60秒）再重建，适合批量修改。
  - 命令行：`pnpm dev -- --mode lazy 45s`
  - `.env`：设置 `DEV_MODE=lazy`，可配合 `DEV_LAZY_WINDOW=45s`
- 开发服务器运行中按 `r` 可立即强制重建，按 `q` 或 `Ctrl+C` 可优雅退出。

### 5. 构建生产版本

```bash
pnpm build
```

输出：`plugin/dist/plugin.zip`

### 6. 部署

```bash
# 到开发环境
pnpm upload:dev

# 到生产环境
pnpm upload:prod
```

## 📋 可用命令

| 命令 | 描述 |
|------|------|
| `pnpm install` | 安装所有依赖 |
| `pnpm dev` | 启动支持热重载的开发服务器 |
| `pnpm build` | 构建生产插件 |
| `pnpm upload:dev` | 上传到开发环境 |
| `pnpm upload:prod` | 上传到生产环境 |
| `pnpm fix-cert` | 修复HTTPS证书问题 |

## 📖 文档

- **[开发指南](docs/DEVELOPMENT.md)** - 学习如何开发插件
- **[部署指南](docs/DEPLOYMENT.md)** - 部署到开发/生产环境
- **[证书管理](docs/CERTIFICATE.md)** - HTTPS证书设置与故障排除
- **[国际化 (i18n)](docs/I18N.md)** - 多语言支持指南
- **[日志系统指南](docs/LOG_SYSTEM.md)** - AI友好的日志系统
- **[故障排除](docs/TROUBLESHOOTING.md)** - 常见问题与解决方案

## 🔍 核心概念

### 热重载开发

模板使用"代理插件"技术：

1. 运行 `pnpm dev` 时，manifest.json被重写为从 `https://localhost:5173` 加载脚本
2. 生成并上传一次开发插件包
3. 所有后续的代码更改都从本地开发服务器提供
4. 只需刷新Kintone页面即可看到更改 - 无需重新上传！

### 开发徽章

当 `DEV_MODE=true` 时，插件图标会显示"D"徽章，用于区分开发版和生产版。

### AI友好的日志

日志以JSONL（JSON Lines）格式写入 `logistics/log/dev.log`：

```javascript
const logger = window.PluginLogger;

logger.info('用户点击按钮', { userId: '123' });
logger.error('保存失败', { error: err.message });
```

每一行都是有效的JSON，便于AI助手解析和分析。

### 证书管理

开发服务器需要HTTPS。`fix-cert` 脚本会：
1. 清理旧证书
2. 生成新的自签名CA
3. 在系统中信任它
4. 验证安装

## 🎯 示例插件

模板包含一个可工作的示例插件，展示了：

- ✅ Kintone事件处理
- ✅ 插件配置页面
- ✅ 日志器使用
- ✅ 现代CSS样式
- ✅ 正确的代码组织

按照上面的快速开始指南试用吧！

## 🛠️ 自定义

### 更新插件信息

编辑 `plugin/src/manifest.json`：

```json
{
  "name": {
    "zh": "你的插件名称"
  },
  "description": {
    "zh": "你的插件描述"
  },
  "version": 1
}
```

### 添加新脚本

1. 在 `plugin/src/logic/` 中创建你的脚本
2. 添加到manifest：
   ```json
   {
     "desktop": {
       "js": [
         "logic/desktop/desktop.js",
         "logic/my-feature/feature.js"
       ]
     }
   }
   ```
3. 热重载会自动识别！

### 添加依赖

```bash
cd plugin
pnpm add your-library
```

在代码中导入：

```javascript
import yourLibrary from 'your-library';
```

Vite会自动打包所有内容。

## 🔒 安全

### 绝对不要提交的文件

- `plugin/private.ppk` - 你的插件私钥
- `.env` - 包含敏感凭证
- `logistics/log/*.log` - 可能包含敏感的运行时数据

这些文件已在 `.gitignore` 中，但提交前请仔细检查！

### 需要管理员账户

插件上传需要具有**系统管理员权限**的用户账户。必须使用用户名和密码认证，原因如下：

- Kintone的API Token只有**应用级别**的权限
- 无法访问系统管理功能
- 插件管理是系统级别的操作

## 🤝 贡献

这是一个模板仓库。欢迎：

1. Fork它
2. 根据需要自定义
3. 分享改进！

## 📝 许可

MIT

## 🙋 需要帮助？

1. 查看 [故障排除指南](docs/TROUBLESHOOTING.md)
2. 阅读其他 [文档](docs/)
3. 查看Kintone开发者网络
4. 询问你的AI助手（分享你的 `dev.log`！）
