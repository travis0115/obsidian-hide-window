#!/bin/bash

echo "🔨 Building Hide Window Obsidian Plugin..."
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# 执行构建
echo "🚀 Building plugin..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "📦 Creating distribution package..."
    
    # 创建 dist 目录
    rm -rf dist
    mkdir -p dist/obsidian-hide-window
    
    # 复制必要的文件到 dist
    cp main.js dist/obsidian-hide-window/
    cp manifest.json dist/obsidian-hide-window/
    cp versions.json dist/obsidian-hide-window/
    
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📁 Distribution files:"
    echo "   dist/obsidian-hide-window/"
    echo "   ├── main.js"
    echo "   ├── manifest.json"
    echo "   └── versions.json"
    echo ""
    echo "📋 To install the plugin:"
    echo "   1. Copy the 'dist/obsidian-hide-window' folder to:"
    echo "      YourVault/.obsidian/plugins/"
    echo "   2. Reload Obsidian"
    echo "   3. Enable the plugin in Settings → Community Plugins"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi
