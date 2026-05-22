#!/bin/bash
# Electron 安装脚本 - 用于在本地电脑上安装 Electron 二进制文件
# 使用国内镜像加速下载

echo "========================================="
echo "  Novel Writer - Electron 安装脚本"
echo "========================================="
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules/electron" ]; then
  echo ">>> 安装 Electron npm 包..."
  npm install --save-dev electron@^28.0.0 electron-builder@^24.0.0
fi

echo ">>> 下载 Electron 二进制文件（使用国内镜像）..."
ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" node node_modules/electron/install.js

if [ $? -eq 0 ]; then
  echo ""
  echo "========================================="
  echo "  ✅ Electron 安装成功！"
  echo "========================================="
  echo ""
  echo "运行以下命令启动桌面应用："
  echo "  npm start"
  echo ""
else
  echo ""
  echo "❌ 安装失败，请尝试手动设置镜像："
  echo "  export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
  echo "  npm run electron:install"
  echo ""
  echo "或者使用其他镜像源："
  echo "  export ELECTRON_MIRROR=https://repo.huaweicloud.com/electron/"
  echo "  npm run electron:install"
fi