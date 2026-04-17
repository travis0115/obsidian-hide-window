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
    echo "✅ Build successful!"
    echo ""
    echo "📁 Generated files:"
    echo "   - main.js"
    echo "   - manifest.json"
    echo ""
    echo "📋 To install the plugin:"
    echo "   1. Copy the entire 'obsidian-hide-window' folder to:"
    echo "      YourVault/.obsidian/plugins/"
    echo "   2. Reload Obsidian"
    echo "   3. Enable the plugin in Settings → Community Plugins"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi
