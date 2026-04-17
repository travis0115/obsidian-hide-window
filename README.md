# Hide Window - Obsidian 插件

关闭标签页时自动隐藏 Obsidian 窗口。

## 功能特性

- 关闭最后一个标签页时自动隐藏 Obsidian 窗口
- 可配置空标签页和内容标签页的不同行为
- 与 Obsidian 标签页管理无缝集成

## 安装方法

### 手动安装

1. 下载最新版本
2. 将文件夹解压到您的 Obsidian 仓库的 `.obsidian/plugins/` 目录下
3. 将文件夹重命名为 `obsidian-hide-window`
4. 重新加载 Obsidian
5. 在 设置 → 社区插件 中启用该插件

## 使用说明

### 插件设置

**Whether the tab is empty or not** (默认: 开启)

- **开启时**: 关闭最后一个标签页时隐藏窗口(无论标签页是否有内容)
- **关闭时**: 只有关闭最后一个空标签页时才隐藏窗口
- 如果您习惯只使用一个标签页,开启此选项将更符合使用逻辑

### 工作原理

1. 插件监控标签页数量和活跃标签页类型
2. 当通过 `Cmd+W` (或 Windows/Linux 上的 `Ctrl+W`)关闭标签页时
3. 如果是最后一个标签页,插件会检查设置
4. 根据您的配置,Obsidian 窗口将自动隐藏

## 开发指南

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

构建完成后,会在 `dist/obsidian-hide-window/` 目录下生成可直接安装的插件文件。

### 开发模式(自动监听)

```bash
npm run dev
```

## 项目结构

```
obsidian-hide-window/
├── src/
│   └── main.ts              # 插件源代码
├── main.js                  # 编译后的插件文件(构建生成)
├── manifest.json            # 插件清单文件
├── package.json             # Node.js 配置
├── tsconfig.json            # TypeScript 配置
├── esbuild.config.mjs       # 构建配置
├── versions.json            # 版本兼容性
├── build.sh                 # 一键构建脚本
├── dist/                    # 构建输出目录(可直接安装)
│   └── obsidian-hide-window/
│       ├── main.js
│       ├── manifest.json
│       └── versions.json
├── .gitignore               # Git 忽略文件
└── README.md                # 说明文档
```

## 许可证

MIT
