# Hide Window - Obsidian 插件

Automatically hide the Obsidian window when closing tabs.

## ✨ 功能特性

- **智能窗口隐藏**: 关闭最后一个标签页时自动隐藏 Obsidian 窗口
- **灵活配置**: 可配置空标签页和内容标签页的不同隐藏行为
- **精准监听**: 只在关闭最后一个标签页时触发,多标签页切换不干扰
- **原生体验**: 使用 `app.hide()` 实现,等同于 macOS 的 Cmd+H,可通过 Cmd+Tab 快速恢复

## 📦 安装方法

### 手动安装

1. 从 GitHub 下载最新版本或克隆仓库
2. 运行构建脚本生成插件文件:
   ```bash
   ./build.sh
   ```
3. 将 `dist/obsidian-hide-window/` 文件夹复制到您的 Obsidian 仓库的 `.obsidian/plugins/` 目录下
4. 重新加载 Obsidian
5. 在 **设置 → 社区插件** 中启用 `Hide Window` 插件

## ⚙️ 使用说明

### 插件设置

在 Obsidian 设置 → 社区插件 → Hide Window 中:

**Whether the tab is empty or not** (默认: ✅ 开启)

- **开启时**: 关闭最后一个标签页时隐藏窗口(无论标签页是否为空)
- **关闭时**: 只有关闭最后一个**空标签页**时才隐藏窗口
- 如果您习惯只使用一个标签页,开启此选项将更符合使用逻辑

### 工作原理

1. **初始化状态**: 插件加载时记录当前标签页数量和活跃标签页类型
2. **监听变化**: 实时监控工作区布局变化
3. **精准判断**: 
   - 只有关闭最后一个标签页时才触发隐藏
   - 多标签页关闭(如 2→1)不会触发
   - 打开文件等操作不会误触发
4. **执行隐藏**: 根据设置选项决定是否隐藏窗口

### 使用场景

#### 场景 1: 单标签页模式(推荐开启选项)
- 您习惯只使用一个标签页
- 关闭标签页 = 完成工作 → 自动隐藏窗口
- 通过 Cmd+Tab 或点击 Dock 图标快速恢复

#### 场景 2: 多标签页模式(建议关闭选项)
- 您经常使用多个标签页
- 只有关闭空标签页(新建但未打开文件)时才隐藏
- 关闭有内容的标签页不会隐藏,避免误操作

## 🔧 开发指南

### 环境配置

```bash
npm install
```

### 构建插件

```bash
npm run build
```

或使用一键构建脚本:

```bash
./build.sh
```

构建完成后,会在 `dist/obsidian-hide-window/` 目录下生成可直接安装的插件文件:
```
dist/obsidian-hide-window/
├── main.js          # 编译后的插件代码
├── manifest.json    # 插件清单
└── versions.json    # 版本兼容性
```

### 开发模式(自动监听)

```bash
npm run dev
```

修改 `src/main.ts` 后会自动重新构建,无需手动操作。

## 📁 项目结构

```
obsidian-hide-window/
├── src/
│   └── main.ts              # 插件源代码
├── main.js                  # 编译后的插件文件(构建生成)
├── manifest.json            # 插件清单文件
├── package.json             # Node.js 项目配置
├── tsconfig.json            # TypeScript 配置
├── esbuild.config.mjs       # esbuild 构建配置
├── versions.json            # Obsidian 版本兼容性
├── build.sh                 # 一键构建脚本
├── dist/                    # 构建输出目录(可直接安装)
│   └── obsidian-hide-window/
│       ├── main.js
│       ├── manifest.json
│       └── versions.json
├── .gitignore               # Git 忽略规则
└── README.md                # 项目说明文档
```

## 💡 技术实现

### 核心 API

- **标签页检测**: `app.workspace.iterateRootLeaves()` 遍历所有工作区标签页
- **活跃标签页**: `app.workspace.activeLeaf` 获取当前活跃标签页(虽然已弃用但仍可用)
- **视图类型**: `leaf.view.getViewType()` 判断标签页类型(empty/markdown 等)
- **事件监听**: `app.workspace.on('layout-change')` 监听布局变化
- **窗口隐藏**: `electron.remote.app.hide()` 实现 macOS 原生隐藏效果

### 关键逻辑

```typescript
// 精准检测最后一个标签页关闭
if (this.tabCountBefore === 1) {
  // 1→0 或 1→1(对象变化),触发隐藏
  this.handleTabClose();
}
```

## 📝 版本历史

### v1.0.0
- ✅ 初始版本发布
- ✅ 支持自动隐藏窗口
- ✅ 可配置空标签页行为
- ✅ 精准监听最后一个标签页关闭

## 👨‍💻 作者

**Travis**  
📧 travis0115@163.com

## 📄 许可证

MIT
