#!/bin/bash

# 抽奖系统部署脚本
set -e

echo "🚀 开始部署抽奖系统..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 加载环境变量
if [ -f .env ]; then
    echo "📁 加载环境变量..."
    source .env
else
    echo "⚠️  未找到 .env 文件，使用默认配置"
fi

# 创建必要的目录
echo "📂 创建目录..."
mkdir -p nginx/ssl
mkdir -p mongodb/backup
mkdir -p logs/{nginx,backend,frontend}

# 生成 SSL 证书（如果不存在）
if [ ! -f nginx/ssl/lottery.crt ]; then
    echo "🔐 生成 SSL 证书..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/lottery.key \
        -out nginx/ssl/lottery.crt \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=Lottery/CN=lottery.example.com"
fi

# 构建并启动服务
echo "🔨 构建 Docker 镜像..."
docker-compose -f docker/docker-compose.yml build

echo "🚀 启动服务..."
docker-compose -f docker/docker-compose.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker/docker-compose.yml ps

# 运行数据库初始化
echo "🗄️  初始化数据库..."
docker-compose -f docker/docker-compose.yml exec mongodb \
    mongosh --username $MONGO_ROOT_USER --password $MONGO_ROOT_PASSWORD --authenticationDatabase admin \
    /docker-entrypoint-initdb.d/init.js

echo "✅ 部署完成！"
echo "🌐 前端访问: http://localhost"
echo "🔧 后端API: http://localhost/api"
echo "📊 MongoDB: mongodb://localhost:27017"