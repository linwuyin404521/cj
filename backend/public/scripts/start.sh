#!/bin/bash

# 抽奖系统启动脚本

# 设置环境变量
export NODE_ENV=production
export PORT=3000
export MONGODB_URI=mongodb://localhost:27017/lottery_system

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
REQUIRED_VERSION="14.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "错误: 需要Node.js版本 >= $REQUIRED_VERSION, 当前版本: $NODE_VERSION"
    exit 1
fi

# 检查MongoDB连接
if ! nc -z localhost 27017 2>/dev/null; then
    echo "错误: MongoDB未运行"
    echo "请先启动MongoDB: mongod --dbpath ./data/db"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "创建环境变量文件..."
    cp .env.example .env
    echo "请编辑 .env 文件配置环境变量"
    exit 1
fi

# 创建必要的目录
mkdir -p logs backups

# 启动应用脚本
echo "启动抽奖系统后端..."
echo "环境: $NODE_ENV"
echo "端口: $PORT"
echo "MongoDB: $MONGODB_URI"

# 使用PM2启动（如果已安装）
if command -v pm2 &> /dev/null; then
    echo "使用PM2启动..."
    pm2 start ecosystem.config.js
    pm2 logs lottery-api
else
    echo "使用Node直接启动..."
    node server.js
fi