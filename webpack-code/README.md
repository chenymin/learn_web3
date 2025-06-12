# Webpack React Project

一个基于 Webpack 5 和 React 19 的现代前端开发项目，集成了 TypeScript、Tailwind CSS 和完整的开发工具链。

## 🚀 技术栈

- **React 19** - 最新版本的 React 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Webpack 5** - 模块打包工具
- **Tailwind CSS 4** - 实用优先的 CSS 框架
- **SWC** - 快速的 TypeScript/JavaScript 编译器
- **ESLint + Prettier** - 代码质量和格式化工具
- **BackstopJS** - 视觉回归测试
- **MetaMask SDK** - Web3 集成支持

## 📋 前置要求

- Node.js (推荐 16+ 版本)
- pnpm 10.12.1+ (项目使用 pnpm 作为包管理器)

## 🛠️ 安装

```bash
# 安装 pnpm (如果未安装)
npm install -g pnpm

# 安装项目依赖
pnpm install
```

## 🚀 快速开始

### 开发模式

```bash
# 启动开发服务器 (带热重载)
pnpm run client:server

# 或者只构建开发版本
pnpm run client:dev
```

开发服务器默认运行在 `http://localhost:8080`

### 生产构建

```bash
# 构建生产版本
pnpm run client:prod
```

构建文件将输出到 `dist` 目录。

## 🧪 测试与质量检查

### 代码检查

```bash
# 运行 ESLint 检查
pnpm run lint

# 自动修复 ESLint 和格式化问题
pnpm run lint:fix
```

### 视觉回归测试

```bash
# 运行 BackstopJS 视觉测试
pnpm run test:uidiff
```

## 📁 项目结构

```
webpack-code/
├── src/                # 源代码目录
│   ├── components/     # React 组件
│   ├── styles/         # 样式文件
│   └── index.tsx       # 应用入口
├── dist/               # 构建输出目录
├── webpack.config.js   # Webpack 配置
├── tailwind.config.js  # Tailwind CSS 配置
├── tsconfig.json       # TypeScript 配置
└── package.json        # 项目配置
```

## ⚙️ 配置说明

### Webpack 功能

- **开发服务器**: 支持热重载和实时开发
- **代码分割**: 自动优化打包输出
- **资源优化**: CSS 和 JS 文件压缩
- **TypeScript 支持**: 通过 SWC 快速编译
- **PostCSS 处理**: 支持 Tailwind CSS 和其他 CSS 预处理

### 代码质量工具

- **ESLint**: 使用 Airbnb TypeScript 配置
- **Prettier**: 代码格式化
- **TypeScript**: 严格类型检查
- **Jest**: 单元测试框架（已配置但需要编写测试用例）

### 特殊功能

- **MetaMask 集成**: 支持 Web3 钱包连接
- **视觉回归测试**: 通过 BackstopJS 进行 UI 测试
- **开发调试**: 集成 Why Did You Render 性能分析工具

## 🔧 开发建议

1. **组件开发**: 在 `src/components` 目录下创建可复用的 React 组件
2. **样式管理**: 优先使用 Tailwind CSS 类名，必要时创建自定义 CSS
3. **类型安全**: 充分利用 TypeScript 类型系统
4. **代码质量**: 提交前运行 `pnpm run lint:fix` 确保代码规范

## 📝 可用脚本

| 脚本命令 | 描述 |
|---------|------|
| `client:dev` | 构建开发版本 |
| `client:server` | 启动开发服务器 |
| `client:prod` | 构建生产版本 |
| `lint` | 运行代码检查 |
| `lint:fix` | 修复代码格式和部分问题 |
| `test:uidiff` | 运行视觉回归测试 |

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 ISC 许可证。详情请查看 [LICENSE](LICENSE) 文件。

## 🚨 注意事项

- 确保使用 pnpm 作为包管理器以保持依赖版本一致性
- 开发时请遵循 ESLint 和 Prettier 的代码规范
- 提交代码前请运行代码检查和测试