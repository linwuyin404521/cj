#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 开始部署抽奖系统..."

# 1. 加载环境变量
if [ -f .env ]; then
    source .env
else
    echo "❌ 找不到 .env 文件"
    exit 1
fi

# 2. 构建前端
echo "📦 构建前端..."
cd frontend
npm install
npm run build
cd ..

# 3. 构建Docker镜像
echo "🐳 构建Docker镜像..."
docker-compose build

# 4. 停止旧服务
echo "🛑 停止旧服务..."
docker-compose down || true

# 5. 启动新服务
echo "🚀 启动新服务..."
docker-compose up -d

# 6. 健康检查
echo "🏥 健康检查..."
sleep 10

# 检查后端服务
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务启动失败"
    docker-compose logs backend
    exit 1
fi

# 检查前端服务
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ 前端服务运行正常"
else
    echo "❌ 前端服务启动失败"
    docker-compose logs nginx
    exit 1
fi

echo "🎉 部署成功！"
echo "🌐 访问地址: https://${DOMAIN_NAME:-localhost}"
echo "📊 查看日志: docker-compose logs -f"